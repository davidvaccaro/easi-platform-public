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
import DicomInstanceHandler from "./DicomInstanceHandler.js";

const RoutingContextStateSymbol = Symbol("RoutingContextState");

export default class ImagingRoutingHandler {

    isThenable(value) {
        return ((value != null) && (typeof value.then === "function"));
    }

    async forwardInstanceEvent(name, context, param = null) {

        if ((this.instanceHandler == null) || (this.instanceHandler[name] == null))
            return null;

        var result = this.instanceHandler[name](context, param);
        if (this.isThenable(result) == true) {
            return await result;
        }

        return result;

    }

    createRoutingState() {
        return {
            labels: new Set(),
            target: null,
            into: null,
            route: null,
            selectedPipeline: null,
            didEvaluateMeta: false,
            didEvaluateData: false
        };
    }

    ensureRoutingState(context) {

        if ((context == null) || (typeof context !== "object"))
            return this.createRoutingState();

        if (context[RoutingContextStateSymbol] == null) {
            context[RoutingContextStateSymbol] = this.createRoutingState();
        }

        return context[RoutingContextStateSymbol];

    }

    resetRoutingState(context) {

        if ((context == null) || (typeof context !== "object"))
            return this.createRoutingState();

        context[RoutingContextStateSymbol] = this.createRoutingState();
        return context[RoutingContextStateSymbol];

    }

    getStage(stagePath) {

        var segments = String(stagePath || "").split(".");
        var current = this.stages;

        for (var i = 0; i < segments.length; i++) {
            current = (current != null) ? current[segments[i]] : null;
            if (current == null)
                return null;
        }

        return current;

    }

    normalizeToken(value) {

        if (value == null)
            return null;

        if (typeof value === "string")
            return value.trim().toLowerCase();

        if ((typeof value === "number") || (typeof value === "boolean"))
            return String(value).toLowerCase();

        if (typeof value === "object") {

            if (typeof value.ID === "string")
                return value.ID.trim().toLowerCase();

            if (typeof value.id === "string")
                return value.id.trim().toLowerCase();

            if (typeof value.UID === "string")
                return value.UID.trim().toLowerCase();

            if (typeof value.uid === "string")
                return value.uid.trim().toLowerCase();

            if (typeof value.mediaType === "string")
                return value.mediaType.trim().toLowerCase();

            if (typeof value.kind === "string")
                return value.kind.trim().toLowerCase();

            if (typeof value.route === "string")
                return value.route.trim().toLowerCase();

        }

        return String(value).toLowerCase();

    }

    toComparableValues(value) {

        if (value == null)
            return [];

        if (value instanceof Uint8Array)
            return [];

        if (Array.isArray(value) == true) {

            var arrayValues = [];
            for (var i = 0; i < value.length; i++) {
                arrayValues = arrayValues.concat(this.toComparableValues(value[i]));
            }
            return arrayValues;

        }

        if (value instanceof Set) {
            return this.toComparableValues(Array.from(value.values()));
        }

        if (typeof value === "object") {

            var extracted = [];
            if (value.kind != null) extracted.push(value.kind);
            if (value.route != null) extracted.push(value.route);
            if (value.target != null) extracted.push(value.target);
            if (value.into != null) extracted.push(value.into);
            if (value.mediaType != null) extracted.push(value.mediaType);
            if (value.sourcePath != null) extracted.push(value.sourcePath);
            if (value.fileName != null) extracted.push(value.fileName);
            if (value.label != null) extracted.push(value.label);

            if (extracted.length > 0)
                return this.toComparableValues(extracted);

        }

        var token = this.normalizeToken(value);
        return (token == null) ? [] : [token];

    }

    matchesExpected(sourceValue, expectedValues) {

        var sourceTokens = this.toComparableValues(sourceValue);
        var expectedTokens = this.toComparableValues(expectedValues);

        if (expectedTokens.length == 0)
            return (sourceTokens.length > 0);

        for (var i = 0; i < sourceTokens.length; i++) {
            if (expectedTokens.indexOf(sourceTokens[i]) >= 0)
                return true;
        }

        return false;

    }

    resolveFieldValue(fieldName, evaluation) {

        var name = String(fieldName || "").trim();
        if (name.length == 0)
            return null;

        var segments = name.split(".");

        var resolvePath = (root) => {

            var current = root;
            for (var i = 0; i < segments.length; i++) {

                if ((current == null) || (typeof current !== "object")) {
                    return null;
                }

                if (Object.prototype.hasOwnProperty.call(current, segments[i]) == false) {
                    return null;
                }

                current = current[segments[i]];

            }

            return current;

        };

        var direct = resolvePath(evaluation);
        if (direct != null)
            return direct;

        var fromPayload = resolvePath(evaluation.payload ?? null);
        if (fromPayload != null)
            return fromPayload;

        var fromContext = resolvePath(evaluation.context ?? null);
        if (fromContext != null)
            return fromContext;

        var fromState = resolvePath(evaluation.state ?? null);
        if (fromState != null)
            return fromState;

        return null;

    }

    resolveAttributeValue(attributeSet, tagID) {

        if ((attributeSet == null) || (tagID == null))
            return null;

        if (typeof attributeSet.value === "function")
            return attributeSet.value({ ID: tagID }, null);

        if (typeof attributeSet.find === "function") {
            var attribute = attributeSet.find({ ID: tagID });
            return attribute?.value ?? null;
        }

        return null;

    }

    async evaluateRuleMatch(rule, evaluation, stageValue = null) {

        var matcher = rule?.matcher ?? null;
        if (matcher == null)
            return false;

        if (matcher.kind == "predicate") {

            if (typeof matcher.predicate !== "function")
                return false;

            var predicateResult = matcher.predicate(Object.assign({}, evaluation, {
                value: stageValue,
                labels: Array.from(evaluation?.state?.labels ?? [])
            }));

            if (this.isThenable(predicateResult) == true) {
                predicateResult = await predicateResult;
            }

            return (predicateResult === true);

        }

        if (matcher.kind == "attribute") {

            var attributeValue = this.resolveAttributeValue(evaluation.attributeSet, matcher.tagID);
            if (matcher.hasExpectedValues !== true)
                return (attributeValue != null);

            return this.matchesExpected(attributeValue, matcher.expectedValues);

        }

        if (matcher.kind == "field") {

            var fieldValue = this.resolveFieldValue(matcher.field, evaluation);
            if (matcher.hasExpectedValues !== true)
                return (fieldValue != null);

            return this.matchesExpected(fieldValue, matcher.expectedValues);

        }

        return this.matchesExpected(
            (stageValue != null) ? stageValue : evaluation?.value,
            matcher.expectedValues
        );

    }

    applyLabelValue(state, value, phaseName) {

        if (value == null)
            return;

        if (Array.isArray(value) == true) {
            for (var i = 0; i < value.length; i++) {
                this.applyLabelValue(state, value[i], phaseName);
            }
            return;
        }

        if (value instanceof Set) {
            this.applyLabelValue(state, Array.from(value.values()), phaseName);
            return;
        }

        if ((typeof value === "object") && (value instanceof Uint8Array == false)) {

            if (value.label != null) {
                this.applyLabelValue(state, value.label, phaseName);
            }

            if (value.labels != null) {
                this.applyLabelValue(state, value.labels, phaseName);
            }

            if (value.target != null) {
                state.target = value.target;
            }

            if (value.into != null) {
                state.into = value.into;
            }

            if (value.route != null) {
                state.route = value.route;
            }

            return;

        }

        var normalized = String(value);
        if (normalized.length > 0) {
            state.labels.add(normalized);
        }

        if (phaseName == "to") {
            state.target = value;
        }

        if (phaseName == "into") {
            state.into = value;
        }

    }

    async applyAction(action, _evaluation, state, phaseName) {

        if (action == null)
            return;

        if (action.kind == "noop")
            return;

        if (action.kind == "pipeline") {

            if ((state.selectedPipeline == null) && (action.pipeline != null)) {
                state.selectedPipeline = action.pipeline;
            }

            return;

        }

        if (action.kind == "label") {
            this.applyLabelValue(state, action.value, phaseName);
        }

    }

    async applyStage(stage, evaluation, state, stageValue = null, phaseName = null) {

        if (stage == null)
            return;

        var matched = false;

        var rules = stage?.rules ?? [];
        for (var i = 0; i < rules.length; i++) {

            var rule = rules[i];
            var isMatch = await this.evaluateRuleMatch(rule, evaluation, stageValue);
            if (isMatch !== true)
                continue;

            matched = true;
            await this.applyAction(rule.action, evaluation, state, phaseName);

        }

        if ((matched == false) && (stage.otherwise != null)) {
            await this.applyAction(stage.otherwise, evaluation, state, phaseName);
        }

    }

    resolveFromStageValue(payload, kind, imageFormat) {

        var contentType = payload?.contentType ?? null;
        var parsedContentType = ImagingDataUtils.parseContentType(contentType);

        return {
            kind: kind,
            sourcePath: payload?.sourcePath ?? ImagingDataUtils.resolveSourcePath(contentType),
            mediaType: ImagingDataUtils.resolveMediaType(contentType),
            imageFormat: imageFormat,
            contentType: parsedContentType,
            fileName: parsedContentType?.fileName ?? null
        };

    }

    buildEvaluation(payload, state, context = null) {
        return {
            payload: payload,
            state: state,
            context: context,
            value: null,
            attributeSet: null
        };
    }

    resolveLegacyBranchPipeline(kind) {

        if (kind == "dicom") {
            return this.dicomPipeline ?? this.otherwisePipeline;
        }

        if (kind == "image") {
            return this.imagePipeline ?? this.otherwisePipeline;
        }

        return this.otherwisePipeline;

    }

    resolveBranchPipeline(kind, state) {
        return state?.selectedPipeline ?? this.resolveLegacyBranchPipeline(kind);
    }

    resolveBranchSourceOptions(kind, payload, state = null) {

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
            contentType: parsed,
            routeLabels: Array.from(state?.labels ?? []),
            routeTarget: state?.target ?? null,
            routeInto: state?.into ?? null
        };

    }

    resolvePassThroughOutput(payload) {

        if (payload?.instance != null)
            return payload.instance;

        return payload;

    }

    buildRouteEnvelope(kind, payload, state, skipped, output, resultCollection = null) {

        var contentType = payload?.contentType ?? null;
        var route = (state?.route ?? kind);

        return {
            route: route,
            kind: kind,
            labels: Array.from(state?.labels ?? []),
            target: state?.target ?? null,
            into: state?.into ?? null,
            sourcePath: payload?.sourcePath ?? ImagingDataUtils.resolveSourcePath(contentType),
            mediaType: ImagingDataUtils.resolveMediaType(contentType),
            imageFormat: payload?.imageFormat ?? null,
            skipped: skipped,
            output: output,
            resultCollection: resultCollection
        };

    }

    async finalizeRoute(kind, payload, state) {

        var branchPipeline = this.resolveBranchPipeline(kind, state);
        if (branchPipeline == null) {

            if (this.usesGeneralRouting !== true) {

                if (this.unknownMode == "fail") {
                    throw new Exception(
                        `No route configured for detected imaging kind '${kind}'.`,
                        GeneralErrorCodes.InvalidData
                    );
                }

                return this.buildRouteEnvelope(kind, payload, state, true, null, null);

            }

            return this.buildRouteEnvelope(
                kind,
                payload,
                state,
                false,
                this.resolvePassThroughOutput(payload),
                null
            );

        }

        var branchSource = payload?.bytes;
        if (branchSource == null) {
            branchSource = payload?.instance ?? payload;
        }

        var branchResultCollection = await branchPipeline.process(branchSource, null, {
            sourceOptions: this.resolveBranchSourceOptions(kind, payload, state)
        });

        var branchFirst = ((branchResultCollection != null) && (typeof branchResultCollection.first === "function"))
            ? branchResultCollection.first()
            : branchResultCollection;

        return this.buildRouteEnvelope(
            kind,
            payload,
            state,
            false,
            branchFirst,
            branchResultCollection
        );

    }

    onReset(context) {
        return this.forwardInstanceEvent("onReset", context);
    }

    onStart(context) {
        return context;
    }

    onData(_context) {
    }

    /**
     * Route one parsed payload into the matching branch pipeline.
     * @param {object | null} context The current parser context.
     * @param {object} payload Parsed payload.
     * @returns {Promise<object>} Routed result envelope.
     */
    async onEnd(context, payload) {

        var bytes = payload?.bytes ?? null;
        var contentType = payload?.contentType ?? null;
        var kind = payload?.kind ?? ImagingDataUtils.detectImagingKind(bytes, contentType);
        var imageFormat = payload?.imageFormat ?? ImagingDataUtils.detectImageFormat(bytes, contentType);

        var state = this.createRoutingState();
        var evaluation = this.buildEvaluation(payload, state, context);

        await this.applyStage(
            this.getStage("from"),
            Object.assign({}, evaluation),
            state,
            this.resolveFromStageValue(payload, kind, imageFormat),
            "from"
        );

        await this.applyStage(
            this.getStage("of.imagingKind"),
            Object.assign({}, evaluation),
            state,
            kind,
            "of"
        );

        if (payload?.metaSet != null) {
            await this.applyStage(
                this.getStage("of.dicomMeta"),
                Object.assign({}, evaluation, { attributeSet: payload.metaSet }),
                state,
                payload.metaSet,
                "of"
            );
        }

        if (payload?.dataSet != null) {
            await this.applyStage(
                this.getStage("of.dicomData"),
                Object.assign({}, evaluation, { attributeSet: payload.dataSet }),
                state,
                payload.dataSet,
                "of"
            );
        }

        await this.applyStage(
            this.getStage("to"),
            Object.assign({}, evaluation),
            state,
            state.labels,
            "to"
        );

        await this.applyStage(
            this.getStage("into"),
            Object.assign({}, evaluation),
            state,
            state.labels,
            "into"
        );

        return this.finalizeRoute(kind, Object.assign({}, payload, {
            imageFormat: imageFormat,
            contentType: contentType
        }), state);

    }

    onStartInstance(context) {

        var instanceContext = this.forwardInstanceEvent("onStartInstance", context);
        if (this.isThenable(instanceContext) == true) {
            return instanceContext.then((resolvedContext) => {
                var ensured = (resolvedContext == null) ? context : resolvedContext;
                this.resetRoutingState(ensured);
                return ensured;
            });
        }

        var ensuredContext = (instanceContext == null) ? context : instanceContext;
        this.resetRoutingState(ensuredContext);
        return ensuredContext;

    }

    onStartPreamble(context, preamble) {
        return this.forwardInstanceEvent("onStartPreamble", context, preamble);
    }

    onStartPrefix(context, prefix) {
        return this.forwardInstanceEvent("onStartPrefix", context, prefix);
    }

    onStartMetaSet(context) {
        return this.forwardInstanceEvent("onStartMetaSet", context);
    }

    onStartDataSet(context) {
        return this.forwardInstanceEvent("onStartDataSet", context);
    }

    onStartAttribute(context, attribute) {
        return this.forwardInstanceEvent("onStartAttribute", context, attribute);
    }

    onStartSequence(context, sequence) {
        return this.forwardInstanceEvent("onStartSequence", context, sequence);
    }

    onStartItem(context) {
        return this.forwardInstanceEvent("onStartItem", context);
    }

    onAppendAttribute(context, attribute) {
        return this.forwardInstanceEvent("onAppendAttribute", context, attribute);
    }

    onAttributeChunk(context, payload) {
        return this.forwardInstanceEvent("onAttributeChunk", context, payload);
    }

    onEndPreamble(context, preamble) {
        return this.forwardInstanceEvent("onEndPreamble", context, preamble);
    }

    onEndPrefix(context, prefix) {
        return this.forwardInstanceEvent("onEndPrefix", context, prefix);
    }

    onEndAttribute(context, attribute) {
        return this.forwardInstanceEvent("onEndAttribute", context, attribute);
    }

    onEndSequence(context, sequence) {
        return this.forwardInstanceEvent("onEndSequence", context, sequence);
    }

    onEndItem(context) {
        return this.forwardInstanceEvent("onEndItem", context);
    }

    buildDicomPayload(context) {
        return {
            kind: "dicom",
            sourceFormat: "dicom",
            bytes: context?.bytes ?? null,
            contentType: context?.contentType ?? null,
            sourcePath: context?.sourcePath ?? null,
            instance: context?.instance ?? null,
            metaSet: context?.instance?.metaSet ?? null,
            dataSet: context?.instance?.dataSet ?? null,
            imageFormat: null
        };
    }

    async onEndMetaSet(context) {

        var result = await this.forwardInstanceEvent("onEndMetaSet", context);

        var payload = this.buildDicomPayload(context);
        var state = this.ensureRoutingState(context);
        var evaluation = this.buildEvaluation(payload, state, context);

        await this.applyStage(
            this.getStage("of.dicomMeta"),
            Object.assign({}, evaluation, { attributeSet: payload.metaSet }),
            state,
            payload.metaSet,
            "of"
        );

        state.didEvaluateMeta = true;
        return result;

    }

    async onEndDataSet(context) {

        var result = await this.forwardInstanceEvent("onEndDataSet", context);

        var payload = this.buildDicomPayload(context);
        var state = this.ensureRoutingState(context);
        var evaluation = this.buildEvaluation(payload, state, context);

        await this.applyStage(
            this.getStage("of.dicomData"),
            Object.assign({}, evaluation, { attributeSet: payload.dataSet }),
            state,
            payload.dataSet,
            "of"
        );

        state.didEvaluateData = true;
        return result;

    }

    async onEndInstance(context) {

        await this.forwardInstanceEvent("onEndInstance", context);

        var payload = this.buildDicomPayload(context);
        var state = this.ensureRoutingState(context);
        var evaluation = this.buildEvaluation(payload, state, context);

        await this.applyStage(
            this.getStage("from"),
            Object.assign({}, evaluation),
            state,
            this.resolveFromStageValue(payload, "dicom", null),
            "from"
        );

        await this.applyStage(
            this.getStage("of.imagingKind"),
            Object.assign({}, evaluation),
            state,
            "dicom",
            "of"
        );

        if ((state.didEvaluateMeta !== true) && (payload.metaSet != null)) {
            await this.applyStage(
                this.getStage("of.dicomMeta"),
                Object.assign({}, evaluation, { attributeSet: payload.metaSet }),
                state,
                payload.metaSet,
                "of"
            );
        }

        if ((state.didEvaluateData !== true) && (payload.dataSet != null)) {
            await this.applyStage(
                this.getStage("of.dicomData"),
                Object.assign({}, evaluation, { attributeSet: payload.dataSet }),
                state,
                payload.dataSet,
                "of"
            );
        }

        await this.applyStage(
            this.getStage("to"),
            Object.assign({}, evaluation),
            state,
            state.labels,
            "to"
        );

        await this.applyStage(
            this.getStage("into"),
            Object.assign({}, evaluation),
            state,
            state.labels,
            "into"
        );

        return this.finalizeRoute("dicom", payload, state);

    }

    onError(context, error) {
        return this.forwardInstanceEvent("onError", context, error);
    }

    onProgress(context, progress) {
        return this.forwardInstanceEvent("onProgress", context, progress);
    }

    /**
     * Create one imaging routing handler.
     * @param {{ stages?: object | null, dicomPipeline?: object | null, imagePipeline?: object | null, otherwisePipeline?: object | null, unknownMode?: "skip" | "fail", usesGeneralRouting?: boolean } | null} routes Routing config.
     */
    constructor(routes = null) {

        this.stages = routes?.stages ?? null;
        this.dicomPipeline = routes?.dicomPipeline ?? null;
        this.imagePipeline = routes?.imagePipeline ?? null;
        this.otherwisePipeline = routes?.otherwisePipeline ?? null;
        this.usesGeneralRouting = (routes?.usesGeneralRouting === true);

        var unknownMode = String(routes?.unknownMode ?? "skip").toLowerCase().trim();
        this.unknownMode = ((unknownMode == "fail") ? "fail" : "skip");

        this.instanceHandler = new DicomInstanceHandler();

    }

}
