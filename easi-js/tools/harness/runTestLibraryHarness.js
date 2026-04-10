//
// runTestLibraryHarness.js - 1.0.0
//
// Recursively executes broad EASI pipeline scenarios across a DICOM test library,
// then emits machine-readable JSON and a human-readable HTML report.
//

import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { monitorEventLoopDelay } from 'node:perf_hooks';

import EASI from '../../src/EASI.js';
import TransferSyntax from '../../src/dicom/TransferSyntax.js';
import Tag from '../../src/dicom/Tag.js';
import DicomToFHIRImagingStudyMapping from '../../src/handlers/mappings/DicomToFHIRImagingStudyMapping.js';

import { renderTestLibraryHarnessHtmlPages } from './TestLibraryHarnessHtmlReport.js';

const ScenarioNames = {
  PARSE: 'parse',
  CONVERT: 'convert',
  DEIDENTIFY: 'deidentify',
  TRANSCODE: 'transcode',
  FHIR: 'fhir',
  ASSETS: 'assets'
};

const SupportedScenarios = new Set(Object.values(ScenarioNames));

const DefaultScenarioOrder = [
ScenarioNames.PARSE,
ScenarioNames.CONVERT,
ScenarioNames.DEIDENTIFY,
ScenarioNames.TRANSCODE,
ScenarioNames.FHIR,
ScenarioNames.ASSETS];


const NonDicomExtensions = new Set([
'7z',
'zip',
'txt',
'csv',
'md',
'png',
'jpg',
'jpeg',
'gif',
'html',
'htm',
'js',
'map',
'pdf',
'ds_store']);


const SingleResultPrefix = '@@HARNESS_SINGLE_RESULT@@';
const OneMegabyte = 1024 * 1024;

function toIsoTimestamp(date = new Date()) {
  return date.toISOString();
}

function createRunStamp(date = new Date()) {
  return date.toISOString().
  replaceAll(':', '').
  replaceAll('-', '').
  replaceAll('.', '').
  replace('T', '_').
  replace('Z', 'Z');
}

function toNumber(value, fallback = null) {
  var numeric = Number(value);
  if (Number.isFinite(numeric) == false)
  return fallback;
  return numeric;
}

function toBoolean(value, fallback = false) {

  if (value == null)
  return fallback;

  if (typeof value == 'boolean')
  return value;

  var normalized = String(value).trim().toLowerCase();
  if (normalized == 'true' || normalized == '1' || normalized == 'yes' || normalized == 'y')
  return true;
  if (normalized == 'false' || normalized == '0' || normalized == 'no' || normalized == 'n')
  return false;

  return fallback;

}

function splitCsv(value) {

  if (value == null)
  return [];

  return String(value).
  split(',').
  map((part) => part.trim()).
  filter((part) => part.length > 0);

}

function parseScenarioList(value) {

  var names = splitCsv(value).map((name) => name.toLowerCase());

  if (names.length == 0)
  return [...DefaultScenarioOrder];

  var invalidNames = names.filter((name) => SupportedScenarios.has(name) == false);
  if (invalidNames.length > 0) {
    throw new Error(`Invalid scenario name(s): ${invalidNames.join(', ')}.`);
  }

  return names;

}

function parseRegex(value) {

  if (value == null || String(value).trim().length == 0)
  return null;

  return new RegExp(String(value));

}

function getFileExtension(filePath) {

  var extension = path.extname(filePath).trim().toLowerCase();
  if (extension.startsWith('.'))
  extension = extension.slice(1);

  return extension;

}

function detectSourceFormat(filePath) {

  var extension = getFileExtension(filePath);

  if (extension == 'json')
  return 'dicom-json';

  if (extension == 'xml')
  return 'dicom-xml';

  return 'dicom-data';

}

function shouldIncludeFile(filePath, options) {

  var fileName = path.basename(filePath).toLowerCase();

  if (fileName.startsWith('.'))
  return false;

  var extension = getFileExtension(filePath);

  if (NonDicomExtensions.has(extension) == true)
  return false;

  if (options.includeExtensions != null && options.includeExtensions.size > 0) {
    return options.includeExtensions.has(extension);
  }

  if (options.allFiles == true)
  return true;

  // Default behavior: include common DICOM extensions and extension-less files.
  if (extension == 'dcm' || extension == 'ima' || extension == 'new' || extension.length == 0)
  return true;

  return false;

}

async function listCandidateFiles(rootDirectory, options) {

  var directories = [rootDirectory];
  var files = [];

  while (directories.length > 0) {

    var currentDirectory = directories.pop();

    var entries = await fsp.readdir(currentDirectory, { withFileTypes: true });
    for (var i = 0; i < entries.length; i++) {

      var entry = entries[i];
      var absolutePath = path.join(currentDirectory, entry.name);

      if (entry.isDirectory()) {
        directories.push(absolutePath);
        continue;
      }

      if (entry.isFile() == false)
      continue;

      if (shouldIncludeFile(absolutePath, options) == false)
      continue;

      if (options.matchPattern != null && options.matchPattern.test(absolutePath) == false)
      continue;

      if (options.excludeMatchPattern != null && options.excludeMatchPattern.test(absolutePath) == true)
      continue;

      files.push(absolutePath);

      if (options.maxFiles != null && files.length >= options.maxFiles)
      return files.sort();

    }

  }

  files.sort();
  return files;

}

function createSkipScenarioResult(message, elapsedMs = 0) {
  return {
    status: 'skip',
    elapsedMs,
    message,
    warningCount: 0,
    errorCount: 0,
    concerns: []
  };
}

function normalizeError(error) {

  if (error == null) {
    return {
      name: 'Error',
      message: 'Unknown error.'
    };
  }

  if (typeof error == 'string') {
    return {
      name: 'Error',
      message: error
    };
  }

  var stack = null;
  if (typeof error.stack == 'string') {
    stack = error.stack.
    split('\n').
    slice(0, 12).
    join('\n');
  }

  return {
    name: error.name ?? 'Error',
    code: error.code ?? null,
    message: error.message ?? String(error),
    stack
  };

}

function sanitizeConcern(concern) {

  if (concern == null || typeof concern != 'object') {
    return {
      code: 'Concern',
      message: String(concern)
    };
  }

  return {
    severity: concern.severity ?? null,
    category: concern.category ?? null,
    code: concern.code ?? null,
    message: concern.message ?? null,
    scope: concern.scope ?? null,
    path: concern.path ?? null,
    tagID: concern.tagID ?? null,
    actionTaken: concern.actionTaken ?? null
  };

}

function summarizeConcerns(concerns) {

  var summary = {
    warningCount: 0,
    errorCount: 0,
    infoCount: 0
  };

  if (Array.isArray(concerns) == false)
  return summary;

  for (var i = 0; i < concerns.length; i++) {

    var concern = concerns[i];
    var severity = String(concern?.severity ?? '').toLowerCase();

    if (severity == 'warning') {
      summary.warningCount++;
    } else
    if (severity == 'error') {
      summary.errorCount++;
    } else
    {
      summary.infoCount++;
    }

  }

  return summary;

}

function round(value, digits = 3) {

  if (value == null)
  return null;

  var numeric = Number(value);
  if (Number.isFinite(numeric) == false)
  return null;

  return Number(numeric.toFixed(digits));

}

function toMegabytes(value) {

  var numeric = Number(value);
  if (Number.isFinite(numeric) == false)
  return null;

  return round(numeric / OneMegabyte, 3);

}

function toEventLoopLagMilliseconds(value) {

  var numeric = Number(value);
  if (Number.isFinite(numeric) == false)
  return null;

  // monitorEventLoopDelay initializes min to a very large sentinel before samples exist.
  if (numeric >= 9e15)
  return null;

  return round(numeric / 1e6, 3);

}

function normalizeScenarioStatus(status) {

  if (status == 'pass' || status == 'fail' || status == 'skip')
  return status;

  return 'fail';

}

function summarizeFileOverallStatus(scenarios) {

  if (scenarios == null || typeof scenarios != 'object')
  return 'fail';

  var scenarioKeys = Object.keys(scenarios);
  for (var i = 0; i < scenarioKeys.length; i++) {
    if (normalizeScenarioStatus(scenarios[scenarioKeys[i]]?.status) == 'fail')
    return 'fail';
  }

  return 'pass';

}

function toRelativeWebPath(rootPath, targetPath) {

  return path.relative(rootPath, targetPath).
  split(path.sep).
  join('/');

}

function createSafeFileNameSeed(value) {

  var normalized = String(value ?? '').
  replaceAll('\\', '/').
  replaceAll('/', '__').
  replaceAll(':', '_').
  replaceAll(' ', '_');

  normalized = normalized.replace(/[^A-Za-z0-9._-]/g, '_');

  if (normalized.length == 0)
  return 'file';

  return normalized;

}

function createThumbnailAllocator(outputDirectory, limit) {

  var thumbnailDirectory = path.join(outputDirectory, 'thumbnails');
  var allocated = 0;

  return {
    async ensureDirectory() {
      await fsp.mkdir(thumbnailDirectory, { recursive: true });
    },
    tryAllocate(relativePath, suffix = 'frame', extension = 'png') {

      if (allocated >= limit)
      return null;

      allocated++;

      var safeSeed = createSafeFileNameSeed(relativePath);
      var safeExtension = String(extension ?? 'png').
      toLowerCase().
      replace(/[^a-z0-9]/g, '').
      trim();

      if (safeExtension.length == 0)
      safeExtension = 'png';

      var fileName = `${String(allocated).padStart(5, '0')}-${safeSeed}-${suffix}.${safeExtension}`;
      var absolutePath = path.join(thumbnailDirectory, fileName);

      return {
        absolutePath,
        relativePath: toRelativeWebPath(outputDirectory, absolutePath)
      };

    },
    get allocatedCount() {
      return allocated;
    },
    get directory() {
      return thumbnailDirectory;
    }
  };

}

function createNoopThumbnailAllocator() {
  return {
    async ensureDirectory() {
    },
    tryAllocate() {
      return null;
    },
    get allocatedCount() {
      return 0;
    },
    get directory() {
      return null;
    }
  };
}

function createSingleThumbnailAllocator(outputDirectory, sequence) {

  var thumbnailDirectory = path.join(outputDirectory, 'thumbnails');
  var used = false;

  return {
    async ensureDirectory() {
      await fsp.mkdir(thumbnailDirectory, { recursive: true });
    },
    tryAllocate(relativePath, suffix = 'frame', extension = 'png') {

      if (used == true)
      return null;

      used = true;

      var safeSeed = createSafeFileNameSeed(relativePath);
      var safeExtension = String(extension ?? 'png').
      toLowerCase().
      replace(/[^a-z0-9]/g, '').
      trim();

      if (safeExtension.length == 0)
      safeExtension = 'png';

      var fileName = `${String(sequence).padStart(5, '0')}-${safeSeed}-${suffix}.${safeExtension}`;
      var absolutePath = path.join(thumbnailDirectory, fileName);

      return {
        absolutePath,
        relativePath: toRelativeWebPath(outputDirectory, absolutePath)
      };

    },
    get allocatedCount() {
      return used ? 1 : 0;
    },
    get directory() {
      return thumbnailDirectory;
    }
  };

}

function createFileResultSeed(fileIndex, fileInput) {

  return {
    index: fileIndex,
    absolutePath: fileInput.absolutePath,
    relativePath: fileInput.relativePath,
    sourceFormat: fileInput.sourceFormat,
    sizeBytes: fileInput.sizeBytes,
    modality: null,
    overallStatus: 'pass',
    totalElapsedMs: 0,
    scenarios: {}
  };

}

function createFatalFileResult(fileIndex, fileInput, configuration, error, elapsedMs = 0) {

  var normalized = normalizeError(error);
  var fileResult = createFileResultSeed(fileIndex, fileInput);

  fileResult.overallStatus = 'fail';
  fileResult.totalElapsedMs = round(elapsedMs, 3);

  for (var scenarioIndex = 0; scenarioIndex < configuration.scenarios.length; scenarioIndex++) {
    var scenarioName = configuration.scenarios[scenarioIndex];
    fileResult.scenarios[scenarioName] = {
      status: 'fail',
      elapsedMs: 0,
      message: normalized.message,
      warningCount: 0,
      errorCount: 1,
      concerns: [],
      metrics: {},
      thumbnailPath: null,
      error: normalized
    };
  }

  return fileResult;

}

async function runScenariosForFile(fileIndex, fileInput, configuration, context) {

  var fileStartedAt = process.hrtime.bigint();
  var fileResult = createFileResultSeed(fileIndex, fileInput);
  var parseFailed = false;

  for (var scenarioIndex = 0; scenarioIndex < configuration.scenarios.length; scenarioIndex++) {

    var scenarioName = configuration.scenarios[scenarioIndex];

    if (parseFailed == true &&
    configuration.skipOnParseFailure == true &&
    scenarioName != ScenarioNames.PARSE) {
      fileResult.scenarios[scenarioName] = createSkipScenarioResult('Skipped because parse scenario failed.');
      continue;
    }

    var scenarioCallback = context.scenarioRunners[scenarioName];
    if (typeof scenarioCallback != 'function') {
      fileResult.scenarios[scenarioName] = createSkipScenarioResult('Scenario is not implemented.');
      continue;
    }

    if (typeof context?.onScenarioStart == 'function') {
      context.onScenarioStart(scenarioName, fileInput);
    }

    var scenarioResult = await executeScenario(
    scenarioName,
    () => scenarioCallback(fileInput.absolutePath, fileInput.sourceFormat, {
      ...configuration,
      relativePath: fileInput.relativePath,
      thumbnailAllocator: context.thumbnailAllocator,
      runDirectory: context.runDirectory
    }),
    configuration.scenarioTimeoutMs);


    fileResult.scenarios[scenarioName] = scenarioResult;

    if (scenarioName == ScenarioNames.PARSE && scenarioResult.status == 'fail') {
      parseFailed = true;
    }

    if (scenarioName == ScenarioNames.PARSE && fileResult.modality == null) {

      var modality = scenarioResult?.metrics?.modality ?? null;

      if (Array.isArray(modality) == true) {
        modality = modality.length > 0 ? modality[0] : null;
      }

      if (modality != null) {
        modality = String(modality).trim().toUpperCase();
        if (modality.length > 0) {
          fileResult.modality = modality;
        }
      }

    }

    if (scenarioResult.status == 'fail') {
      fileResult.overallStatus = 'fail';
    }

  }

  fileResult.totalElapsedMs = round(Number(process.hrtime.bigint() - fileStartedAt) / 1e6, 3);
  return fileResult;

}

function escapeRegexLiteral(value) {
  return String(value ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function executeScenario(name, callback, timeoutMs = null) {

  var started = process.hrtime.bigint();

  try {

    var callbackPromise = callback();

    var payload = null;
    if (timeoutMs != null && timeoutMs > 0) {
      payload = await Promise.race([
      callbackPromise,
      new Promise((resolve, reject) => {
        setTimeout(() => {
          var timeoutError = new Error(`Scenario '${name}' timed out after ${timeoutMs} ms.`);
          timeoutError.code = 'ScenarioTimeout';
          reject(timeoutError);
        }, timeoutMs);
      })]);

    } else
    {
      payload = await callbackPromise;
    }

    var elapsedMs = Number(process.hrtime.bigint() - started) / 1e6;

    return {
      status: payload?.status ?? 'pass',
      elapsedMs: round(elapsedMs, 3),
      message: payload?.message ?? null,
      warningCount: Number(payload?.warningCount ?? 0),
      errorCount: Number(payload?.errorCount ?? 0),
      concerns: Array.isArray(payload?.concerns) ? payload.concerns : [],
      metrics: payload?.metrics ?? {},
      thumbnailPath: payload?.thumbnailPath ?? null,
      error: null
    };

  }
  catch (error) {

    var elapsedMsOnError = Number(process.hrtime.bigint() - started) / 1e6;
    var concerns = Array.isArray(error?.scenarioConcerns) ? error.scenarioConcerns : [];
    var concernSummary = summarizeConcerns(concerns);

    return {
      status: 'fail',
      elapsedMs: round(elapsedMsOnError, 3),
      message: error?.message ?? `${name} failed.`,
      warningCount: concernSummary.warningCount,
      errorCount: Math.max(1, concernSummary.errorCount),
      concerns: concerns.slice(0, 10),
      metrics: {},
      thumbnailPath: null,
      error: normalizeError(error)
    };

  }

}

function extractInstanceMetrics(result) {

  var firstInstance = result;
  var instanceCount = 1;

  if (Array.isArray(result) == true) {
    instanceCount = result.length;
    firstInstance = result.length > 0 ? result[0] : null;
  }

  if (firstInstance == null) {
    return {
      instanceCount,
      hasMetaSet: false,
      hasPixelData: false,
      sopClassUID: null
    };
  }

  var sopClassUID = firstInstance?.metaSet?.find?.(Tag.MediaStorageSOPClassUID)?.value ??
  firstInstance?.dataSet?.find?.(Tag.SOPClassUID)?.value ??
  null;
  var modality = firstInstance?.dataSet?.find?.(Tag.Modality)?.value ?? null;

  if (Array.isArray(modality) == true) {
    modality = modality.length > 0 ? modality[0] : null;
  }

  if (modality != null) {
    modality = String(modality).trim().toUpperCase();
    if (modality.length == 0) {
      modality = null;
    }
  }

  return {
    instanceCount,
    hasMetaSet: firstInstance?.metaSet != null,
    hasPixelData: firstInstance?.dataSet?.find?.(Tag.PixelData) != null,
    sopClassUID,
    modality
  };

}

function countJsonEndpoints(imagingStudy) {

  if (imagingStudy == null)
  return 0;

  var count = 0;

  if (Array.isArray(imagingStudy.endpoint) == true)
  count += imagingStudy.endpoint.length;

  if (Array.isArray(imagingStudy.series) == true) {
    for (var i = 0; i < imagingStudy.series.length; i++) {

      var series = imagingStudy.series[i];

      if (Array.isArray(series?.endpoint) == true)
      count += series.endpoint.length;

      if (Array.isArray(series?.instance) == true) {
        for (var j = 0; j < series.instance.length; j++) {
          if (Array.isArray(series.instance[j]?.endpoint) == true)
          count += series.instance[j].endpoint.length;
        }
      }

    }
  }

  return count;

}

async function runParseScenario(absolutePath, sourceFormat, configuration) {

  var concerns = [];

  var builder = EASI.pipelineBuilder().
  fromFileStream();

  if (sourceFormat == 'dicom-json') {
    builder = builder.ofDicomMetadata();
  } else
  if (sourceFormat == 'dicom-xml') {
    builder = builder.ofDicomXmlMetadata();
  } else
  {
    builder = builder.ofDicomData();
  }

  builder = builder.withValidation({
    goal: configuration.validationGoal,
    onConcern: (concern) => {
      concerns.push(sanitizeConcern(concern));
    }
  }).toInstances();

  var result = await builder.build().process({ source: absolutePath });

  var concernSummary = summarizeConcerns(concerns);

  return {
    message: 'Parsed to instances successfully.',
    warningCount: concernSummary.warningCount,
    errorCount: concernSummary.errorCount,
    concerns: concerns.slice(0, 10),
    metrics: extractInstanceMetrics(result)
  };

}

async function runConvertScenario(absolutePath, sourceFormat) {

  if (sourceFormat != 'dicom-data') {
    return {
      status: 'skip',
      message: 'Conversion scenario currently targets native DICOM data input only.'
    };
  }

  var bytesWritten = 0;
  var chunkCount = 0;

  var result = await EASI.pipelineBuilder().
  fromFileStream().
  ofDicomData().
  toDicomData({
    collectOutput: false,
    onChunk: (chunk) => {
      if (chunk == null)
      return;
      chunkCount++;
      bytesWritten += chunk.length;
    }
  }).
  build().
  process({ source: absolutePath });

  if (bytesWritten <= 0 && Number.isFinite(Number(result)) == true) {
    bytesWritten = Number(result);
  }

  if (bytesWritten <= 0)
  throw new Error('No DICOM output bytes were emitted during conversion.');

  return {
    message: 'Converted to native DICOM data stream.',
    metrics: {
      bytesWritten,
      chunkCount
    }
  };

}

async function runDeIdentifyScenario(absolutePath, sourceFormat) {

  if (sourceFormat != 'dicom-data') {
    return {
      status: 'skip',
      message: 'De-identification scenario currently targets native DICOM data input only.'
    };
  }

  var bytesWritten = 0;
  var chunkCount = 0;

  var result = await EASI.pipelineBuilder().
  fromFileStream().
  ofDicomData().
  withDeIdentification().
  toDicomData({
    collectOutput: false,
    onChunk: (chunk) => {
      if (chunk == null)
      return;
      chunkCount++;
      bytesWritten += chunk.length;
    }
  }).
  build().
  process({ source: absolutePath });

  if (bytesWritten <= 0 && Number.isFinite(Number(result)) == true) {
    bytesWritten = Number(result);
  }

  if (bytesWritten <= 0)
  throw new Error('No DICOM output bytes were emitted during de-identification.');

  return {
    message: 'De-identified and emitted native DICOM bytes.',
    metrics: {
      bytesWritten,
      chunkCount
    }
  };

}

async function runTranscodeScenario(absolutePath, sourceFormat, configuration) {

  if (sourceFormat != 'dicom-data') {
    return {
      status: 'skip',
      message: 'Transcoding scenario currently targets native DICOM data input only.'
    };
  }

  var concerns = [];
  var bytesWritten = 0;
  var chunkCount = 0;

  try {

    var result = await EASI.pipelineBuilder().
    fromFileStream().
    ofDicomData().
    withTranscoding({
      targetTransferSyntax: configuration.transcodeTargetSyntax,
      goal: 'compatibility',
      onConcern: (concern) => {
        concerns.push(sanitizeConcern(concern));
      }
    }).
    toDicomData({
      collectOutput: false,
      onChunk: (chunk) => {
        if (chunk == null)
        return;
        chunkCount++;
        bytesWritten += chunk.length;
      }
    }).
    build().
    process({ source: absolutePath });

    if (bytesWritten <= 0 && Number.isFinite(Number(result)) == true) {
      bytesWritten = Number(result);
    }

    if (bytesWritten <= 0)
    throw new Error('No DICOM output bytes were emitted during transcoding.');

  }
  catch (error) {
    error.scenarioConcerns = concerns.slice(0, 25);
    throw error;
  }

  var concernSummary = summarizeConcerns(concerns);

  return {
    message: `Transcoded to ${configuration.transcodeTargetSyntax}.`,
    warningCount: concernSummary.warningCount,
    errorCount: concernSummary.errorCount,
    concerns: concerns.slice(0, 10),
    metrics: {
      bytesWritten,
      chunkCount,
      targetTransferSyntax: configuration.transcodeTargetSyntax
    }
  };

}

async function runFhirScenario(absolutePath, sourceFormat) {

  var builder = EASI.pipelineBuilder().
  fromFileStream();

  if (sourceFormat == 'dicom-json') {
    builder = builder.ofDicomMetadata();
  } else
  if (sourceFormat == 'dicom-xml') {
    builder = builder.ofDicomXmlMetadata();
  } else
  {
    builder = builder.ofDicomData();
  }

  var result = await builder.
  toFHIRImagingStudy().
  build().
  process({ source: absolutePath });

  if (result?.resourceType != 'ImagingStudy') {
    throw new Error('FHIR mapping did not produce an ImagingStudy resource.');
  }

  return {
    message: 'Mapped to FHIR ImagingStudy.',
    metrics: {
      studyUID: result.identifier?.[0]?.value ?? null,
      seriesCount: Array.isArray(result.series) ? result.series.length : 0,
      endpointCount: countJsonEndpoints(result)
    }
  };

}

async function runAssetsScenario(absolutePath, sourceFormat, context) {

  if (sourceFormat != 'dicom-data') {
    return {
      status: 'skip',
      message: 'Asset extraction scenario currently targets native DICOM data input only.'
    };
  }

  var metadataCount = 0;
  var frameCount = 0;
  var contentCount = 0;
  var thumbnailPath = null;

  var mapping = new DicomToFHIRImagingStudyMapping();
  var decodeFallbackToNative = false;

  async function runWithFrameOptions(frameOptions) {

    metadataCount = 0;
    frameCount = 0;
    contentCount = 0;
    thumbnailPath = null;

    await EASI.pipelineBuilder().
    fromFileStream().
    ofDicomData().
    withBulkDataPolicy('materialize').
    toAssets({
      metadata: {
        mapping,
        collect: false,
        onMetadata: () => {
          metadataCount++;
        }
      },
      payload: {
        mode: 'materialize',
        frame: frameOptions,
        onFrame: async (frame) => {

          frameCount++;

          if (thumbnailPath != null ||
          frame?.bytes == null ||
          frame.bytes.length == 0) {
            return;
          }

          var mimeType = String(frame?.mimeType ?? '').toLowerCase();
          if (mimeType.startsWith('image/') != true) {
            return;
          }

          var extension = 'png';
          if (mimeType == 'image/jpeg') {
            extension = 'jpg';
          } else
          if (mimeType == 'image/tiff') {
            extension = 'tiff';
          }

          var allocation = context.thumbnailAllocator.tryAllocate(context.relativePath, 'assets-frame', extension);
          if (allocation == null)
          return;

          await fsp.writeFile(allocation.absolutePath, Buffer.from(frame.bytes));
          thumbnailPath = allocation.relativePath;

        },
        onContent: () => {
          contentCount++;
        },
        collect: false
      }
    }).
    build().
    process({ source: absolutePath });

  }

  var jpegFrameOptions = {
    frames: 'first',
    decode: 'rgba',
    encode: 'jpeg',
    quality: 0.7
  };

  try {
    await runWithFrameOptions(jpegFrameOptions);
  }
  catch (error) {

    var detail = String(error?.message ?? '');
    var isDecodeRuntimeUnavailable =
    detail.includes('decoding is unavailable') ||
    detail.includes('No decoder registered for transfer syntax') ||
    detail.includes('Provide a preloaded OpenJPEG module') ||
    detail.includes('JPEG-LS decoding failed') ||
    detail.includes('Provide a JPEG-LS module/factory') ||
    detail.includes('Failed decoding frame to RGBA.');


    if (isDecodeRuntimeUnavailable != true) {
      throw error;
    }

    // Fallback for environments that do not preload optional decode runtimes (e.g. OpenJPEG in Node harness).
    decodeFallbackToNative = true;
    await runWithFrameOptions({
      frames: 'first',
      decode: 'native',
      encode: 'none'
    });

  }

  return {
    message: decodeFallbackToNative == true ?
    'Extracted metadata and payload assets (native-frame fallback used; decode runtime unavailable).' :
    'Extracted metadata and payload assets.',
    metrics: {
      metadataCount,
      frameCount,
      contentCount,
      decodeFallbackToNative
    },
    thumbnailPath
  };

}

function createScenarioRunnerMap() {
  return {
    [ScenarioNames.PARSE]: runParseScenario,
    [ScenarioNames.CONVERT]: runConvertScenario,
    [ScenarioNames.DEIDENTIFY]: runDeIdentifyScenario,
    [ScenarioNames.TRANSCODE]: runTranscodeScenario,
    [ScenarioNames.FHIR]: runFhirScenario,
    [ScenarioNames.ASSETS]: runAssetsScenario
  };
}

function buildSummary(fileResults, configuration, elapsedMsTotal) {

  var summary = {
    filesProcessed: fileResults.length,
    filesPassedAllScenarios: 0,
    filesWithFailures: 0,
    elapsedMsTotal: round(elapsedMsTotal, 3),
    warningCountTotal: 0,
    errorCountTotal: 0,
    scenarios: {}
  };

  for (var scenarioIndex = 0; scenarioIndex < configuration.scenarios.length; scenarioIndex++) {
    summary.scenarios[configuration.scenarios[scenarioIndex]] = {
      passCount: 0,
      failCount: 0,
      skipCount: 0,
      averageMs: null,
      maxMs: null
    };
  }

  for (var i = 0; i < fileResults.length; i++) {

    var file = fileResults[i];
    var hasFailure = false;

    for (var scenarioIndex = 0; scenarioIndex < configuration.scenarios.length; scenarioIndex++) {

      var scenarioName = configuration.scenarios[scenarioIndex];
      var scenarioResult = file.scenarios?.[scenarioName];
      if (scenarioResult == null)
      continue;

      var scenarioSummary = summary.scenarios[scenarioName];

      if (scenarioResult.status == 'pass')
      scenarioSummary.passCount++;else
      if (scenarioResult.status == 'fail')
      scenarioSummary.failCount++;else

      scenarioSummary.skipCount++;

      if (scenarioResult.status == 'fail')
      hasFailure = true;

      summary.warningCountTotal += Number(scenarioResult.warningCount ?? 0);
      summary.errorCountTotal += Number(scenarioResult.errorCount ?? 0);

      if (scenarioResult.status == 'pass' || scenarioResult.status == 'fail') {

        var elapsed = toNumber(scenarioResult.elapsedMs, null);
        if (elapsed != null) {

          if (scenarioSummary.averageMs == null) {
            scenarioSummary.averageMs = elapsed;
            scenarioSummary._count = 1;
          } else
          {
            scenarioSummary.averageMs += elapsed;
            scenarioSummary._count += 1;
          }

          scenarioSummary.maxMs = scenarioSummary.maxMs == null ?
          elapsed :
          Math.max(scenarioSummary.maxMs, elapsed);

        }

      }

    }

    if (hasFailure == true) {
      summary.filesWithFailures++;
    } else
    {
      summary.filesPassedAllScenarios++;
    }

  }

  var scenarioKeys = Object.keys(summary.scenarios);
  for (var keyIndex = 0; keyIndex < scenarioKeys.length; keyIndex++) {

    var key = scenarioKeys[keyIndex];
    var scenario = summary.scenarios[key];

    if (scenario._count > 0)
    scenario.averageMs = round(scenario.averageMs / scenario._count, 3);

    scenario.maxMs = round(scenario.maxMs, 3);
    delete scenario._count;

  }

  return summary;

}

function printHelp() {

  console.log('Usage: node tools/harness/runTestLibraryHarness.js [options]');
  console.log('');
  console.log('Options:');
  console.log('  --root <path>               Root test-library directory.');
  console.log('  --output <path>             Output directory (run folder created inside).');
  console.log('  --max-files <n>             Maximum files to process.');
  console.log('  --start-index <n>           Zero-based start index in sorted candidate list (default: 0).');
  console.log('  --end-index <n>             Zero-based inclusive end index in sorted candidate list (default: end).');
  console.log('  --scenarios <csv>           Scenario list (parse,convert,deidentify,transcode,fhir,assets).');
  console.log('  --match <regex>             Regex filter applied to absolute file paths.');
  console.log('  --exclude-match <regex>     Regex exclusion applied to absolute file paths.');
  console.log('  --include-ext <csv>         Restrict file extensions (example: dcm,ima,new).');
  console.log('  --all-files <bool>          Include all non-ignored file extensions (default: true).');
  console.log('  --thumbnail-limit <n>       Max extracted frame thumbnails (default: 25000).');
  console.log('  --progress-every <n>        Progress logging interval (default: 25).');
  console.log('  --checkpoint-every <n>      Checkpoint summary write interval in processed files (default: 250).');
  console.log('  --skip-on-parse-fail <bool> Skip downstream scenarios when parse fails (default: true).');
  console.log('  --scenario-timeout-ms <n>   Per-scenario timeout in milliseconds (default: none).');
  console.log('  --isolate-file-worker <b>   Run each file in an isolated worker process (default: auto for full-library runs).');
  console.log('  --file-timeout-ms <n>       Hard timeout for each file worker (default: 30000).');
  console.log('  --validation-goal <goal>    Validation goal: permissive|strict (default: permissive).');
  console.log(`  --transcode-target <uid>    Target transfer syntax UID (default: ${TransferSyntax.ExplicitVRLittleEndian.ID}).`);
  console.log('  --single-file <path>        Internal: run exactly one file and emit machine payload.');
  console.log('  --single-relative <path>    Internal: relative path used in single-file payload.');
  console.log('  --single-size-bytes <n>     Internal: file size for single-file payload.');
  console.log('  --single-source-format <v>  Internal: source format for single-file payload.');
  console.log('  --quiet <bool>              Suppress informational logs (default: false).');
  console.log('  --help                      Show this help.');

}

function parseArguments(argv) {

  var options = {
    rootDirectory: path.resolve(process.cwd(), '../data/test-library'),
    outputBaseDirectory: path.resolve(process.cwd(), 'test/output/harness'),
    maxFiles: null,
    startIndex: 0,
    endIndex: null,
    scenarios: [...DefaultScenarioOrder],
    matchPattern: null,
    excludeMatchPattern: null,
    includeExtensions: null,
    allFiles: true,
    thumbnailLimit: 25000,
    progressEvery: 25,
    checkpointEvery: 250,
    skipOnParseFailure: true,
    scenarioTimeoutMs: null,
    isolateFileWorker: false,
    isolateFileWorkerWasProvided: false,
    fileTimeoutMs: 30000,
    validationGoal: 'permissive',
    transcodeTargetSyntax: TransferSyntax.ExplicitVRLittleEndian.ID,
    help: false,
    singleFileAbsolutePath: null,
    singleRelativePath: null,
    singleSizeBytes: null,
    singleSourceFormat: null,
    singleThumbnailDirectory: null,
    singleThumbnailSequence: null,
    quiet: false
  };

  for (var i = 2; i < argv.length; i++) {

    var token = argv[i];

    if (token == '--help' || token == '-h') {
      options.help = true;
      continue;
    }

    if (token == '--root') {
      options.rootDirectory = path.resolve(argv[++i]);
      continue;
    }

    if (token == '--output') {
      options.outputBaseDirectory = path.resolve(argv[++i]);
      continue;
    }

    if (token == '--max-files') {
      options.maxFiles = toNumber(argv[++i], null);
      continue;
    }

    if (token == '--start-index') {
      options.startIndex = toNumber(argv[++i], 0);
      continue;
    }

    if (token == '--end-index') {
      options.endIndex = toNumber(argv[++i], null);
      continue;
    }

    if (token == '--scenarios') {
      options.scenarios = parseScenarioList(argv[++i]);
      continue;
    }

    if (token == '--match') {
      options.matchPattern = parseRegex(argv[++i]);
      continue;
    }

    if (token == '--exclude-match') {
      options.excludeMatchPattern = parseRegex(argv[++i]);
      continue;
    }

    if (token == '--include-ext') {
      options.includeExtensions = new Set(splitCsv(argv[++i]).map((value) => value.toLowerCase()));
      continue;
    }

    if (token == '--all-files') {
      options.allFiles = toBoolean(argv[++i], true);
      continue;
    }

    if (token == '--thumbnail-limit') {
      options.thumbnailLimit = Math.max(0, toNumber(argv[++i], 25000));
      continue;
    }

    if (token == '--progress-every') {
      options.progressEvery = Math.max(1, toNumber(argv[++i], 25));
      continue;
    }

    if (token == '--checkpoint-every') {
      options.checkpointEvery = Math.max(1, toNumber(argv[++i], 250));
      continue;
    }

    if (token == '--skip-on-parse-fail') {
      options.skipOnParseFailure = toBoolean(argv[++i], true);
      continue;
    }

    if (token == '--scenario-timeout-ms') {
      options.scenarioTimeoutMs = toNumber(argv[++i], null);
      continue;
    }

    if (token == '--isolate-file-worker') {
      options.isolateFileWorker = toBoolean(argv[++i], false);
      options.isolateFileWorkerWasProvided = true;
      continue;
    }

    if (token == '--file-timeout-ms') {
      options.fileTimeoutMs = toNumber(argv[++i], 30000);
      continue;
    }

    if (token == '--validation-goal') {
      options.validationGoal = String(argv[++i] ?? 'permissive').trim().toLowerCase();
      continue;
    }

    if (token == '--transcode-target') {
      options.transcodeTargetSyntax = String(argv[++i] ?? '').trim();
      continue;
    }

    if (token == '--single-file') {
      options.singleFileAbsolutePath = path.resolve(argv[++i]);
      continue;
    }

    if (token == '--single-relative') {
      options.singleRelativePath = String(argv[++i] ?? '').trim();
      continue;
    }

    if (token == '--single-size-bytes') {
      options.singleSizeBytes = toNumber(argv[++i], null);
      continue;
    }

    if (token == '--single-source-format') {
      options.singleSourceFormat = String(argv[++i] ?? '').trim().toLowerCase();
      continue;
    }

    if (token == '--single-thumbnail-dir') {
      options.singleThumbnailDirectory = path.resolve(argv[++i]);
      continue;
    }

    if (token == '--single-thumbnail-seq') {
      options.singleThumbnailSequence = toNumber(argv[++i], null);
      continue;
    }

    if (token == '--quiet') {
      options.quiet = toBoolean(argv[++i], false);
      continue;
    }

    throw new Error(`Unknown argument: ${token}`);

  }

  if (Number.isFinite(options.maxFiles) == false)
  options.maxFiles = null;else

  options.maxFiles = Math.max(0, Math.floor(options.maxFiles));

  if (Number.isFinite(options.startIndex) == false)
  options.startIndex = 0;else

  options.startIndex = Math.max(0, Math.floor(options.startIndex));

  if (Number.isFinite(options.endIndex) == false)
  options.endIndex = null;else

  options.endIndex = Math.max(0, Math.floor(options.endIndex));

  if (Number.isFinite(options.checkpointEvery) == false)
  options.checkpointEvery = 250;else

  options.checkpointEvery = Math.max(1, Math.floor(options.checkpointEvery));

  if (Number.isFinite(options.scenarioTimeoutMs) == false)
  options.scenarioTimeoutMs = null;else

  options.scenarioTimeoutMs = Math.max(1, options.scenarioTimeoutMs);

  if (Number.isFinite(options.fileTimeoutMs) == false)
  options.fileTimeoutMs = null;else

  options.fileTimeoutMs = Math.max(1, options.fileTimeoutMs);

  if (Number.isFinite(options.singleSizeBytes) == false)
  options.singleSizeBytes = null;

  if (Number.isFinite(options.singleThumbnailSequence) == false)
  options.singleThumbnailSequence = null;else

  options.singleThumbnailSequence = Math.max(1, Math.floor(options.singleThumbnailSequence));

  if (options.validationGoal != 'strict' && options.validationGoal != 'permissive') {
    options.validationGoal = 'permissive';
  }

  return options;

}

function formatProgress(index, total, startedAtMs, elapsedOverrideMs = null) {

  var processed = index + 1;
  var elapsedMs = elapsedOverrideMs != null ?
  Number(elapsedOverrideMs) :
  Date.now() - startedAtMs;
  var avgMs = processed > 0 ? elapsedMs / processed : 0;
  var remaining = Math.max(0, total - processed);
  var etaMs = remaining * avgMs;

  return {
    processed,
    total,
    elapsedMs,
    averageMsPerFile: avgMs,
    etaMs
  };

}

function formatDurationMs(value) {

  if (value == null || Number.isFinite(Number(value)) == false)
  return '-';

  var ms = Number(value);

  if (ms < 1000)
  return `${ms.toFixed(0)} ms`;

  var seconds = ms / 1000;
  if (seconds < 60)
  return `${seconds.toFixed(1)} s`;

  var minutes = Math.floor(seconds / 60);
  var remSeconds = seconds - minutes * 60;
  return `${minutes}m ${remSeconds.toFixed(0)}s`;

}

function selectCandidateWindow(allCandidateFiles, configuration) {

  var totalCandidates = allCandidateFiles.length;

  var startIndex = Math.max(0, configuration.startIndex ?? 0);
  if (startIndex > totalCandidates)
  startIndex = totalCandidates;

  var endIndexInclusive = configuration.endIndex;
  if (endIndexInclusive == null || Number.isFinite(endIndexInclusive) == false) {
    endIndexInclusive = totalCandidates - 1;
  }

  endIndexInclusive = Math.max(startIndex, Math.floor(endIndexInclusive));
  if (totalCandidates > 0) {
    endIndexInclusive = Math.min(endIndexInclusive, totalCandidates - 1);
  } else
  {
    endIndexInclusive = -1;
  }

  var endIndexExclusive = endIndexInclusive >= startIndex ?
  endIndexInclusive + 1 :
  startIndex;

  var selectedFiles = allCandidateFiles.slice(startIndex, endIndexExclusive);

  if (configuration.maxFiles != null && configuration.maxFiles >= 0) {
    selectedFiles = selectedFiles.slice(0, configuration.maxFiles);
  }

  var selectedEndIndex = selectedFiles.length > 0 ?
  startIndex + selectedFiles.length - 1 :
  null;

  return {
    files: selectedFiles,
    totalCandidates,
    startIndex,
    endIndex: selectedEndIndex
  };

}

function shouldAutoEnableIsolatedWorkers(configuration, candidateWindow) {

  if (configuration.isolateFileWorkerWasProvided == true)
  return false;

  if (configuration.singleFileAbsolutePath != null)
  return false;

  if (configuration.maxFiles != null)
  return false;

  if (configuration.matchPattern != null || configuration.excludeMatchPattern != null)
  return false;

  if (configuration.includeExtensions != null && configuration.includeExtensions.size > 0)
  return false;

  if (configuration.allFiles != true)
  return false;

  if (candidateWindow.startIndex != 0)
  return false;

  if (candidateWindow.totalCandidates == 0)
  return false;

  if (candidateWindow.files.length != candidateWindow.totalCandidates)
  return false;

  return true;

}

function createTelemetryState() {

  return {
    latest: null,
    recent: [],
    maxRecentSamples: 180,
    peaks: {
      rssMb: null,
      heapUsedMb: null,
      heapTotalMb: null,
      externalMb: null,
      arrayBuffersMb: null,
      eventLoopLagMaxMs: null,
      eventLoopLagP99Ms: null
    }
  };

}

function updateTelemetryPeaks(peaks, snapshot) {

  if (snapshot == null)
  return;

  var memory = snapshot.memory ?? {};
  var eventLoopLag = snapshot.eventLoopLag ?? {};

  var mergePeak = (current, next) => {
    if (next == null)
    return current;
    if (current == null)
    return next;
    return Math.max(current, next);
  };

  peaks.rssMb = mergePeak(peaks.rssMb, memory.rssMb ?? null);
  peaks.heapUsedMb = mergePeak(peaks.heapUsedMb, memory.heapUsedMb ?? null);
  peaks.heapTotalMb = mergePeak(peaks.heapTotalMb, memory.heapTotalMb ?? null);
  peaks.externalMb = mergePeak(peaks.externalMb, memory.externalMb ?? null);
  peaks.arrayBuffersMb = mergePeak(peaks.arrayBuffersMb, memory.arrayBuffersMb ?? null);
  peaks.eventLoopLagMaxMs = mergePeak(peaks.eventLoopLagMaxMs, eventLoopLag.maxMs ?? null);
  peaks.eventLoopLagP99Ms = mergePeak(peaks.eventLoopLagP99Ms, eventLoopLag.p99Ms ?? null);

}

function createFailureDigest(fileResult) {

  if (fileResult == null || fileResult.scenarios == null)
  return null;

  var failedScenarios = [];
  var scenarioKeys = Object.keys(fileResult.scenarios);
  for (var i = 0; i < scenarioKeys.length; i++) {
    var scenarioName = scenarioKeys[i];
    var scenario = fileResult.scenarios[scenarioName];
    if (scenario?.status != 'fail')
    continue;

    failedScenarios.push({
      name: scenarioName,
      message: scenario?.message ?? null,
      code: scenario?.error?.code ?? null
    });
  }

  if (failedScenarios.length == 0)
  return null;

  return {
    index: fileResult.index,
    relativePath: fileResult.relativePath,
    sourceFormat: fileResult.sourceFormat,
    failedScenarios
  };

}

async function writeCheckpointReport(runDirectory, checkpointPayload) {

  var checkpointPath = path.join(runDirectory, 'checkpoint.json');
  await fsp.writeFile(checkpointPath, JSON.stringify(checkpointPayload, null, 2), 'utf-8');

}

async function writeRunState(runDirectory, statePayload) {

  var statePath = path.join(runDirectory, 'run-state.json');
  await fsp.writeFile(statePath, JSON.stringify(statePayload, null, 2), 'utf-8');

}

function summarizeOutputTail(text, maxLines = 20) {

  if (text == null || String(text).trim().length == 0)
  return null;

  var lines = String(text).
  split(/\r?\n/).
  map((line) => line.trimEnd()).
  filter((line) => line.length > 0);

  if (lines.length == 0)
  return null;

  return lines.slice(Math.max(0, lines.length - maxLines)).join('\n');

}

function extractWorkerSingleResult(stdoutText) {

  var lines = String(stdoutText ?? '').split(/\r?\n/);
  var payload = null;

  for (var i = 0; i < lines.length; i++) {

    var line = lines[i];
    if (line.startsWith(SingleResultPrefix) == false)
    continue;

    var json = line.slice(SingleResultPrefix.length).trim();
    if (json.length == 0)
    continue;

    payload = JSON.parse(json);

  }

  return payload;

}

function buildWorkerArguments(runIndex, fileInput, configuration, runDirectory) {

  var argumentsList = [
  path.resolve(process.argv[1]),
  '--single-file', fileInput.absolutePath,
  '--single-relative', fileInput.relativePath,
  '--single-size-bytes', String(fileInput.sizeBytes),
  '--single-source-format', fileInput.sourceFormat,
  '--scenarios', configuration.scenarios.join(','),
  '--skip-on-parse-fail', String(configuration.skipOnParseFailure),
  '--validation-goal', configuration.validationGoal,
  '--transcode-target', configuration.transcodeTargetSyntax,
  '--quiet', 'true'];


  if (configuration.thumbnailLimit > 0 && runIndex < configuration.thumbnailLimit && runDirectory != null) {
    argumentsList.push('--single-thumbnail-dir', runDirectory);
    argumentsList.push('--single-thumbnail-seq', String(runIndex + 1));
  }

  if (configuration.scenarioTimeoutMs != null) {
    argumentsList.push('--scenario-timeout-ms', String(configuration.scenarioTimeoutMs));
  }

  return argumentsList;

}

async function runFileInIsolatedWorker(absoluteIndex, runIndex, fileInput, configuration, runDirectory) {

  return await new Promise((resolve) => {

    var started = process.hrtime.bigint();
    var fileTimedOut = false;
    var stdoutText = '';
    var stderrText = '';

    var child = spawn(
    process.execPath,
    buildWorkerArguments(runIndex, fileInput, configuration, runDirectory),
    {
      cwd: process.cwd(),
      stdio: ['ignore', 'pipe', 'pipe']
    });


    var timer = null;
    if (configuration.fileTimeoutMs != null && configuration.fileTimeoutMs > 0) {
      timer = setTimeout(() => {
        fileTimedOut = true;
        child.kill('SIGKILL');
      }, configuration.fileTimeoutMs);
    }

    child.stdout.on('data', (chunk) => {
      stdoutText += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderrText += chunk.toString();
    });

    child.on('error', (error) => {

      if (timer != null)
      clearTimeout(timer);

      var elapsedMs = Number(process.hrtime.bigint() - started) / 1e6;
      resolve(createFatalFileResult(absoluteIndex, fileInput, configuration, error, elapsedMs));

    });

    child.on('close', (code, signal) => {

      if (timer != null)
      clearTimeout(timer);

      if (fileTimedOut == true) {

        var timeoutError = new Error(`File worker timed out after ${configuration.fileTimeoutMs} ms.`);
        timeoutError.code = 'FileTimeout';
        timeoutError.signal = signal ?? 'SIGKILL';

        var timeoutResult = createFatalFileResult(
        absoluteIndex,
        fileInput,
        configuration,
        timeoutError,
        Number(process.hrtime.bigint() - started) / 1e6);


        var stderrTailOnTimeout = summarizeOutputTail(stderrText);
        if (stderrTailOnTimeout != null) {
          timeoutResult.workerLogs = { stderr: stderrTailOnTimeout };
        }

        resolve(timeoutResult);
        return;

      }

      try {

        var workerFileResult = extractWorkerSingleResult(stdoutText);
        if (workerFileResult != null) {
          workerFileResult.index = absoluteIndex;
          workerFileResult.absolutePath = fileInput.absolutePath;
          workerFileResult.relativePath = fileInput.relativePath;
          workerFileResult.sourceFormat = fileInput.sourceFormat;
          workerFileResult.sizeBytes = fileInput.sizeBytes;

          if (workerFileResult.scenarios == null || typeof workerFileResult.scenarios != 'object') {
            workerFileResult = createFatalFileResult(
            absoluteIndex,
            fileInput,
            configuration,
            new Error('Worker produced an invalid result payload.'),
            Number(process.hrtime.bigint() - started) / 1e6);

          } else
          {
            workerFileResult.overallStatus = summarizeFileOverallStatus(workerFileResult.scenarios);

            if (Number.isFinite(Number(workerFileResult.totalElapsedMs)) == false) {
              workerFileResult.totalElapsedMs = round(Number(process.hrtime.bigint() - started) / 1e6, 3);
            }
          }

          resolve(workerFileResult);
          return;
        }

        var workerError = new Error(`File worker exited without a result payload (code=${code}, signal=${signal ?? '-'})`);
        workerError.code = 'WorkerNoResult';
        workerError.stdout = summarizeOutputTail(stdoutText);
        workerError.stderr = summarizeOutputTail(stderrText);

        var failedResult = createFatalFileResult(
        absoluteIndex,
        fileInput,
        configuration,
        workerError,
        Number(process.hrtime.bigint() - started) / 1e6);


        failedResult.workerLogs = {
          stdout: workerError.stdout,
          stderr: workerError.stderr
        };

        resolve(failedResult);

      }
      catch (error) {

        var invalidResult = createFatalFileResult(
        absoluteIndex,
        fileInput,
        configuration,
        error,
        Number(process.hrtime.bigint() - started) / 1e6);


        invalidResult.workerLogs = {
          stdout: summarizeOutputTail(stdoutText),
          stderr: summarizeOutputTail(stderrText)
        };

        resolve(invalidResult);

      }

    });

  });

}

async function runSingleFileMode(configuration) {

  var singleAbsolutePath = path.resolve(configuration.singleFileAbsolutePath);
  var sourceFormat = configuration.singleSourceFormat ?? detectSourceFormat(singleAbsolutePath);

  var stat = null;
  if (configuration.singleSizeBytes != null) {
    stat = { size: configuration.singleSizeBytes };
  } else
  {
    stat = await fsp.stat(singleAbsolutePath);
  }

  var fileInput = {
    absolutePath: singleAbsolutePath,
    relativePath: configuration.singleRelativePath ??
    toRelativeWebPath(configuration.rootDirectory, singleAbsolutePath),
    sourceFormat,
    sizeBytes: stat.size
  };

  var thumbnailAllocator = createNoopThumbnailAllocator();
  if (configuration.singleThumbnailDirectory != null && configuration.singleThumbnailSequence != null) {
    thumbnailAllocator = createSingleThumbnailAllocator(
    configuration.singleThumbnailDirectory,
    configuration.singleThumbnailSequence);

    await thumbnailAllocator.ensureDirectory();
  }

  return await runScenariosForFile(
  0,
  fileInput,
  configuration,
  {
    scenarioRunners: createScenarioRunnerMap(),
    thumbnailAllocator,
    runDirectory: null
  });


}

async function runHarness(configuration) {

  if (fs.existsSync(configuration.rootDirectory) == false) {
    throw new Error(`Root directory does not exist: ${configuration.rootDirectory}`);
  }

  var runDirectory = path.join(configuration.outputBaseDirectory, `run-${createRunStamp()}`);
  await fsp.mkdir(runDirectory, { recursive: true });

  var thumbnailAllocator = createThumbnailAllocator(runDirectory, configuration.thumbnailLimit);
  await thumbnailAllocator.ensureDirectory();

  if (configuration.quiet != true) {
    console.log(`[Harness] Scanning: ${configuration.rootDirectory}`);
  }

  var allCandidateFiles = await listCandidateFiles(
  configuration.rootDirectory,
  {
    ...configuration,
    maxFiles: null
  });

  var candidateWindow = selectCandidateWindow(allCandidateFiles, configuration);
  var candidateFiles = candidateWindow.files;

  var autoEnabledIsolatedWorkers = false;
  if (shouldAutoEnableIsolatedWorkers(configuration, candidateWindow) == true) {
    configuration.isolateFileWorker = true;
    autoEnabledIsolatedWorkers = true;
  }

  if (configuration.quiet != true) {
    console.log(`[Harness] Found ${candidateWindow.totalCandidates} candidate file(s).`);
    console.log(
    `[Harness] Selected ${candidateFiles.length} file(s)` +
    ` (start-index=${candidateWindow.startIndex}` +
    `, end-index=${candidateWindow.endIndex ?? '-'})`);

    console.log(`[Harness] Scenarios: ${configuration.scenarios.join(', ')}`);
    console.log(`[Harness] Output: ${runDirectory}`);
    if (configuration.isolateFileWorker == true) {
      console.log(`[Harness] Worker mode: ON (file timeout: ${configuration.fileTimeoutMs ?? 'none'} ms)`);
      if (autoEnabledIsolatedWorkers == true) {
        console.log('[Harness] Worker mode was auto-enabled for full-library reliability.');
      }
    }
  }

  var scenarioRunners = createScenarioRunnerMap();
  var fileResults = [];
  var recentFailures = [];
  var maxRecentFailures = 500;

  var harnessStartedAt = process.hrtime.bigint();
  var checkpointPath = path.join(runDirectory, 'checkpoint.json');
  var runStatePath = path.join(runDirectory, 'run-state.json');
  var eventLoopDelay = monitorEventLoopDelay({ resolution: 20 });
  eventLoopDelay.enable();

  var telemetry = createTelemetryState();

  var runtimeState = {
    status: 'running',
    startedAt: toIsoTimestamp(),
    processedCount: 0,
    totalFiles: candidateFiles.length,
    indexRange: {
      startIndex: candidateWindow.startIndex,
      endIndex: candidateWindow.endIndex,
      totalCandidates: candidateWindow.totalCandidates
    },
    currentFile: null,
    currentScenario: null,
    lastCompletedFile: null,
    lastFailure: null,
    lastProgressAt: toIsoTimestamp()
  };

  var checkpointWritePending = false;
  var runStateWritePending = false;
  var runStateIntervalHandle = null;

  var elapsedNowMs = () => Number(process.hrtime.bigint() - harnessStartedAt) / 1e6;

  var sampleTelemetry = (trigger = 'heartbeat') => {

    var memoryUsage = process.memoryUsage();
    var snapshot = {
      generatedAt: toIsoTimestamp(),
      trigger,
      processedCount: fileResults.length,
      elapsedMs: round(elapsedNowMs(), 3),
      memory: {
        rssMb: toMegabytes(memoryUsage.rss),
        heapUsedMb: toMegabytes(memoryUsage.heapUsed),
        heapTotalMb: toMegabytes(memoryUsage.heapTotal),
        externalMb: toMegabytes(memoryUsage.external),
        arrayBuffersMb: toMegabytes(memoryUsage.arrayBuffers)
      },
      eventLoopLag: {
        minMs: toEventLoopLagMilliseconds(eventLoopDelay.min),
        meanMs: toEventLoopLagMilliseconds(eventLoopDelay.mean),
        maxMs: toEventLoopLagMilliseconds(eventLoopDelay.max),
        p95Ms: toEventLoopLagMilliseconds(eventLoopDelay.percentile(95)),
        p99Ms: toEventLoopLagMilliseconds(eventLoopDelay.percentile(99)),
        stddevMs: toEventLoopLagMilliseconds(eventLoopDelay.stddev)
      }
    };

    telemetry.latest = snapshot;
    telemetry.recent.push(snapshot);
    if (telemetry.recent.length > telemetry.maxRecentSamples) {
      telemetry.recent = telemetry.recent.slice(telemetry.recent.length - telemetry.maxRecentSamples);
    }

    updateTelemetryPeaks(telemetry.peaks, snapshot);
    eventLoopDelay.reset();

    return snapshot;

  };

  var buildRunStatePayload = (status = 'running', error = null) => ({
    generatedAt: toIsoTimestamp(),
    status,
    elapsedMs: round(elapsedNowMs(), 3),
    processedCount: fileResults.length,
    totalFiles: candidateFiles.length,
    indexRange: runtimeState.indexRange,
    progressPercent: round(candidateFiles.length > 0 ?
    fileResults.length / candidateFiles.length * 100 :
    100, 3),
    lastProgressAt: runtimeState.lastProgressAt,
    msSinceLastProgress: runtimeState.lastProgressAt == null ?
    null :
    round(
    Math.max(0, Date.now() - new Date(runtimeState.lastProgressAt).getTime()),
    3),

    currentFile: runtimeState.currentFile,
    currentScenario: runtimeState.currentScenario,
    lastCompletedFile: runtimeState.lastCompletedFile,
    lastFailure: runtimeState.lastFailure,
    telemetry: {
      latest: telemetry.latest,
      peaks: telemetry.peaks
    },
    error: error == null ? null : normalizeError(error)
  });

  var buildCheckpointPayload = (trigger = 'interval') => {
    var elapsedMs = elapsedNowMs();
    var summary = buildSummary(fileResults, configuration, elapsedMs);
    return {
      generatedAt: toIsoTimestamp(),
      trigger,
      processedCount: fileResults.length,
      totalFiles: candidateFiles.length,
      progressPercent: round(candidateFiles.length > 0 ?
      fileResults.length / candidateFiles.length * 100 :
      100, 3),
      elapsedMs: round(elapsedMs, 3),
      currentFile: runtimeState.currentFile,
      currentScenario: runtimeState.currentScenario,
      lastCompletedFile: runtimeState.lastCompletedFile,
      lastFailure: runtimeState.lastFailure,
      telemetry: {
        latest: telemetry.latest,
        peaks: telemetry.peaks,
        recent: telemetry.recent
      },
      recentFailures,
      summary
    };
  };

  var flushRunState = async (status = 'running', error = null) => {
    if (runStateWritePending == true)
    return;

    runStateWritePending = true;
    try {
      sampleTelemetry('run-state');
      await writeRunState(runDirectory, buildRunStatePayload(status, error));
    } finally
    {
      runStateWritePending = false;
    }
  };

  var flushCheckpoint = async (trigger = 'interval') => {
    if (checkpointWritePending == true)
    return;

    checkpointWritePending = true;
    try {
      sampleTelemetry(`checkpoint:${trigger}`);
      await writeCheckpointReport(runDirectory, buildCheckpointPayload(trigger));
    } finally
    {
      checkpointWritePending = false;
    }
  };

  await flushRunState('running');
  await flushCheckpoint('start');

  runStateIntervalHandle = setInterval(() => {
    flushRunState('running').catch(() => {});
  }, 2000);

  try {

    for (var i = 0; i < candidateFiles.length; i++) {

      var absolutePath = candidateFiles[i];
      var absoluteIndex = candidateWindow.startIndex + i;
      var relativePath = toRelativeWebPath(configuration.rootDirectory, absolutePath);

      var fileInput = {
        absolutePath,
        relativePath,
        sourceFormat: detectSourceFormat(absolutePath),
        sizeBytes: (await fsp.stat(absolutePath)).size
      };

      runtimeState.currentFile = {
        index: absoluteIndex,
        relativePath: fileInput.relativePath,
        sourceFormat: fileInput.sourceFormat,
        sizeBytes: fileInput.sizeBytes,
        startedAt: toIsoTimestamp()
      };
      runtimeState.currentScenario = null;

      var fileResult = null;

      if (configuration.isolateFileWorker == true) {
        fileResult = await runFileInIsolatedWorker(absoluteIndex, i, fileInput, configuration, runDirectory);
      } else
      {
        fileResult = await runScenariosForFile(
        absoluteIndex,
        fileInput,
        configuration,
        {
          scenarioRunners,
          thumbnailAllocator,
          runDirectory,
          onScenarioStart: (scenarioName) => {
            runtimeState.currentScenario = {
              name: scenarioName,
              startedAt: toIsoTimestamp()
            };
          }
        });

      }

      fileResults.push(fileResult);
      runtimeState.processedCount = fileResults.length;
      runtimeState.lastCompletedFile = {
        index: absoluteIndex,
        relativePath: fileInput.relativePath,
        overallStatus: fileResult?.overallStatus ?? null,
        totalElapsedMs: fileResult?.totalElapsedMs ?? null,
        completedAt: toIsoTimestamp()
      };
      runtimeState.lastProgressAt = toIsoTimestamp();

      var failureDigest = createFailureDigest(fileResult);
      if (failureDigest != null) {
        runtimeState.lastFailure = failureDigest;
        recentFailures.push(failureDigest);
        if (recentFailures.length > maxRecentFailures) {
          recentFailures = recentFailures.slice(recentFailures.length - maxRecentFailures);
        }
      }

      runtimeState.currentFile = null;
      runtimeState.currentScenario = null;

      if (configuration.checkpointEvery > 0 && (i + 1) % configuration.checkpointEvery == 0) {
        await flushCheckpoint('interval');
      }

      if (configuration.quiet != true && ((i + 1) % configuration.progressEvery == 0 || i + 1 == candidateFiles.length)) {

        var progress = formatProgress(
        i,
        candidateFiles.length,
        0,
        elapsedNowMs());


        console.log(
        `[Harness] ${progress.processed}/${progress.total}` +
        ` | elapsed=${formatDurationMs(progress.elapsedMs)}` +
        ` | avg=${formatDurationMs(progress.averageMsPerFile)}` +
        ` | eta=${formatDurationMs(progress.etaMs)}`);


      }

    }

  }
  catch (error) {
    await flushCheckpoint('error');
    await flushRunState('failed', error);
    throw error;
  } finally
  {
    if (runStateIntervalHandle != null) {
      clearInterval(runStateIntervalHandle);
      runStateIntervalHandle = null;
    }
    eventLoopDelay.disable();
  }

  var elapsedMsTotal = Number(process.hrtime.bigint() - harnessStartedAt) / 1e6;
  var summary = buildSummary(fileResults, configuration, elapsedMsTotal);

  var thumbnailsSaved = thumbnailAllocator.allocatedCount;
  if (configuration.isolateFileWorker == true) {
    thumbnailsSaved = fileResults.reduce((count, fileResult) => {
      if (fileResult == null || fileResult.scenarios == null)
      return count;

      var scenarioKeys = Object.keys(fileResult.scenarios);
      for (var keyIndex = 0; keyIndex < scenarioKeys.length; keyIndex++) {
        var scenario = fileResult.scenarios[scenarioKeys[keyIndex]];
        if (scenario?.thumbnailPath != null)
        count++;
      }
      return count;
    }, 0);
  }

  var report = {
    generatedAt: toIsoTimestamp(),
    configuration: {
      rootDirectory: configuration.rootDirectory,
      outputDirectory: runDirectory,
      scenarios: configuration.scenarios,
      maxFiles: configuration.maxFiles,
      startIndex: candidateWindow.startIndex,
      endIndex: candidateWindow.endIndex,
      totalCandidates: candidateWindow.totalCandidates,
      includeExtensions: configuration.includeExtensions != null ?
      Array.from(configuration.includeExtensions.values()).sort() :
      null,
      allFiles: configuration.allFiles,
      matchPattern: configuration.matchPattern != null ?
      String(configuration.matchPattern) :
      null,
      excludeMatchPattern: configuration.excludeMatchPattern != null ?
      String(configuration.excludeMatchPattern) :
      null,
      skipOnParseFailure: configuration.skipOnParseFailure,
      scenarioTimeoutMs: configuration.scenarioTimeoutMs,
      isolateFileWorker: configuration.isolateFileWorker,
      isolateFileWorkerWasProvided: configuration.isolateFileWorkerWasProvided,
      isolateFileWorkerAutoEnabled: autoEnabledIsolatedWorkers,
      fileTimeoutMs: configuration.fileTimeoutMs,
      validationGoal: configuration.validationGoal,
      transcodeTargetSyntax: configuration.transcodeTargetSyntax,
      thumbnailLimit: configuration.thumbnailLimit,
      checkpointEvery: configuration.checkpointEvery,
      thumbnailsSaved
    },
    telemetry: {
      latest: telemetry.latest,
      peaks: telemetry.peaks
    },
    summary,
    files: fileResults
  };

  var reportJsonPath = path.join(runDirectory, 'report.json');
  var reportHtmlPath = path.join(runDirectory, 'report.html');

  await fsp.writeFile(reportJsonPath, JSON.stringify(report, null, 2), 'utf-8');

  var htmlPages = renderTestLibraryHarnessHtmlPages(report, {
    pageSize: 1000,
    outputDirectory: runDirectory,
    easiSourceDirectory: path.resolve('src')
  });
  await fsp.writeFile(reportHtmlPath, htmlPages.mainHtml, 'utf-8');

  var reportPagePaths = [];
  for (var pageIndex = 0; pageIndex < htmlPages.pages.length; pageIndex++) {
    var page = htmlPages.pages[pageIndex];
    var reportPagePath = path.join(runDirectory, page.fileName);
    reportPagePaths.push(reportPagePath);
    await fsp.writeFile(reportPagePath, page.html, 'utf-8');
  }

  await flushCheckpoint('final');
  await flushRunState('completed');

  return {
    report,
    runDirectory,
    reportJsonPath,
    reportHtmlPath,
    reportPagePaths,
    checkpointPath,
    runStatePath
  };

}

async function main() {

  var options = parseArguments(process.argv);

  if (options.help == true) {
    printHelp();
    return;
  }

  if (options.singleFileAbsolutePath != null) {

    try {

      var singleResult = await runSingleFileMode(options);
      process.stdout.write(`${SingleResultPrefix}${JSON.stringify(singleResult)}\n`);
      process.exit(0);

    }
    catch (error) {

      var fallbackInput = {
        absolutePath: options.singleFileAbsolutePath,
        relativePath: options.singleRelativePath ??
        toRelativeWebPath(options.rootDirectory, options.singleFileAbsolutePath),
        sourceFormat: options.singleSourceFormat ?? detectSourceFormat(options.singleFileAbsolutePath),
        sizeBytes: options.singleSizeBytes ?? 0
      };

      var fallbackResult = createFatalFileResult(0, fallbackInput, options, error, 0);
      process.stdout.write(`${SingleResultPrefix}${JSON.stringify(fallbackResult)}\n`);
      process.exit(1);

    }

    return;

  }

  var result = await runHarness(options);

  if (options.quiet != true) {
    console.log('[Harness] Completed.');
    console.log(`[Harness] Files processed: ${result.report.summary.filesProcessed}`);
    console.log(`[Harness] Files with failures: ${result.report.summary.filesWithFailures}`);
    console.log(`[Harness] Checkpoint: ${result.checkpointPath}`);
    console.log(`[Harness] Run state: ${result.runStatePath}`);
    console.log(`[Harness] JSON report: ${result.reportJsonPath}`);
    console.log(`[Harness] HTML report: ${result.reportHtmlPath}`);
    console.log(`[Harness] HTML modality pages: ${result.reportPagePaths?.length ?? 0}`);
  }

}

main().catch((error) => {
  var normalized = normalizeError(error);
  console.error('[Harness] Failed.');
  console.error(`${normalized.name}: ${normalized.message}`);
  if (normalized.stack != null) {
    console.error(normalized.stack);
  }
  process.exitCode = 1;
});