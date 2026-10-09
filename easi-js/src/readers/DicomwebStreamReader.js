//
// DicomwebStreamReader.js
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
import PartStreamReader from "./PartStreamReader.js";
import PartContentType from "./parts/PartContentType.js";

const WADO_INSTANCE_MODE = "wado-instance";
const WADO_METADATA_MODE = "wado-metadata";
const QIDO_SEARCH_MODE = "qido-search";

const REQUEST_OPTION_KEYS = Object.freeze([
    "method",
    "headers",
    "mode",
    "credentials",
    "cache",
    "redirect",
    "referrer",
    "referrerPolicy",
    "integrity",
    "keepalive",
    "signal",
    "body"
]);

function isObject(value) {
    return (value != null) && (typeof value === "object") && (Array.isArray(value) === false);
}

function normalizeString(value) {
    if (value == null) {
        return "";
    }

    return String(value).trim();
}

function removeTrailingSlashes(value) {
    return String(value || "").replace(/\/+$/g, "");
}

function removeLeadingSlashes(value) {
    return String(value || "").replace(/^\/+/g, "");
}

function joinPath(basePath, ...segments) {
    var nextPath = removeTrailingSlashes(basePath);
    for (const segment of segments) {
        var clean = removeLeadingSlashes(removeTrailingSlashes(segment));
        if (clean.length <= 0)
            continue;
        nextPath += "/" + clean;
    }
    return nextPath;
}

export default class DicomwebStreamReader {

    /**
     * Normalize one DICOMweb read mode.
     * @param {string | null} modeCandidate Requested mode.
     * @returns {string} Normalized mode.
     */
    normalizeMode(modeCandidate) {

        var raw = normalizeString(modeCandidate).toLowerCase();

        if (raw.length <= 0)
            return WADO_INSTANCE_MODE;

        if (raw === "wado")
            return WADO_INSTANCE_MODE;
        if (raw === "wado-rs")
            return WADO_INSTANCE_MODE;
        if (raw === "instance")
            return WADO_INSTANCE_MODE;
        if (raw === "wadoinstance")
            return WADO_INSTANCE_MODE;
        if (raw === WADO_INSTANCE_MODE)
            return WADO_INSTANCE_MODE;

        if (raw === "metadata")
            return WADO_METADATA_MODE;
        if (raw === "wadometadata")
            return WADO_METADATA_MODE;
        if (raw === WADO_METADATA_MODE)
            return WADO_METADATA_MODE;

        if (raw === "qido")
            return QIDO_SEARCH_MODE;
        if (raw === "qido-rs")
            return QIDO_SEARCH_MODE;
        if (raw === "search")
            return QIDO_SEARCH_MODE;
        if (raw === "qidosearch")
            return QIDO_SEARCH_MODE;
        if (raw === QIDO_SEARCH_MODE)
            return QIDO_SEARCH_MODE;

        throw new Exception("Invalid DICOMweb mode. Use 'wado-instance', 'wado-metadata', or 'qido-search'.", GeneralErrorCodes.InvalidParameter);

    }

    /**
     * Normalize one QIDO level token.
     * @param {string | null} levelCandidate Requested level token.
     * @returns {"study" | "series" | "instance"} Normalized level token.
     */
    normalizeQidoLevel(levelCandidate) {

        var raw = normalizeString(levelCandidate).toLowerCase();
        if (raw.length <= 0)
            return "study";

        if (raw === "study")
            return "study";
        if (raw === "studies")
            return "study";

        if (raw === "series")
            return "series";

        if (raw === "instance")
            return "instance";
        if (raw === "instances")
            return "instance";

        throw new Exception("Invalid DICOMweb query level. Use 'study', 'series', or 'instance'.", GeneralErrorCodes.InvalidParameter);

    }

    /**
     * Resolve one default Accept header for a mode.
     * @param {string} mode Normalized mode.
     * @returns {string} Accept header value.
     */
    defaultAcceptByMode(mode) {
        if (mode === QIDO_SEARCH_MODE)
            return "application/dicom+json";
        if (mode === WADO_METADATA_MODE)
            return "application/dicom+json";
        return "application/dicom";
    }

    /**
     * Convert one source value to source-object form.
     * @param {string | object | null} source DICOMweb source.
     * @returns {{ url?: string, endpoint?: string, href?: string, [key: string]: any }} Source object.
     */
    toSourceObject(source) {

        if (typeof source === "string") {
            return {
                url: source
            };
        }

        if (isObject(source))
            return source;

        return {};

    }

    /**
     * Resolve one explicit URL directly supplied by source/options.
     * @param {object} sourceObject Source object.
     * @param {object} options Read options.
     * @returns {string | null} Explicit URL, when supplied.
     */
    resolveExplicitUrl(sourceObject, options) {

        var sourceUrl = normalizeString(sourceObject.url || sourceObject.endpoint || sourceObject.href);
        if (sourceUrl.length > 0)
            return sourceUrl;

        var optionUrl = normalizeString(options.url || options.endpoint || options.href);
        if (optionUrl.length > 0)
            return optionUrl;

        return null;

    }

    /**
     * Resolve one UIDs tuple from source/options.
     * @param {object} sourceObject Source object.
     * @param {object} options Read options.
     * @returns {{ studyInstanceUid: string, seriesInstanceUid: string, sopInstanceUid: string }} UID tuple.
     */
    resolveUidTuple(sourceObject, options) {
        return {
            studyInstanceUid: normalizeString(sourceObject.studyInstanceUid || options.studyInstanceUid || sourceObject.studyUID || options.studyUID),
            seriesInstanceUid: normalizeString(sourceObject.seriesInstanceUid || options.seriesInstanceUid || sourceObject.seriesUID || options.seriesUID),
            sopInstanceUid: normalizeString(sourceObject.sopInstanceUid || options.sopInstanceUid || sourceObject.instanceUID || options.instanceUID)
        };
    }

    /**
     * Resolve query parameters from source/options.
     * @param {object} sourceObject Source object.
     * @param {object} options Read options.
     * @returns {object} Query object.
     */
    resolveQueryObject(sourceObject, options) {

        var merged = {};

        if (isObject(sourceObject.query)) {
            merged = Object.assign(merged, sourceObject.query);
        }

        if (isObject(options.query)) {
            merged = Object.assign(merged, options.query);
        }

        return merged;

    }

    /**
     * Append one query object to URL.
     * @param {string} url Base URL.
     * @param {object} query Query object.
     * @returns {string} URL with query string.
     */
    appendQuery(url, query) {

        if (isObject(query) === false)
            return url;

        var entries = Object.entries(query).filter((entry) => {
            var value = entry[1];
            if (value == null)
                return false;
            if (Array.isArray(value))
                return value.length > 0;
            if (typeof value === "string")
                return value.length > 0;
            return true;
        });

        if (entries.length <= 0)
            return url;

        var params = new URLSearchParams();
        entries.forEach((entry) => {
            var key = entry[0];
            var value = entry[1];
            if (Array.isArray(value)) {
                value.forEach((item) => params.append(key, String(item)));
                return;
            }
            params.append(key, String(value));
        });

        var separator = (url.indexOf("?") > -1) ? "&" : "?";
        return url + separator + params.toString();

    }

    /**
     * Build one DICOMweb URL from source/options when explicit URL is not supplied.
     * @param {object} sourceObject Source object.
     * @param {object} options Read options.
     * @param {string} mode Normalized mode.
     * @returns {string} Built DICOMweb URL.
     */
    buildUrlFromSource(sourceObject, options, mode) {

        var explicitUrl = this.resolveExplicitUrl(sourceObject, options);
        if (explicitUrl != null)
            return explicitUrl;

        var baseUrl = normalizeString(sourceObject.baseUrl || sourceObject.base || options.baseUrl || options.base);
        if (baseUrl.length <= 0)
            throw new Exception("Invalid DICOMweb source. Provide URL or baseUrl.", GeneralErrorCodes.InvalidParameter);

        var pathPrefix = normalizeString(options.dicomwebPathPrefix || sourceObject.dicomwebPathPrefix);
        if (pathPrefix.length > 0) {
            baseUrl = joinPath(baseUrl, pathPrefix);
        }

        var query = this.resolveQueryObject(sourceObject, options);
        var uids = this.resolveUidTuple(sourceObject, options);

        if ((mode === WADO_INSTANCE_MODE) || (mode === WADO_METADATA_MODE)) {

            if ((uids.studyInstanceUid.length <= 0)
                || (uids.seriesInstanceUid.length <= 0)
                || (uids.sopInstanceUid.length <= 0)) {
                throw new Exception(
                    "Invalid DICOMweb source. WADO modes require studyInstanceUid, seriesInstanceUid, and sopInstanceUid.",
                    GeneralErrorCodes.InvalidParameter
                );
            }

            var wadoUrl = joinPath(
                baseUrl,
                "studies",
                encodeURIComponent(uids.studyInstanceUid),
                "series",
                encodeURIComponent(uids.seriesInstanceUid),
                "instances",
                encodeURIComponent(uids.sopInstanceUid)
            );

            if (mode === WADO_METADATA_MODE) {
                wadoUrl = joinPath(wadoUrl, "metadata");
            }

            return this.appendQuery(wadoUrl, query);

        }

        var qidoLevel = this.normalizeQidoLevel(sourceObject.level || options.level || sourceObject.queryRetrieveLevel || options.queryRetrieveLevel);
        var qidoPath = [];

        if (qidoLevel === "study") {
            qidoPath = ["studies"];
        } else if (qidoLevel === "series") {
            if (uids.studyInstanceUid.length <= 0) {
                throw new Exception("Invalid DICOMweb source. QIDO series-level queries require studyInstanceUid.", GeneralErrorCodes.InvalidParameter);
            }
            qidoPath = ["studies", encodeURIComponent(uids.studyInstanceUid), "series"];
        } else {
            if ((uids.studyInstanceUid.length <= 0) || (uids.seriesInstanceUid.length <= 0)) {
                throw new Exception(
                    "Invalid DICOMweb source. QIDO instance-level queries require studyInstanceUid and seriesInstanceUid.",
                    GeneralErrorCodes.InvalidParameter
                );
            }
            qidoPath = [
                "studies",
                encodeURIComponent(uids.studyInstanceUid),
                "series",
                encodeURIComponent(uids.seriesInstanceUid),
                "instances"
            ];
        }

        var qidoUrl = joinPath(baseUrl, ...qidoPath);
        return this.appendQuery(qidoUrl, query);

    }

    /**
     * Copy selected request-init keys from source object.
     * @param {object} source Source object.
     * @param {object} target Target request options.
     */
    applyRequestKeys(source, target) {
        if (isObject(source) === false)
            return;

        REQUEST_OPTION_KEYS.forEach((key) => {
            if (Object.prototype.hasOwnProperty.call(source, key) == true) {
                target[key] = source[key];
            }
        });
    }

    /**
     * Merge one header collection onto a plain object map.
     * @param {object} targetHeaders Header map to mutate.
     * @param {Headers | Array<Array<string>> | object | null | undefined} headersValue Input header source.
     */
    mergeHeaders(targetHeaders, headersValue) {

        if (headersValue == null)
            return;

        if (typeof headersValue.forEach === "function") {
            headersValue.forEach((value, key) => {
                targetHeaders[String(key)] = String(value);
            });
            return;
        }

        if (Array.isArray(headersValue)) {
            headersValue.forEach((entry) => {
                if ((Array.isArray(entry) == false) || (entry.length < 2))
                    return;
                targetHeaders[String(entry[0])] = String(entry[1]);
            });
            return;
        }

        if (isObject(headersValue) == false)
            return;

        Object.entries(headersValue).forEach((entry) => {
            targetHeaders[String(entry[0])] = String(entry[1]);
        });

    }

    /**
     * Build one fetch request options object.
     * @param {object} sourceObject Source object.
     * @param {object} options Read options.
     * @param {string} mode Normalized mode.
     * @returns {{ requestOptions: object, onEmit: Function | null, hasOnEmit: boolean }} Request metadata.
     */
    buildRequestOptions(sourceObject, options, mode) {

        var requestOptions = {};

        this.applyRequestKeys(sourceObject, requestOptions);
        this.applyRequestKeys(sourceObject.request, requestOptions);
        this.applyRequestKeys(options, requestOptions);
        this.applyRequestKeys(options.request, requestOptions);

        var hasOnEmit = false;
        var onEmit = null;

        if (Object.prototype.hasOwnProperty.call(options, "onEmit") == true) {
            hasOnEmit = true;
            onEmit = options.onEmit;
        } else if (Object.prototype.hasOwnProperty.call(sourceObject, "onEmit") == true) {
            hasOnEmit = true;
            onEmit = sourceObject.onEmit;
        }

        if ((hasOnEmit === true) && (onEmit != null) && (typeof onEmit !== "function")) {
            throw new Exception("Invalid 'onEmit' callback. Expected function or null.", GeneralErrorCodes.InvalidParameter);
        }

        var headers = {};
        this.mergeHeaders(headers, sourceObject.headers);
        this.mergeHeaders(headers, sourceObject.request?.headers);
        this.mergeHeaders(headers, options.headers);
        this.mergeHeaders(headers, options.request?.headers);

        var acceptHeader = normalizeString(options.accept || sourceObject.accept);
        if (acceptHeader.length <= 0)
            acceptHeader = this.defaultAcceptByMode(mode);

        if (acceptHeader.length > 0)
            headers.Accept = acceptHeader;

        requestOptions.headers = headers;
        requestOptions.method = normalizeString(requestOptions.method).toUpperCase() || "GET";

        return {
            requestOptions,
            onEmit,
            hasOnEmit
        };

    }

    /**
     * Read and parse one DICOMweb source.
     * @param {string | object | null} source Optional DICOMweb URL or structured source object.
     * @param {{ mode?: string, accept?: string, request?: RequestInit, query?: object, dicomwebPathPrefix?: string, onEmit?: Function | null } | null} options Optional DICOMweb request options.
     * @returns {Promise<object>} Parser result.
     */
    async read(source, options = null) {

        var sourceObject = this.toSourceObject(source);
        var readOptions = isObject(options) ? options : {};
        var mode = this.normalizeMode(readOptions.mode || sourceObject.mode);
        var url = this.buildUrlFromSource(sourceObject, readOptions, mode);
        var requestMeta = this.buildRequestOptions(sourceObject, readOptions, mode);

        var response = await fetch(url, requestMeta.requestOptions);
        if ((response == null) || (response.body == null)) {
            throw new Exception("Invalid DICOMweb response. Missing response body stream.", GeneralErrorCodes.GeneralError);
        }

        var contentType = PartContentType.parse(response);
        if ((contentType.mediaType == null) || (contentType.mediaType.length <= 0)) {
            contentType = PartContentType.parse(this.defaultAcceptByMode(mode));
        }

        var streamOptions = {
            contentType: contentType,
            contentLength: (response.headers != null) ? response.headers.get("content-length") : null
        };

        if (requestMeta.hasOnEmit === true) {
            streamOptions.onEmit = requestMeta.onEmit;
        }

        return this._partReader.readStream(response.body, streamOptions);

    }

    /**
     * Set the current parser.
     * @param {DataParser} parser The parser.
     */
    set parser(parser) {
        this._partReader.parser = parser;
    }

    /**
     * Get the current parser.
     * @returns {DataParser} The parser.
     */
    get parser() {
        return this._partReader.parser;
    }

    /**
     * Set the onPart callback.
     * @param {Function | null} onPart The onPart callback.
     */
    set onPart(onPart) {
        this._partReader.onPart = onPart;
    }

    /**
     * Get the onPart callback.
     * @returns {Function | null} The onPart callback.
     */
    get onPart() {
        return this._partReader.onPart;
    }

    /**
     * Create one DICOMweb reader adapter.
     * @param {PartStreamReader | null} partReader Optional part reader.
     */
    constructor(partReader = null) {
        this._partReader = (partReader != null) ? partReader : new PartStreamReader();
    }

}
