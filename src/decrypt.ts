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

export class Decrypt { 

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
    public static CtIvS(item: Record<string, string>, key: string) {
        const CryptoJS = loader.packages.crypto;
        const cipherParams = CryptoJS.lib.CipherParams.create({
            ciphertext: CryptoJS.enc.Base64.parse(item.ct),
            iv: CryptoJS.enc.Hex.parse(item.iv),
            salt: CryptoJS.enc.Hex.parse(item.s),
        });
        const decrypted = CryptoJS.AES.decrypt(cipherParams, key, {
            mode: CryptoJS.mode.CBC,
            padding: CryptoJS.pad.Pkcs7,
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
    public static findObjects(obj: any) {
        const found = [];
        function walk(x) {
            if (!x || typeof x !== 'object') return;
            if ('ct' in x && 'iv' in x && 's' in x) { found.push(x); return; }
            if (Array.isArray(x)) { x.forEach(walk); } else { Object.values(x).forEach(walk); }
        }
        walk(obj);
        return found;
    }
}

export default Decrypt;