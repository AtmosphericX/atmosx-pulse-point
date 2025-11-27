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

// ----------- Settings ----------- //

// --- Exports --- //
export interface ClientSettingsTypes {
    key?: string | null;
    filtering?: { 
        events?: string[];
        agencies?: string[];
    };
    interval?: number;
    journal?: boolean;
}

export type Coordinates = { 
    lon: number; 
    lat: number;
}

export type HTTPSettings = { 
    timeout?: number;
    headers?: Record<string, string>;
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    body?: string;
}