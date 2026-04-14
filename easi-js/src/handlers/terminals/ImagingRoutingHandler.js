//
// ImagingRoutingHandler.js
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

export default class ImagingRoutingHandler {

    onReset() {
    }

    onStart(context) {
        return context;
    }

    onData(context) {
    }

    /**
     * Resolve one branch pipeline from detected kind.
     * @param {"dicom" | "image" | "unknown"} kind Detected kind.
     * @returns {object | null} Branch pipeline.
     */
    resolveBranchPipeline(kind) {

        if (kind == "dicom") {
            return this.dicomPipeline ?? this.otherwisePipeline;
        }

        if (kind == "image") {
            return this.imagePipeline ?? this.otherwisePipeline;
        }

        return this.otherwisePipeline;

    }

    /**
     * Resolve branch source options passed into branch pipeline process call.
     * @param {"dicom" | "image" | "unknown"} kind Detected kind.
     * @param {object} payload Parser payload.
     * @returns {object | null} Branch source options.
     */
    resolveBranchSourceOptions(kind, payload) {

        var contentType = payload?.contentType ?? null;
        var parsed = ImagingDataUtils.parseContentType(contentType);

        if ((kind == "image") && (parsed?.mediaType == null)) {
            var imageFormat = payload?.imageFormat ?? ImagingDataUtils.detectImageFormat(payload?.bytes ?? null, contentType);
            var imageMediaType = ImagingDataUtils.resolveImageMediaType(imageFormat);

            if (imageMediaType != null) {
                parsed = ImagingDataUtils.buildContentType(imageMediaType, payload?.sourcePath ?? null, parsed?.fileName ?? null);
            }
        }

        return {
            contentType: parsed
        };

    }

    /**
     * Route one parsed payload into the matching branch pipeline.
     * @param {object | null} _context The current parser context.
     * @param {object} payload Parsed payload.
     * @returns {Promise<object>} Routed result envelope.
     */
    async onEnd(_context, payload) {

        var bytes = payload?.bytes ?? null;
        var contentType = payload?.contentType ?? null;
        var kind = payload?.kind ?? ImagingDataUtils.detectImagingKind(bytes, contentType);
        var imageFormat = payload?.imageFormat ?? ImagingDataUtils.detectImageFormat(bytes, contentType);

        var branchPipeline = this.resolveBranchPipeline(kind);
        if (branchPipeline == null) {

            if (this.unknownMode == "fail") {
                throw new Exception(
                    `No route configured for detected imaging kind '${kind}'.`,
                    GeneralErrorCodes.InvalidData
                );
            }

            return {
                route: kind,
                kind: kind,
                sourcePath: payload?.sourcePath ?? ImagingDataUtils.resolveSourcePath(contentType),
                mediaType: ImagingDataUtils.resolveMediaType(contentType),
                imageFormat: imageFormat,
                skipped: true,
                output: null
            };

        }

        var branchResultCollection = await branchPipeline.process(bytes, null, {
            sourceOptions: this.resolveBranchSourceOptions(kind, payload)
        });

        var branchFirst = ((branchResultCollection != null) && (typeof branchResultCollection.first === "function"))
            ? branchResultCollection.first()
            : branchResultCollection;

        return {
            route: kind,
            kind: kind,
            sourcePath: payload?.sourcePath ?? ImagingDataUtils.resolveSourcePath(contentType),
            mediaType: ImagingDataUtils.resolveMediaType(contentType),
            imageFormat: imageFormat,
            skipped: false,
            output: branchFirst,
            resultCollection: branchResultCollection
        };

    }

    onError() {
    }

    onProgress() {
    }

    /**
     * Create one imaging routing handler.
     * @param {{ dicomPipeline?: object | null, imagePipeline?: object | null, otherwisePipeline?: object | null, unknownMode?: "skip" | "fail" } | null} routes Routing config.
     */
    constructor(routes = null) {

        this.dicomPipeline = routes?.dicomPipeline ?? null;
        this.imagePipeline = routes?.imagePipeline ?? null;
        this.otherwisePipeline = routes?.otherwisePipeline ?? null;

        var unknownMode = String(routes?.unknownMode ?? "skip").toLowerCase().trim();
        this.unknownMode = ((unknownMode == "fail") ? "fail" : "skip");

    }

}
