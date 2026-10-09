import { BlockedRunError, RunFeedback, dicomwebUrl } from './run-feedback.js';
import { postDimseRequest, resolveDimseRequestUrl } from './dimse-api.js';

import EASI from '../../src/EASI.js';

import Constants from '../../src/dicom/Constants.js';

import { Status } from '../../src/parsers/Status.js';

import Tag from '../../src/dicom/Tag.js';
import TransferSyntax from '../../src/dicom/TransferSyntax.js';

import Data from '../../src/data/Data.js';
import Attribute from '../../src/dicom/Attribute.js'

import MetaSet from '../../src/dicom/MetaSet.js';
import DataSet from '../../src/dicom/DataSet.js';

import Item from '../../src/dicom/Item.js';
import AttributeSequence from '../../src/dicom/AttributeSequence.js';

import DicomInstanceHandler from '../../src/handlers/terminals/DicomInstanceHandler.js';
import DicomMappingHandler from '../../src/handlers/terminals/DicomMappingHandler.js';
import DicomSelectingHandler from '../../src/handlers/terminals/DicomSelectingHandler.js';
import JsonDataHandler from '../../src/handlers/terminals/syntax/JsonDataHandler.js';

import DicomToFHIRImagingStudyMapping from '../../src/handlers/mappings/DicomToFHIRImagingStudyMapping.js';

import DicomSelection from '../../src/handlers/selections/DicomSelection.js'

import DicomDataParser from '../../src/parsers/DicomDataParser.js';
import PartStreamReader from '../../src/readers/PartStreamReader.js';
import PipelineBuilder from '../../src/builders/PipelineBuilder.js';

import JsonDataParser from '../../src/parsers/JsonDataParser.js';

import DumpParser from '../../src/tools/dicom/DumpParser.js';

$(function () {

    var feedback = new RunFeedback();
    var dimseBackendInput = document.getElementById('dimseBackendUrl');
    if (dimseBackendInput && !String(dimseBackendInput.value ?? '').trim()
        && window.location?.port === '5500'
        && ['localhost', '127.0.0.1', '[::1]', '::1'].includes(window.location.hostname)) {
        dimseBackendInput.value = 'http://127.0.0.1:8080';
    }
    window.addEventListener('error', function (event) {
        feedback.reportUnexpectedError(event.error ?? new Error(event.message ?? 'Unexpected page error.'));
    });
    window.addEventListener('unhandledrejection', function (event) {
        feedback.reportUnexpectedError(event.reason ?? new Error('Unhandled promise rejection.'));
    });
    var localFileInputs = {
        parseLocalFile: 'dicomFile',
        decodeLocalFile: 'dicomFile',
        mapLocalFileFHIR: 'dicomFileFHIR',
        selectLocalFile: 'dicomFileSelection'
    };

    function registerAction(id, eventName, handler) {
        feedback.bindAction(id, eventName, function (event) {
            var input = document.getElementById(localFileInputs[id]);
            if (input && !input.files?.length)
                throw new BlockedRunError('Choose a DICOM file for this action first.');
            return handler.call(input ?? this, event);
        });
    }

    function getDicomwebUrl(level) {
        return dicomwebUrl({
            baseUrl: getTrimmedInput('#ksDicomwebBaseUrl'),
            studyUid: getTrimmedInput('#ksStudyUid'),
            seriesUid: getTrimmedInput('#ksSeriesUid'),
            instanceUid: getTrimmedInput('#ksInstanceUid')
        }, level);
    }

    // ================================
    // PARSE DICOM
    // ================================

    function getDicomDataValidationMode() {
        return $('input[name="dicomDataValidationMode"]:checked').val() || 'none';
    }

    function applyDicomDataValidation(builder) {

        var mode = getDicomDataValidationMode();

        function logValidationConcern(concern) {
            console.warn('[DICOM Validation]', {
                severity: concern.severity,
                code: concern.code,
                path: concern.path,
                message: concern.message,
                tagID: concern.tagID,
                tagName: concern.tagName,
                details: concern.details
            });
        }

        if (mode === 'strict')
            return builder.withValidation({
                goal: 'strict',
                onConcern: logValidationConcern
            });

        if (mode === 'permissive')
            return builder.withValidation({
                goal: 'permissive',
                onConcern: logValidationConcern
            });

        return builder.withValidation(false);

    }

    function processWithTiming(pipeline, source, requestOptions = null, label = "Execution") {

        var start = new Date().getTime();
        var invocation = {
            source: source
        };

        if (requestOptions != null) {
            invocation.sourceOptions = requestOptions;
        }

        var promise = pipeline.process(invocation);

        return promise.then(function (result) {
            console.log(label + ' time: ' + (new Date().getTime() - start) + ' ms');
            var output = unwrapPipelineResult(result);
            if (output?.ok === false)
                throw new Error(output.message ?? 'The pipeline reported an unsuccessful operation.');
            feedback.capture(isPipelineResultCollection(result) && Number(result.count) === 0 ? [] : output);
            console.log('Pipeline result:', output);
            return output;
        }).catch(function (err) {
            console.log(label + ' time: ' + (new Date().getTime() - start) + ' ms');
            throw err;
        });

    }

    function isPipelineResultCollection(result) {
        return (result != null)
            && (typeof result === 'object')
            && (typeof result.first === 'function')
            && (typeof result.toArray === 'function')
            && (Number.isFinite(Number(result.count)));
    }

    function unwrapPipelineResult(result) {

        if (isPipelineResultCollection(result) == false)
            return result;

        var count = Number(result.count);
        if (count <= 0)
            return null;

        if (count == 1)
            return result.first();

        return result.toArray();

    }

    function getTrimmedInput(selector) {

        var value = $(selector).val();
        if (value == null)
            return null;

        var text = String(value).trim();
        if (text.length == 0)
            return null;

        return text;

    }

    function getIntegerInput(selector, fallback) {

        var text = getTrimmedInput(selector);
        if (text == null)
            return fallback;

        var value = Number(text);
        if (Number.isFinite(value) == false)
            return fallback;

        value = Math.trunc(value);
        if ((value <= 0) || (value > 65535))
            return fallback;

        return value;

    }

    function getDimseOutputMode() {
        return $('input[name="dimseOutputMode"]:checked').val() || 'instance';
    }

    function reportDimseRequestError(selector, operation, error) {
        var blocked = error instanceof BlockedRunError;
        $(selector).val(
            operation + (blocked ? ' blocked.\n' : ' failed.\n')
            + String(error?.message ?? error)
            + (blocked ? '' : ('\n\n' + (error?.stack ?? '')))
        );
        if (blocked)
            console.warn(error.message);
        else
            console.error(error);
    }

    function getFhirSubjectMode() {
        return $('input[name="fhirSubjectMode"]:checked').val() || 'contained';
    }

    function newFhirImagingStudyMapping() {
        var options = { subjectMode: getFhirSubjectMode() };
        if (options.subjectMode === 'reference') {
            var subjectTemplate = getTrimmedInput('#fhirSubjectReferenceTemplate');
            if (subjectTemplate == null)
                throw new BlockedRunError('Enter a FHIR subject reference template or choose Contained Patient.');
            options.referenceTemplates = { subject: subjectTemplate };
        }
        return new DicomToFHIRImagingStudyMapping(options);
    }

    var imageListObjectUrls = [];
    var folderNormalizeInputHandle = null;
    var folderNormalizeOutputHandle = null;

    function clearImageList() {

        for (var i = 0; i < imageListObjectUrls.length; i++) {
            URL.revokeObjectURL(imageListObjectUrls[i]);
        }

        imageListObjectUrls = [];
        $('#imageList').empty();

    }

    function renderImageListFrames(frames) {

        clearImageList();

        if ((Array.isArray(frames) == false) || (frames.length == 0))
            return;

        for (var i = 0; i < frames.length; i++) {

            appendImageListFrame(frames[i], i);

        }

    }

    function appendImageListFrame(frame, fallbackIndex = null) {

        var bytes = frame?.bytes;

        if ((bytes == null) || (bytes.length == 0))
            return;

        var mimeType = frame?.mimeType ?? 'image/png';
        var blob = new Blob([bytes], { type: mimeType });
        var objectUrl = URL.createObjectURL(blob);
        imageListObjectUrls.push(objectUrl);

        var frameContainer = document.createElement('div');
        frameContainer.style.display = 'inline-block';
        frameContainer.style.border = '1px solid #ccc';
        frameContainer.style.padding = '6px';
        frameContainer.style.background = '#fafafa';

        var frameTitle = document.createElement('div');
        var frameIndex = frame?.index ?? fallbackIndex ?? 0;
        frameTitle.textContent = 'Frame ' + String(frameIndex + 1);
        frameTitle.style.fontSize = '12px';
        frameTitle.style.marginBottom = '4px';
        frameContainer.appendChild(frameTitle);

        var image = document.createElement('img');
        image.src = objectUrl;
        image.alt = 'Frame ' + String(frameIndex + 1);
        image.style.maxWidth = '256px';
        image.style.maxHeight = '256px';
        image.style.display = 'block';
        frameContainer.appendChild(image);

        $('#imageList').append(frameContainer);

    }

    function yieldToBrowserFrame() {
        return new Promise(function (resolve) {
            if (typeof requestAnimationFrame === 'function') {
                requestAnimationFrame(function () { resolve(); });
            }
            else {
                setTimeout(function () { resolve(); }, 0);
            }
        });
    }

    function buildArchiveFileName(fileName) {

        var name = String(fileName ?? 'dicom').trim();
        if (name.length == 0)
            name = 'dicom';

        var extensionIndex = name.lastIndexOf('.');
        var baseName = (extensionIndex > 0)
            ? name.substring(0, extensionIndex)
            : name;

        return baseName + '_assets.zip';

    }

    function collectUnwrappedDocuments(result) {

        var documents = [];

        function collect(value) {

            if (value == null)
                return;

            if (Array.isArray(value) == true) {
                for (var i = 0; i < value.length; i++) {
                    collect(value[i]);
                }
                return;
            }

            if ((typeof value == 'object') && (value.bytes instanceof Uint8Array)) {
                documents.push(value);
            }

        }

        collect(result);
        return documents;

    }

    function buildUnwrappedDocumentsSummary(fileName, documents) {

        var lines = [];
        lines.push('Unwrapped documents successfully.');
        lines.push('Source DICOM: ' + String(fileName ?? 'unknown'));
        lines.push('Document Count: ' + String(documents.length));
        lines.push('');

        for (var i = 0; i < documents.length; i++) {

            var document = documents[i] ?? {};
            var safeFileName = document.fileName ?? ('document_' + String(i + 1) + '.bin');
            var mimeType = document.mimeType ?? 'application/octet-stream';
            var byteLength = document.byteLength ?? document.bytes?.length ?? 0;
            var title = document.title ?? 'unknown';
            var textPreview = null;

            if ((typeof document.text == 'string') && (document.text.length > 0)) {
                textPreview = document.text.replace(/\s+/g, ' ').trim().substring(0, 160);
            }

            lines.push('[' + String(i + 1) + '] ' + safeFileName);
            lines.push('    MIME Type: ' + String(mimeType));
            lines.push('    Size: ' + String(byteLength) + ' bytes');
            lines.push('    Title: ' + String(title));

            if ((textPreview != null) && (textPreview.length > 0)) {
                lines.push('    Text Preview: ' + textPreview + ((document.text.length > 160) ? '...' : ''));
            }

            lines.push('');

        }

        return lines.join('\n');

    }

    function formatAssetsSourceDiagnostics(instance) {

        if (instance == null)
            return 'No instance diagnostics available.';

        var dataSet = instance?.dataSet ?? null;
        var metaSet = instance?.metaSet ?? null;

        var transferSyntaxUID = metaSet?.find?.(Tag.TransferSyntaxUID)?.value ?? null;
        var transferSyntax = TransferSyntax.find(transferSyntaxUID ?? '') ?? null;
        var transferSyntaxName = transferSyntax?.Name ?? 'Unknown';

        var photometric = dataSet?.find?.(Tag.PhotometricInterpretation)?.value ?? null;
        var rows = dataSet?.find?.(Tag.Rows)?.value ?? null;
        var columns = dataSet?.find?.(Tag.Columns)?.value ?? null;
        var samplesPerPixel = dataSet?.find?.(Tag.SamplesPerPixel)?.value ?? null;
        var bitsAllocated = dataSet?.find?.(Tag.BitsAllocated)?.value ?? null;
        var bitsStored = dataSet?.find?.(Tag.BitsStored)?.value ?? null;
        var numberOfFrames = dataSet?.find?.(Tag.NumberOfFrames)?.value ?? null;
        var pixelData = dataSet?.find?.(Tag.PixelData) ?? null;

        return ''
            + 'Transfer Syntax UID: ' + String(transferSyntaxUID ?? 'unknown') + '\n'
            + 'Transfer Syntax Name: ' + String(transferSyntaxName) + '\n'
            + 'Photometric Interpretation: ' + String(photometric ?? 'unknown') + '\n'
            + 'Rows x Columns: ' + String(rows ?? 'unknown') + ' x ' + String(columns ?? 'unknown') + '\n'
            + 'Samples/Bits: ' + String(samplesPerPixel ?? 'unknown') + ' / '
            + String(bitsAllocated ?? 'unknown') + ' (stored=' + String(bitsStored ?? 'unknown') + ')\n'
            + 'Number Of Frames: ' + String(numberOfFrames ?? '1') + '\n'
            + 'PixelData Present: ' + String(pixelData != null)
            + ((pixelData != null) ? (' (length=' + String(pixelData.length?.() ?? 'unknown') + ')') : '');

    }

    function buildDeidentifiedDicomFileName(fileName) {

        var name = String(fileName ?? 'dicom').trim();
        if (name.length == 0)
            name = 'dicom';

        var extensionIndex = name.lastIndexOf('.');
        var baseName = (extensionIndex > 0)
            ? name.substring(0, extensionIndex)
            : name;

        return baseName + '_deid.dcm';

    }

    function buildBurnedInRedactedDicomFileName(fileName) {

        var name = String(fileName ?? 'dicom').trim();
        if (name.length == 0)
            name = 'dicom';

        var extensionIndex = name.lastIndexOf('.');
        var baseName = (extensionIndex > 0)
            ? name.substring(0, extensionIndex)
            : name;

        return baseName + '_burnedin-redacted.dcm';

    }

    function buildWrappedDocumentDicomFileName(fileName) {

        var name = String(fileName ?? 'document').trim();
        if (name.length == 0)
            name = 'document';

        var extensionIndex = name.lastIndexOf('.');
        var baseName = (extensionIndex > 0)
            ? name.substring(0, extensionIndex)
            : name;

        return baseName + '_wrapped.dcm';

    }

    function buildWrappedDocumentTitle(fileName) {

        var name = String(fileName ?? 'Document').trim();
        if (name.length == 0)
            name = 'Document';

        var extensionIndex = name.lastIndexOf('.');
        var baseName = (extensionIndex > 0)
            ? name.substring(0, extensionIndex)
            : name;

        return baseName;

    }

    function resolveWrappedDocumentMimeType(file) {

        var mimeType = String(file?.type ?? '').trim().toLowerCase();
        if (mimeType.length > 0)
            return mimeType;

        var lowerName = String(file?.name ?? '').toLowerCase();
        if (lowerName.endsWith('.pdf'))
            return 'application/pdf';

        return 'application/octet-stream';

    }

    function normalizeIntegerInput(value, fallbackValue, minimum = null, maximum = null) {

        var numericValue = Number(value);
        if (Number.isFinite(numericValue) == false)
            numericValue = fallbackValue;

        numericValue = Math.floor(numericValue);

        if ((minimum != null) && (numericValue < minimum))
            numericValue = minimum;

        if ((maximum != null) && (numericValue > maximum))
            numericValue = maximum;

        return numericValue;

    }

    function normalizeDecimalInput(value, fallbackValue, minimum = null, maximum = null) {

        var numericValue = Number(value);
        if (Number.isFinite(numericValue) == false)
            numericValue = fallbackValue;

        if ((minimum != null) && (numericValue < minimum))
            numericValue = minimum;

        if ((maximum != null) && (numericValue > maximum))
            numericValue = maximum;

        return numericValue;

    }

    function getBurnedInRegionByIndex(regionIndex) {

        var isEnabled = ($('#burnedInRegion' + String(regionIndex) + 'Enabled').is(':checked') === true);
        if (isEnabled != true)
            return null;

        return {
            x: normalizeIntegerInput($('#burnedInRegion' + String(regionIndex) + 'X').val(), 0, 0, null),
            y: normalizeIntegerInput($('#burnedInRegion' + String(regionIndex) + 'Y').val(), 0, 0, null),
            width: normalizeIntegerInput($('#burnedInRegion' + String(regionIndex) + 'Width').val(), 128, 1, null),
            height: normalizeIntegerInput($('#burnedInRegion' + String(regionIndex) + 'Height').val(), 64, 1, null)
        };

    }

    function getBurnedInRedactionRegions() {

        var regions = [];

        for (var regionIndex = 1; regionIndex <= 4; regionIndex++) {
            var region = getBurnedInRegionByIndex(regionIndex);
            if (region != null) {
                regions.push(region);
            }
        }

        return regions;

    }

    function getBurnedInRedactionAction() {
        return $('input[name="burnedInRedactionAction"]:checked').val() || 'black';
    }

    function getBurnedInRedactionMode() {
        return $('input[name="burnedInRedactionMode"]:checked').val() || 'regions';
    }

    function getBurnedInRedactionCoordinateMode() {
        return $('input[name="burnedInCoordinateMode"]:checked').val() || 'auto-fit';
    }

    function getBurnedInConstantFill() {
        return normalizeIntegerInput($('#burnedInConstantFill').val(), 0, 0, 255);
    }

    function getBurnedInOcrRegionOptions() {

        return {
            detectDarkText: ($('#burnedInOcrDetectDarkText').is(':checked') === true),
            usePeripheralZones: ($('#burnedInOcrUsePeripheralZones').is(':checked') === true),
            redactOutsideImagingBounds: ($('#burnedInOcrRedactOutsideBounds').is(':checked') === true),
            minHighThreshold: normalizeIntegerInput($('#burnedInOcrMinHighThreshold').val(), 156, 0, 255),
            maxBrightChannelDelta: normalizeIntegerInput($('#burnedInOcrMaxBrightChannelDelta').val(), 255, 0, 255),
            topZoneRatio: normalizeDecimalInput($('#burnedInOcrTopZoneRatio').val(), 0.24, 0, 1),
            bottomZoneRatio: normalizeDecimalInput($('#burnedInOcrBottomZoneRatio').val(), 0.24, 0, 1),
            leftZoneRatio: normalizeDecimalInput($('#burnedInOcrLeftZoneRatio').val(), 0.24, 0, 1),
            rightZoneRatio: normalizeDecimalInput($('#burnedInOcrRightZoneRatio').val(), 0.28, 0, 1)
        };

    }

    function getBurnedInRedactionOptions() {

        var mode = getBurnedInRedactionMode();
        var action = getBurnedInRedactionAction();
        var regions = getBurnedInRedactionRegions();
        var options = {
            mode: mode,
            action: action,
            coordinateMode: getBurnedInRedactionCoordinateMode(),
            regions: regions,
            ocrRegions: getBurnedInOcrRegionOptions()
        };

        if (action == 'constant') {
            options.fill = getBurnedInConstantFill();
        }

        return options;

    }

    function getTranscodeFallbackMode() {
        return $('input[name="transcodeFallbackMode"]:checked').val() || 'fail';
    }

    function getTranscodeTargetTransferSyntaxID() {
        return $('#transcodeTargetTransferSyntax').val() || TransferSyntax.ExplicitVRLittleEndian.ID;
    }

    function getTranscodeRoundTripEnabled() {
        return ($('#transcodeRoundTripEnabled').is(':checked') === true);
    }

    function getTranscodeRoundTripTargetTransferSyntaxID() {
        return $('#transcodeRoundTripTargetTransferSyntax').val() || TransferSyntax.ExplicitVRLittleEndian.ID;
    }

    function getTranscodeLossyQuality() {

        var value = Number($('#transcodeLossyQuality').val());
        if (Number.isFinite(value) == false)
            return 90;

        value = Math.round(value);
        if (value < 1)
            value = 1;
        if (value > 100)
            value = 100;

        return value;

    }

    function getTranscodeCompressionRatio() {

        var value = Number($('#transcodeCompressionRatio').val());
        if (Number.isFinite(value) == false)
            return 10;

        if (value < 1)
            value = 1;

        return value;

    }

    function isLossyTransferSyntaxID(transferSyntaxID) {
        var transferSyntax = TransferSyntax.find(transferSyntaxID);
        return (transferSyntax?.IsLossy === true);
    }

    function buildTranscodeCodecOptions(transferSyntaxID, lossyQuality, compressionRatio) {

        if (isLossyTransferSyntaxID(transferSyntaxID) != true)
            return null;

        return {
            encode: {
                quality: lossyQuality,
                compressionRatio: compressionRatio
            }
        };

    }

    function isJpeg2000TransferSyntaxID(transferSyntaxID) {
        return (
            (transferSyntaxID == TransferSyntax.JPEG2000Lossless.ID)
            || (transferSyntaxID == TransferSyntax.JPEG2000.ID)
            || (transferSyntaxID == TransferSyntax.JPEG2000MCLossless.ID)
            || (transferSyntaxID == TransferSyntax.JPEG2000MC.ID)
            || (transferSyntaxID == TransferSyntax.HTJ2KLossless.ID)
            || (transferSyntaxID == TransferSyntax.HTJ2KLosslessRPCL.ID)
            || (transferSyntaxID == TransferSyntax.HTJ2K.ID)
        );
    }

    function isJpegLsTransferSyntaxID(transferSyntaxID) {
        return (
            (transferSyntaxID == TransferSyntax.JPEGLSLossless.ID)
            || (transferSyntaxID == TransferSyntax.JPEGLSNearLossless.ID)
        );
    }

    async function ensureOpenJpegRuntime() {

        var openjpegModule = globalThis?.EASIOpenJPEGModule ?? null;
        if ((openjpegModule != null)
            && (typeof openjpegModule.J2KEncoder == 'function')
            && (typeof openjpegModule.J2KDecoder == 'function')) {
            return openjpegModule;
        }

        if (globalThis.__easiOpenJpegLoadingPromise == null) {
            globalThis.__easiOpenJpegLoadingPromise = (async function () {

                var openjpegBasePath = '/easi-js/node_modules/@voxelmed/openjpegjs/dist/';

                var openjpegFactory = globalThis?.OpenJPEGWASM ?? null;
                if (typeof openjpegFactory != 'function') {

                    if (globalThis.__easiOpenJpegScriptLoadingPromise == null) {
                        globalThis.__easiOpenJpegScriptLoadingPromise = new Promise(function (resolve, reject) {

                            var existingScript = document.getElementById('easi-openjpeg-wasm-script');
                            if (existingScript != null) {
                                existingScript.addEventListener('load', function () { resolve(); }, { once: true });
                                existingScript.addEventListener('error', function () { reject(new Error('Failed loading OpenJPEG script.')); }, { once: true });
                                return;
                            }

                            var script = document.createElement('script');
                            script.id = 'easi-openjpeg-wasm-script';
                            script.src = (openjpegBasePath + 'openjpegwasm.js');
                            script.async = true;
                            script.onload = function () { resolve(); };
                            script.onerror = function () { reject(new Error('Failed loading OpenJPEG script.')); };
                            document.head.appendChild(script);

                        }).catch(function (error) {
                            globalThis.__easiOpenJpegScriptLoadingPromise = null;
                            throw error;
                        });
                    }

                    await globalThis.__easiOpenJpegScriptLoadingPromise;
                    openjpegFactory = globalThis?.OpenJPEGWASM ?? null;

                }

                if (typeof openjpegFactory != 'function') {
                    throw new Error('OpenJPEG factory export is unavailable.');
                }

                globalThis.EASIOpenJPEGFactory = openjpegFactory;

                var loadedModule = await openjpegFactory({
                    locateFile: function (path) {
                        return openjpegBasePath + String(path ?? '');
                    }
                });
                if ((loadedModule == null)
                    || (typeof loadedModule.J2KEncoder != 'function')
                    || (typeof loadedModule.J2KDecoder != 'function')) {
                    throw new Error('OpenJPEG module does not expose J2KEncoder/J2KDecoder.');
                }

                globalThis.EASIOpenJPEGModule = loadedModule;
                return loadedModule;

            })().catch(function (error) {

                globalThis.__easiOpenJpegLoadingPromise = null;
                throw error;

            });
        }

        return await globalThis.__easiOpenJpegLoadingPromise;

    }

    function isJpegLsRuntimeModule(moduleCandidate) {

        if (moduleCandidate == null)
            return false;

        var moduleObject = moduleCandidate;
        if ((moduleObject?.default != null) && (typeof moduleObject.default == 'object' || typeof moduleObject.default == 'function'))
            moduleObject = moduleObject.default;

        if (typeof moduleObject == 'function')
            return true;

        if (typeof moduleObject?.decode == 'function')
            return true;

        if (typeof moduleObject?.decodeFrame == 'function')
            return true;

        if (typeof moduleObject?.JpegLsDecoder == 'function')
            return true;

        if (typeof moduleObject?.JPEGLSDecoder == 'function')
            return true;

        if (typeof moduleObject?.JPEG_LS_Decoder == 'function')
            return true;

        if (typeof moduleObject?.CharLSDecoder == 'function')
            return true;

        if (typeof moduleObject?.Decoder == 'function')
            return true;

        return false;

    }

    function resolveJpegLsFactory() {
        return (
            globalThis?.EASIJpegLsFactory
            ?? globalThis?.EASIJPEGLSFactory
            ?? globalThis?.CharLSWASM
            ?? globalThis?.CharLSWasm
            ?? globalThis?.charlswasm
            ?? null
        );
    }

    async function loadScriptOnce(scriptId, scriptUrl) {

        return await new Promise(function (resolve, reject) {
            var existingScript = document.getElementById(scriptId);
            if (existingScript != null) {
                if (existingScript.getAttribute('data-loaded') == 'true') {
                    resolve();
                    return;
                }

                existingScript.addEventListener('load', function () { resolve(); }, { once: true });
                existingScript.addEventListener('error', function () { reject(new Error('Failed loading script: ' + scriptUrl)); }, { once: true });
                return;
            }

            var script = document.createElement('script');
            script.id = scriptId;
            script.src = scriptUrl;
            script.async = true;
            script.onload = function () {
                script.setAttribute('data-loaded', 'true');
                resolve();
            };
            script.onerror = function () {
                reject(new Error('Failed loading script: ' + scriptUrl));
            };
            document.head.appendChild(script);
        });

    }

    async function ensureJpegLsRuntime() {

        var jpegLsModule = globalThis?.EASIJpegLsModule ?? globalThis?.EASIJPEGLSModule ?? null;
        if (isJpegLsRuntimeModule(jpegLsModule) == true)
            return jpegLsModule;

        if (globalThis.__easiJpegLsLoadingPromise == null) {
            globalThis.__easiJpegLsLoadingPromise = (async function () {

                var jpegLsFactory = resolveJpegLsFactory();
                if (typeof jpegLsFactory != 'function') {

                    var scriptCandidates = [
                        '/easi-js/node_modules/@cornerstonejs/codec-charls/dist/dynamic-import/charlswasm_decode.js',
                        '/easi-js/node_modules/@cornerstonejs/codec-charls/dist/charlswasm_decode.js',
                        '/easi-js/node_modules/@cornerstonejs/codec-charls/dist/charlswasm.js'
                    ];

                    for (var scriptIndex = 0; scriptIndex < scriptCandidates.length; scriptIndex++) {
                        var scriptUrl = scriptCandidates[scriptIndex];
                        try {
                            await loadScriptOnce('easi-jpegls-wasm-script-' + String(scriptIndex), scriptUrl);
                        }
                        catch {
                            continue;
                        }

                        jpegLsFactory = resolveJpegLsFactory();
                        if (typeof jpegLsFactory == 'function')
                            break;
                    }
                }

                if (typeof jpegLsFactory != 'function') {
                    throw new Error('JPEG-LS factory export is unavailable.');
                }

                globalThis.EASIJpegLsFactory = jpegLsFactory;
                globalThis.EASIJPEGLSFactory = jpegLsFactory;

                var loadedModule = await jpegLsFactory({});
                if ((isJpegLsRuntimeModule(loadedModule) != true) && (isJpegLsRuntimeModule(loadedModule?.default) == true))
                    loadedModule = loadedModule.default;

                if (isJpegLsRuntimeModule(loadedModule) != true)
                    throw new Error('JPEG-LS module does not expose a compatible decode surface.');

                globalThis.EASIJpegLsModule = loadedModule;
                globalThis.EASIJPEGLSModule = loadedModule;
                return loadedModule;

            })().catch(function (error) {
                globalThis.__easiJpegLsLoadingPromise = null;
                throw error;
            });
        }

        return await globalThis.__easiJpegLsLoadingPromise;

    }

    function buildTranscodedDicomFileName(fileName, targetTransferSyntaxID) {

        var name = String(fileName ?? 'dicom').trim();
        if (name.length == 0)
            name = 'dicom';

        var extensionIndex = name.lastIndexOf('.');
        var baseName = (extensionIndex > 0)
            ? name.substring(0, extensionIndex)
            : name;

        var syntaxToken = String(targetTransferSyntaxID ?? '').trim();
        if (syntaxToken.length == 0)
            syntaxToken = 'unknown';

        syntaxToken = syntaxToken
            .replace(/[^\w.]/g, '_')
            .replace(/\.+/g, '.');

        return baseName + '_tx_' + syntaxToken + '.dcm';

    }

    function buildRoundTripDicomFileName(fileName, firstTransferSyntaxID, secondTransferSyntaxID) {

        var name = String(fileName ?? 'dicom').trim();
        if (name.length == 0)
            name = 'dicom';

        var extensionIndex = name.lastIndexOf('.');
        var baseName = (extensionIndex > 0)
            ? name.substring(0, extensionIndex)
            : name;

        var firstToken = String(firstTransferSyntaxID ?? '').trim().replace(/[^\w.]/g, '_');
        var secondToken = String(secondTransferSyntaxID ?? '').trim().replace(/[^\w.]/g, '_');

        if (firstToken.length == 0)
            firstToken = 'unknown';

        if (secondToken.length == 0)
            secondToken = 'unknown';

        return baseName + '_tx_' + firstToken + '_rt_' + secondToken + '.dcm';

    }

    async function inspectTransferSyntaxFromBytes(bytes) {

        if ((bytes == null) || (bytes.length == 0))
            return null;

        const probePipeline = EASI.pipelineBuilder()
            .fromByteStream()
            .ofDicomData()
            .toInstances()
            .build();

        var instanceResult = await probePipeline.process({ source: bytes });
        var instance = unwrapPipelineResult(instanceResult);
        if (Array.isArray(instance) == true)
            instance = instance[0] || null;
        return instance?.metaSet?.transferSyntaxUID?.ID ?? null;

    }

    async function ensureSourceDecoderRuntimes(sourceTransferSyntaxID) {

        if (isJpeg2000TransferSyntaxID(sourceTransferSyntaxID) == true) {
            await ensureOpenJpegRuntime();
        }

        if (isJpegLsTransferSyntaxID(sourceTransferSyntaxID) == true) {
            await ensureJpegLsRuntime();
        }

    }

    function downloadBytesAsFile(bytes, fileName, mimeType = 'application/zip') {

        if ((bytes == null) || (bytes.length == 0))
            return;

        var blob = new Blob([bytes], { type: mimeType });
        var objectUrl = URL.createObjectURL(blob);

        var link = document.createElement('a');
        link.href = objectUrl;
        link.download = fileName;
        link.style.display = 'none';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setTimeout(function () {
            URL.revokeObjectURL(objectUrl);
        }, 0);

    }

    function isFolderPickerSupported() {
        return (typeof window.showDirectoryPicker === 'function');
    }

    function updateFolderNormalizeLabels() {

        var inputLabel = 'Input: (not selected)';
        var outputLabel = 'Output: (not selected)';

        if (folderNormalizeInputHandle != null) {
            inputLabel = 'Input: ' + String(folderNormalizeInputHandle.name ?? '(selected)');
        }

        if (folderNormalizeOutputHandle != null) {
            outputLabel = 'Output: ' + String(folderNormalizeOutputHandle.name ?? '(selected)');
        }

        $('#folderNormalizeInputLabel').text(inputLabel);
        $('#folderNormalizeOutputLabel').text(outputLabel);

    }

    function normalizeFolderFileExtension(fileName) {

        var value = String(fileName ?? '').trim().toLowerCase();
        if (value.length == 0)
            return '';

        var lastDotIndex = value.lastIndexOf('.');
        if ((lastDotIndex < 0) || (lastDotIndex == (value.length - 1)))
            return '';

        return value.substring(lastDotIndex);

    }

    function isFolderNormalizeSupportedFile(fileName) {

        var extension = normalizeFolderFileExtension(fileName);
        return (
            (extension == '.png')
            || (extension == '.tif')
            || (extension == '.tiff')
            || (extension == '.jpg')
            || (extension == '.jpeg')
            || (extension == '.jepg')
            || (extension == '.dcm')
            || (extension == '.dicom')
            || (extension == '.ima')
        );

    }

    function inferFolderNormalizeContentType(fileName) {

        var extension = normalizeFolderFileExtension(fileName);

        if ((extension == '.jpg') || (extension == '.jpeg') || (extension == '.jepg'))
            return 'image/jpeg';

        if (extension == '.png')
            return 'image/png';

        if ((extension == '.tif') || (extension == '.tiff'))
            return 'image/tiff';

        if ((extension == '.dcm') || (extension == '.dicom'))
            return 'application/dicom';

        if (extension == '.ima')
            return 'application/dicom';

        return null;

    }

    function isFolderNormalizeDicomExtension(fileName) {

        var extension = normalizeFolderFileExtension(fileName);
        return (
            (extension == '.dcm')
            || (extension == '.dicom')
            || (extension == '.ima')
        );

    }

    function describeFolderNormalizeError(error) {

        var messages = [];
        var current = error;
        var depth = 0;

        while ((current != null) && (depth < 8)) {

            var message = (current?.message != null)
                ? String(current.message)
                : String(current);
            message = message.trim();

            if ((message.length > 0) && (messages.includes(message) == false)) {
                messages.push(message);
            }

            var next = (current?.error ?? current?.cause ?? null);
            if (next === current)
                break;

            current = next;
            depth += 1;

        }

        if (messages.length == 0)
            return 'Unknown error.';

        return messages.join(' -> ');

    }

    function sanitizeFolderOutputSegment(segment) {

        var value = String(segment ?? '').trim();
        if (value.length == 0)
            return 'file';

        var sanitized = value
            .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '_')
            .replace(/\s+/g, ' ')
            .trim();

        if (sanitized.length == 0)
            return 'file';

        return sanitized;

    }

    function buildFolderNormalizeOutputName(relativePath) {

        var normalizedPath = String(relativePath ?? '').replace(/\\/g, '/');
        var segments = normalizedPath.split('/').filter(function (segment) {
            return String(segment).trim().length > 0;
        }).map(sanitizeFolderOutputSegment);

        if (segments.length == 0)
            segments = ['image'];

        var flattened = segments.join('__');
        var extensionIndex = flattened.lastIndexOf('.');
        var baseName = (extensionIndex > 0)
            ? flattened.substring(0, extensionIndex)
            : flattened;

        if (baseName.length == 0)
            baseName = 'image';

        return baseName + '.tiff';

    }

    function buildUniqueFolderNormalizeOutputName(candidateName, usedNames) {

        var normalizedCandidate = String(candidateName ?? 'image.tiff');
        var key = normalizedCandidate.toLowerCase();

        if (usedNames.has(key) == false) {
            usedNames.add(key);
            return normalizedCandidate;
        }

        var extensionIndex = normalizedCandidate.lastIndexOf('.');
        var baseName = (extensionIndex > 0)
            ? normalizedCandidate.substring(0, extensionIndex)
            : normalizedCandidate;
        var extension = (extensionIndex > 0)
            ? normalizedCandidate.substring(extensionIndex)
            : '';

        var suffix = 2;
        while (true) {

            var nextName = baseName + '__' + String(suffix) + extension;
            var nextKey = nextName.toLowerCase();
            if (usedNames.has(nextKey) == false) {
                usedNames.add(nextKey);
                return nextName;
            }

            suffix += 1;

        }

    }

    async function ensureDirectoryPermission(handle, mode = 'read') {

        if (handle == null)
            return;

        if (typeof handle.queryPermission === 'function') {
            var permission = await handle.queryPermission({ mode: mode });
            if (permission === 'granted')
                return;
        }

        if (typeof handle.requestPermission === 'function') {
            var requested = await handle.requestPermission({ mode: mode });
            if (requested !== 'granted') {
                throw new Error('Permission denied for folder access (' + String(mode) + ').');
            }
        }

    }

    async function collectFolderNormalizeCandidates(rootDirectoryHandle) {

        var files = [];

        async function walk(directoryHandle, relativePrefix) {

            for await (var entry of directoryHandle.entries()) {

                var name = entry[0];
                var handle = entry[1];
                var relativePath = (relativePrefix.length > 0)
                    ? (relativePrefix + '/' + name)
                    : name;

                if (handle?.kind === 'directory') {
                    await walk(handle, relativePath);
                    continue;
                }

                if (handle?.kind !== 'file')
                    continue;

                if (isFolderNormalizeSupportedFile(name) != true)
                    continue;

                files.push({
                    fileHandle: handle,
                    fileName: name,
                    relativePath: relativePath
                });

            }

        }

        await walk(rootDirectoryHandle, '');
        files.sort(function (left, right) {
            return String(left?.relativePath ?? '').localeCompare(String(right?.relativePath ?? ''));
        });

        return files;

    }

    async function writeBytesToBrowserFileHandle(fileHandle, bytes) {

        var writable = await fileHandle.createWritable();

        try {
            await writable.write(bytes);
        }
        finally {
            await writable.close();
        }

    }

    function createFolderNormalizePipeline() {

        return EASI.pipelineBuilder()
            .fromFileStream()
            .ofMixedImagingData()
            .withBulkDataPolicy({
                mode: 'materialize',
                knownLengthThreshold: Number.MAX_SAFE_INTEGER,
                hardSafetyCap: Number.MAX_SAFE_INTEGER
            })
            .withNormalization(function (normalize) {
                return normalize.toFrames({
                    format: 'tiff',
                    includeRgba: false
                });
            })
            .toImageData()
            .build();

    }

    async function ensureFolderNormalizeDicomRuntime(file, ensuredTransferSyntaxes) {

        var transferSyntaxID = null;

        try {
            var probeBytes = new Uint8Array(await file.arrayBuffer());
            transferSyntaxID = await inspectTransferSyntaxFromBytes(probeBytes);
        }
        catch {
            transferSyntaxID = null;
        }

        if ((transferSyntaxID != null) && (ensuredTransferSyntaxes.has(transferSyntaxID) == false)) {
            await ensureSourceDecoderRuntimes(transferSyntaxID);
            ensuredTransferSyntaxes.add(transferSyntaxID);
        }

        return transferSyntaxID;

    }

    registerAction('selectFolderNormalizeInput', 'click', async function () {

        if (isFolderPickerSupported() != true) {
            throw new BlockedRunError('This browser does not support folder picking (showDirectoryPicker).');
        }

        try {

            folderNormalizeInputHandle = await window.showDirectoryPicker({
                id: 'easi-folder-normalize-input',
                mode: 'read'
            });
            updateFolderNormalizeLabels();

        }
        catch (error) {

            if (error?.name === 'AbortError')
                throw error;

            console.error(error);
            throw new BlockedRunError('Failed selecting input folder: ' + String(error?.message ?? error));

        }

    });

    registerAction('selectFolderNormalizeOutput', 'click', async function () {

        if (isFolderPickerSupported() != true) {
            throw new BlockedRunError('This browser does not support folder picking (showDirectoryPicker).');
        }

        try {

            folderNormalizeOutputHandle = await window.showDirectoryPicker({
                id: 'easi-folder-normalize-output',
                mode: 'readwrite'
            });
            updateFolderNormalizeLabels();

        }
        catch (error) {

            if (error?.name === 'AbortError')
                throw error;

            console.error(error);
            throw new BlockedRunError('Failed selecting output folder: ' + String(error?.message ?? error));

        }

    });

    registerAction('runFolderNormalizeToTiff', 'click', async function () {

        $('#folderNormalizeOutput').val('');

        if (isFolderPickerSupported() != true) {
            $('#folderNormalizeOutput').val('Folder normalization is unavailable in this browser. showDirectoryPicker is required.');
            throw new BlockedRunError('Folder normalization requires a browser with showDirectoryPicker support.');
        }

        if (folderNormalizeInputHandle == null) {
            throw new BlockedRunError('Please select an input folder first.');
        }

        if (folderNormalizeOutputHandle == null) {
            throw new BlockedRunError('Please select an output folder first.');
        }

        var started = new Date().getTime();
        var candidates = [];
        var processedCount = 0;
        var successCount = 0;
        var errorCount = 0;
        var totalBytesWritten = 0;
        var errorLines = [];
        var progressLines = [];
        var usedOutputNames = new Set();
        var ensuredTransferSyntaxes = new Set();

        try {

            $('#folderNormalizeOutput').val('Resolving folder permissions...');

            await ensureDirectoryPermission(folderNormalizeInputHandle, 'read');
            await ensureDirectoryPermission(folderNormalizeOutputHandle, 'readwrite');

            $('#folderNormalizeOutput').val('Scanning input folder recursively...');

            candidates = await collectFolderNormalizeCandidates(folderNormalizeInputHandle);

            if (candidates.length == 0) {
                $('#folderNormalizeOutput').val(
                    'No supported files found.\n'
                    + 'Supported extensions: .png, .tif, .tiff, .jpg, .jpeg, .jepg, .dcm, .dicom, .ima'
                );
                throw new BlockedRunError('No supported image or DICOM files were found in the selected folder.');
            }

            for (var index = 0; index < candidates.length; index++) {

                var candidate = candidates[index];
                var displayIndex = index + 1;
                var pipeline = createFolderNormalizePipeline();

                $('#folderNormalizeOutput').val(
                    'Running folder normalization...\n'
                    + 'Input Folder: ' + String(folderNormalizeInputHandle?.name ?? '(selected)') + '\n'
                    + 'Output Folder: ' + String(folderNormalizeOutputHandle?.name ?? '(selected)') + '\n'
                    + 'Candidates: ' + String(candidates.length) + '\n'
                    + 'Processed: ' + String(processedCount) + '\n'
                    + 'Succeeded: ' + String(successCount) + '\n'
                    + 'Failed: ' + String(errorCount) + '\n'
                    + 'Bytes Written: ' + String(totalBytesWritten) + '\n'
                    + '\nCurrent [' + String(displayIndex) + '/' + String(candidates.length) + ']: '
                    + String(candidate?.relativePath ?? '(unknown)')
                    + ((progressLines.length > 0)
                        ? ('\n\nRecent Activity:\n' + progressLines.slice(-20).join('\n'))
                        : '')
                );
                await yieldToBrowserFrame();

                try {

                    var file = await candidate.fileHandle.getFile();
                    var isDicomExtension = isFolderNormalizeDicomExtension(candidate.fileName);
                    var contentType = inferFolderNormalizeContentType(candidate.fileName);

                    if (isDicomExtension == true) {
                        try {
                            await ensureFolderNormalizeDicomRuntime(file, ensuredTransferSyntaxes);
                        }
                        catch (runtimeError) {
                            progressLines.push(
                                '[WARN] ' + String(candidate?.relativePath ?? '(unknown file)')
                                + ' runtime preflight: '
                                + describeFolderNormalizeError(runtimeError)
                            );
                        }
                    }

                    var invocation = {
                        source: file
                    };

                    if (contentType != null) {
                        invocation.sourceOptions = {
                            contentType: contentType
                        };
                    }

                    var normalizedResult = null;
                    var usedFallbackInvocation = false;

                    try {
                        normalizedResult = await pipeline.process(invocation);
                    }
                    catch (primaryError) {

                        if ((contentType == 'application/dicom') || (isDicomExtension == true)) {

                            // Fallback: do not force DICOM media-type; allow byte sniffing.
                            var fallbackInvocation = {
                                source: file
                            };

                            normalizedResult = await pipeline.process(fallbackInvocation);
                            usedFallbackInvocation = true;

                            progressLines.push(
                                '[WARN] ' + String(candidate?.relativePath ?? '(unknown file)')
                                + ' primary DICOM parse failed; fallback parse path succeeded.'
                            );

                        }
                        else {
                            throw primaryError;
                        }

                    }

                    normalizedResult = unwrapPipelineResult(normalizedResult);
                    if (Array.isArray(normalizedResult) == true) {
                        normalizedResult = normalizedResult[0] ?? null;
                    }

                    var outputBytes = normalizedResult?.bytes ?? null;
                    if ((outputBytes instanceof Uint8Array) == false) {
                        throw new Error('Normalization did not produce TIFF bytes.');
                    }

                    var suggestedOutputName = buildFolderNormalizeOutputName(candidate.relativePath);
                    var outputFileName = buildUniqueFolderNormalizeOutputName(suggestedOutputName, usedOutputNames);
                    var outputFileHandle = await folderNormalizeOutputHandle.getFileHandle(outputFileName, {
                        create: true
                    });

                    await writeBytesToBrowserFileHandle(outputFileHandle, outputBytes);

                    processedCount += 1;
                    successCount += 1;
                    totalBytesWritten += outputBytes.length;
                    progressLines.push(
                        '[OK] ' + String(candidate?.relativePath ?? '(unknown)')
                        + ' -> ' + String(outputFileName)
                        + ' (' + String(outputBytes.length) + ' bytes)'
                        + (usedFallbackInvocation ? ' [fallback parse]' : '')
                    );

                }
                catch (fileError) {

                    var fileErrorMessage = describeFolderNormalizeError(fileError);

                    processedCount += 1;
                    errorCount += 1;
                    errorLines.push(
                        '[' + String(displayIndex) + '/' + String(candidates.length) + '] '
                        + String(candidate?.relativePath ?? '(unknown file)')
                        + ' :: '
                        + fileErrorMessage
                    );
                    progressLines.push(
                        '[FAIL] ' + String(candidate?.relativePath ?? '(unknown file)')
                        + ' :: '
                        + fileErrorMessage
                    );
                    console.error('[Folder Normalize to TIFF]', {
                        file: candidate?.relativePath ?? null,
                        error: fileError
                    });

                }
                await yieldToBrowserFrame();

            }

            var elapsed = (new Date().getTime() - started);
            var lines = [
                'Folder normalization complete.',
                'Elapsed: ' + String(elapsed) + ' ms',
                'Input Folder: ' + String(folderNormalizeInputHandle?.name ?? '(selected)'),
                'Output Folder: ' + String(folderNormalizeOutputHandle?.name ?? '(selected)'),
                'Candidates: ' + String(candidates.length),
                'Processed: ' + String(processedCount),
                'Succeeded: ' + String(successCount),
                'Failed: ' + String(errorCount),
                'Bytes Written: ' + String(totalBytesWritten)
            ];

            if (errorLines.length > 0) {

                lines.push('');
                lines.push('Errors (first ' + String(Math.min(errorLines.length, 25)) + '):');

                for (var errorIndex = 0; errorIndex < errorLines.length; errorIndex++) {
                    if (errorIndex >= 25)
                        break;
                    lines.push(errorLines[errorIndex]);
                }

                if (errorLines.length > 25) {
                    lines.push('... ' + String(errorLines.length - 25) + ' additional error(s) omitted.');
                }

            }

            if (progressLines.length > 0) {
                lines.push('');
                lines.push('Recent Activity:');
                lines.push(progressLines.slice(-25).join('\n'));
            }

            $('#folderNormalizeOutput').val(lines.join('\n'));

            console.log({
                scenario: 'Folder Normalize to TIFF',
                elapsedMs: elapsed,
                candidates: candidates.length,
                processed: processedCount,
                succeeded: successCount,
                failed: errorCount,
                bytesWritten: totalBytesWritten,
                errors: errorLines
            });
            feedback.capture({ processed: processedCount, succeeded: successCount, failed: errorCount, bytesWritten: totalBytesWritten });
            if (errorCount > 0)
                throw new Error('Folder normalization completed with ' + errorCount + ' failed file(s). See the folder output for details.');

        }
        catch (error) {

            $('#folderNormalizeOutput').val(
                'Folder normalization failed.\n'
                + String(error?.message ?? error)
                + '\n\n'
                + String(error?.stack ?? '')
            );

            console.error(error);

            throw error;

        }

    });

    registerAction('parseLocalFile', 'click', function () {
        var file = this.files[0];
        var url = URL.createObjectURL(file);
        const pipeline = applyDicomDataValidation(
            EASI.pipelineBuilder().fromHttpStream().ofDicomData()
        ).toInstances().build();
        return processWithTiming(pipeline, url, null, 'Parse local DICOM')
            .then(result => { console.log(result); return result; })
            .finally(() => URL.revokeObjectURL(url));
    });

    registerAction('decodeLocalFile', 'click', function () {

        // Create an object URL from the selected file
        var url = URL.createObjectURL(this.files[0]);

        // Build the DICOM streaming reader
        const pipeline = applyDicomDataValidation(
            EASI.pipelineBuilder()
                .fromHttpStream()
                .ofDicomData()
        ).toEntities().build();

        // Read and parse the DICOM file
        return processWithTiming(pipeline, url)
            .then(result => {

                // Establish the parsed entity
                var entity = Array.isArray(result) ? result[0] : result;

                // Log the entity
                console.log(entity);

                var patientID = entity?.patient?.patientID;
                var patientName = entity?.patient?.patientName;
                var patientDOB = entity?.patient?.patientBirthDate;

                // Establish the image entity when available
                var imageEntity = (entity && (typeof entity.decodeFrame == 'function')) ? entity : null;

                if (imageEntity == null) {
                    throw new BlockedRunError('This DICOM file has no supported image entity to preview. Parsing is available separately.');
                }

                // Create the destination for the decode (4 BYTES PER PIXEL)
                var destination = new Uint8Array(imageEntity.imagePixelModule.columns * imageEntity.imagePixelModule.rows * 4);

                // Decoce into the destination
                if (imageEntity.decodeFrame(destination) !== true)
                    throw new Error('Pixel decoding did not succeed. Inspect the transfer syntax and decoder details in the console.');

                // Create the image data from the decoded data
                var data = new ImageData(
                    new Uint8ClampedArray(destination),
                    imageEntity.imagePixelModule.columns,
                    imageEntity.imagePixelModule.rows);

                var width = imageEntity.imagePixelModule.columns;
                var height = imageEntity.imagePixelModule.rows;

                const canvas = document.getElementById("canvas");
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext("2d");

                ctx.fillRect(0, 0, width, height);
                ctx.putImageData(data, 0, 0);

            })
            .finally(() => URL.revokeObjectURL(url));

    });

    // Handle Instance
    registerAction('instance', 'click', function () {

        // Build the DICOM streaming reader
        const pipeline = applyDicomDataValidation(
            EASI.pipelineBuilder()
                .fromHttpStream()
                .ofDicomData()
        ).toInstances().build();

        // Read and parse the DICOM file
        return processWithTiming(pipeline, getDicomwebUrl('instance'))
            .then(result => console.log(result))
            .catch(err => { throw err; });

    });

    registerAction('deinstance', 'click', function () {

        // Build the DICOM streaming reader
        const pipeline = applyDicomDataValidation(
            EASI.pipelineBuilder()
                .fromHttpStream()
                .ofDicomData()
                .withDeIdentification()
        ).toInstances().build();

        // Read and parse the DICOM file
        return processWithTiming(pipeline, getDicomwebUrl('instance'))
            .then(result => console.log(result))
            .catch(err => { throw err; });

    });

    registerAction('dimseCFindStudies', 'click', async function () {

        $('#dimseFindOutput').val('Running DIMSE C-FIND study request...');

        var payload = {
            dimseAssociation: {
                host: getTrimmedInput('#dimseHost') ?? '127.0.0.1',
                port: getIntegerInput('#dimsePort', 4242),
                calledAeTitle: getTrimmedInput('#dimseCalledAeTitle') ?? 'ORTHANC',
                callingAeTitle: getTrimmedInput('#dimseCallingAeTitle') ?? 'EASI_JS'
            },
            outputMode: getDimseOutputMode(),
            queryRetrieveModel: getTrimmedInput('#dimseQrModel') ?? 'study-root',
            modality: getTrimmedInput('#dimseFindModality')
        };

        try {

            var start = new Date().getTime();

            var backendUrl = resolveDimseRequestUrl('/easi-js/samples/kitchen-sink/api/dimse/cfind-studies', getTrimmedInput('#dimseBackendUrl'));
            var body = await postDimseRequest(backendUrl, payload, 'DIMSE C-FIND');

            var elapsed = (new Date().getTime() - start);

            $('#dimseFindOutput').val(
                'DIMSE C-FIND succeeded.\n'
                + 'Elapsed (browser): ' + elapsed + ' ms\n'
                + 'Association: ' + (body?.association?.callingAeTitle ?? 'UNKNOWN')
                + ' -> '
                + (body?.association?.calledAeTitle ?? 'UNKNOWN')
                + ' @ '
                + (body?.association?.host ?? 'UNKNOWN')
                + ':'
                + String(body?.association?.port ?? '?')
                + '\n'
                + 'Pipeline Output: ' + String(body?.outputMode ?? payload.outputMode)
                + '\n'
                + 'Query Model: ' + String(body?.request?.queryRetrieveModel ?? 'N/A') + '\n'
                + 'Query Level: ' + String(body?.request?.queryRetrieveLevel ?? 'N/A') + '\n'
                + 'Modality Filter: ' + String(body?.request?.modality ?? 'none') + '\n'
                + 'Concerns: ' + String(body?.concernCount ?? 0) + '\n'
                + 'Result Count: ' + String(body?.resultCount ?? 0)
                + '\n\nSummary:\n'
                + JSON.stringify(body?.resultSummary ?? [], null, 2)
                + '\n\nTiming (server):\n'
                + JSON.stringify(body?.timingsMs ?? {}, null, 2)
            );

            if (body?.outputMode === 'fhir-imaging-study') {
                $('#dimseFindOutput').val(
                    $('#dimseFindOutput').val()
                    + '\n\nFHIR ImagingStudies:\n'
                    + JSON.stringify(body?.fhirImagingStudies ?? [], null, 2)
                );
            }
            else {
                $('#dimseFindOutput').val(
                    $('#dimseFindOutput').val()
                    + '\n\nInstance Summaries:\n'
                    + JSON.stringify(body?.instanceSummaries ?? [], null, 2)
                );
            }

            if ((Array.isArray(body?.concerns) == true) && (body.concerns.length > 0)) {
                $('#dimseFindOutput').val(
                    $('#dimseFindOutput').val()
                    + '\n\nConcerns:\n'
                    + JSON.stringify(body.concerns, null, 2)
                );
            }

            console.log('[DIMSE C-FIND]', body);
            return body;

        }
        catch (error) {

            reportDimseRequestError('#dimseFindOutput', 'DIMSE C-FIND', error);

            throw error;

        }

    });

    registerAction('dimseCGetInstance', 'click', async function () {

        $('#dimseOutput').val('Running DIMSE C-GET request...');

        var payload = {
            orthancHttpUrl: getTrimmedInput('#dimseOrthancHttpUrl') ?? 'http://localhost:8042',
            dimseAssociation: {
                host: getTrimmedInput('#dimseHost') ?? '127.0.0.1',
                port: getIntegerInput('#dimsePort', 4242),
                calledAeTitle: getTrimmedInput('#dimseCalledAeTitle') ?? 'ORTHANC',
                callingAeTitle: getTrimmedInput('#dimseCallingAeTitle') ?? 'EASI_JS'
            },
            outputMode: getDimseOutputMode(),
            queryRetrieveModel: getTrimmedInput('#dimseQrModel') ?? 'study-root',
            studyInstanceUid: getTrimmedInput('#dimseStudyInstanceUid'),
            seriesInstanceUid: getTrimmedInput('#dimseSeriesInstanceUid'),
            sopInstanceUid: getTrimmedInput('#dimseSopInstanceUid')
        };

        try {

            var start = new Date().getTime();

            var backendUrl = resolveDimseRequestUrl('/easi-js/samples/kitchen-sink/api/dimse/cget-instance', getTrimmedInput('#dimseBackendUrl'));
            var body = await postDimseRequest(backendUrl, payload, 'DIMSE C-GET');

            var elapsed = (new Date().getTime() - start);

            $('#dimseOutput').val(
                'DIMSE C-GET succeeded.\n'
                + 'Elapsed (browser): ' + elapsed + ' ms\n'
                + 'Used Orthanc discovery: ' + String(body.usedOrthancDiscovery === true) + '\n'
                + 'Association: ' + (body?.association?.callingAeTitle ?? 'UNKNOWN')
                + ' -> '
                + (body?.association?.calledAeTitle ?? 'UNKNOWN')
                + ' @ '
                + (body?.association?.host ?? 'UNKNOWN')
                + ':'
                + String(body?.association?.port ?? '?')
                + '\n'
                + 'Pipeline Output: ' + String(body?.outputMode ?? payload.outputMode)
                + '\n'
                + 'Study UID: ' + String(body?.request?.studyInstanceUid ?? 'N/A') + '\n'
                + 'Series UID: ' + String(body?.request?.seriesInstanceUid ?? 'N/A') + '\n'
                + 'SOP UID: ' + String(body?.request?.sopInstanceUid ?? 'N/A') + '\n'
                + 'Concerns: ' + String(body?.concernCount ?? 0) + '\n'
                + '\nSummary:\n'
                + JSON.stringify(body?.resultSummary ?? {}, null, 2)
                + '\n\nTiming (server):\n'
                + JSON.stringify(body?.timingsMs ?? {}, null, 2)
            );

            if (body?.outputMode === 'fhir-imaging-study') {
                $('#dimseOutput').val(
                    $('#dimseOutput').val()
                    + '\n\nFHIR ImagingStudy:\n'
                    + JSON.stringify(body?.fhirImagingStudy ?? {}, null, 2)
                );
            }

            if ((Array.isArray(body?.concerns) == true) && (body.concerns.length > 0)) {
                $('#dimseOutput').val(
                    $('#dimseOutput').val()
                    + '\n\nConcerns:\n'
                    + JSON.stringify(body.concerns, null, 2)
                );
            }

            console.log('[DIMSE C-GET]', body);
            return body;

        }
        catch (error) {

            reportDimseRequestError('#dimseOutput', 'DIMSE C-GET', error);

            throw error;

        }

    });

    registerAction('dimseCMoveRelayDeidentify', 'click', async function () {

        $('#dimseRelayOutput').val('Running DIMSE C-MOVE de-identification relay...');

        var payload = {
            orthancHttpUrl: getTrimmedInput('#dimseOrthancHttpUrl') ?? 'http://localhost:8042',
            sourceAssociation: {
                host: getTrimmedInput('#dimseHost') ?? '127.0.0.1',
                port: getIntegerInput('#dimsePort', 4242),
                calledAeTitle: getTrimmedInput('#dimseCalledAeTitle') ?? 'ORTHANC',
                callingAeTitle: getTrimmedInput('#dimseCallingAeTitle') ?? 'EASI_JS'
            },
            destinationAssociation: {
                host: getTrimmedInput('#dimseDestinationHost') ?? '127.0.0.1',
                port: getIntegerInput('#dimseDestinationPort', 4242),
                calledAeTitle: getTrimmedInput('#dimseDestinationCalledAeTitle') ?? 'ORTHANC',
                callingAeTitle: getTrimmedInput('#dimseDestinationCallingAeTitle') ?? 'EASI_JS'
            },
            queryRetrieveModel: getTrimmedInput('#dimseQrModel') ?? 'study-root',
            studyInstanceUid: getTrimmedInput('#dimseStudyInstanceUid'),
            seriesInstanceUid: getTrimmedInput('#dimseSeriesInstanceUid'),
            sopInstanceUid: getTrimmedInput('#dimseSopInstanceUid'),
            moveDestinationAeTitle: getTrimmedInput('#dimseMoveDestinationAeTitle') ?? 'EASI_MOVE_DEST',
            moveStoreHost: getTrimmedInput('#dimseMoveStoreHost') ?? '127.0.0.1',
            moveStorePort: getIntegerInput('#dimseMoveStorePort', 4104),
            moveStoreCalledAeTitle: getTrimmedInput('#dimseMoveStoreCalledAeTitle') ?? 'EASI_MOVE_DEST',
            reassignUids: ($('#dimseRelayReassignUids').is(':checked') === true)
        };

        try {

            var start = new Date().getTime();

            var backendUrl = resolveDimseRequestUrl('/easi-js/samples/kitchen-sink/api/dimse/cmove-deidentify-relay', getTrimmedInput('#dimseBackendUrl'));
            var body = await postDimseRequest(backendUrl, payload, 'DIMSE C-MOVE relay');

            var elapsed = (new Date().getTime() - start);

            $('#dimseRelayOutput').val(
                'DIMSE C-MOVE relay succeeded.\n'
                + 'Elapsed (browser): ' + elapsed + ' ms\n'
                + 'Used Orthanc discovery: ' + String(body.usedOrthancDiscovery === true) + '\n'
                + 'Source AE: ' + (body?.sourceAssociation?.callingAeTitle ?? 'UNKNOWN')
                + ' -> '
                + (body?.sourceAssociation?.calledAeTitle ?? 'UNKNOWN')
                + ' @ '
                + (body?.sourceAssociation?.host ?? 'UNKNOWN')
                + ':'
                + String(body?.sourceAssociation?.port ?? '?')
                + '\n'
                + 'Destination AE: ' + (body?.destinationAssociation?.callingAeTitle ?? 'UNKNOWN')
                + ' -> '
                + (body?.destinationAssociation?.calledAeTitle ?? 'UNKNOWN')
                + ' @ '
                + (body?.destinationAssociation?.host ?? 'UNKNOWN')
                + ':'
                + String(body?.destinationAssociation?.port ?? '?')
                + '\n'
                + 'Move Destination AE: ' + String(body?.request?.moveDestinationAeTitle ?? 'N/A') + '\n'
                + 'Move Store Endpoint: ' + String(body?.request?.moveStoreHost ?? 'N/A')
                + ':'
                + String(body?.request?.moveStorePort ?? 'N/A')
                + ' (Called AE: '
                + String(body?.request?.moveStoreCalledAeTitle ?? 'N/A')
                + ')\n'
                + 'Source SOP UID: ' + String(body?.relayResult?.sourceSopInstanceUid ?? 'N/A') + '\n'
                + 'Destination SOP UID: ' + String(body?.relayResult?.destinationSopInstanceUid ?? 'N/A') + '\n'
                + 'DIMSE Status: ' + String(body?.relayResult?.dimseStatus ?? 'N/A') + '\n'
                + 'Concerns: ' + String(body?.concernCount ?? 0) + '\n'
                + 'Bytes Written: ' + String(body?.relayResult?.bytesWritten ?? 'N/A')
                + '\n\nRelay Result:\n'
                + JSON.stringify(body?.relayResult ?? {}, null, 2)
                + '\n\nTiming (server):\n'
                + JSON.stringify(body?.timingsMs ?? {}, null, 2)
            );

            if ((Array.isArray(body?.concerns) == true) && (body.concerns.length > 0)) {
                $('#dimseRelayOutput').val(
                    $('#dimseRelayOutput').val()
                    + '\n\nConcerns:\n'
                    + JSON.stringify(body.concerns, null, 2)
                );
            }

            console.log('[DIMSE C-MOVE Relay]', body);
            return body;

        }
        catch (error) {

            reportDimseRequestError('#dimseRelayOutput', 'DIMSE C-MOVE relay', error);

            throw error;

        }

    });

    registerAction('deidentifyStreamSave', 'click', async function () {

        $('#deidentifyStreamOutput').val('');

        var file = $('#dicomDeidentifyStreamFile')[0]?.files?.[0];
        if (file == null) {
            throw new BlockedRunError('Please select a DICOM file first.');
        }

        var sourceUrl = URL.createObjectURL(file);
        var outputFileName = buildDeidentifiedDicomFileName(file.name);

        var fileHandle = null;
        var chunkCount = 0;
        var bytesStreamed = 0;

        try {

            if (typeof window.showSaveFilePicker === 'function') {
                fileHandle = await window.showSaveFilePicker({
                    suggestedName: outputFileName,
                    types: [{
                        description: 'DICOM files',
                        accept: { 'application/dicom': ['.dcm', '.dicom'] }
                    }]
                });
            }

            var pipelineBuilder = applyDicomDataValidation(
                EASI.pipelineBuilder()
                    .fromHttpStream()
                    .ofDicomData()
                    .withDeIdentification(Tag.DefaultDeIdentificationMask)
            )
            .toDicomData();

            var writerOptions = {
                chunkSize: (64 * 1024),
                onChunk: function (chunk) {

                    if ((chunk == null) || (chunk.length == 0))
                        return;

                    bytesStreamed += chunk.length;
                    chunkCount += 1;
                }
            };

            var pipeline = null;
            if (fileHandle != null) {
                pipeline = pipelineBuilder
                    .intoBrowserFileStream(fileHandle, writerOptions)
                    .build();
            }
            else {
                pipeline = pipelineBuilder
                    .intoByteBuffer(Object.assign({}, writerOptions, {
                        collectOutput: true
                    }))
                    .build();
            }

            var result = await processWithTiming(
                pipeline,
                sourceUrl,
                null,
                'De-Identify + Stream Save'
            );

            if (fileHandle == null) {
                var outputBytes = result?.body ?? new Uint8Array(0);
                if (outputBytes.length == 0) {
                    throw new Error('No output bytes were produced by the de-identification pipeline.');
                }
                downloadBytesAsFile(outputBytes, outputFileName, 'application/dicom');
            }

            $('#deidentifyStreamOutput').val(
                'Source: ' + file.name + '\n'
                + 'Output: ' + outputFileName + '\n'
                + 'Chunks streamed: ' + chunkCount + '\n'
                + 'Bytes streamed: ' + bytesStreamed + '\n'
                + 'Writer result bytesWritten: ' + String(result?.bytesWritten ?? bytesStreamed)
            );

            console.log({
                sourceFile: file.name,
                outputFile: outputFileName,
                chunksStreamed: chunkCount,
                bytesStreamed: bytesStreamed,
                writerResult: result
            });

        }
        catch (err) {

            if (err?.name === 'AbortError') {
                $('#deidentifyStreamOutput').val('Save cancelled by user.');
                throw err;
            }

            $('#deidentifyStreamOutput').val(
                'Stream save failed.\n'
                + (err?.message ?? String(err))
            );

            console.log(err);

            throw err;

        }
        finally {
            URL.revokeObjectURL(sourceUrl);
        }

    });

    registerAction('burnedInRedactionStreamSave', 'click', async function () {

        $('#burnedInRedactionStreamOutput').val('');

        var file = $('#dicomBurnedInRedactionFile')[0]?.files?.[0];
        if (file == null) {
            throw new BlockedRunError('Please select a DICOM file first.');
        }

        var sourceUrl = URL.createObjectURL(file);
        var outputFileName = buildBurnedInRedactedDicomFileName(file.name);
        var redactionOptions = getBurnedInRedactionOptions();
        if ((redactionOptions.mode == 'regions')
            && ((Array.isArray(redactionOptions.regions) == false) || (redactionOptions.regions.length == 0))) {
            URL.revokeObjectURL(sourceUrl);
            throw new BlockedRunError('Please enable at least one redaction region (R1-R4).');
        }
        var redactionConcerns = [];

        var fileHandle = null;
        var chunkCount = 0;
        var bytesStreamed = 0;

        try {

            if (typeof window.showSaveFilePicker === 'function') {
                fileHandle = await window.showSaveFilePicker({
                    suggestedName: outputFileName,
                    types: [{
                        description: 'DICOM files',
                        accept: { 'application/dicom': ['.dcm', '.dicom'] }
                    }]
                });
            }

            var pipelineBuilder = applyDicomDataValidation(
                EASI.pipelineBuilder()
                    .fromHttpStream()
                    .ofDicomData()
                    .withBurnedInRedaction(Object.assign({}, redactionOptions, {
                        onConcern: function (concern) {
                            redactionConcerns.push(concern);
                            console.warn('[Burned-In Redaction]', concern);
                        }
                    }))
            )
            .toDicomData();

            var writerOptions = {
                chunkSize: (64 * 1024),
                onChunk: function (chunk) {

                    if ((chunk == null) || (chunk.length == 0))
                        return;

                    bytesStreamed += chunk.length;
                    chunkCount += 1;

                }
            };

            var pipeline = null;
            if (fileHandle != null) {
                pipeline = pipelineBuilder
                    .intoBrowserFileStream(fileHandle, writerOptions)
                    .build();
            }
            else {
                pipeline = pipelineBuilder
                    .intoByteBuffer(Object.assign({}, writerOptions, {
                        collectOutput: true
                    }))
                    .build();
            }

            var result = await processWithTiming(
                pipeline,
                sourceUrl,
                null,
                'Burned-In Redaction + Stream Save'
            );

            if (fileHandle == null) {
                var outputBytes = result?.body ?? new Uint8Array(0);
                if (outputBytes.length == 0) {
                    throw new Error('No output bytes were produced by the burned-in redaction pipeline.');
                }
                downloadBytesAsFile(outputBytes, outputFileName, 'application/dicom');
            }

            $('#burnedInRedactionStreamOutput').val(
                'Source: ' + file.name + '\n'
                + 'Output: ' + outputFileName + '\n'
                + 'Mode: ' + String(redactionOptions.mode ?? 'regions') + '\n'
                + 'Action: ' + String(redactionOptions.action ?? 'black') + '\n'
                + 'Coordinate mode: ' + String(redactionOptions.coordinateMode ?? 'auto-fit') + '\n'
                + 'Regions (' + String(redactionOptions.regions?.length ?? 0) + '): ' + JSON.stringify(redactionOptions.regions ?? []) + '\n'
                + ((redactionOptions.mode == 'ocr-regions')
                    ? ('OCR Options: ' + JSON.stringify(redactionOptions.ocrRegions ?? {}) + '\n')
                    : '')
                + ((redactionOptions.action == 'constant')
                    ? ('Fill: ' + String(redactionOptions.fill ?? 0) + '\n')
                    : '')
                + 'Concerns: ' + String(redactionConcerns.length) + '\n'
                + 'Chunks streamed: ' + chunkCount + '\n'
                + 'Bytes streamed: ' + bytesStreamed + '\n'
                + 'Writer result bytesWritten: ' + String(result?.bytesWritten ?? bytesStreamed)
            );

            console.log({
                sourceFile: file.name,
                outputFile: outputFileName,
                redactionOptions: redactionOptions,
                chunksStreamed: chunkCount,
                bytesStreamed: bytesStreamed,
                writerResult: result
            });

        }
        catch (err) {

            if (err?.name === 'AbortError') {
                $('#burnedInRedactionStreamOutput').val('Save cancelled by user.');
                throw err;
            }

            $('#burnedInRedactionStreamOutput').val(
                'Burned-in redaction stream save failed.\n'
                + (err?.message ?? String(err))
            );

            console.log(err);

            throw err;

        }
        finally {
            URL.revokeObjectURL(sourceUrl);
        }

    });

    registerAction('transcodeStreamSave', 'click', async function () {

        $('#transcodeStreamOutput').val('');

        var file = $('#dicomTranscodeStreamFile')[0]?.files?.[0];
        if (file == null) {
            throw new BlockedRunError('Please select a DICOM file first.');
        }

        var sourceUrl = URL.createObjectURL(file);
        var targetTransferSyntaxID = getTranscodeTargetTransferSyntaxID();
        var roundTripEnabled = getTranscodeRoundTripEnabled();
        var roundTripTargetTransferSyntaxID = getTranscodeRoundTripTargetTransferSyntaxID();
        var fallbackMode = getTranscodeFallbackMode();
        var lossyQuality = getTranscodeLossyQuality();
        var compressionRatio = getTranscodeCompressionRatio();
        var stageOneNeedsOpenJpeg = isJpeg2000TransferSyntaxID(targetTransferSyntaxID);
        var stageTwoNeedsOpenJpeg = ((roundTripEnabled === true) && isJpeg2000TransferSyntaxID(roundTripTargetTransferSyntaxID));
        var stageOneNeedsJpegLs = false;
        var stageTwoNeedsJpegLs = false;
        var sourceObservedTransferSyntax = null;
        var outputFileName = roundTripEnabled
            ? buildRoundTripDicomFileName(file.name, targetTransferSyntaxID, roundTripTargetTransferSyntaxID)
            : buildTranscodedDicomFileName(file.name, targetTransferSyntaxID);

        var fileHandle = null;
        var chunkCount = 0;
        var bytesStreamed = 0;
        var transcodeConcerns = [];
        var transcodeFrameEvents = 0;
        var roundTripConcerns = [];
        var roundTripFrameEvents = 0;

        try {

            try {
                var sourceProbeBytes = new Uint8Array(await file.arrayBuffer());
                sourceObservedTransferSyntax = await inspectTransferSyntaxFromBytes(sourceProbeBytes);
            }
            catch (probeError) {
                console.warn('Unable to inspect source transfer syntax prior to transcoding.', probeError);
            }

            stageOneNeedsJpegLs = isJpegLsTransferSyntaxID(sourceObservedTransferSyntax);
            stageTwoNeedsJpegLs = ((roundTripEnabled === true) && isJpegLsTransferSyntaxID(targetTransferSyntaxID));

            if ((stageOneNeedsOpenJpeg == true) || (stageTwoNeedsOpenJpeg == true)) {
                await ensureOpenJpegRuntime();
            }

            if ((stageOneNeedsJpegLs == true) || (stageTwoNeedsJpegLs == true)) {
                await ensureJpegLsRuntime();
            }

            if (typeof window.showSaveFilePicker === 'function') {
                fileHandle = await window.showSaveFilePicker({
                    suggestedName: outputFileName,
                    types: [{
                        description: 'DICOM files',
                        accept: { 'application/dicom': ['.dcm', '.dicom'] }
                    }]
                });
            }

            var stageOneBuilder = applyDicomDataValidation(
                EASI.pipelineBuilder()
                    .fromHttpStream()
                    .ofDicomData()
                    .withTranscoding({
                        targetTransferSyntax: targetTransferSyntaxID,
                        fallback: fallbackMode,
                        codec: buildTranscodeCodecOptions(targetTransferSyntaxID, lossyQuality, compressionRatio),
                        onConcern: function (concern) {
                            transcodeConcerns.push(concern);
                            console.warn('[DICOM Transcoding]', concern);
                        },
                        onFrame: function (frame) {
                            transcodeFrameEvents += 1;
                            return Status.CONTINUE;
                        }
                    })
            )
            .toDicomData();
            var stageOneResult = await processWithTiming(
                stageOneBuilder
                    .intoByteBuffer({
                        chunkSize: (64 * 1024),
                        collectOutput: true
                    })
                    .build(),
                sourceUrl,
                null,
                'Transcode Stage 1'
            );

            var stageOneBytes = stageOneResult?.body ?? new Uint8Array(0);
            if (stageOneBytes.length == 0) {
                throw new Error('No output bytes were produced by transcoding stage 1.');
            }

            var stageOneObservedTransferSyntax = null;
            try {
                stageOneObservedTransferSyntax = await inspectTransferSyntaxFromBytes(stageOneBytes);
            }
            catch (probeError) {
                console.warn('Unable to inspect stage 1 transfer syntax.', probeError);
            }

            var finalBytes = stageOneBytes;
            var finalResult = stageOneResult;
            var stageTwoObservedTransferSyntax = null;

            if (roundTripEnabled === true) {

                var stageTwoBuilder = applyDicomDataValidation(
                    EASI.pipelineBuilder()
                        .fromByteStream()
                        .ofDicomData()
                        .withTranscoding({
                            targetTransferSyntax: roundTripTargetTransferSyntaxID,
                            fallback: fallbackMode,
                            codec: buildTranscodeCodecOptions(roundTripTargetTransferSyntaxID, lossyQuality, compressionRatio),
                            onConcern: function (concern) {
                                roundTripConcerns.push(concern);
                                console.warn('[DICOM Transcoding Round-Trip]', concern);
                            },
                            onFrame: function () {
                                roundTripFrameEvents += 1;
                                return Status.CONTINUE;
                            }
                        })
                )
                .toDicomData();

                finalResult = await processWithTiming(
                    stageTwoBuilder
                        .intoByteBuffer({
                            chunkSize: (64 * 1024),
                            collectOutput: true
                        })
                        .build(),
                    stageOneBytes,
                    null,
                    'Transcode Stage 2 (Round-Trip)'
                );

                finalBytes = finalResult?.body ?? new Uint8Array(0);
                if (finalBytes.length == 0) {
                    throw new Error('No output bytes were produced by transcoding stage 2.');
                }

                try {
                    stageTwoObservedTransferSyntax = await inspectTransferSyntaxFromBytes(finalBytes);
                }
                catch (probeError) {
                    console.warn('Unable to inspect stage 2 transfer syntax.', probeError);
                }

            }

            var writerOptions = {
                chunkSize: (64 * 1024),
                onChunk: function (chunk) {
                    if ((chunk == null) || (chunk.length == 0))
                        return;

                    bytesStreamed += chunk.length;
                    chunkCount += 1;
                }
            };

            if (fileHandle != null) {
                await processWithTiming(
                    EASI.pipelineBuilder()
                        .fromByteStream()
                        .ofDicomData()
                        .toDicomData()
                        .intoBrowserFileStream(fileHandle, writerOptions)
                        .build(),
                    finalBytes,
                    null,
                    'Transcode Output Stream Save'
                );
            }
            else {
                // Browser fallback: direct download when no File System Access API.
                bytesStreamed = finalBytes.length;
                chunkCount = 1;
                downloadBytesAsFile(finalBytes, outputFileName, 'application/dicom');
            }

            $('#transcodeStreamOutput').val(
                'Source: ' + file.name + '\n'
                + 'Source observed Transfer Syntax: ' + String(sourceObservedTransferSyntax ?? 'unknown') + '\n'
                + 'Output: ' + outputFileName + '\n'
                + 'Round-trip enabled: ' + String(roundTripEnabled) + '\n'
                + 'Stage 1 target Transfer Syntax: ' + targetTransferSyntaxID + '\n'
                + 'Stage 1 observed Transfer Syntax: ' + String(stageOneObservedTransferSyntax ?? 'unknown') + '\n'
                + 'Stage 1 frame events: ' + transcodeFrameEvents + '\n'
                + 'Stage 1 concerns: ' + transcodeConcerns.length + '\n'
                + 'Stage 1 lossy quality: '
                + (isLossyTransferSyntaxID(targetTransferSyntaxID) ? String(lossyQuality) : 'n/a (lossless/non-lossy target)')
                + '\n'
                + 'Stage 1 compression ratio: '
                + (isLossyTransferSyntaxID(targetTransferSyntaxID) ? String(compressionRatio) : 'n/a (lossless/non-lossy target)')
                + '\n'
                + (roundTripEnabled
                    ? ('Stage 2 target Transfer Syntax: ' + roundTripTargetTransferSyntaxID + '\n'
                        + 'Stage 2 observed Transfer Syntax: ' + String(stageTwoObservedTransferSyntax ?? 'unknown') + '\n'
                        + 'Stage 2 frame events: ' + roundTripFrameEvents + '\n'
                        + 'Stage 2 concerns: ' + roundTripConcerns.length + '\n'
                        + 'Stage 2 lossy quality: '
                        + (isLossyTransferSyntaxID(roundTripTargetTransferSyntaxID) ? String(lossyQuality) : 'n/a (lossless/non-lossy target)')
                        + '\n'
                        + 'Stage 2 compression ratio: '
                        + (isLossyTransferSyntaxID(roundTripTargetTransferSyntaxID) ? String(compressionRatio) : 'n/a (lossless/non-lossy target)')
                        + '\n')
                    : '')
                + 'Fallback: ' + fallbackMode + '\n'
                + 'Chunks streamed: ' + chunkCount + '\n'
                + 'Bytes streamed: ' + bytesStreamed + '\n'
                + 'Final bytes: ' + String(finalResult?.bytesWritten ?? finalBytes.length)
            );

            console.log({
                sourceFile: file.name,
                outputFile: outputFileName,
                roundTripEnabled: roundTripEnabled,
                stageOne: {
                    targetTransferSyntax: targetTransferSyntaxID,
                    observedTransferSyntax: stageOneObservedTransferSyntax,
                    lossyQuality: (isLossyTransferSyntaxID(targetTransferSyntaxID) ? lossyQuality : null),
                    compressionRatio: (isLossyTransferSyntaxID(targetTransferSyntaxID) ? compressionRatio : null),
                    frameEvents: transcodeFrameEvents,
                    concerns: transcodeConcerns
                },
                stageTwo: (roundTripEnabled ? {
                    targetTransferSyntax: roundTripTargetTransferSyntaxID,
                    observedTransferSyntax: stageTwoObservedTransferSyntax,
                    lossyQuality: (isLossyTransferSyntaxID(roundTripTargetTransferSyntaxID) ? lossyQuality : null),
                    compressionRatio: (isLossyTransferSyntaxID(roundTripTargetTransferSyntaxID) ? compressionRatio : null),
                    frameEvents: roundTripFrameEvents,
                    concerns: roundTripConcerns
                } : null),
                fallbackMode: fallbackMode,
                chunksStreamed: chunkCount,
                bytesStreamed: bytesStreamed
            });

        }
        catch (err) {

            if (err?.name === 'AbortError') {
                $('#transcodeStreamOutput').val('Save cancelled by user.');
                throw err;
            }

            var concernsSummary = [];
            if (Array.isArray(transcodeConcerns) == true) {
                for (var concernIndex = 0; concernIndex < transcodeConcerns.length; concernIndex++) {
                    var concern = transcodeConcerns[concernIndex];
                    concernsSummary.push(
                        '[' + String(concern?.severity ?? 'warning').toUpperCase() + '] '
                        + String(concern?.code ?? 'Concern')
                        + ': ' + String(concern?.message ?? '')
                    );
                }
            }

            if (Array.isArray(roundTripConcerns) == true) {
                for (var rtConcernIndex = 0; rtConcernIndex < roundTripConcerns.length; rtConcernIndex++) {
                    var rtConcern = roundTripConcerns[rtConcernIndex];
                    concernsSummary.push(
                        '[ROUND-TRIP ' + String(rtConcern?.severity ?? 'warning').toUpperCase() + '] '
                        + String(rtConcern?.code ?? 'Concern')
                        + ': ' + String(rtConcern?.message ?? '')
                    );
                }
            }

            var message = (
                'Transcode stream save failed.\n'
                + (err?.message ?? String(err))
            );

            if (concernsSummary.length > 0) {
                message += '\n\nConcerns:\n' + concernsSummary.join('\n');
            }

            if ((targetTransferSyntaxID == TransferSyntax.JPEG2000.ID)
                || (targetTransferSyntaxID == TransferSyntax.JPEG2000Lossless.ID)
                || (targetTransferSyntaxID == TransferSyntax.HTJ2K.ID)
                || (targetTransferSyntaxID == TransferSyntax.HTJ2KLossless.ID)
                || (targetTransferSyntaxID == TransferSyntax.HTJ2KLosslessRPCL.ID)) {

                var jpeg2000Unavailable = (
                    String(err?.message ?? '').toLowerCase().includes('jpeg 2000 encoding is unavailable')
                    || String(err?.message ?? '').toLowerCase().includes('jpeg 2000 decoding is unavailable')
                );

                if (jpeg2000Unavailable == true) {
                    message += '\n\nNote: JPEG 2000/HTJ2K transcoding is enabled, but no OpenJPEG runtime/backend is configured. '
                        + 'Provide an OpenJPEG module/factory (for example via globalThis.EASIOpenJPEGModule or globalThis.EASIOpenJPEGFactory), '
                        + 'or pass codec options on withTranscoding(...).';
                }
            }

            var jpegLsUnavailable = (
                String(err?.message ?? '').toLowerCase().includes('jpeg-ls decoding failed')
                || String(err?.message ?? '').toLowerCase().includes('jpeg-ls factory export is unavailable')
                || String(err?.message ?? '').toLowerCase().includes('jpeg-ls module does not expose')
            );

            if (jpegLsUnavailable == true) {
                message += '\n\nNote: JPEG-LS source decoding is enabled, but no JPEG-LS runtime/backend is configured. '
                    + 'Provide a JPEG-LS module/factory (for example via globalThis.EASIJpegLsModule or globalThis.EASIJpegLsFactory), '
                    + 'or install a browser runtime package such as @cornerstonejs/codec-charls for kitchen-sink auto-loading.';
            }

            $('#transcodeStreamOutput').val(
                message
            );

            console.log(err);

            throw err;

        }
        finally {
            URL.revokeObjectURL(sourceUrl);
        }

    });

    // Handle Extract Assets File
    registerAction('extractAssets', 'click', async function () {

        var file = $('#dicomAssetsFile')[0]?.files?.[0];
        if (file == null) {
            throw new BlockedRunError('Please select a DICOM file first.');
        }

        $('#assetsMetadataDump').val('');
        $('#assetsSourceDiagnostics').val('');
        clearImageList();

        var url = URL.createObjectURL(file);
        var metadataOutput = [];
        var hasSourceDiagnostics = false;
        var sourceObservedTransferSyntax = null;

        try {

            try {
                var sourceProbeBytes = new Uint8Array(await file.arrayBuffer());
                sourceObservedTransferSyntax = await inspectTransferSyntaxFromBytes(sourceProbeBytes);
            }
            catch (probeError) {
                console.warn('Unable to inspect source transfer syntax prior to asset extraction.', probeError);
            }

            await ensureSourceDecoderRuntimes(sourceObservedTransferSyntax);

            const pipeline = applyDicomDataValidation(
                EASI.pipelineBuilder()
                    .fromHttpStream()
                    .ofDicomData()
            ).toAssets({
                    metadata: {
                        mapping: newFhirImagingStudyMapping(),
                        onMetadata: async function (metadata, scope) {

                            metadataOutput.push(metadata);
                            var displayModel = (metadataOutput.length == 1)
                                ? metadataOutput[0]
                                : metadataOutput;

                            $('#assetsMetadataDump').val(JSON.stringify(displayModel, null, 2));

                            if ((hasSourceDiagnostics == false) && (scope?.instance != null)) {
                                $('#assetsSourceDiagnostics').val(formatAssetsSourceDiagnostics(scope.instance));
                                hasSourceDiagnostics = true;
                            }
                            await yieldToBrowserFrame();

                        }
                    },
                    payload: {
                        mode: 'materialize',
                        frame: {
                            frames: 'all',
                            decode: 'rgba',
                            encode: 'png'
                        },
                        onFrame: async function (frame, scope) {
                            appendImageListFrame(frame);

                            if ((hasSourceDiagnostics == false) && (scope?.instance != null)) {
                                $('#assetsSourceDiagnostics').val(formatAssetsSourceDiagnostics(scope.instance));
                                hasSourceDiagnostics = true;
                            }
                            await yieldToBrowserFrame();
                        }
                    }
                    })
            .build();

            var result = await processWithTiming(pipeline, url, null, "Extract Assets");

            var assets = Array.isArray(result) ? result[0] : result;

            console.log(assets);

            if ((hasSourceDiagnostics == false) && (assets?.instance != null)) {
                $('#assetsSourceDiagnostics').val(formatAssetsSourceDiagnostics(assets.instance));
                hasSourceDiagnostics = true;
            }

        }
        catch (err) {

            var message = (
                'Asset extraction failed.\n'
                + (err?.message ?? String(err))
            );

            var jpeg2000Unavailable = (
                String(err?.message ?? '').toLowerCase().includes('jpeg 2000 encoding is unavailable')
                || String(err?.message ?? '').toLowerCase().includes('jpeg 2000 decoding is unavailable')
                || String(err?.message ?? '').toLowerCase().includes('openjpeg factory export is unavailable')
            );
            if (jpeg2000Unavailable == true) {
                message += '\n\nNote: Source appears to require JPEG 2000/HTJ2K decoding, but no OpenJPEG runtime/backend is configured.';
            }

            var jpegLsUnavailable = (
                String(err?.message ?? '').toLowerCase().includes('jpeg-ls decoding failed')
                || String(err?.message ?? '').toLowerCase().includes('jpeg-ls factory export is unavailable')
                || String(err?.message ?? '').toLowerCase().includes('jpeg-ls module does not expose')
            );
            if (jpegLsUnavailable == true) {
                message += '\n\nNote: Source appears to require JPEG-LS decoding, but no JPEG-LS runtime/backend is configured.';
            }

            if (sourceObservedTransferSyntax != null) {
                message += '\n\nSource observed Transfer Syntax: ' + String(sourceObservedTransferSyntax);
            }

            $('#assetsSourceDiagnostics').val(message);
            console.log(err);

            throw err;

        }
        finally {
            URL.revokeObjectURL(url);
        }

    });

    // Handle Asset Archive File
    registerAction('createAssetArchive', 'click', async function () {

        var file = $('#dicomAssetArchiveFile')[0]?.files?.[0];
        if (file == null) {
            throw new BlockedRunError('Please select a DICOM file first.');
        }

        $('#assetArchiveOutput').val('');

        var url = URL.createObjectURL(file);
        var sourceObservedTransferSyntax = null;

        try {

            try {
                var sourceProbeBytes = new Uint8Array(await file.arrayBuffer());
                sourceObservedTransferSyntax = await inspectTransferSyntaxFromBytes(sourceProbeBytes);
            }
            catch (probeError) {
                console.warn('Unable to inspect source transfer syntax prior to asset archive creation.', probeError);
            }

            await ensureSourceDecoderRuntimes(sourceObservedTransferSyntax);

            const pipeline = applyDicomDataValidation(
                EASI.pipelineBuilder()
                    .fromHttpStream()
                    .ofDicomData()
            ).toAssetArchive({
                    metadata: {
                        mapping: newFhirImagingStudyMapping()
                    },
                    payload: {
                        frame: {
                            frames: 'all',
                            decode: 'rgba',
                            encode: 'tiff'
                        }
                    }
                    })
            .build();

            var result = await processWithTiming(pipeline, url, null, "Create Asset Archive");
            var archiveBytes = Array.isArray(result) ? result[0] : result;
            downloadBytesAsFile(archiveBytes, buildArchiveFileName(file.name));

            $('#assetArchiveOutput').val(
                'Archive created successfully.\n'
                + 'File: ' + buildArchiveFileName(file.name) + '\n'
                + 'Size: ' + (archiveBytes?.length ?? 0) + ' bytes'
                + '\nSource observed Transfer Syntax: ' + String(sourceObservedTransferSyntax ?? 'unknown')
            );

            console.log({
                archiveFileName: buildArchiveFileName(file.name),
                archiveSize: archiveBytes?.length ?? 0
            });

        }
        catch (err) {

            var message = (
                'Asset archive creation failed.\n'
                + (err?.message ?? String(err))
            );

            var jpeg2000Unavailable = (
                String(err?.message ?? '').toLowerCase().includes('jpeg 2000 encoding is unavailable')
                || String(err?.message ?? '').toLowerCase().includes('jpeg 2000 decoding is unavailable')
                || String(err?.message ?? '').toLowerCase().includes('openjpeg factory export is unavailable')
            );
            if (jpeg2000Unavailable == true) {
                message += '\n\nNote: Source appears to require JPEG 2000/HTJ2K decoding, but no OpenJPEG runtime/backend is configured.';
            }

            var jpegLsUnavailable = (
                String(err?.message ?? '').toLowerCase().includes('jpeg-ls decoding failed')
                || String(err?.message ?? '').toLowerCase().includes('jpeg-ls factory export is unavailable')
                || String(err?.message ?? '').toLowerCase().includes('jpeg-ls module does not expose')
            );
            if (jpegLsUnavailable == true) {
                message += '\n\nNote: Source appears to require JPEG-LS decoding, but no JPEG-LS runtime/backend is configured.';
            }

            if (sourceObservedTransferSyntax != null) {
                message += '\n\nSource observed Transfer Syntax: ' + String(sourceObservedTransferSyntax);
            }

            $('#assetArchiveOutput').val(message);
            console.log(err);

            throw err;

        }
        finally {
            URL.revokeObjectURL(url);
        }

    });

    // Handle Encapsulated Document Unwrapping
    registerAction('wrapDocumentToDicom', 'click', async function () {

        $('#wrappedDocumentOutput').val('');

        var file = $('#wrappedDocumentSourceFile')[0]?.files?.[0];
        if (file == null) {
            throw new BlockedRunError('Please select a PDF file first.');
        }

        var sourceMimeType = resolveWrappedDocumentMimeType(file);
        var lowerName = String(file?.name ?? '').toLowerCase();
        if ((sourceMimeType != 'application/pdf') && (lowerName.endsWith('.pdf') == false)) {
            throw new BlockedRunError('Please select a PDF file.');
        }

        var outputFileName = buildWrappedDocumentDicomFileName(file.name);
        var sourceTitle = buildWrappedDocumentTitle(file.name);

        var fileHandle = null;
        var chunkCount = 0;
        var bytesStreamed = 0;

        try {

            if (typeof window.showSaveFilePicker === 'function') {
                fileHandle = await window.showSaveFilePicker({
                    suggestedName: outputFileName,
                    types: [{
                        description: 'DICOM files',
                        accept: { 'application/dicom': ['.dcm', '.dicom'] }
                    }]
                });
            }

            var pipelineBuilder = EASI.pipelineBuilder()
                .fromFileStream()
                .ofByteData()
                .toWrappedDocuments({
                    mimeType: sourceMimeType,
                    title: sourceTitle
                });

            var writerOptions = {
                chunkSize: (64 * 1024),
                onChunk: function (chunk) {

                    if ((chunk == null) || (chunk.length == 0))
                        return;

                    bytesStreamed += chunk.length;
                    chunkCount += 1;

                }
            };

            var pipeline = null;
            if (fileHandle != null) {
                pipeline = pipelineBuilder
                    .intoBrowserFileStream(fileHandle, writerOptions)
                    .build();
            }
            else {
                pipeline = pipelineBuilder
                    .intoByteBuffer(Object.assign({}, writerOptions, {
                        collectOutput: true
                    }))
                    .build();
            }

            var result = await processWithTiming(
                pipeline,
                file,
                { contentType: sourceMimeType },
                'Wrap PDF to DICOM'
            );

            var outputSize = Number(result?.bytesWritten ?? bytesStreamed ?? 0);
            if (fileHandle == null) {
                var outputBytes = result?.body ?? new Uint8Array(0);
                if (outputBytes.length == 0) {
                    throw new Error('No output bytes were produced by the wrapping pipeline.');
                }
                outputSize = outputBytes.length;
                downloadBytesAsFile(outputBytes, outputFileName, 'application/dicom');
            }

            $('#wrappedDocumentOutput').val(
                'Source: ' + String(file.name ?? 'unknown') + '\n'
                + 'Source MIME Type: ' + String(sourceMimeType) + '\n'
                + 'Title: ' + String(sourceTitle) + '\n'
                + 'Output: ' + String(outputFileName) + '\n'
                + 'Chunks streamed: ' + String(chunkCount) + '\n'
                + 'Bytes streamed: ' + String(bytesStreamed) + '\n'
                + 'Output size: ' + String(outputSize) + ' bytes'
            );

            console.log({
                sourceFile: file.name,
                sourceMimeType: sourceMimeType,
                sourceTitle: sourceTitle,
                outputFile: outputFileName,
                chunksStreamed: chunkCount,
                bytesStreamed: bytesStreamed,
                writerResult: result
            });

        }
        catch (err) {

            if (err?.name === 'AbortError') {
                $('#wrappedDocumentOutput').val('Save cancelled by user.');
                throw err;
            }

            $('#wrappedDocumentOutput').val(
                'Document wrapping failed.\n'
                + (err?.message ?? String(err))
            );

            console.log(err);

            throw err;

        }

    });

    // Handle Encapsulated Document Unwrapping
    registerAction('unwrapDocuments', 'click', async function () {

        var file = $('#dicomUnwrappedDocumentsFile')[0]?.files?.[0];
        if (file == null) {
            throw new BlockedRunError('Please select a DICOM file first.');
        }

        $('#unwrappedDocumentsOutput').val('');

        var url = URL.createObjectURL(file);

        try {

            const pipeline = applyDicomDataValidation(
                EASI.pipelineBuilder()
                    .fromHttpStream()
                    .ofDicomData()
            ).toUnwrappedDocuments()
            .build();

            var result = await processWithTiming(pipeline, url, null, 'Unwrap Encapsulated Documents');
            var documents = collectUnwrappedDocuments(result);

            if (documents.length == 0) {
                $('#unwrappedDocumentsOutput').val(
                    'No encapsulated documents were found in the selected DICOM file.\n'
                    + 'Source DICOM: ' + String(file.name ?? 'unknown')
                );
                return;
            }

            for (var i = 0; i < documents.length; i++) {

                var document = documents[i] ?? {};
                var outputBytes = document.bytes ?? new Uint8Array(0);
                var outputFileName = document.fileName ?? ('document_' + String(i + 1) + '.bin');
                var outputMimeType = document.mimeType ?? 'application/octet-stream';
                downloadBytesAsFile(outputBytes, outputFileName, outputMimeType);

            }

            $('#unwrappedDocumentsOutput').val(
                buildUnwrappedDocumentsSummary(file.name, documents)
            );

            console.log({
                sourceFile: file.name,
                unwrappedDocuments: documents
            });

        }
        catch (err) {

            var message = (
                'Encapsulated document unwrapping failed.\n'
                + (err?.message ?? String(err))
            );

            $('#unwrappedDocumentsOutput').val(message);
            console.log(err);

            throw err;

        }
        finally {
            URL.revokeObjectURL(url);
        }

    });

    // Handle Series
    registerAction('series', 'click', function () {

        // Build the DICOM streaming reader
        const reader = applyDicomDataValidation(
            EASI.pipelineBuilder()
                .fromHttpStream()
                .ofDicomData()
        ).toInstances().build();

        // Read and parse the DICOM file
        return processWithTiming(reader, getDicomwebUrl('series'))
            .then(result => {
                console.log(result);
            })
            .catch(err => { throw err; });

    });

    // Handle Study
    registerAction('study', 'click', function () {

        // Build the DICOM streaming reader
        const reader = applyDicomDataValidation(
            EASI.pipelineBuilder()
                .fromHttpStream()
                .ofDicomData()
                .withOnEmit(function (result) {

                    // Log
                    if (Array.isArray(result) == false)
                        console.log(result);
                    else
                        console.log(result[result.length - 1]);

                    // Return CONTINUE
                    return Status.CONTINUE;

                })
        ).toInstances().build();

        // Read and parse the DICOM file
        return processWithTiming(reader, getDicomwebUrl('study'))
            .then(result => console.log(result))
            .catch(err => { throw err; });

    });

    // ================================
    // FHIR DICOM
    // ================================

    // Handle FHIR File
    registerAction('mapLocalFileFHIR', 'click', function () {

        var mapping = newFhirImagingStudyMapping();
        // Create an object URL from the selected file
        var url = URL.createObjectURL(this.files[0]);

        // Build the DICOM streaming reader
        const reader = EASI.pipelineBuilder()
            .fromHttpStream()
            .ofDicomData()
            .toMapping(mapping)
            .build();

        // Read and parse the DICOM file
        return processWithTiming(reader, url)
            .then(result => {
                 console.log(result);
                 $('#fhirDump').val(JSON.stringify(result));
            })
            .finally(() => URL.revokeObjectURL(url));

    });

    // Handle Instance
    registerAction('fhir', 'click', function () {

        // Build the DICOM streaming reader
        const reader = EASI.pipelineBuilder()
            .fromHttpStream()
            .ofDicomData()
            .toMapping(newFhirImagingStudyMapping())
            .build();

        // Read and parse the DICOM file
        return processWithTiming(reader, getDicomwebUrl('instance'))
            .then(result => {
                 console.log(result);
                 $('#fhirDump').val(JSON.stringify(result));
            })
            .catch(err => { throw err; });

    });

    // Handle Series
    registerAction('fhirSeries', 'click', function () {

        // Build the DICOM streaming reader
        const reader = EASI.pipelineBuilder()
            .fromHttpStream()
            .ofDicomData()
            .toMapping(newFhirImagingStudyMapping())
            .build();

        // Read and parse the DICOM file
        return processWithTiming(reader, getDicomwebUrl('series'))
            .then(result => {
                 console.log(result);
                 $('#fhirDump').val(JSON.stringify(result));
            })
            .catch(err => { throw err; });

    });

    // Handle Study
    registerAction('fhirStudy', 'click', function () {

        // Build the DICOM streaming reader
        const reader = EASI.pipelineBuilder()
            .fromHttpStream()
            .ofDicomData()
            .toMapping(newFhirImagingStudyMapping())
            .build();

        // Read and parse the DICOM file
        return processWithTiming(reader, getDicomwebUrl('study'))
            .then(result => {
                 console.log(result);
                 $('#fhirDump').val(JSON.stringify(result));
            })
            .catch(err => { throw err; });

    });

    // ================================
    // SELECTION DICOM
    // ================================

    // Handle SELECTION File
    registerAction('selectLocalFile', 'click', function () {

        // Create an object URL from the selected file
        var url = URL.createObjectURL(this.files[0]);

        // Create the new selection
        var selection = new DicomSelection();

        selection.addTag(Tag.StudyInstanceUID);
        selection.addTag(Tag.SeriesInstanceUID);
        selection.addTag(Tag.SOPInstanceUID);
        selection.addTag(Tag.InstanceNumber);

        // Build the DICOM streaming reader
        const reader = EASI.pipelineBuilder()
            .fromHttpStream()
            .ofDicomData()
            .toSelection(selection)
            .build();

        // Read and parse the DICOM file
        return processWithTiming(reader, url)
            .then(result => {
                console.log(result);
            })
            .finally(() => URL.revokeObjectURL(url));

    });

    // Handle Instance
    registerAction('selection', 'click', function () {

        // Create the new selection
        var selection = new DicomSelection();

        selection.addTag(Tag.PatientID);
        selection.addTag(Tag.PatientName);
        selection.addTag(Tag.PatientBirthDate);
        selection.addTag(Tag.PatientSex);

        // Build the DICOM streaming reader
        const reader = EASI.pipelineBuilder()
            .fromHttpStream()
            .ofDicomData()
            .toSelection(selection)
            .build();

        // Read and parse the DICOM file
        return processWithTiming(reader, getDicomwebUrl('instance'))
            .then(result => {
                console.log(result);
            })
            .catch(err => { throw err; });

    });

    // Handle Series
    registerAction('selectionSeries', 'click', function () {

        // Create the new selection
        var selection = new DicomSelection();

        selection.addTag(Tag.PatientID);
        selection.addTag(Tag.PatientName);
        selection.addTag(Tag.PatientBirthDate);
        selection.addTag(Tag.PatientSex);

        // Build the DICOM streaming reader
        const reader = EASI.pipelineBuilder()
            .fromHttpStream()
            .ofDicomData()
            .toSelection(selection)
            .build();

        // Read and parse the DICOM file
        return processWithTiming(reader, getDicomwebUrl('series'))
            .then(result => {
                console.log(result);
            })
            .catch(err => { throw err; });

    });

    // Handle Study
    registerAction('selectionStudy', 'click', function () {

        // Create the new selection
        var selection = new DicomSelection();

        selection.addTag(Tag.PatientID);
        selection.addTag(Tag.PatientName);
        selection.addTag(Tag.PatientBirthDate);
        selection.addTag(Tag.PatientSex);

        // Build the DICOM streaming reader
        const reader = EASI.pipelineBuilder()
            .fromHttpStream()
            .ofDicomData()
            .toSelection(selection)
            .build();

        // Read and parse the DICOM file
        return processWithTiming(reader, getDicomwebUrl('study'))
            .then(result => {
                console.log(result);
            })
            .catch(err => { throw err; });

    });

    // ================================
    // PARSE JSON
    // ================================

    registerAction('jsonFromBox', 'click', function () {
        var sourceText = $('#jsonBox').val();
        JSON.parse(sourceText);
        // Create an object URL from the selected file
        var url = URL.createObjectURL(new Blob([sourceText], {type : 'text/plain'}));

        // Build the DICOM streaming reader
        const reader = EASI.pipelineBuilder()
            .fromHttpStream()
            .ofJsonData()
            .toStructuredValue()
            .build();

        // Read and parse the DICOM file
        return processWithTiming(reader, url)
            .then(result => {

                // Log the instance
                console.log(result);

            })
            .finally(() => URL.revokeObjectURL(url));

        });

    // Handle Instance
    registerAction('jsonInstance', 'click', function () {

        // Build the DICOM streaming reader
        const reader = EASI.pipelineBuilder()
            .fromHttpStream()
            .ofJsonData()
            .toStructuredValue()
            .build();

        // Read and parse the DICOM file
        return processWithTiming(reader, getDicomwebUrl('instance') + "/metadata")
            .then(result => console.log(result))
            .catch(err => { throw err; });

    });

    registerAction('jsonInstanceGET', 'click', async function () {
        var start = new Date().getTime();
        var response = await fetch(getDicomwebUrl('instance') + '/metadata', {
            headers: { Accept: 'application/dicom+json' }
        });
        if (!response.ok)
            throw new Error('Metadata request failed with HTTP ' + response.status + ' ' + response.statusText + '.');
        var result = await response.json();
        console.log(result);
        console.log('Execution time: ' + (new Date().getTime() - start) + ' ms');
        return result;
    });

    // Handle Series
    registerAction('jsonSeries', 'click', function () {

        // Build the DICOM streaming reader
        const reader = EASI.pipelineBuilder()
            .fromHttpStream()
            .ofJsonData()
            .toStructuredValue()
            .build();

        // Read and parse the DICOM file
        return processWithTiming(reader, getDicomwebUrl('series') + "/metadata")
            .then(result => {
                console.log(result);
            })
            .catch(err => { throw err; });

    });

    // Handle Study
    registerAction('jsonStudy', 'click', function () {

        // Build the DICOM streaming reader
        const reader = EASI.pipelineBuilder()
            .fromHttpStream()
            .ofJsonData()
            .withOnEmit(function (result) {

                // Log
                if (Array.isArray(result) == false)
                    console.log(result);
                else
                    console.log(result[result.length - 1]);

                // Return CONTINUE
                return Status.CONTINUE;

            })
            .toStructuredValue()
            .build();

        // Read and parse the DICOM file
        return processWithTiming(reader, getDicomwebUrl('study') + "/metadata")
            .then(result => console.log(result))
            .catch(err => { throw err; });

    });

    // ================================
    // PARSE METADATA
    // ================================

    // Handle Instance
    registerAction('metadataInstance', 'click', function () {

        // Build the DICOM streaming reader
        const reader = EASI
            .pipelineBuilder()
            .fromHttpStream()
            .ofDicomMetadata()
            .toInstances()
            .build();

        // Read and parse the DICOM file
        return processWithTiming(reader, getDicomwebUrl('instance') + "/metadata")
            .then(result => console.log(result))
            .catch(err => { throw err; });

    });

    // Handle Instance (XML Metadata)
    registerAction('metadataXmlInstance', 'click', function () {

        // Build the DICOM streaming reader (XML metadata -> Instance)
        const reader = EASI
            .pipelineBuilder()
            .fromHttpStream()
            .ofDicomXmlMetadata()
            .toInstances()
            .build();

        // Read and parse the local DICOMweb XML metadata sample.
        return processWithTiming(reader, "../../../data/xml/dicomweb.xml")
        .then(result => console.log(result))
        .catch(err => { throw err; });

    });

    // Handle Series
    registerAction('metadataSeriesInstances', 'click', function () {

        // Build the DICOM streaming reader
        const reader = EASI
            .pipelineBuilder()
            .fromHttpStream()
            .ofDicomMetadata()
            .toInstances()
            .build();

        // Read and parse the DICOM file
        return processWithTiming(reader, getDicomwebUrl('series') + "/metadata")
            .then(result => {
                console.log(result);
            })
            .catch(err => { throw err; });

    });

    // Handle Study
    registerAction('metadataStudyInstances', 'click', function () {

        // Build the DICOM streaming reader
        const reader = EASI
            .pipelineBuilder()
            .fromHttpStream()
            .ofDicomMetadata()
            .withOnEmit(function (result) {

                // Log
                if (Array.isArray(result) == false)
                    console.log(result);
                else
                    console.log(result[result.length - 1]);

                // Return CONTINUE
                return Status.CONTINUE;

            })
            .toInstances()
            .build();

        // Read and parse the DICOM file
        return processWithTiming(reader, getDicomwebUrl('study') + "/metadata")
            .then(result => console.log(result))
            .catch(err => { throw err; });

    });

    // ================================
    // DUMP DICOM
    // ================================

    function createNewItem(index) {

        let item = new Item(Constants.UndefinedLength);
        item.add(new Attribute(Tag.FileMetaInformationGroupLength, 4, [255, index, 0, 0], TransferSyntax.NONE));

        let data = (new TextEncoder()).encode("The Title " + index.toString());
        item.add(new Attribute(Tag.SourceApplicationEntityTitle, data.length, data, TransferSyntax.NONE));

        data = (new TextEncoder()).encode("Short String" + index.toString());
        item.add(new Attribute(Tag.ImplementationVersionName, data.length, data, TransferSyntax.NONE));

        data = (new TextEncoder()).encode("1.2.3.4.5.6.7.8.9.0." + index.toString());
        item.add(new Attribute(Tag.ImplementationClassUID, data.length, data, TransferSyntax.NONE));

        data = new Uint8Array([255, 1, 255, 1])
        item.add(new Attribute(Tag.PixelData, data.length, data, TransferSyntax.NONE));

        return item;

    }

    // Handle Dump
    registerAction('dump', 'click', function () {

        // Create the DICOM Dump Parer
        var parser = new DumpParser(new DicomInstanceHandler());

        parser.parse($('#dicomDump').val());

        console.log(parser.result);

        let data = null;

        // Create the squence
        var metaset = new MetaSet();

        data = (new TextEncoder()).encode("Private Information");
        metaset.add(new Attribute(Tag.PrivateInformation, data.length, data, TransferSyntax.NONE));

        var ddd = metaset.privateInformation;

        var uuu = 100;

        return parser.result;

    });

    // SAMPLE CODE
    registerAction('sample', 'click', function () {

        // Build the EASI DICOM reader configured to parse DICOM Data to DICOM Instances
        const reader = EASI
            .pipelineBuilder()
            .fromHttpStream()
            .ofDicomData()
            .toInstances()
            .build();

        // Issue the HTTP request, read and parse the DICOM data response
        return processWithTiming(reader, getDicomwebUrl('series'))
            .then(instances => {

                for (const instance of (Array.isArray(instances) ? instances : (instances ? [instances] : []))) {

                    // Access the primary patient details
                    const patientId = instance.dataSet.find(Tag.PatientID);
                    const patientName = instance.dataSet.find(Tag.PatientName);
                    const patientDOB = instance.dataSet.find(Tag.PatientBirthDate);

                    // Access the modality details
                    const modality = instance.dataSet.find(Tag.Modality);

                    // Access the pixel-data
                    const pixels = instance.dataSet.find(Tag.PixelData);

                    // Do something useful with the patient and pixel data
                    var xxx = 100;

                }

            })
            .catch(error => { throw error; });

    });

    feedback.render();

});
