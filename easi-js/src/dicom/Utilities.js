//
// Utilities.js - 1.0.0
//
// DICOM Utilities Class 
//
// Proprietary Notices:
// The Products, Documentation and Materials are proprietary to Xinonix Interactive Development Inc. and its licensors 
// and protected by applicable U.S. and international patent, copyright, trademark and trade secret laws. Xinonix 
// Interactive Development Inc and its licensors shall retain ownership in the Products, Documentation and Materials; 
// all derivatives thereof (in whole or part); and any intellectual property or other rights embodied therein. 
// 
// All proprietary notices incorporated in or affixed to any Products, Documentation or Materials shall be duplicated 
// by you on all copies of the Products, Documentation, or Material, as applicable, and shall not be altered, removed 
// or obliterated. Lease Equipment is, and shall at all times be and remain Our sole and exclusive property; you have 
// no right, title or interest therein or thereto except as expressly set forth in this Agreement. You shall keep the 
// Lease Equipment free and clear of all levies, liens and encumbrances and shall immediately notify us in writing of 
// any circumstances with respect to the location of the Equipment which will adversely affect it or our security 
// interests therein. You shall not install, attach, mount or otherwise house the Lease Equipment in a manner that 
// would render it a fixture under applicable law within the jurisdiction in which the Lease Equipment is located.
//

import Runtime from "../environment/Runtime.js";

export default class Utilities {

    /**
     * Constants for item indicators
     */
    static littleEndianItem = [254, 255, 0, 224];
    static bigEndianItem = [255, 254, 224, 0];

    /**
     * Constants for end sequence indicators
     */
    static littleEndianEndSequence = [254, 255, 221, 224, 0, 0, 0, 0];
    static bigEndianEndSequence = [255, 254, 224, 221, 0, 0, 0, 0];
    static uidCounter = 0;

    /**
     * Convert the specified byte array (2 or 4 bytes) to an unsigned integer value.
     * @param {Uint8Array} bytes The specified byte array.
     * @returns The unsigned integer value of the byte array.
     */
    static bytesToUnsignedInteger(bytes) {
        var dv = new DataView(bytes.buffer);
        if (bytes.length == 2)
            return dv.getUint16(bytes.byteOffset, Runtime.isLittleEndian);
        else if (bytes.length == 4)
            return dv.getUint32(bytes.byteOffset, Runtime.isLittleEndian);
        return undefined;
    }

    /**
     * Convert the specified byte array to a string representation.
     * @param {Uint8Array} bytes The specifide byte array. 
     * @returns The string value of the byte array.
     */
    static bytesToString(bytes) {
        return String.fromCharCode.apply(null, bytes);
    }

    /**
     * Swap bytes in the array for when differences in the endian-ness of the runtime requires data adjustment.
     * @param {Uint8Array} buf The buffer of data bytes
     */
    static swapBytes(buf) {

        // Create a new array for the swapped bytes
        var bytes = new Uint8Array(buf);
        var len = bytes.length;
        var holder;

        // Swap the bytes
        for (var i = 0; i < len; i += 2) {
            holder = bytes[i];
            bytes[i] = bytes[i + 1];
            bytes[i + 1] = holder;
        }

        return bytes;
        
    }

    /**
     * Performs a "deep" compy of the specified array.
     * @param {Array<unknown>} arr The specified array.
     * @returns The "deep" copy of the specified array.
     */
    static deepCopyArray(arr) {
        return JSON.parse(JSON.stringify(arr));
    }

    /**
     * Get the byte buffer containing the DICOM Item.
     * @returns The Item byte buffer.
     */
    static getItem() {
        if (Runtime.isLittleEndian == true) {
            return Utilities.littleEndianItem;
        }
        return Utilities.bigEndianItem;
    }

    /**
     * Get the byte buffer containing the DICOM End Sequence.
     * @returns The End Sequence byte buffer.
     */    
    static getEndSequence() {
        if (Runtime.isLittleEndian == true) {
            return Utilities.littleEndianEndSequence;
        }
        return Utilities.bigEndianEndSequence;
    }

    /**
     * Parses the specified DA date string value to a Date instance.
     * @param {string} value The specified date value in the DA format YYYYMMDD. 
     * @returns The value parsed to a Date.
     */
    static parseDA(value) {
        
        // First, check the params
        if ((value == null) || (value.trim() == '')) {
            return null;
        }

        // Parse the parts
        const year = parseInt(value.slice(0, 4), 10);
        const month = parseInt(value.slice(4, 6), 10) - 1; // Subtract 1 for zero-based months
        const day = parseInt(value.slice(6, 8), 10);
      
        // Return the date
        return new Date(year, month, day);

    }
    
    /**
     * Parses the specified DT date string value to a Date instance.
     * @param {string} value The specified date value in the DT format YYYYMMDDHHMMSS.FFFFFF&ZZXX. 
     * @returns The value parsed to a Date.
     */
    static parseDT(value) {

        // First, check the params
        if ((value == null) || (value.trim() == '')) {
            return null;
        }

        // Parse the parts
        const year = value.slice(0, 4);
        const month = value.slice(4, 6);
        const day = value.slice(6, 8);
        const hours = value.slice(8, 10);
        const minutes = value.slice(10, 12);
        const seconds = value.slice(12, 14);
        const milliseconds = value.slice(15, 21); // Keep only the first 3 digits for JavaScript Date object
        const tzSign = value.slice(21, 22);
        const tzHours = value.slice(22, 24);
        const tzMinutes = value.slice(24, 26);
      
        // Convert the timezone offset to the format ±HH:mm
        const timezoneOffset = `${tzSign}${tzHours}:${tzMinutes}`;
      
        // Combine the date, time, and timezone components into an ISO 8601-compliant string
        const iso8601DateStr = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}${timezoneOffset}`;
      
        // Parse the ISO 8601 string into a JavaScript Date object
        return new Date(iso8601DateStr);

    }  

    /**
     * Parses the specified TM date string value to a Date instance.
     * @param {string} value The specified date value in the TM format HHMMSS.FFFFFF. 
     * @returns The value parsed to a Date.
     */
    static parseTM(value) {

        // First, check the params
        if ((value == null) || (value.trim() == '')) {
            return null;
        }

        const currentDate = new Date();
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const day = currentDate.getDate();
      
        const hours = parseInt(value.slice(0, 2), 10);
        const minutes = parseInt(value.slice(2, 4), 10);
        const seconds = parseInt(value.slice(4, 6), 10);
        const milliseconds = parseInt(value.slice(7, 10), 10); // Keep only the first 3 digits for JavaScript Date object
      
        return new Date(year, month, day, hours, minutes, seconds, milliseconds);

    }

    /**
     * Create a deterministic UID from a string seed.
     * @param {string} seed The source seed.
     * @returns {string} The replacement UID.
     */
    static createDeterministicUID(seed) {

        var hashA = 2166136261;
        var hashB = 2166136261;
        var text = (seed == null) ? '' : String(seed);

        for (var i = 0; i < text.length; i++) {

            var code = text.charCodeAt(i);
            hashA ^= code;
            hashA = Math.imul(hashA, 16777619);

            hashB ^= (code * 31);
            hashB = Math.imul(hashB, 2246822519);

        }

        var partA = (hashA >>> 0).toString();
        var partB = (hashB >>> 0).toString();
        var uid = ('2.25.' + partA + partB);
        if (uid.length > 64) {
            uid = uid.substring(0, 64);
        }

        return uid;

    }

    /**
     * Create a new random UID in the DICOM-compatible 2.25 OID space.
     * @returns {string} The new UID value.
     */
    static newUID() {

        // Use 128 random bits and map them to the 2.25.<decimal-uuid> space.
        var bytes = new Uint8Array(16);
        var hasCrypto = (
            (typeof globalThis !== 'undefined')
            && (globalThis.crypto != null)
            && (typeof globalThis.crypto.getRandomValues === 'function')
        );

        if (hasCrypto) {
            globalThis.crypto.getRandomValues(bytes);
        }
        else {
            for (var i = 0; i < bytes.length; i++) {
                bytes[i] = Math.floor(Math.random() * 256);
            }
        }

        // Mark the 16 bytes as a UUID v4 style value before OID conversion.
        bytes[6] = (bytes[6] & 0x0F) | 0x40;
        bytes[8] = (bytes[8] & 0x3F) | 0x80;

        // Fallback for runtimes without BigInt support.
        if (typeof BigInt !== 'function') {
            Utilities.uidCounter++;
            return Utilities.createDeterministicUID(
                Date.now().toString() + '|' + Utilities.uidCounter.toString() + '|' + Math.random().toString()
            );
        }

        var value = 0n;
        for (var index = 0; index < bytes.length; index++) {
            value = (value << 8n) | BigInt(bytes[index]);
        }

        return '2.25.' + value.toString(10);

    }

    constructor() {
    }

};
