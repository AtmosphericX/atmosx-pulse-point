/*
                                            _               _     __   __
         /\  | |                           | |             (_)    \ \ / /
        /  \ | |_ _ __ ___   ___  ___ _ __ | |__   ___ _ __ _  ___ \ V / 
       / /\ \| __| "_ ` _ \ / _ \/ __| "_ \| "_ \ / _ \ "__| |/ __| > <  
      / ____ \ |_| | | | | | (_) \__ \ |_) | | | |  __/ |  | | (__ / . \ 
     /_/    \_\__|_| |_| |_|\___/|___/ .__/|_| |_|\___|_|  |_|\___/_/ \_\
                                     | |                                 
                                     |_|                                                                                                                
    
    Written by: KiyoWx (k3yomi)                
*/


import * as loader from './bootstrap';
import * as types from './types';
import Utils from './utils';
import Decrypt from './decrypt';

export class PulsePoint {
    job: any 
    constructor(metadata: types.ClientSettingsTypes) { this.start(metadata) }
    
    /**
     * @function setSettings
     * @description
     *     Merges the provided client settings into the current configuration,
     *     preserving nested structures.
     *
     * @async
     * @param {types.ClientSettingsTypes} settings
     * @returns {Promise<void>}
     */
    public async setSettings(settings: types.ClientSettingsTypes) {
        Utils.mergeClientSettings(loader.settings, settings);
    }

    /**
     * @function on
     * @description
     *     Registers a callback for a specific event and returns a function
     *     to unregister the listener.
     *
     * @param {string} event
     * @param {(...args: any[]) => void} callback
     * @returns {() => void}
     */
    public on(event: string, callback: (...args: any[]) => void) {
        loader.cache.events.on(event, callback);
        return () => loader.cache.events.off(event, callback);
    }

    /**
     * @function start
     * @description
     *     Initializes the client with the provided settings
     *
     * @async
     * @param {types.ClientSettingsTypes} metadata
     * @returns {Promise<void>}
     */
    public async start(metadata: types.ClientSettingsTypes): Promise<void> {
        if (!loader.cache.isReady) { 
            Utils.warn(loader.definitions.messages.not_ready);
            return;
        }
        this.setSettings(metadata);
        const settings = loader.settings as types.ClientSettingsTypes;
        const interval = settings.interval || 15;
        if (this.job) { this.job.stop(); }
        await this.getEvents(settings.filtering.agencies || [], loader.settings.key || '')
        this.job = new loader.packages.jobs.Cron(`*/${interval} * * * * *`, async () => {
            await this.getEvents(settings.filtering.agencies || [], loader.settings.key || '')
        })
    }

    /**
     * @function stop
     * @description
     *     Stops active scheduled tasks (cron job)
     *
     * @async
     * @returns {Promise<void>}
     */
    public async stop(): Promise<void> {
        loader.cache.isReady = true;
        if (this.job) {
            try { this.job.stop(); } catch {}
            this.job = null;
        }
        Utils.warn(loader.definitions.messages.client_stopped);
    }

    /**
     * @function getAvailableAgencies
     * @description
     *     Fetches the list of available agencies from the PulsePoint API.
     *     Decrypts the data using the provided key.
     * 
     * @returns {Promise<any[]>}
     */
    public async getAvailableAgencies(): Promise<any[]> {
        const response = await Utils.createHttpRequest(`https://api.pulsepoint.org/v1/webapp?resource=searchagencies&token=`);
        if (response.error) {
            Utils.warn(`Failed to fetch agencies list: ${response.message}`);
            return [];
        }
        const data: any = response.message || {};
        const encryptedItems = Decrypt.findObjects(data);
        const decryptedItems = encryptedItems.map(item => Decrypt.CtIvS(item, loader.settings.key || ''));
        return decryptedItems[0]?.searchagencies || [];
    }

    /**
     * @function getEvents
     * @description
     *      Fetches and processes agency and incident data from the PulsePoint API.
     *      Decrypts the data and updates the cache, emitting events for any changes.
     * 
     * @param {string[]} agencies - List of agency IDs to fetch data for.
     * @param {string} key - Decryption key for the data.
     * @returns {Promise<void>}
     */
    private async getEvents(agencies: string[], key: string): Promise<void> {
        const data: any = {};
        const urls = [
            `https://api.pulsepoint.org/v1/webapp?resource=agencies&agencyid=${agencies.join(',')}`,
            `https://api.pulsepoint.org/v1/webapp?resource=incidents&agencyid=${agencies.join(',')}`
        ];
        for (const url of urls) {
            const response = await Utils.createHttpRequest(url);
            if (response.error) {
                Utils.warn(`Failed to fetch agencies list: ${response.message}`);
                continue;
            }
            data[url.includes('agencies') ? 'agencies' : 'incidents'] = response.message || {};
        }
        const encryptedItems = Decrypt.findObjects(data);
        const decryptedItems = encryptedItems.map(item => Decrypt.CtIvS(item, key));
        const incidentsObj = decryptedItems.find(d => d.incidents);
        const dAgencies = decryptedItems[0]?.agencies || [];
        const dActive = incidentsObj?.incidents?.active || [];

        const oldStations = loader.cache.stations || [];
        loader.cache.stations = dAgencies;
        if (JSON.stringify(oldStations) !== JSON.stringify(dAgencies)) {
            loader.cache.events.emit('onStationUpdate', dAgencies, oldStations);
            Utils.warn(`Station list updated`, true);
        }
        const newIncidents = dActive.map(item => {
            const agency = loader.cache.stations.find(a => a.agencyid === item.AgencyID);
            const latitude = item.Latitude === '0.0000000000' ? null : item.Latitude;
            const longitude = item.Longitude === '0.0000000000' ? null : item.Longitude;
            return {
                ID: item.ID,
                agency: agency?.short_agencyname || "Unknown Agency",
                stream: agency?.livestreamurl || null,
                latitude,
                longitude,
                address: item.FullDisplayAddress ?? "Not Specified",
                type: loader.definitions.events[item.PulsePointIncidentCallType] || "Unknown",
                received: item.CallReceivedDateTime ? new Date(item.CallReceivedDateTime).toLocaleString() : null,
                closed: item.ClosedDateTime ? new Date(item.ClosedDateTime).toLocaleString() : false,
                units: Array.isArray(item.Unit) ? item.Unit.map(u => ({
                    id: u.UnitID,
                    status: loader.definitions.status[u.PulsePointDispatchStatus] || "Unknown",
                    closed: u.UnitClearedDateTime ? new Date(u.UnitClearedDateTime).toLocaleString() : null,
                })) : [],
            };
        });
        const filteredIncidents = loader.settings.filtering?.events?.length ? newIncidents.filter(incident =>
            loader.settings.filtering!.events!.some(e => e.toLowerCase() === incident.type.toLowerCase()))
            : newIncidents;
        const oldIncMap = new Map((loader.cache.active || []).map(i => [i.ID, i]));
        for (const incident of filteredIncidents) {
            const oldIncident = oldIncMap.get(incident.ID);
            if (!oldIncident || JSON.stringify(oldIncident) !== JSON.stringify(incident)) {
                loader.cache.events.emit('onIncidentUpdate', incident);
            }
        }
        loader.cache.active = newIncidents;
    }
}

export default PulsePoint;