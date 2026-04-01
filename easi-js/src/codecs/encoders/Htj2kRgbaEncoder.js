//
// Htj2kRgbaEncoder.js
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
