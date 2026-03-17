//
// Htj2kDecoder.js - 1.0.0
//
// HTJ2K Decoder Class
//

import Jpeg2000Decoder from "./Jpeg2000Decoder.js";

export default class Htj2kDecoder extends Jpeg2000Decoder {

    /**
     * Construct an HTJ2K decoder instance.
     * This implementation reuses the JPEG 2000 runtime decoder surface.
     */
    constructor(options = null) {
        super(options);
    }

};
