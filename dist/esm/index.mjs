var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
var __async = (__this, __arguments, generator) => {
  return new Promise((resolve, reject) => {
    var fulfilled = (value) => {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    };
    var rejected = (value) => {
      try {
        step(generator.throw(value));
      } catch (e) {
        reject(e);
      }
    };
    var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
    step((generator = generator.apply(__this, __arguments)).next());
  });
};

// src/bootstrap.ts
import * as fs from "fs";
import * as path from "path";
import * as events from "events";
import * as jobs from "croner";
import axios from "axios";
import crypto from "crypto-js";
import os from "os";

// src/dictionaries/events.ts
var EVENTS = {
  "AA": "Auto Aid",
  "MU": "Mutual Aid",
  "ST": "Strike Team/Task Force",
  "AC": "Aircraft Crash",
  "AE": "Aircraft Emergency",
  "AES": "Aircraft Emergency Standby",
  "LZ": "Landing Zone",
  "AED": "AED Alarm",
  "OA": "Alarm",
  "CMA": "Carbon Monoxide",
  "FA": "Fire Alarm",
  "MA": "Manual Alarm",
  "SD": "Smoke Detector",
  "TRBL": "Trouble Alarm",
  "WFA": "Waterflow Alarm",
  "FL": "Flooding",
  "LR": "Ladder Request",
  "LA": "Lift Assist",
  "PA": "Police Assist",
  "PS": "Public Service",
  "SH": "Sheared Hydrant",
  "EX": "Explosion",
  "PE": "Pipeline Emergency",
  "TE": "Transformer Explosion",
  "AF": "Appliance Fire",
  "CHIM": "Chimney Fire",
  "CF": "Commercial Fire",
  "WSF": "Confirmed Structure Fire",
  "WVEG": "Confirmed Vegetation Fire",
  "CB": "Controlled Burn/Prescribed Fire",
  "ELF": "Electrical Fire",
  "EF": "Extinguished Fire",
  "FIRE": "Fire",
  "FULL": "Full Assignment",
  "IF": "Illegal Fire",
  "MF": "Marine Fire",
  "OF": "Outside Fire",
  "PF": "Pole Fire",
  "GF": "Refuse/Garbage Fire",
  "RF": "Residential Fire",
  "SF": "Structure Fire",
  "TF": "Tank Fire",
  "VEG": "Vegetation Fire",
  "VF": "Vehicle Fire",
  "WF": "Confirmed Fire",
  "WCF": "Working Commercial Fire",
  "WRF": "Working Residential Fire",
  "BT": "Bomb Threat",
  "EE": "Electrical Emergency",
  "EM": "Emergency",
  "ER": "Emergency Response",
  "GAS": "Gas Leak",
  "HC": "Hazardous Condition",
  "HMR": "Hazardous Response",
  "TD": "Tree Down",
  "WE": "Water Emergency",
  "AI": "Arson Investigation",
  "FWI": "Fireworks Investigation",
  "HMI": "Hazmat Investigation",
  "INV": "Investigation",
  "OI": "Odor Investigation",
  "SI": "Smoke Investigation",
  "CL": "Commercial Lockout",
  "LO": "Lockout",
  "RL": "Residential Lockout",
  "VL": "Vehicle Lockout",
  "CP": "Community Paramedicine",
  "IFT": "Interfacility Transfer",
  "ME": "Medical Emergency",
  "MCI": "Multi Casualty",
  "EQ": "Earthquake",
  "FLW": "Flood Warning",
  "TOW": "Tornado Warning",
  "TSW": "Tsunami Warning",
  "WX": "Weather Incident",
  "AR": "Animal Rescue",
  "CR": "Cliff Rescue",
  "CSR": "Confined Space Rescue",
  "ELR": "Elevator Rescue",
  "EER": "Elevator/Escalator Rescue",
  "IR": "Ice Rescue",
  "IA": "Industrial Accident",
  "RES": "Rescue",
  "RR": "Rope Rescue",
  "SC": "Structural Collapse",
  "TR": "Technical Rescue",
  "TNR": "Trench Rescue",
  "USAR": "Urban Search and Rescue",
  "VS": "Vessel Sinking",
  "WR": "Water Rescue",
  "TCP": "Collision Involving Pedestrian",
  "TCS": "Collision Involving Structure",
  "TCT": "Collision Involving Train",
  "TCE": "Expanded Traffic Collision",
  "RTE": "Railroad/Train Emergency",
  "TC": "Traffic Collision",
  "PLE": "Powerline Emergency",
  "WA": "Wires Arching",
  "WD": "Wires Down",
  "WDA": "Wires Down/Arcing",
  "BP": "Burn Permit",
  "CA": "Community Activity",
  "FW": "Fire Watch",
  "MC": "Move-up/Cover",
  "NO": "Notification",
  "STBY": "Standby",
  "TEST": "Test",
  "TRNG": "Training",
  "NEWS": "News",
  "CERT": "CERT",
  "DISASTER": "Disaster",
  "UNK": "Unknown Call Type"
};
var STATUS = {
  "DP": "Dispatched",
  "AK": "Acknowledged",
  "ER": "Enroute",
  "SG": "Staged",
  "OS": "On Scene",
  "AE": "Available On Scene",
  "TR": "Transport",
  "TA": "Transport Arrived",
  "AR": "Cleared From Incident"
};

// src/bootstrap.ts
var packages = {
  fs,
  path,
  events,
  jobs,
  axios,
  crypto,
  os
};
var cache = {
  stations: [],
  active: [],
  events: new events.EventEmitter(),
  lastWarn: null,
  isReady: true
};
var settings = {
  key: null,
  interval: 15,
  filtering: {
    events: [],
    agencies: []
  },
  journal: true
};
var definitions = {
  events: EVENTS,
  status: STATUS,
  messages: {
    not_ready: `AtmosphericX PulsePoint client is not ready. This may be due to failed initialization.`,
    client_stopped: `AtmosphericX PulsePoint client has been stopped.`
  }
};

// src/utils.ts
var Utils = class {
  /**
   * @function sleep
   * @description
   *     Pauses execution for a specified number of milliseconds.
   *
   * @static
   * @async
   * @param {number} ms
   * @returns {Promise<void>}
   */
  static sleep(ms) {
    return __async(this, null, function* () {
      return new Promise((resolve) => setTimeout(resolve, ms));
    });
  }
  /**
  * @function warn
  * @description
  *     Emits a log event and prints a warning to the console. Throttles repeated
  *     warnings within a short interval unless `force` is `true`.
  *
  * @static
  * @param {string} message
  * @param {boolean} [force=false]
  */
  static warn(message, force = false) {
    cache.events.emit("log", message);
    if (!settings.journal) return;
    if (cache.lastWarn != null && Date.now() - cache.lastWarn < 500 && !force) return;
    cache.lastWarn = Date.now();
    console.warn(`\x1B[33m[ATMOSX-PULSEPOINT]\x1B[0m [${(/* @__PURE__ */ new Date()).toLocaleString()}] ${message}`);
  }
  /**
   * @function createHttpRequest
   * @description
   *     Performs an HTTP GET request with default headers and timeout, returning
   *     either the response data or an error message.
   *
   * @static
   * @template T
   * @param {string} url
   * @param {types.HTTPSettings} [options]
   * @returns {Promise<{ error: boolean; message: T | string }>}
   */
  static createHttpRequest(url, options) {
    return __async(this, null, function* () {
      var _a;
      const defaultOptions = {
        timeout: 1e4,
        headers: {
          "User-Agent": "AtmosphericX",
          "Accept": "application/geo+json, text/plain, */*; q=0.9",
          "Accept-Language": "en-US,en;q=0.9"
        }
      };
      const requestOptions = __spreadProps(__spreadValues(__spreadValues({}, defaultOptions), options), {
        headers: __spreadValues(__spreadValues({}, defaultOptions.headers), (_a = options == null ? void 0 : options.headers) != null ? _a : {})
      });
      try {
        const resp = yield packages.axios.get(url, {
          headers: requestOptions.headers,
          timeout: requestOptions.timeout,
          maxRedirects: 0,
          validateStatus: (status) => status === 200 || status === 500
        });
        return { error: false, message: resp.data };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return { error: true, message: msg };
      }
    });
  }
  /**
   * @function mergeClientSettings
   * @description
   *     Recursively merges a ClientSettings object into a target object,
   *     preserving nested structures and overriding existing values.
   *
   * @static
   * @param {Record<string, unknown>} target
   * @param {types.ClientSettingsTypes} settings
   * @returns {Record<string, unknown>}
   */
  static mergeClientSettings(target, settings2) {
    for (const key in settings2) {
      if (!Object.prototype.hasOwnProperty.call(settings2, key)) continue;
      const value = settings2[key];
      if (value && typeof value === "object" && !Array.isArray(value)) {
        if (!target[key] || typeof target[key] !== "object" || Array.isArray(target[key])) {
          target[key] = {};
        }
        this.mergeClientSettings(target[key], value);
      } else {
        target[key] = value;
      }
    }
    return target;
  }
};
var utils_default = Utils;

// src/decrypt.ts
var Decrypt = class {
  /**
   * @function CtIvS
   * @description
   *    Decrypts data encrypted with AES using Cipher Text, IV, and Salt.
   * 
   * @static
   * @param {Record<string, string>} item
   * @param {string} key
   * @returns {any}
   */
  static CtIvS(item, key) {
    const CryptoJS = packages.crypto;
    const cipherParams = CryptoJS.lib.CipherParams.create({
      ciphertext: CryptoJS.enc.Base64.parse(item.ct),
      iv: CryptoJS.enc.Hex.parse(item.iv),
      salt: CryptoJS.enc.Hex.parse(item.s)
    });
    const decrypted = CryptoJS.AES.decrypt(cipherParams, key, {
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });
    const plaintext = decrypted.toString(CryptoJS.enc.Utf8);
    return JSON.parse(JSON.parse(plaintext));
  }
  /**
   * @function findObjects
   * @description
   *    Recursively searches an object for all nested objects containing
   *    the keys 'ct', 'iv', and 's'.
   * @static
   * @param {any} obj
   * @returns {any[]}
   */
  static findObjects(obj) {
    const found = [];
    function walk(x) {
      if (!x || typeof x !== "object") return;
      if ("ct" in x && "iv" in x && "s" in x) {
        found.push(x);
        return;
      }
      if (Array.isArray(x)) {
        x.forEach(walk);
      } else {
        Object.values(x).forEach(walk);
      }
    }
    walk(obj);
    return found;
  }
};
var decrypt_default = Decrypt;

// src/index.ts
var PulsePoint = class {
  constructor(metadata) {
    this.start(metadata);
  }
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
  setSettings(settings2) {
    return __async(this, null, function* () {
      utils_default.mergeClientSettings(settings, settings2);
    });
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
  on(event, callback) {
    cache.events.on(event, callback);
    return () => cache.events.off(event, callback);
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
  start(metadata) {
    return __async(this, null, function* () {
      if (!cache.isReady) {
        utils_default.warn(definitions.messages.not_ready);
        return;
      }
      this.setSettings(metadata);
      const settings2 = settings;
      const interval = settings2.interval || 15;
      if (this.job) {
        this.job.stop();
      }
      yield this.getEvents(settings2.filtering.agencies || [], settings.key || "");
      this.job = new packages.jobs.Cron(`*/${interval} * * * * *`, () => __async(this, null, function* () {
        yield this.getEvents(settings2.filtering.agencies || [], settings.key || "");
      }));
    });
  }
  /**
   * @function stop
   * @description
   *     Stops active scheduled tasks (cron job)
   *
   * @async
   * @returns {Promise<void>}
   */
  stop() {
    return __async(this, null, function* () {
      cache.isReady = true;
      if (this.job) {
        try {
          this.job.stop();
        } catch (e) {
        }
        this.job = null;
      }
      utils_default.warn(definitions.messages.client_stopped);
    });
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
  getEvents(agencies, key) {
    return __async(this, null, function* () {
      var _a, _b, _c, _d;
      const data = {};
      const urls = [
        `https://api.pulsepoint.org/v1/webapp?resource=agencies&agencyid=${agencies.join(",")}`,
        `https://api.pulsepoint.org/v1/webapp?resource=incidents&agencyid=${agencies.join(",")}`
      ];
      for (const url of urls) {
        const response = yield utils_default.createHttpRequest(url);
        if (response.error) {
          utils_default.warn(`Failed to fetch agencies list: ${response.message}`);
          continue;
        }
        data[url.includes("agencies") ? "agencies" : "incidents"] = response.message || {};
      }
      const encryptedItems = decrypt_default.findObjects(data);
      const decryptedItems = encryptedItems.map((item) => decrypt_default.CtIvS(item, key));
      const incidentsObj = decryptedItems.find((d) => d.incidents);
      const dAgencies = ((_a = decryptedItems[0]) == null ? void 0 : _a.agencies) || [];
      const dActive = ((_b = incidentsObj == null ? void 0 : incidentsObj.incidents) == null ? void 0 : _b.active) || [];
      const oldStations = cache.stations || [];
      cache.stations = dAgencies;
      if (JSON.stringify(oldStations) !== JSON.stringify(dAgencies)) {
        cache.events.emit("onStationUpdate", dAgencies, oldStations);
        utils_default.warn(`Station list updated`, true);
      }
      const newIncidents = dActive.map((item) => {
        var _a2;
        const agency = cache.stations.find((a) => a.agencyid === item.AgencyID);
        const latitude = item.Latitude === "0.0000000000" ? null : item.Latitude;
        const longitude = item.Longitude === "0.0000000000" ? null : item.Longitude;
        return {
          ID: item.ID,
          agency: (agency == null ? void 0 : agency.short_agencyname) || "Unknown Agency",
          stream: (agency == null ? void 0 : agency.livestreamurl) || null,
          latitude,
          longitude,
          address: (_a2 = item.FullDisplayAddress) != null ? _a2 : "Not Specified",
          type: definitions.events[item.PulsePointIncidentCallType] || "Unknown",
          received: item.CallReceivedDateTime ? new Date(item.CallReceivedDateTime).toLocaleString() : null,
          closed: item.ClosedDateTime ? new Date(item.ClosedDateTime).toLocaleString() : false,
          units: Array.isArray(item.Unit) ? item.Unit.map((u) => ({
            id: u.UnitID,
            status: definitions.status[u.PulsePointDispatchStatus] || "Unknown",
            closed: u.UnitClearedDateTime ? new Date(u.UnitClearedDateTime).toLocaleString() : null
          })) : []
        };
      });
      const filteredIncidents = ((_d = (_c = settings.filtering) == null ? void 0 : _c.events) == null ? void 0 : _d.length) ? newIncidents.filter((incident) => settings.filtering.events.some((e) => e.toLowerCase() === incident.type.toLowerCase())) : newIncidents;
      const oldIncMap = new Map((cache.active || []).map((i) => [i.ID, i]));
      for (const incident of filteredIncidents) {
        const oldIncident = oldIncMap.get(incident.ID);
        if (!oldIncident || JSON.stringify(oldIncident) !== JSON.stringify(incident)) {
          cache.events.emit("onIncidentUpdate", incident);
        }
      }
      cache.active = newIncidents;
    });
  }
};
var index_default = PulsePoint;
export {
  PulsePoint,
  index_default as default
};
