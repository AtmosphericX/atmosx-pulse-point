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
     * @function getAvailableEvents
     * @description
     *     Returns a list of all defined event types that can be filtered.
     * 
     * @returns {string[]}
     */
    public getAvailableEvents(): string[] {
        return Object.values(loader.definitions.events);
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
        if (!agencies.length) return;
        const agencyIds = agencies.join(",");
        const urls = {
            agencies: `https://api.pulsepoint.org/v1/webapp?resource=agencies&agencyid=${agencyIds}`,
            incidents: `https://api.pulsepoint.org/v1/webapp?resource=incidents&agencyid=${agencyIds}`
        };
        const responses = await Promise.all(
            Object.entries(urls).map(async ([type, url]) => {
                const res = await Utils.createHttpRequest(url);
                if (res.error) {
                    Utils.warn(loader.definitions.messages.failed_fetch + ` (${type}): ${res.message}`);
                    return [type, {}] as const;
                }
                return [type, res.message ?? {}] as const;
            })
        );
        const data = Object.fromEntries(responses) as {agencies: any; incidents: any;};
        const encrypted = Decrypt.findObjects(data);
        if (!encrypted.length) {
            return Utils.warn(loader.definitions.messages.no_encrypted_data, true);
        }
        const decrypted = encrypted.map(obj => {
            try { return Decrypt.CtIvS(obj, key); } catch (err) { Utils.warn(loader.definitions.messages.decrypt_fail, true); return {}; }
        });
        const decAgencies = decrypted.find(d => d.agencies)?.agencies ?? [];
        const decIncidents = decrypted.find(d => d.incidents)?.incidents?.active ?? [];
        const oldStations = loader.cache.stations ?? [];
        loader.cache.stations = decAgencies;
        if (JSON.stringify(oldStations) !== JSON.stringify(decAgencies)) {
            loader.cache.events.emit("onStationUpdate", decAgencies, oldStations);
            Utils.warn(loader.definitions.messages.stations_updated, true);
        }
        const newIncidents = decIncidents.map(i => {
            const agency = loader.cache.stations.find(a => a.agencyid === i.AgencyID);
            const latitude = i.Latitude === "0.0000000000" ? null : Number(i.Latitude);
            const longitude = i.Longitude === "0.0000000000" ? null : Number(i.Longitude);
            return {
                type: "Feature",
                geometry: latitude !== null && longitude !== null ? {
                    type: "Point",
                    coordinates: [longitude, latitude]
                } : null,
                properties: {
                    ID: i.ID,
                    agency: agency?.short_agencyname ?? "Unknown Agency",
                    stream: agency?.livestreamurl ?? null,
                    address: i.FullDisplayAddress ?? "Not Specified",
                    event: loader.definitions.events[i.PulsePointIncidentCallType] ?? "Unknown",
                    issued: i.CallReceivedDateTime ? new Date(i.CallReceivedDateTime).toISOString() : null,
                    expires: i.ClosedDateTime ? new Date(i.ClosedDateTime).toISOString() : null,
                    units: Array.isArray(i.Unit) ? i.Unit.map(u => ({
                        id: u.UnitID,
                        status: loader.definitions.status[u.PulsePointDispatchStatus] ?? "Unknown",
                        closed: u.UnitClearedDateTime ? new Date(u.UnitClearedDateTime).toISOString() : null
                    })) : []
                }
            };
        });
        const filters = loader.settings.filtering?.events?.map(f => f.toLowerCase()) ?? [];
        const filteredIncidents = filters.length === 0 ? newIncidents
            : newIncidents.filter(i => filters.includes(i.properties.event.toLowerCase()));
        const oldMap = new Map((loader.cache.active ?? []).map(i => [i.properties.ID, i]));
        for (const incident of filteredIncidents) {
            const prev = oldMap.get(incident.properties.ID);
            if (!prev || JSON.stringify(prev) !== JSON.stringify(incident)) {
                loader.cache.events.emit("onIncidentUpdate", incident);
            }
        }
        loader.cache.active = newIncidents;
    }
}

export default PulsePoint;