//
// MixedImagingDataParser.js
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

import ByteDataParser from "./ByteDataParser.js";
import ImagingDataUtils from "../utils/ImagingDataUtils.js";

export default class MixedImagingDataParser extends ByteDataParser {

    /**
     * Finalize one mixed-imaging parse transaction.
     * @returns {Promise<*>} The handler end result.
     */
    async finalize() {

        var bytes = new Uint8Array(0);
        if ((this.data != null) && (this.data.length() > 0)) {
            bytes = this.data.consume(this.data.length());
        }

        var imageFormat = ImagingDataUtils.detectImageFormat(bytes, this.contentType);
        var kind = ImagingDataUtils.detectImagingKind(bytes, this.contentType);

        return super.fireStreamEvent("onEnd", {
            bytes: bytes,
            contentType: this.contentType,
            sourceFormat: "mixed-imaging",
            imageFormat: imageFormat,
            kind: kind,
            sourcePath: ImagingDataUtils.resolveSourcePath(this.contentType)
        }, this.status);

    }

    /**
     * Create one mixed-imaging parser.
     */
    constructor() {
        super();
    }

}
