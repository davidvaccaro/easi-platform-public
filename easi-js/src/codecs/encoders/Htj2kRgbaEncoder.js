//
// Htj2kRgbaEncoder.js - 1.0.0
//
// HTJ2K RGBA Encoder Class
//

import Jpeg2000RgbaEncoder from "./Jpeg2000RgbaEncoder.js";

export default class Htj2kRgbaEncoder extends Jpeg2000RgbaEncoder {

    /**
     * Encode RGBA bytes to HTJ2K-family bytes.
     * @param {Uint8Array} rgba RGBA bytes.
     * @param {number} width Frame width.
     * @param {number} height Frame height.
     * @param {object | null} options Encode options.
     * @returns {Promise<{ bytes: Uint8Array, mimeType: string, format: string }>} Encoded payload.
     */
    async encode(rgba, width, height, options = null) {
        return await super.encode(rgba, width, height, Object.assign({}, options ?? {}, { htj2k: true }));
    }

    /**
     * Encode native monochrome source frame bytes to HTJ2K-family bytes.
     * @param {ArrayBufferView} sourceBytes Monochrome source frame bytes.
     * @param {number} width Frame width.
     * @param {number} height Frame height.
     * @param {object | null} options Encode options.
     * @returns {Promise<{ bytes: Uint8Array, mimeType: string, format: string }>} Encoded output.
     */
    async encodeMonochromeSamples(sourceBytes, width, height, options = null) {
        return await super.encodeMonochromeSamples(sourceBytes, width, height, Object.assign({}, options ?? {}, { htj2k: true }));
    }

    /**
     * Construct an HTJ2K encoder instance.
     * @param {{ backend?: Function | object | null, openjpegFactory?: Function | object | null, openjpegModule?: object | null } | null} options Encoder options.
     */
    constructor(options = null) {
        super(options);
    }

};
