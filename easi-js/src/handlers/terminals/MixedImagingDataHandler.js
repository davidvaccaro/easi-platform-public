//
// MixedImagingDataHandler.js
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

import Exception from "../../environment/Exception.js";
import { GeneralErrorCodes } from "../../environment/Exception.js";
import ImagingDataUtils from "../../utils/ImagingDataUtils.js";

export default class MixedImagingDataHandler {

    onReset() {
    }

    onStart(context) {
        return context;
    }

    onData(context) {
    }

    /**
     * Complete one mixed-imaging parse transaction.
     * @param {object | null} _context The current parser context.
     * @param {object} payload Parsed parser payload.
     * @returns {object} Normalized mixed-imaging payload.
     */
    onEnd(_context, payload) {

        var bytes = payload?.bytes ?? null;
        var contentType = payload?.contentType ?? null;
        var kind = payload?.kind ?? ImagingDataUtils.detectImagingKind(bytes, contentType);
        var imageFormat = payload?.imageFormat ?? ImagingDataUtils.detectImageFormat(bytes, contentType);

        if ((kind == "unknown") && (this.failOnUnknown == true)) {
            throw new Exception(
                "Failed parsing mixed imaging data. Could not determine DICOM or standard image format.",
                GeneralErrorCodes.InvalidData
            );
        }

        var mediaType = ImagingDataUtils.resolveMediaType(contentType)
            ?? ImagingDataUtils.resolveImageMediaType(imageFormat)
            ?? null;

        var result = {
            kind: kind,
            imageFormat: imageFormat,
            mediaType: mediaType,
            bytes: bytes,
            sourcePath: payload?.sourcePath ?? ImagingDataUtils.resolveSourcePath(contentType),
            contentType: ImagingDataUtils.parseContentType(contentType)
        };

        if (payload?.normalizedMode != null)
            result.normalizedMode = payload.normalizedMode;
        if (payload?.normalizedFrom != null)
            result.normalizedFrom = payload.normalizedFrom;
        if (payload?.width != null)
            result.width = payload.width;
        if (payload?.height != null)
            result.height = payload.height;
        if (payload?.frameIndex != null)
            result.frameIndex = payload.frameIndex;
        if (payload?.frameCount != null)
            result.frameCount = payload.frameCount;
        if (payload?.frame != null)
            result.frame = payload.frame;
        if (payload?.rgba instanceof Uint8Array)
            result.rgba = payload.rgba;

        return result;

    }

    onError() {
    }

    onProgress() {
    }

    /**
     * Create one mixed-imaging data handler.
     * @param {{ failOnUnknown?: boolean } | null} options Handler options.
     */
    constructor(options = null) {
        this.failOnUnknown = (options?.failOnUnknown === true);
    }

}
