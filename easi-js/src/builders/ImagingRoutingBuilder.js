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
import Tag from "../dicom/Tag.js";
import PipelineBuilder from "./PipelineBuilder.js";

class RoutingStageBuilder {

    when(predicateOrAttribute, valueOrAction = null, action = undefined) {
        this.owner._usesGeneralRouting = true;
        var normalized = this.owner.normalizeWhenArguments(
            this.stagePath,
            predicateOrAttribute,
            valueOrAction,
            action
        );
        this.owner.addRule(this.stagePath, normalized.matcher, normalized.action);
        return this;
    }

    otherwise(action) {
        this.owner._usesGeneralRouting = true;
        this.owner.setOtherwise(
            this.stagePath,
            this.owner.normalizeAction(action, `${this.stagePath}.otherwise`)
        );
        return this;
    }

    constructor(owner, stagePath) {
        this.owner = owner;
        this.stagePath = stagePath;
    }

}

class RoutingOfStageBuilder {

    onImagingKind(definition) {
        this.owner.configureStage("of.imagingKind", definition, "onImagingKind");
        return this;
    }

    onDicomMeta(definition) {
        this.owner.configureStage("of.dicomMeta", definition, "onDicomMeta");
        return this;
    }

    onDicomData(definition) {
        this.owner.configureStage("of.dicomData", definition, "onDicomData");
        return this;
    }

    constructor(owner) {
        this.owner = owner;
    }

}

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

        if ((definition != null) && (typeof definition === "object")
            && (Object.prototype.hasOwnProperty.call(definition, "pipeline") == true)) {
            definition = definition.pipeline;
        }

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

    isTagReference(value) {
        if ((value != null) && (typeof value === "object") && (typeof value.ID === "string")) {
            return true;
        }

        if (typeof value === "string") {
            return (this.normalizeTagID(value) != null);
        }

        return false;
    }

    normalizeTagID(tagOrID) {

        if ((tagOrID != null) && (typeof tagOrID === "object") && (typeof tagOrID.ID === "string")) {
            return String(tagOrID.ID).trim().toUpperCase();
        }

        if (typeof tagOrID === "string") {

            var normalized = tagOrID.trim();
            if ((normalized.length == 8) && (/^[\da-fA-F]{8}$/.test(normalized) == true)) {
                return normalized.toUpperCase();
            }

            if ((normalized.indexOf("(") >= 0) || (normalized.indexOf(",") >= 0) || (normalized.indexOf(")") >= 0)) {
                normalized = normalized.replace(/[^\da-fA-F]/g, "");
                if (normalized.length == 8) {
                    return normalized.toUpperCase();
                }
            }

            if ((Tag[normalized] != null) && (typeof Tag[normalized].ID === "string")) {
                return Tag[normalized].ID;
            }

        }

        return null;

    }

    normalizeComparableValue(value) {

        if (value == null)
            return null;

        if ((value != null) && (typeof value === "object")) {

            if (typeof value.ID === "string")
                return value.ID;

            if (typeof value.id === "string")
                return value.id;

            if (typeof value.UID === "string")
                return value.UID;

            if (typeof value.uid === "string")
                return value.uid;

        }

        if ((typeof value === "string") || (typeof value === "number") || (typeof value === "boolean"))
            return value;

        return String(value);

    }

    normalizeComparableList(valueOrValues) {

        if (valueOrValues == null)
            return null;

        if (Array.isArray(valueOrValues) == true) {
            return valueOrValues.map((item) => this.normalizeComparableValue(item));
        }

        if (valueOrValues instanceof Set) {
            return Array.from(valueOrValues.values()).map((item) => this.normalizeComparableValue(item));
        }

        return [this.normalizeComparableValue(valueOrValues)];

    }

    normalizeMatcher(stagePath, predicateOrAttribute, expectedValues = null) {

        if (typeof predicateOrAttribute === "function") {
            return {
                kind: "predicate",
                predicate: predicateOrAttribute
            };
        }

        var tagID = this.normalizeTagID(predicateOrAttribute);
        if (tagID != null) {
            return {
                kind: "attribute",
                tagID: tagID,
                expectedValues: this.normalizeComparableList(expectedValues),
                hasExpectedValues: (expectedValues != null)
            };
        }

        if ((expectedValues != null) && (typeof predicateOrAttribute === "string")) {
            return {
                kind: "field",
                field: predicateOrAttribute,
                expectedValues: this.normalizeComparableList(expectedValues),
                hasExpectedValues: true
            };
        }

        return {
            kind: "value",
            expectedValues: this.normalizeComparableList(
                (expectedValues == null) ? predicateOrAttribute : expectedValues
            ),
            hasExpectedValues: true
        };

    }

    normalizeAction(definition, routeName) {

        if ((definition != null)
            && (typeof definition === "object")
            && (definition.kind == "noop")) {
            return {
                kind: "noop"
            };
        }

        if ((definition != null)
            && (typeof definition === "object")
            && (Array.isArray(definition) == false)
            && (Object.prototype.hasOwnProperty.call(definition, "pipeline") == true)) {
            return {
                kind: "pipeline",
                pipeline: this.resolveBranchPipeline(definition.pipeline, routeName)
            };
        }

        if ((definition != null)
            && ((typeof definition.process === "function")
                || (typeof definition.build === "function")
                || (typeof definition === "function"))) {
            return {
                kind: "pipeline",
                pipeline: this.resolveBranchPipeline(definition, routeName)
            };
        }

        return {
            kind: "label",
            value: definition
        };

    }

    isActionDefinition(value) {

        if (typeof value === "function")
            return true;

        if ((value == null) || (typeof value !== "object") || (Array.isArray(value) == true))
            return false;

        return (
            (typeof value.process === "function")
            || (typeof value.build === "function")
            || (Object.prototype.hasOwnProperty.call(value, "pipeline") == true)
            || (Object.prototype.hasOwnProperty.call(value, "label") == true)
            || (Object.prototype.hasOwnProperty.call(value, "labels") == true)
            || (Object.prototype.hasOwnProperty.call(value, "target") == true)
            || (Object.prototype.hasOwnProperty.call(value, "into") == true)
            || (Object.prototype.hasOwnProperty.call(value, "action") == true)
            || (Object.prototype.hasOwnProperty.call(value, "then") == true)
        );

    }

    normalizeWhenArguments(stagePath, predicateOrAttribute, valueOrAction = null, action = undefined) {

        var hasExplicitExpectedValues = (action !== undefined);
        var expectedValues = hasExplicitExpectedValues ? valueOrAction : null;
        var actionDefinition = hasExplicitExpectedValues ? action : valueOrAction;

        if (hasExplicitExpectedValues === false) {

            if (this.isTagReference(predicateOrAttribute) == true) {

                if (this.isActionDefinition(valueOrAction) == true) {
                    expectedValues = null;
                    actionDefinition = valueOrAction;
                }
                else {
                    expectedValues = valueOrAction;
                    actionDefinition = { kind: "noop" };
                }

            }

        }

        if (actionDefinition === undefined) {
            throw new Exception(
                `Invalid ${stagePath}.when(...) configuration. Missing action argument.`,
                GeneralErrorCodes.InvalidParameter
            );
        }

        return {
            matcher: this.normalizeMatcher(stagePath, predicateOrAttribute, expectedValues),
            action: this.normalizeAction(actionDefinition, `${stagePath}.when(...)`)
        };

    }

    resolveStage(stagePath) {

        var segments = String(stagePath || "").split(".");
        var current = this._stages;

        for (var i = 0; i < segments.length; i++) {
            current = (current != null) ? current[segments[i]] : null;
            if (current == null) {
                throw new Exception(
                    `Invalid route stage '${stagePath}'.`,
                    GeneralErrorCodes.InvalidParameter
                );
            }
        }

        return current;

    }

    addRule(stagePath, matcher, action) {
        this.resolveStage(stagePath).rules.push({
            matcher: matcher,
            action: action
        });
        return this;
    }

    setOtherwise(stagePath, action) {
        this.resolveStage(stagePath).otherwise = action;
        return this;
    }

    applyStageObjectDefinition(stagePath, definition) {

        if ((definition == null) || (typeof definition !== "object") || (Array.isArray(definition) == true)) {
            throw new Exception(
                `Invalid ${stagePath} route definition. Expected function callback or object definition.`,
                GeneralErrorCodes.InvalidParameter
            );
        }

        var whenRules = null;
        if (Array.isArray(definition.when) == true) {
            whenRules = definition.when;
        }
        else if (Array.isArray(definition.rules) == true) {
            whenRules = definition.rules;
        }

        if (whenRules != null) {

            for (var i = 0; i < whenRules.length; i++) {

                var item = whenRules[i];

                if (Array.isArray(item) == true) {

                    if (item.length == 2) {
                        var normalizedPairRule = this.normalizeWhenArguments(stagePath, item[0], item[1]);
                        this.addRule(
                            stagePath,
                            normalizedPairRule.matcher,
                            normalizedPairRule.action
                        );
                    }
                    else if (item.length >= 3) {
                        var normalizedTripletRule = this.normalizeWhenArguments(stagePath, item[0], item[1], item[2]);
                        this.addRule(
                            stagePath,
                            normalizedTripletRule.matcher,
                            normalizedTripletRule.action
                        );
                    }

                    continue;

                }

                if ((item != null) && (typeof item === "object")) {

                    var predicate = (
                        (Object.prototype.hasOwnProperty.call(item, "predicate") == true)
                            ? item.predicate
                            : item.when
                    );

                    if (predicate == null)
                        continue;

                    var value = (
                        (Object.prototype.hasOwnProperty.call(item, "value") == true)
                            ? item.value
                            : item.values
                    );

                    var itemAction = (
                        (Object.prototype.hasOwnProperty.call(item, "action") == true)
                            ? item.action
                            : item.then
                    );

                    var normalized = null;
                    if ((Object.prototype.hasOwnProperty.call(item, "value") == true)
                        || (Object.prototype.hasOwnProperty.call(item, "values") == true)) {
                        normalized = this.normalizeWhenArguments(stagePath, predicate, value, itemAction);
                    }
                    else {
                        normalized = this.normalizeWhenArguments(stagePath, predicate, itemAction);
                    }

                    this.addRule(stagePath, normalized.matcher, normalized.action);

                }

            }

        }

        if (Object.prototype.hasOwnProperty.call(definition, "otherwise") == true) {
            this.setOtherwise(stagePath, this.normalizeAction(definition.otherwise, `${stagePath}.otherwise`));
        }

        return this;

    }

    configureStage(stagePath, definition, methodName) {

        var stageBuilder = new RoutingStageBuilder(this, stagePath);

        if (definition == null) {
            return this;
        }

        if (typeof definition === "function") {
            definition(stageBuilder);
            return this;
        }

        return this.applyStageObjectDefinition(stagePath, definition, methodName);

    }

    findImagingKindPipeline(kindName) {

        var rules = this._stages.of.imagingKind.rules;
        var normalizedKind = String(kindName || "").trim().toLowerCase();

        for (var i = 0; i < rules.length; i++) {

            var rule = rules[i];
            if ((rule?.action?.kind ?? null) != "pipeline")
                continue;

            if ((rule?.matcher?.kind ?? null) != "value")
                continue;

            var expectedValues = rule?.matcher?.expectedValues ?? [];
            for (var v = 0; v < expectedValues.length; v++) {
                var expected = String(expectedValues[v] ?? "").trim().toLowerCase();
                if (expected == normalizedKind) {
                    return rule.action.pipeline;
                }
            }

        }

        return null;

    }

    resolveLegacyOtherwisePipeline() {
        var otherwise = this._stages.of.imagingKind.otherwise;
        if ((otherwise != null) && (otherwise.kind == "pipeline")) {
            return otherwise.pipeline;
        }
        return null;
    }

    cloneStage(stage) {
        return {
            rules: stage.rules.slice(),
            otherwise: stage.otherwise
        };
    }

    buildStagesSnapshot() {
        return {
            from: this.cloneStage(this._stages.from),
            of: {
                imagingKind: this.cloneStage(this._stages.of.imagingKind),
                dicomMeta: this.cloneStage(this._stages.of.dicomMeta),
                dicomData: this.cloneStage(this._stages.of.dicomData)
            },
            to: this.cloneStage(this._stages.to),
            into: this.cloneStage(this._stages.into)
        };
    }

    onFrom(definition) {
        this._usesGeneralRouting = true;
        return this.configureStage("from", definition, "onFrom");
    }

    onOf(definition) {

        this._usesGeneralRouting = true;

        var ofBuilder = new RoutingOfStageBuilder(this);
        if (definition == null) {
            return this;
        }

        if (typeof definition === "function") {
            definition(ofBuilder);
            return this;
        }

        if ((definition != null) && (typeof definition === "object") && (Array.isArray(definition) == false)) {

            if (definition.imagingKind != null) {
                ofBuilder.onImagingKind(definition.imagingKind);
            }

            if (definition.dicomMeta != null) {
                ofBuilder.onDicomMeta(definition.dicomMeta);
            }

            if (definition.dicomData != null) {
                ofBuilder.onDicomData(definition.dicomData);
            }

            return this;

        }

        throw new Exception(
            "Invalid onOf route definition. Expected function callback or object definition.",
            GeneralErrorCodes.InvalidParameter
        );

    }

    onTo(definition) {
        this._usesGeneralRouting = true;
        return this.configureStage("to", definition, "onTo");
    }

    onInto(definition) {
        this._usesGeneralRouting = true;
        return this.configureStage("into", definition, "onInto");
    }

    /**
     * Configure DICOM route branch.
     * @param {*} definition Route branch definition.
     * @returns {ImagingRoutingBuilder} Current routing builder.
     */
    whenDicom(definition) {
        var pipeline = this.resolveBranchPipeline(definition, "whenDicom");
        this._dicomPipeline = pipeline;
        this.addRule("of.imagingKind", {
            kind: "value",
            expectedValues: this.normalizeComparableList("dicom"),
            hasExpectedValues: true
        }, {
            kind: "pipeline",
            pipeline: pipeline
        });
        return this;
    }

    /**
     * Configure standard image route branch.
     * @param {*} definition Route branch definition.
     * @returns {ImagingRoutingBuilder} Current routing builder.
     */
    whenImage(definition) {
        var pipeline = this.resolveBranchPipeline(definition, "whenImage");
        this._imagePipeline = pipeline;
        this.addRule("of.imagingKind", {
            kind: "value",
            expectedValues: this.normalizeComparableList("image"),
            hasExpectedValues: true
        }, {
            kind: "pipeline",
            pipeline: pipeline
        });
        return this;
    }

    /**
     * Configure fallback route branch.
     * @param {*} definition Route branch definition.
     * @returns {ImagingRoutingBuilder} Current routing builder.
     */
    otherwise(definition) {
        var pipeline = this.resolveBranchPipeline(definition, "otherwise");
        this._otherwisePipeline = pipeline;
        this.setOtherwise("of.imagingKind", {
            kind: "pipeline",
            pipeline: pipeline
        });
        return this;
    }

    /**
     * Sugar for transfer-syntax routing in DICOM meta-set stage.
     * @param {*} valueOrValues One transfer-syntax UID or many.
     * @param {*} action Route action (label or branch).
     * @returns {ImagingRoutingBuilder}
     */
    whenTransferSyntax(valueOrValues, action) {
        this._usesGeneralRouting = true;
        this.onOf((of) => of.onDicomMeta((meta) => meta.when(Tag.TransferSyntaxUID, valueOrValues, action)));
        return this;
    }

    /**
     * Backward-compatible alias.
     * @param {*} valueOrValues One transfer-syntax UID or many.
     * @param {*} action Route action (label or branch).
     * @returns {ImagingRoutingBuilder}
     */
    whenTransferSyntaxIn(valueOrValues, action) {
        return this.whenTransferSyntax(valueOrValues, action);
    }

    /**
     * Sugar for modality routing in DICOM data-set stage.
     * @param {*} valueOrValues One modality or many.
     * @param {*} action Route action (label or branch).
     * @returns {ImagingRoutingBuilder}
     */
    whenModality(valueOrValues, action) {
        this._usesGeneralRouting = true;
        this.onOf((of) => of.onDicomData((data) => data.when(Tag.Modality, valueOrValues, action)));
        return this;
    }

    /**
     * Backward-compatible alias.
     * @param {*} valueOrValues One modality or many.
     * @param {*} action Route action (label or branch).
     * @returns {ImagingRoutingBuilder}
     */
    whenModalityIn(valueOrValues, action) {
        return this.whenModality(valueOrValues, action);
    }

    /**
     * Configure generic "from" stage routing with one direct rule.
     * @param {*} predicateOrAttribute Predicate/value/tag selector.
     * @param {*} valueOrAction Value(s) or action.
     * @param {*} action Optional action when value(s) are provided.
     * @returns {ImagingRoutingBuilder}
     */
    whenFrom(predicateOrAttribute, valueOrAction = null, action = undefined) {
        this._usesGeneralRouting = true;
        this.configureStage("from", (stage) => stage.when(predicateOrAttribute, valueOrAction, action), "whenFrom");
        return this;
    }

    /**
     * Configure generic "to" stage routing with one direct rule.
     * @param {*} predicateOrAttribute Predicate/value/tag selector.
     * @param {*} valueOrAction Value(s) or action.
     * @param {*} action Optional action when value(s) are provided.
     * @returns {ImagingRoutingBuilder}
     */
    whenTo(predicateOrAttribute, valueOrAction = null, action = undefined) {
        this._usesGeneralRouting = true;
        this.configureStage("to", (stage) => stage.when(predicateOrAttribute, valueOrAction, action), "whenTo");
        return this;
    }

    /**
     * Configure generic "into" stage routing with one direct rule.
     * @param {*} predicateOrAttribute Predicate/value/tag selector.
     * @param {*} valueOrAction Value(s) or action.
     * @param {*} action Optional action when value(s) are provided.
     * @returns {ImagingRoutingBuilder}
     */
    whenInto(predicateOrAttribute, valueOrAction = null, action = undefined) {
        this._usesGeneralRouting = true;
        this.configureStage("into", (stage) => stage.when(predicateOrAttribute, valueOrAction, action), "whenInto");
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
     * @returns {{
     *  stages: object,
     *  dicomPipeline: object | null,
     *  imagePipeline: object | null,
     *  otherwisePipeline: object | null,
     *  unknownMode: "skip" | "fail",
     *  usesGeneralRouting: boolean
     * }} Routing config.
     */
    build() {

        var dicomPipeline = this._dicomPipeline ?? this.findImagingKindPipeline("dicom");
        var imagePipeline = this._imagePipeline ?? this.findImagingKindPipeline("image");
        var otherwisePipeline = this._otherwisePipeline ?? this.resolveLegacyOtherwisePipeline();

        return {
            stages: this.buildStagesSnapshot(),
            dicomPipeline: dicomPipeline,
            imagePipeline: imagePipeline,
            otherwisePipeline: otherwisePipeline,
            unknownMode: this._unknownMode,
            usesGeneralRouting: (this._usesGeneralRouting === true)
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

            if (definition.unknownMode != null) {
                builderFromObject.withUnknownMode(definition.unknownMode);
            }

            if (definition.dicom != null) {
                builderFromObject.whenDicom(definition.dicom);
            }

            if (definition.image != null) {
                builderFromObject.whenImage(definition.image);
            }

            if (definition.otherwise != null) {
                builderFromObject.otherwise(definition.otherwise);
            }

            var stages = definition.stages ?? definition;

            if (stages.from != null) {
                builderFromObject.onFrom(stages.from);
            }

            if (stages.of != null) {
                builderFromObject.onOf(stages.of);
            }

            if (stages.to != null) {
                builderFromObject.onTo(stages.to);
            }

            if (stages.into != null) {
                builderFromObject.onInto(stages.into);
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

        this._stages = {
            from: { rules: [], otherwise: null },
            of: {
                imagingKind: { rules: [], otherwise: null },
                dicomMeta: { rules: [], otherwise: null },
                dicomData: { rules: [], otherwise: null }
            },
            to: { rules: [], otherwise: null },
            into: { rules: [], otherwise: null }
        };

        this._dicomPipeline = null;
        this._imagePipeline = null;
        this._otherwisePipeline = null;
        this._unknownMode = "skip";
        this._usesGeneralRouting = false;
    }

}
