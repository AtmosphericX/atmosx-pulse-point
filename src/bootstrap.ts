/*
                                            _               _     __   __
         /\  | |                           | |             (_)    \ \ / /
        /  \ | |_ _ __ ___   ___  ___ _ __ | |__   ___ _ __ _  ___ \ V / 
       / /\ \| __| '_ ` _ \ / _ \/ __| '_ \| '_ \ / _ \ '__| |/ __| > <  
      / ____ \ |_| | | | | | (_) \__ \ |_) | | | |  __/ |  | | (__ / . \ 
     /_/    \_\__|_| |_| |_|\___/|___/ .__/|_| |_|\___|_|  |_|\___/_/ \_\
                                     | |                                 
                                     |_|                                                                                                                
    
    Written by: k3yomi@GitHub                        
*/


import * as fs from 'fs';
import * as path from 'path';
import * as events from 'events';
import * as jobs from 'croner';
import axios from 'axios';
import crypto from 'crypto-js';
import os from 'os';

import * as dictEvents from './dictionaries/events';

export const packages = {
    fs, 
    path, 
    events, 
    jobs, 
    axios, 
    crypto, 
    os, 
};

export const cache = {
    stations: [],
    active: [],
    events: new events.EventEmitter(),
    lastWarn: null,
    isReady: true,
};

export const settings = { 
    key: null,
    interval: 15,
    agencies: [],
    journal: true,
};

export const definitions = {
    events: dictEvents.EVENTS,
    status: dictEvents.STATUS,
    messages: {
        not_ready: `AtmosphericX PulsePoint client is not ready. This may be due to failed initialization.`,
        client_stopped: `AtmosphericX PulsePoint client has been stopped.`
    },
};