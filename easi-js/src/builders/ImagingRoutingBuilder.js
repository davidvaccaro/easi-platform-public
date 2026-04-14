//
// ImagingRoutingBuilder.js
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

import Exception from "../environment/Exception.js";
import { GeneralErrorCodes } from "../environment/Exception.js";
import PipelineBuilder from "./PipelineBuilder.js";

export default class ImagingRoutingBuilder {

    /**
     * Resolve one route branch to a built pipeline.
     * Supported branch definitions:
     * - Built pipeline (`{ process(...) }`)
     * - Output-stage/builder object (`{ build() }`)
     * - Configure callback receiving `PipelineBuilder().fromByteStream()` stage
     * @param {* } definition Route branch definition.
     * @param {string} routeName Route name.
     * @returns {object} Built pipeline.
     */
    resolveBranchPipeline(definition, routeName) {

        if ((definition != null) && (typeof definition.process === "function")) {
            return definition;
        }

        if ((definition != null) && (typeof definition.build === "function")) {
            var builtFromBuilder = definition.build();
            if ((builtFromBuilder != null) && (typeof builtFromBuilder.process === "function")) {
                return builtFromBuilder;
            }
        }

        if (typeof definition === "function") {

            var sourceStage = new PipelineBuilder().fromByteStream();
            var configured = definition(sourceStage);

            if (configured == null) {
                configured = sourceStage;
            }

            if ((configured != null) && (typeof configured.process === "function")) {
                return configured;
            }

            if ((configured != null) && (typeof configured.build === "function")) {
                var builtFromCallback = configured.build();
                if ((builtFromCallback != null) && (typeof builtFromCallback.process === "function")) {
                    return builtFromCallback;
                }
            }

        }

        throw new Exception(
            `Invalid ${routeName} route definition. Expected built pipeline, buildable stage, or configure callback.`,
            GeneralErrorCodes.InvalidParameter
        );

    }

    /**
     * Configure DICOM route branch.
     * @param {*} definition Route branch definition.
     * @returns {ImagingRoutingBuilder} Current routing builder.
     */
    whenDicom(definition) {
        this._dicomPipeline = this.resolveBranchPipeline(definition, "whenDicom");
        return this;
    }

    /**
     * Configure standard image route branch.
     * @param {*} definition Route branch definition.
     * @returns {ImagingRoutingBuilder} Current routing builder.
     */
    whenImage(definition) {
        this._imagePipeline = this.resolveBranchPipeline(definition, "whenImage");
        return this;
    }

    /**
     * Configure fallback route branch.
     * @param {*} definition Route branch definition.
     * @returns {ImagingRoutingBuilder} Current routing builder.
     */
    otherwise(definition) {
        this._otherwisePipeline = this.resolveBranchPipeline(definition, "otherwise");
        return this;
    }

    /**
     * Configure unknown-item routing behavior.
     * @param {"skip" | "fail"} mode Unknown mode.
     * @returns {ImagingRoutingBuilder} Current routing builder.
     */
    withUnknownMode(mode = "skip") {

        var normalized = String(mode || "skip").toLowerCase().trim();
        if ((normalized != "skip") && (normalized != "fail")) {
            throw new Exception(
                "Invalid unknown route mode. Expected 'skip' or 'fail'.",
                GeneralErrorCodes.InvalidParameter
            );
        }

        this._unknownMode = normalized;
        return this;

    }

    /**
     * Build immutable routing configuration.
     * @returns {{ dicomPipeline: object | null, imagePipeline: object | null, otherwisePipeline: object | null, unknownMode: "skip" | "fail" }} Routing config.
     */
    build() {
        return {
            dicomPipeline: this._dicomPipeline,
            imagePipeline: this._imagePipeline,
            otherwisePipeline: this._otherwisePipeline,
            unknownMode: this._unknownMode
        };
    }

    /**
     * Resolve one public routing definition to immutable routing config.
     * @param {ImagingRoutingBuilder | Function | object | null} definition Routing definition.
     * @returns {{ dicomPipeline: object | null, imagePipeline: object | null, otherwisePipeline: object | null, unknownMode: "skip" | "fail" }} Routing config.
     */
    static resolve(definition = null) {

        if (definition instanceof ImagingRoutingBuilder) {
            return definition.build();
        }

        if (typeof definition === "function") {

            var builder = new ImagingRoutingBuilder();
            var configured = definition(builder);

            if (configured instanceof ImagingRoutingBuilder) {
                return configured.build();
            }

            return builder.build();

        }

        if ((definition != null) && (typeof definition === "object")) {

            var builderFromObject = new ImagingRoutingBuilder();

            if (definition.dicom != null) {
                builderFromObject.whenDicom(definition.dicom);
            }

            if (definition.image != null) {
                builderFromObject.whenImage(definition.image);
            }

            if (definition.otherwise != null) {
                builderFromObject.otherwise(definition.otherwise);
            }

            if (definition.unknownMode != null) {
                builderFromObject.withUnknownMode(definition.unknownMode);
            }

            return builderFromObject.build();

        }

        throw new Exception(
            "Invalid routing definition. Expected function, ImagingRoutingBuilder, or object definition.",
            GeneralErrorCodes.InvalidParameter
        );

    }

    /**
     * Create one routing builder.
     */
    constructor() {
        this._dicomPipeline = null;
        this._imagePipeline = null;
        this._otherwisePipeline = null;
        this._unknownMode = "skip";
    }

}
