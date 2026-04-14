//
// ImagingNormalizationBuilder.js
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

import Exception, { GeneralErrorCodes } from "../environment/Exception.js";

export default class ImagingNormalizationBuilder {

    /**
     * Create a new normalization builder.
     * @returns {ImagingNormalizationBuilder} A new builder instance.
     */
    static builder() {
        return new ImagingNormalizationBuilder();
    }

    /**
     * Normalize one mode alias.
     * @param {string | null} mode The source mode alias.
     * @returns {"frames" | "dicom" | null} The normalized mode.
     */
    static normalizeMode(mode = null) {

        var normalized = String(mode ?? "").trim().toLowerCase();
        if ((normalized == "frame")
            || (normalized == "frames")
            || (normalized == "image")
            || (normalized == "images")) {
            return "frames";
        }

        if ((normalized == "dicom") || (normalized == "instance")) {
            return "dicom";
        }

        return null;

    }

    /**
     * Configure normalization to a frame representation.
     * @param {object | null} options Frame-normalization options.
     * @returns {ImagingNormalizationBuilder} Current builder.
     */
    toFrames(options = null) {
        this.definition = Object.assign({ mode: "frames" }, options ?? {});
        return this;
    }

    /**
     * Configure normalization to native DICOM instances.
     * @param {object | null} options DICOM-normalization options.
     * @returns {ImagingNormalizationBuilder} Current builder.
     */
    toDicom(options = null) {
        this.definition = Object.assign({ mode: "dicom" }, options ?? {});
        return this;
    }

    /**
     * Build one immutable normalization definition.
     * @returns {object} The built normalization definition.
     */
    build() {

        if (this.definition == null) {
            throw new Exception(
                "Normalization definition is missing. Call toFrames(...) or toDicom(...).",
                GeneralErrorCodes.InvalidParameter
            );
        }

        var normalizedMode = ImagingNormalizationBuilder.normalizeMode(this.definition.mode);
        if (normalizedMode == null) {
            throw new Exception(
                "Invalid normalization mode. Use toFrames(...) or toDicom(...).",
                GeneralErrorCodes.InvalidParameter
            );
        }

        return Object.freeze(Object.assign({}, this.definition, {
            mode: normalizedMode
        }));

    }

    /**
     * Resolve one public normalization definition to immutable config.
     * @param {ImagingNormalizationBuilder | Function | object | null} definition The normalization definition.
     * @returns {object} The resolved normalization config.
     */
    static resolve(definition = null) {

        if (definition instanceof ImagingNormalizationBuilder) {
            return definition.build();
        }

        if (typeof definition == "function") {

            var builder = new ImagingNormalizationBuilder();
            var configured = definition(builder);

            if (configured instanceof ImagingNormalizationBuilder) {
                return configured.build();
            }

            return builder.build();

        }

        if ((definition != null) && (typeof definition == "object")) {

            var mode = ImagingNormalizationBuilder.normalizeMode(definition.mode ?? definition.target ?? null);
            if (mode == null) {
                throw new Exception(
                    "Invalid normalization definition. Expected mode/target of 'frames' or 'dicom'.",
                    GeneralErrorCodes.InvalidParameter
                );
            }

            return Object.freeze(Object.assign({}, definition, {
                mode: mode
            }));

        }

        throw new Exception(
            "Invalid normalization definition. Expected function, ImagingNormalizationBuilder, or object.",
            GeneralErrorCodes.InvalidParameter
        );

    }

    /**
     * Construct one normalization builder.
     */
    constructor() {
        this.definition = null;
    }

}
