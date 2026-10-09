//
// NodeDimseQueryRetrieveSourceTransport.js
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
import DimseSourceTransport from "./DimseSourceTransport.js";
import DimseTransportContract from "./DimseTransportContract.js";
import Tag, { Tags } from "../../dicom/Tag.js";
import TransferSyntax from "../../dicom/TransferSyntax.js";
import ValueRepresentation from "../../dicom/ValueRepresentation.js";

const APPLICATION_CONTEXT_UID = "1.2.840.10008.3.1.1.1";
const DEFAULT_IMPLEMENTATION_CLASS_UID = "1.2.826.0.1.3680043.10.5432.1";
const DEFAULT_IMPLEMENTATION_VERSION_NAME = "EASIJS_1_0";

const STUDY_ROOT_FIND_UID = "1.2.840.10008.5.1.4.1.2.2.1";
const STUDY_ROOT_MOVE_UID = "1.2.840.10008.5.1.4.1.2.2.2";
const STUDY_ROOT_GET_UID = "1.2.840.10008.5.1.4.1.2.2.3";
const PATIENT_ROOT_FIND_UID = "1.2.840.10008.5.1.4.1.2.1.1";
const PATIENT_ROOT_MOVE_UID = "1.2.840.10008.5.1.4.1.2.1.2";
const PATIENT_ROOT_GET_UID = "1.2.840.10008.5.1.4.1.2.1.3";
const VERIFICATION_SOP_CLASS_UID = "1.2.840.10008.1.1";

const EXPLICIT_VR_LE = "1.2.840.10008.1.2.1";
const IMPLICIT_VR_LE = "1.2.840.10008.1.2";

const DEFAULT_STORAGE_SOP_CLASS_UIDS = [
    "1.2.840.10008.5.1.4.1.1.1",    // CR Image Storage
    "1.2.840.10008.5.1.4.1.1.1.1",  // DX for Presentation
    "1.2.840.10008.5.1.4.1.1.1.2",  // Mammography DX for Presentation
    "1.2.840.10008.5.1.4.1.1.2",    // CT Image Storage
    "1.2.840.10008.5.1.4.1.1.2.1",  // Enhanced CT
    "1.2.840.10008.5.1.4.1.1.4",    // MR Image Storage
    "1.2.840.10008.5.1.4.1.1.4.1",  // Enhanced MR
    "1.2.840.10008.5.1.4.1.1.6.1",  // Ultrasound Image Storage
    "1.2.840.10008.5.1.4.1.1.7",    // Secondary Capture
    "1.2.840.10008.5.1.4.1.1.12.1", // XA Image Storage
    "1.2.840.10008.5.1.4.1.1.12.2", // XRF Image Storage
    "1.2.840.10008.5.1.4.1.1.128",  // PET Image Storage
    "1.2.840.10008.5.1.4.1.1.130",  // Enhanced PET
    "1.2.840.10008.5.1.4.1.1.88.22" // Enhanced SR
];

const DEFAULT_STORAGE_TRANSFER_SYNTAX_UIDS = [
    IMPLICIT_VR_LE,
    EXPLICIT_VR_LE
];

const QUERY_TAG_VRS = {
    "00080016": "UI", // SOPClassUID
    "00080018": "UI", // SOPInstanceUID
    "00080050": "SH", // AccessionNumber
    "00080052": "CS", // QueryRetrieveLevel
    "00100020": "LO", // PatientID
    "0020000D": "UI", // StudyInstanceUID
    "0020000E": "UI"  // SeriesInstanceUID
};

const PDU_TYPES = {
    A_ASSOCIATE_RQ: 0x01,
    A_ASSOCIATE_AC: 0x02,
    A_ASSOCIATE_RJ: 0x03,
    P_DATA_TF: 0x04,
    A_RELEASE_RQ: 0x05,
    A_RELEASE_RP: 0x06,
    A_ABORT: 0x07
};

var CachedNetModule = null;
var CachedTlsModule = null;
var PendingSocketModuleLoad = null;

function padAeTitle(value) {

    var text = (value == null) ? "" : String(value);
    if (text.length > 16) {
        text = text.substring(0, 16);
    }

    while (text.length < 16) {
        text += " ";
    }

    return text;

}

function toTextBytes(value) {
    return (new TextEncoder()).encode(String(value));
}

function padEven(valueBytes, padByte = 0x00) {

    if ((valueBytes.length % 2) == 0) {
        return valueBytes;
    }

    var padded = new Uint8Array(valueBytes.length + 1);
    padded.set(valueBytes, 0);
    padded[padded.length - 1] = padByte;

    return padded;

}

function toUint16BE(value) {
    var bytes = new Uint8Array(2);
    (new DataView(bytes.buffer)).setUint16(0, value >>> 0, false);
    return bytes;
}

function toUint16LE(value) {
    var bytes = new Uint8Array(2);
    (new DataView(bytes.buffer)).setUint16(0, value >>> 0, true);
    return bytes;
}

function toUint32BE(value) {
    var bytes = new Uint8Array(4);
    (new DataView(bytes.buffer)).setUint32(0, value >>> 0, false);
    return bytes;
}

function toUint32LE(value) {
    var bytes = new Uint8Array(4);
    (new DataView(bytes.buffer)).setUint32(0, value >>> 0, true);
    return bytes;
}

function concatBytes(chunks) {

    var total = 0;
    for (var i = 0; i < chunks.length; i++) {
        total += chunks[i].length;
    }

    var result = new Uint8Array(total);
    var offset = 0;
    for (var index = 0; index < chunks.length; index++) {
        result.set(chunks[index], offset);
        offset += chunks[index].length;
    }

    return result;

}

function makeItem(type, payload) {

    return concatBytes([
        new Uint8Array([type, 0x00]),
        toUint16BE(payload.length),
        payload
    ]);

}

function makePdu(type, payload) {
    return concatBytes([
        new Uint8Array([type, 0x00]),
        toUint32BE(payload.length),
        payload
    ]);
}

function encodeCommandElement(group, element, valueBytes) {

    return concatBytes([
        toUint16LE(group),
        toUint16LE(element),
        toUint32LE(valueBytes.length),
        valueBytes
    ]);

}

function encodeCommandUI(group, element, value) {
    return encodeCommandElement(group, element, padEven(toTextBytes(value), 0x00));
}

function encodeCommandAE(group, element, value) {
    return encodeCommandElement(group, element, padEven(toTextBytes(value), 0x20));
}

function encodeCommandUS(group, element, value) {
    return encodeCommandElement(group, element, toUint16LE(value));
}

function encodeCommandUL(group, element, value) {
    return encodeCommandElement(group, element, toUint32LE(value));
}

function encodeRequestCommand(commandField, messageId, sopClassUid, hasDataSet = true, priority = 0x0000) {

    var body = concatBytes([
        encodeCommandUI(0x0000, 0x0002, sopClassUid),
        encodeCommandUS(0x0000, 0x0100, commandField),
        encodeCommandUS(0x0000, 0x0110, messageId),
        encodeCommandUS(0x0000, 0x0700, priority),
        encodeCommandUS(0x0000, 0x0800, (hasDataSet == true) ? 0x0000 : 0x0101)
    ]);

    return concatBytes([
        encodeCommandUL(0x0000, 0x0000, body.length),
        body
    ]);

}

function encodeEchoRequestCommand(messageId, sopClassUid = VERIFICATION_SOP_CLASS_UID) {

    var body = concatBytes([
        encodeCommandUI(0x0000, 0x0002, sopClassUid),
        encodeCommandUS(0x0000, 0x0100, 0x0030), // C-ECHO-RQ
        encodeCommandUS(0x0000, 0x0110, messageId),
        encodeCommandUS(0x0000, 0x0800, 0x0101) // no data-set
    ]);

    return concatBytes([
        encodeCommandUL(0x0000, 0x0000, body.length),
        body
    ]);

}

function encodeEchoResponseCommand(messageId) {
    var body = concatBytes([
        encodeCommandUI(0, 2, VERIFICATION_SOP_CLASS_UID),
        encodeCommandUS(0, 0x0100, 0x8030),
        encodeCommandUS(0, 0x0120, messageId),
        encodeCommandUS(0, 0x0800, 0x0101),
        encodeCommandUS(0, 0x0900, 0)
    ]);
    return concatBytes([encodeCommandUL(0, 0, body.length), body]);
}

function encodeMoveRequestCommand(messageId, moveSopClassUid, moveDestinationAeTitle, priority = 0x0000) {

    var body = concatBytes([
        encodeCommandUI(0x0000, 0x0002, moveSopClassUid),
        encodeCommandUS(0x0000, 0x0100, 0x0021), // C-MOVE-RQ
        encodeCommandUS(0x0000, 0x0110, messageId),
        encodeCommandAE(0x0000, 0x0600, moveDestinationAeTitle),
        encodeCommandUS(0x0000, 0x0700, priority),
        encodeCommandUS(0x0000, 0x0800, 0x0000) // data-set present
    ]);

    return concatBytes([
        encodeCommandUL(0x0000, 0x0000, body.length),
        body
    ]);

}

function encodeStoreResponseCommand(sopClassUid, sopInstanceUid, messageIdBeingRespondedTo, status = 0x0000) {

    var body = concatBytes([
        encodeCommandUI(0x0000, 0x0002, sopClassUid),
        encodeCommandUS(0x0000, 0x0100, 0x8001), // C-STORE-RSP
        encodeCommandUS(0x0000, 0x0120, messageIdBeingRespondedTo),
        encodeCommandUS(0x0000, 0x0800, 0x0101),
        encodeCommandUS(0x0000, 0x0900, status),
        encodeCommandUI(0x0000, 0x1000, sopInstanceUid)
    ]);

    return concatBytes([
        encodeCommandUL(0x0000, 0x0000, body.length),
        body
    ]);

}

function parseCommandElements(bytes) {

    var elements = new Map();
    var offset = 0;

    while (offset < bytes.length) {

        if ((offset + 8) > bytes.length) {
            throw new Exception("Truncated DIMSE command element header.", GeneralErrorCodes.GeneralError);
        }

        var view = new DataView(bytes.buffer, bytes.byteOffset + offset, 8);
        var group = view.getUint16(0, true);
        var element = view.getUint16(2, true);
        var length = view.getUint32(4, true);
        offset += 8;

        if ((group != 0) || ((length % 2) != 0) || ((offset + length) > bytes.length)) {
            throw new Exception("Invalid or truncated DIMSE command element.", GeneralErrorCodes.GeneralError);
        }

        var tag = group.toString(16).padStart(4, "0").toUpperCase()
            + element.toString(16).padStart(4, "0").toUpperCase();
        if (elements.has(tag)) {
            throw new Exception("Duplicate DIMSE command element.", GeneralErrorCodes.GeneralError);
        }
        elements.set(tag, bytes.subarray(offset, offset + length));
        offset += length;

    }

    var groupLength = elements.get("00000000");
    if ((groupLength == null) || (groupLength.length != 4)
        || ((new DataView(groupLength.buffer, groupLength.byteOffset, 4)).getUint32(0, true) != (bytes.length - 12))) {
        throw new Exception("Invalid DIMSE command group length.", GeneralErrorCodes.GeneralError);
    }

    return elements;

}

function decodeCommandUS(elements, tag, defaultValue = 0) {
    var value = elements.get(tag);
    if (value == null) {
        return defaultValue;
    }
    if (value.length != 2) {
        throw new Exception(`Invalid DIMSE command US value ${tag}.`, GeneralErrorCodes.GeneralError);
    }
    return (new DataView(value.buffer, value.byteOffset, value.byteLength)).getUint16(0, true);
}

function requireCommandUS(elements, tag) {
    if (elements.has(tag) == false) {
        throw new Exception(`Missing DIMSE command field ${tag}.`, GeneralErrorCodes.GeneralError);
    }
    return decodeCommandUS(elements, tag);
}

function readResponse(event, commandField, contextId, messageId = null, sopClassUid = null) {
    if ((event.type != "pdv") || (event.isCommand !== true) || (event.contextId != contextId)) {
        throw new Exception("Unexpected DIMSE response presentation context or dataset.", GeneralErrorCodes.GeneralError);
    }
    var elements = parseCommandElements(event.bytes);
    if (requireCommandUS(elements, "00000100") != commandField) {
        throw new Exception("Unexpected DIMSE response command.", GeneralErrorCodes.GeneralError);
    }
    var respondedTo = requireCommandUS(elements, "00000120");
    if ((messageId != null) && (respondedTo != messageId)) {
        throw new Exception("DIMSE response message ID does not match the request.", GeneralErrorCodes.GeneralError);
    }
    var affected = decodeCommandUI(elements, "00000002", null);
    if ((affected != null) && (sopClassUid != null) && (affected != sopClassUid)) {
        throw new Exception("DIMSE response SOP class does not match the request.", GeneralErrorCodes.GeneralError);
    }
    requireCommandUS(elements, "00000800");
    requireCommandUS(elements, "00000900");
    return elements;
}

function responseDetails(elements) {
    return {
        status: requireCommandUS(elements, "00000900"),
        messageIdBeingRespondedTo: requireCommandUS(elements, "00000120"),
        remaining: decodeCommandUS(elements, "00001020", null),
        completed: decodeCommandUS(elements, "00001021", null),
        failed: decodeCommandUS(elements, "00001022", null),
        warning: decodeCommandUS(elements, "00001023", null),
        failedSopInstanceUids: []
    };
}

function failedResponse(operation, details) {
    var error = new Exception(`${operation} failed with status 0x${details.status.toString(16).toUpperCase()}.`, GeneralErrorCodes.GeneralError);
    error.dimse = details;
    return error;
}

function validatePositiveInteger(value, name, maximum = Number.MAX_SAFE_INTEGER) {
    var number = Number(value);
    if ((Number.isInteger(number) == false) || (number <= 0) || (number > maximum)) {
        throw new Exception(`Invalid DIMSE ${name}.`, GeneralErrorCodes.InvalidParameter);
    }
    return number;
}

function validateUidList(value, name) {
    if ((Array.isArray(value) == false) || (value.length == 0)
        || value.some((uid) => (typeof uid !== "string") || (uid.length > 64) || (/^[0-9]+(?:\.[0-9]+)*$/.test(uid) == false))) {
        throw new Exception(`Invalid DIMSE ${name}.`, GeneralErrorCodes.InvalidParameter);
    }
    return Array.from(new Set(value));
}

function cancellationError(signal) {
    var error = new Exception("DIMSE operation aborted.", GeneralErrorCodes.GeneralError);
    error.name = "AbortError";
    error.cause = signal?.reason;
    return error;
}

function validateSignal(signal) {
    if ((signal != null) && ((typeof signal.addEventListener !== "function")
        || (typeof signal.removeEventListener !== "function") || (typeof signal.aborted !== "boolean"))) {
        throw new Exception("Invalid DIMSE AbortSignal.", GeneralErrorCodes.InvalidParameter);
    }
}

function decodeCommandUI(elements, tag, defaultValue = "") {
    var value = elements.get(tag);
    if (value == null) {
        return defaultValue;
    }
    return (new TextDecoder()).decode(value).replace(/\0/g, "").trim();
}

function normalizeTag(value) {

    if (value == null) {
        return null;
    }

    var text = String(value).toUpperCase();
    text = text.replace(/[(),\s]/g, "");

    if (/^[0-9A-F]{8}$/.test(text) == false) {
        return null;
    }

    return text;

}

function splitTag(tag) {
    return {
        group: parseInt(tag.substring(0, 4), 16),
        element: parseInt(tag.substring(4, 8), 16)
    };
}

function encodeExplicitVRElement(tag, vr, valueBytes) {

    var tagParts = splitTag(tag);
    var normalizedVr = String(vr || "UN").toUpperCase();
    var longVr = (normalizedVr == "OB") || (normalizedVr == "OD") || (normalizedVr == "OF") || (normalizedVr == "OL")
        || (normalizedVr == "OV") || (normalizedVr == "OW") || (normalizedVr == "SQ") || (normalizedVr == "UC")
        || (normalizedVr == "UR") || (normalizedVr == "UT") || (normalizedVr == "UN")
        || (normalizedVr == "SV") || (normalizedVr == "UV");

    if (longVr == true) {
        return concatBytes([
            toUint16LE(tagParts.group),
            toUint16LE(tagParts.element),
            toTextBytes(normalizedVr),
            new Uint8Array([0x00, 0x00]),
            toUint32LE(valueBytes.length),
            valueBytes
        ]);
    }

    return concatBytes([
        toUint16LE(tagParts.group),
        toUint16LE(tagParts.element),
        toTextBytes(normalizedVr),
        toUint16LE(valueBytes.length),
        valueBytes
    ]);

}

function encodeImplicitVRElement(tag, valueBytes) {

    var tagParts = splitTag(tag);

    return concatBytes([
        toUint16LE(tagParts.group),
        toUint16LE(tagParts.element),
        toUint32LE(valueBytes.length),
        valueBytes
    ]);

}

function encodeTextValue(vr, value) {

    var text = (value == null) ? "" : (Array.isArray(value) ? value.join("\\") : String(value));
    var bytes = toTextBytes(text);

    if (vr == "UI") {
        return padEven(bytes, 0x00);
    }

    return padEven(bytes, 0x20);

}

function buildQueryIdentifierDataset(queryOptions = null, transferSyntaxUid = EXPLICIT_VR_LE) {

    if (queryOptions == null) {
        queryOptions = {};
    }

    var keys = {};
    var suppliedKeys = queryOptions.keys || {};
    for (var suppliedKey of Object.keys(suppliedKeys)) {
        var normalizedKey = normalizeTag(suppliedKey) || Tag[suppliedKey]?.ID;
        if ((normalizedKey == null) || (normalizedKey.startsWith("0000")) || (normalizedKey.startsWith("0002"))) {
            throw new Exception(`Invalid DIMSE query key '${suppliedKey}'.`, GeneralErrorCodes.InvalidParameter);
        }
        keys[normalizedKey] = suppliedKeys[suppliedKey];
    }
    if (queryOptions.returnKeys != null) {
        if (Array.isArray(queryOptions.returnKeys) == false) {
            throw new Exception("DIMSE returnKeys must be an array of tag IDs or keywords.", GeneralErrorCodes.InvalidParameter);
        }
        for (var returnKey of queryOptions.returnKeys) {
            var returnTag = normalizeTag(returnKey) || Tag[returnKey]?.ID;
            if ((returnTag == null) || returnTag.startsWith("0000") || returnTag.startsWith("0002")) {
                throw new Exception(`Invalid DIMSE return key '${returnKey}'.`, GeneralErrorCodes.InvalidParameter);
            }
            if (keys[returnTag] === undefined) {
                keys[returnTag] = "";
            }
        }
    }

    if (queryOptions.studyInstanceUid != null) {
        keys["0020000D"] = queryOptions.studyInstanceUid;
    }

    if (queryOptions.seriesInstanceUid != null) {
        keys["0020000E"] = queryOptions.seriesInstanceUid;
    }

    if (queryOptions.sopInstanceUid != null) {
        keys["00080018"] = queryOptions.sopInstanceUid;
    }

    if (queryOptions.patientId != null) {
        keys["00100020"] = queryOptions.patientId;
    }

    if (queryOptions.accessionNumber != null) {
        keys["00080050"] = queryOptions.accessionNumber;
    }

    var queryRetrieveLevel = queryOptions.queryRetrieveLevel;
    if (queryRetrieveLevel == null) {
        if (keys["00080018"] != null) {
            queryRetrieveLevel = "IMAGE";
        }
        else if (keys["0020000E"] != null) {
            queryRetrieveLevel = "SERIES";
        }
        else {
            queryRetrieveLevel = "STUDY";
        }
    }

    queryRetrieveLevel = String(queryRetrieveLevel).toUpperCase();
    if (["PATIENT", "STUDY", "SERIES", "IMAGE"].includes(queryRetrieveLevel) == false) {
        throw new Exception("Invalid DIMSE queryRetrieveLevel.", GeneralErrorCodes.InvalidParameter);
    }
    if ((queryRetrieveLevel == "PATIENT") && (queryOptions.queryRetrieveModel != "patient-root")) {
        throw new Exception("DIMSE Study Root does not support PATIENT level.", GeneralErrorCodes.InvalidParameter);
    }
    keys["00080052"] = queryRetrieveLevel;

    if (Object.values(keys).some((value) => /[^\x00-\x7F]/.test(String(value ?? "")))) {
        if ((keys["00080005"] != null) && (keys["00080005"] != "ISO_IR 192")) {
            throw new Exception("DIMSE query text supports UTF-8 (ISO_IR 192) only.", GeneralErrorCodes.InvalidParameter);
        }
        keys["00080005"] = "ISO_IR 192";
    }

    var keyVrs = {};
    for (var vrKey of Object.keys(queryOptions.keyVrs || {})) {
        var vrTag = normalizeTag(vrKey) || Tag[vrKey]?.ID;
        if (vrTag == null) {
            throw new Exception(`Invalid DIMSE keyVrs key '${vrKey}'.`, GeneralErrorCodes.InvalidParameter);
        }
        keyVrs[vrTag] = String(queryOptions.keyVrs[vrKey]).toUpperCase();
    }
    var encodedElements = [];

    var allKeys = Object.keys(keys);
    allKeys.sort();

    var isImplicitVr = (String(transferSyntaxUid || EXPLICIT_VR_LE) == IMPLICIT_VR_LE);

    for (var i = 0; i < allKeys.length; i++) {

        var key = normalizeTag(allKeys[i]);
        var vr = keyVrs[key] || QUERY_TAG_VRS[key] || Tags[key]?.VR?.ID;
        var emptyValue = (keys[allKeys[i]] == null) || (keys[allKeys[i]] === "")
            || (Array.isArray(keys[allKeys[i]]) && (keys[allKeys[i]].length == 0));
        if ((vr == null) || (ValueRepresentation.find(vr) == null)
            || ((emptyValue == false) && (["AE", "AS", "CS", "DA", "DS", "DT", "IS", "LO", "LT", "PN", "SH", "ST", "TM", "UC", "UI", "UR", "UT"].includes(vr) == false))) {
            throw new Exception(`DIMSE query key '${key}' requires a supported text VR.`, GeneralErrorCodes.InvalidParameter);
        }
        var valueBytes = encodeTextValue(vr, keys[allKeys[i]]);
        if ((valueBytes.length > 65534) && (["UC", "UR", "UT"].includes(vr) == false)) {
            throw new Exception(`DIMSE query value '${key}' is too long.`, GeneralErrorCodes.InvalidParameter);
        }
        if (isImplicitVr == true) {
            encodedElements.push(encodeImplicitVRElement(key, valueBytes));
        }
        else {
            encodedElements.push(encodeExplicitVRElement(key, vr, valueBytes));
        }

    }

    return concatBytes(encodedElements);

}

function makeRoleSelectionItem(sopClassUid, scuRole = false, scpRole = true) {

    var uidBytes = toTextBytes(sopClassUid);

    return concatBytes([
        new Uint8Array([0x54, 0x00]),
        toUint16BE(uidBytes.length + 4),
        toUint16BE(uidBytes.length),
        uidBytes,
        new Uint8Array([scuRole ? 0x01 : 0x00, scpRole ? 0x01 : 0x00])
    ]);

}

function parseText(valueBytes) {
    return (new TextDecoder()).decode(valueBytes).replace(/\0/g, "").trim();
}

function readStoreRequest(event, acceptedContexts, pendingStores, requireScpRole = false) {
    var elements = parseCommandElements(event.bytes);
    var accepted = acceptedContexts.get(event.contextId);
    var sopClassUid = decodeCommandUI(elements, "00000002");
    var sopInstanceUid = decodeCommandUI(elements, "00001000");
    var abstractSyntaxUid = accepted?.context?.abstractSyntaxUid || accepted?.abstractSyntaxUid;
    if ((requireCommandUS(elements, "00000100") != 0x0001) || (accepted == null)
        || (accepted.accepted === false) || (sopClassUid != abstractSyntaxUid)
        || ((requireScpRole == true) && (accepted.scpRole !== true))
        || (pendingStores.has(event.contextId)) || (sopInstanceUid.length == 0)
        || (requireCommandUS(elements, "00000800") == 0x0101)) {
        throw new Exception("Invalid C-STORE request, missing dataset, or unnegotiated storage context/role.", GeneralErrorCodes.GeneralError);
    }
    requireCommandUS(elements, "00000700");
    return {
        messageId: requireCommandUS(elements, "00000110"),
        sopClassUid,
        sopInstanceUid,
        hasDataSet: true
    };
}

function parseFailedSopInstanceUids(bytes, transferSyntaxUid) {
    var offset = 0;
    var uids = [];
    while (offset < bytes.length) {
        if ((offset + 8) > bytes.length) {
            throw new Exception("Truncated DIMSE retrieve response identifier.", GeneralErrorCodes.GeneralError);
        }
        var view = new DataView(bytes.buffer, bytes.byteOffset + offset, 8);
        var group = view.getUint16(0, true);
        var element = view.getUint16(2, true);
        var header = (transferSyntaxUid == IMPLICIT_VR_LE)
            ? { headerLength: 8, length: view.getUint32(4, true) }
            : readMetaElementHeader(bytes, offset);
        if ((header == null) || ((header.length % 2) != 0) || ((offset + header.headerLength + header.length) > bytes.length)) {
            throw new Exception("Invalid DIMSE retrieve response identifier.", GeneralErrorCodes.GeneralError);
        }
        var start = offset + header.headerLength;
        if ((group == 8) && (element == 0x0058)) {
            uids = parseText(bytes.subarray(start, start + header.length)).split("\\").filter((uid) => uid.length > 0);
        }
        offset = start + header.length;
    }
    return Array.from(new Set(uids));
}

function readMetaElementHeader(bytes, offset) {

    if ((offset + 8) > bytes.length) {
        return null;
    }

    var view = new DataView(bytes.buffer, bytes.byteOffset + offset, Math.min(12, bytes.length - offset));
    var group = view.getUint16(0, true);
    var element = view.getUint16(2, true);
    var vr = String.fromCharCode(bytes[offset + 4]) + String.fromCharCode(bytes[offset + 5]);

    var longVr = (vr == "OB") || (vr == "OD") || (vr == "OF") || (vr == "OL") || (vr == "OV")
        || (vr == "OW") || (vr == "SQ") || (vr == "UC") || (vr == "UR") || (vr == "UT") || (vr == "UN")
        || (vr == "SV") || (vr == "UV");

    var headerLength = longVr ? 12 : 8;
    if ((offset + headerLength) > bytes.length) {
        return null;
    }

    var length = longVr
        ? (new DataView(bytes.buffer, bytes.byteOffset + offset + 8, 4)).getUint32(0, true)
        : (new DataView(bytes.buffer, bytes.byteOffset + offset + 6, 2)).getUint16(0, true);

    return { group, element, vr, headerLength, length };

}

function parsePart10Meta(bytes) {

    if ((bytes == null) || (bytes.length < 132)) {
        return null;
    }

    if ((bytes[128] != 0x44) || (bytes[129] != 0x49) || (bytes[130] != 0x43) || (bytes[131] != 0x4D)) {
        return null;
    }

    var offset = 132;
    var meta = {
        transferSyntaxUid: null,
        sopClassUid: null,
        sopInstanceUid: null,
        dataSetOffset: 132
    };

    while (offset < bytes.length) {

        var header = readMetaElementHeader(bytes, offset);
        if (header == null) {
            break;
        }

        if (header.group != 0x0002) {
            meta.dataSetOffset = offset;
            return meta;
        }

        var valueStart = offset + header.headerLength;
        var valueStop = valueStart + header.length;
        if (valueStop > bytes.length) {
            break;
        }

        var valueText = parseText(bytes.subarray(valueStart, valueStop));

        if ((header.group == 0x0002) && (header.element == 0x0002)) {
            meta.sopClassUid = valueText;
        }
        else if ((header.group == 0x0002) && (header.element == 0x0003)) {
            meta.sopInstanceUid = valueText;
        }
        else if ((header.group == 0x0002) && (header.element == 0x0010)) {
            meta.transferSyntaxUid = valueText;
        }

        offset = valueStop;

    }

    meta.dataSetOffset = Math.min(offset, bytes.length);
    return meta;

}

function parseAssociateRqPayload(payload) {

    if ((payload == null) || (payload.length < 68)
        || ((new DataView(payload.buffer, payload.byteOffset, 2)).getUint16(0, false) != 1)) {
        throw new Exception("Invalid DIMSE association request payload.", GeneralErrorCodes.GeneralError);
    }
    var request = {
        calledAeTitle: (new TextDecoder()).decode(payload.subarray(4, 20)).trim(),
        callingAeTitle: (new TextDecoder()).decode(payload.subarray(20, 36)).trim(),
        applicationContextUid: null,
        maxPduLength: 16384,
        contexts: []
    };
    const items = (bytes, start = 0) => {
        var values = [];
        for (var offset = start; offset < bytes.length;) {
            if ((offset + 4) > bytes.length) {
                throw new Exception("Truncated DIMSE association item.", GeneralErrorCodes.GeneralError);
            }
            var length = (new DataView(bytes.buffer, bytes.byteOffset + offset + 2, 2)).getUint16(0, false);
            if ((offset + 4 + length) > bytes.length) {
                throw new Exception("Truncated DIMSE association item value.", GeneralErrorCodes.GeneralError);
            }
            values.push({ type: bytes[offset], value: bytes.subarray(offset + 4, offset + 4 + length) });
            offset += 4 + length;
        }
        return values;
    };
    for (var item of items(payload, 68)) {
        if (item.type == 0x10) {
            request.applicationContextUid = parseText(item.value);
        }
        else if (item.type == 0x20) {
            if ((item.value.length < 4) || (item.value[0] == 0) || ((item.value[0] % 2) != 1)
                || request.contexts.some((context) => context.id == item.value[0])) {
                throw new Exception("Invalid or duplicate DIMSE presentation context ID.", GeneralErrorCodes.GeneralError);
            }
            var context = { id: item.value[0], abstractSyntaxUid: null, transferSyntaxUids: [] };
            for (var sub of items(item.value, 4)) {
                if (sub.type == 0x30) {
                    if (context.abstractSyntaxUid != null) {
                        throw new Exception("Duplicate DIMSE abstract syntax.", GeneralErrorCodes.GeneralError);
                    }
                    context.abstractSyntaxUid = parseText(sub.value);
                }
                else if (sub.type == 0x40) {
                    context.transferSyntaxUids.push(parseText(sub.value));
                }
            }
            if ((context.abstractSyntaxUid == null) || (context.transferSyntaxUids.length == 0)) {
                throw new Exception("Incomplete DIMSE presentation context.", GeneralErrorCodes.GeneralError);
            }
            request.contexts.push(context);
        }
        else if (item.type == 0x50) {
            for (var user of items(item.value)) {
                if (user.type == 0x51) {
                    if (user.value.length != 4) {
                        throw new Exception("Invalid DIMSE maximum length item.", GeneralErrorCodes.GeneralError);
                    }
                    request.maxPduLength = (new DataView(user.value.buffer, user.value.byteOffset, 4)).getUint32(0, false);
                }
            }
        }
    }
    if ((request.applicationContextUid != APPLICATION_CONTEXT_UID) || (request.contexts.length == 0)
        || ((request.maxPduLength > 0) && (request.maxPduLength < 8))) {
        throw new Exception("Invalid DIMSE application context or maximum PDU length.", GeneralErrorCodes.GeneralError);
    }
    return request;

}

function buildStoreScpAssociateAcPdu(request, acceptedContexts, maxPduLength = 16384) {

    var appContextItem = makeItem(0x10, toTextBytes(request.applicationContextUid || APPLICATION_CONTEXT_UID));

    var presentationContextItems = [];
    for (var index = 0; index < request.contexts.length; index++) {

        var requested = request.contexts[index];
        var accepted = acceptedContexts.get(requested.id) || null;

        var acceptance = 0x03; // abstract-syntax-not-supported
        var transferSyntaxUid = null;

        if (accepted != null) {
            acceptance = 0x00;
            transferSyntaxUid = accepted.transferSyntaxUid;
        }

        var tsItem = makeItem(0x40, toTextBytes(transferSyntaxUid || IMPLICIT_VR_LE));
        var pcPayload = concatBytes([
            new Uint8Array([requested.id & 0xFF, 0x00, acceptance & 0xFF, 0x00]),
            tsItem
        ]);
        presentationContextItems.push(makeItem(0x21, pcPayload));

    }

    var userInformationItem = makeItem(0x50, concatBytes([
        makeItem(0x51, toUint32BE(maxPduLength)),
        makeItem(0x52, toTextBytes(DEFAULT_IMPLEMENTATION_CLASS_UID)),
        makeItem(0x55, toTextBytes(DEFAULT_IMPLEMENTATION_VERSION_NAME))
    ]));

    var fixed = concatBytes([
        toUint16BE(0x0001),
        new Uint8Array([0x00, 0x00]),
        toTextBytes(padAeTitle(request.calledAeTitle || "")),
        toTextBytes(padAeTitle(request.callingAeTitle || "")),
        new Uint8Array(32)
    ]);

    return makePdu(PDU_TYPES.A_ASSOCIATE_AC, concatBytes([
        fixed,
        appContextItem,
        concatBytes(presentationContextItems),
        userInformationItem
    ]));

}

function isLikelyStorageSopClassUid(sopClassUid) {

    if (typeof sopClassUid !== "string") {
        return false;
    }

    return sopClassUid.startsWith("1.2.840.10008.5.1.4.1.1.");

}

function selectAcceptedTransferSyntaxUid(requestedTransferSyntaxUids, preferredTransferSyntaxUids) {

    if (Array.isArray(requestedTransferSyntaxUids) == false) {
        return null;
    }

    var preferred = Array.isArray(preferredTransferSyntaxUids)
        ? preferredTransferSyntaxUids
        : [];

    if (preferred.length == 0) {
        preferred = DEFAULT_STORAGE_TRANSFER_SYNTAX_UIDS.concat(requestedTransferSyntaxUids.filter((uid) => TransferSyntax.find(uid) != null));
    }

    for (var index = 0; index < preferred.length; index++) {
        if (requestedTransferSyntaxUids.includes(preferred[index])) {
            return preferred[index];
        }
    }

    return null;

}

function normalizeAeTitle(value) {

    if ((value == null) || (typeof value !== "string"))
        return null;

    var normalized = value.trim().toUpperCase();
    return (normalized.length > 0) ? normalized : null;

}

function normalizeRemoteAddress(value) {

    if ((value == null) || (typeof value !== "string"))
        return null;

    var normalized = value.trim().toLowerCase();
    if (normalized.length == 0)
        return null;

    if (normalized == "::1")
        return "127.0.0.1";

    if (normalized.startsWith("::ffff:") == true)
        return normalized.substring("::ffff:".length);

    return normalized;

}

function normalizePolicyStringSet(values, normalizer) {

    var result = new Set();

    if (Array.isArray(values) == false)
        return result;

    for (var i = 0; i < values.length; i++) {
        var normalized = normalizer(values[i]);
        if ((normalized != null) && (normalized.length > 0))
            result.add(normalized);
    }

    return result;

}

function buildAssociateRjPdu(result = 0x01, source = 0x01, reason = 0x01) {
    return makePdu(PDU_TYPES.A_ASSOCIATE_RJ, new Uint8Array([
        0x00,
        (result & 0xFF),
        (source & 0xFF),
        (reason & 0xFF)
    ]));
}

function buildPart10FromDataSet(dataSetBytes, metadata = {}) {

    var transferSyntaxUid = metadata.transferSyntaxUid || EXPLICIT_VR_LE;
    var sopClassUid = metadata.sopClassUid || "";
    var sopInstanceUid = metadata.sopInstanceUid || "";

    var metaElements = [];

    metaElements.push(encodeExplicitVRElement("00020001", "OB", new Uint8Array([0x00, 0x01])));
    metaElements.push(encodeExplicitVRElement("00020002", "UI", encodeTextValue("UI", sopClassUid)));
    metaElements.push(encodeExplicitVRElement("00020003", "UI", encodeTextValue("UI", sopInstanceUid)));
    metaElements.push(encodeExplicitVRElement("00020010", "UI", encodeTextValue("UI", transferSyntaxUid)));
    metaElements.push(encodeExplicitVRElement("00020012", "UI", encodeTextValue("UI", DEFAULT_IMPLEMENTATION_CLASS_UID)));
    metaElements.push(encodeExplicitVRElement("00020013", "SH", encodeTextValue("SH", DEFAULT_IMPLEMENTATION_VERSION_NAME)));

    var metaBody = concatBytes(metaElements);
    var metaGroupLength = encodeExplicitVRElement("00020000", "UL", toUint32LE(metaBody.length));

    return concatBytes([
        new Uint8Array(128),
        toTextBytes("DICM"),
        metaGroupLength,
        metaBody,
        dataSetBytes
    ]);

}

function createSingleChunkStreamReader(bytes) {

    var emitted = false;

    return {
        async read() {
            if (emitted == true) {
                return { done: true, value: undefined };
            }
            emitted = true;
            return { done: false, value: bytes };
        },
        releaseLock() {
            return;
        }
    };

}

function encodeMultipartDicomParts(instances, boundary) {

    var chunks = [];

    for (var i = 0; i < instances.length; i++) {

        var instanceBytes = instances[i];

        chunks.push(toTextBytes(`--${boundary}\r\n`));
        chunks.push(toTextBytes("Content-Type: application/dicom\r\n"));
        chunks.push(toTextBytes(`Content-Length: ${instanceBytes.length}\r\n\r\n`));
        chunks.push(instanceBytes);
        chunks.push(toTextBytes("\r\n"));

    }

    chunks.push(toTextBytes(`--${boundary}--\r\n`));

    return concatBytes(chunks);

}

function createPromiseQueue() {

    var values = [];
    var waiters = [];
    var failure = null;

    return {
        push(value) {
            if (failure != null) {
                return;
            }
            if (waiters.length > 0) {
                waiters.shift().resolve(value);
                return;
            }
            values.push(value);
        },
        fail(error, discardQueued = false) {
            if (failure != null) {
                return;
            }
            failure = error;
            if (discardQueued == true) {
                values = [];
            }
            while (waiters.length > 0) {
                waiters.shift().reject(error);
            }
        },
        async shift() {
            if (values.length > 0) {
                return values.shift();
            }
            if (failure != null) {
                throw failure;
            }
            return await new Promise((resolve, reject) => {
                waiters.push({ resolve, reject });
            });
        }
    };

}

async function importNodeSocketModule(nodeSpecifier, legacySpecifier) {

    // Prefer CommonJS require when available (for example Jest-transpiled runtime),
    // then fall back to dynamic import for native ESM Node environments.
    if (typeof require === "function") {
        try {
            return require(nodeSpecifier);
        }
        catch (_nodeRequireError) {
            try {
                return require(legacySpecifier);
            }
            catch (_legacyRequireError) {
                // Fall through to dynamic import attempts.
            }
        }
    }

    try {
        return await import(nodeSpecifier);
    }
    catch (_nodeSpecifierError) {
        try {
            return await import(legacySpecifier);
        }
        catch (legacySpecifierError) {
            throw legacySpecifierError;
        }
    }

}

export default class NodeDimseQueryRetrieveSourceTransport extends DimseSourceTransport {

    /**
     * Resolve Node socket modules lazily so browser bundles can load this file safely.
     * @returns {Promise<{ net: object, tls: object }>} Loaded Node socket modules.
     */
    async resolveNodeSocketModules() {

        if ((CachedNetModule != null) && (CachedTlsModule != null)) {
            return {
                net: CachedNetModule,
                tls: CachedTlsModule
            };
        }

        if (PendingSocketModuleLoad == null) {
            PendingSocketModuleLoad = Promise.all([
                importNodeSocketModule("node:net", "net"),
                importNodeSocketModule("node:tls", "tls")
            ]).then(([netModule, tlsModule]) => {
                CachedNetModule = netModule?.default || netModule;
                CachedTlsModule = tlsModule?.default || tlsModule;
                return {
                    net: CachedNetModule,
                    tls: CachedTlsModule
                };
            }).catch((error) => {
                throw new Exception(
                    "Node DIMSE transport requires Node.js net/tls modules and is not available in this runtime.",
                    GeneralErrorCodes.NotImplemented,
                    error
                );
            }).finally(() => {
                PendingSocketModuleLoad = null;
            });
        }

        return await PendingSocketModuleLoad;

    }

    /**
     * Resolve one association option from read-call, instance config, and default.
     * @param {object | null} association Read-call association object.
     * @param {string} name Option property name.
     * @param {unknown} fallback Fallback value.
     * @returns {unknown} Resolved option value.
     */
    resolveAssociationValue(association, name, fallback = null) {

        if ((association != null) && (association[name] != null)) {
            return association[name];
        }

        if ((this._defaultAssociation != null) && (this._defaultAssociation[name] != null)) {
            return this._defaultAssociation[name];
        }

        if ((this._options != null) && (this._options[name] != null)) {
            return this._options[name];
        }

        return fallback;

    }

    /**
     * Validate required DIMSE association fields.
     * @param {object | null} association Association options.
     */
    validateAssociation(association) {

        var host = this.resolveAssociationValue(association, "host", null);
        var port = this.resolveAssociationValue(association, "port", 4242);
        var callingAeTitle = this.resolveAssociationValue(association, "callingAeTitle", null);
        var calledAeTitle = this.resolveAssociationValue(association, "calledAeTitle", null);

        if ((typeof host !== "string") || (host.length == 0)) {
            throw new Exception("Invalid DIMSE association host.", GeneralErrorCodes.InvalidParameter);
        }

        if ((Number.isInteger(Number(port)) == false) || (Number(port) <= 0) || (Number(port) > 65535)) {
            throw new Exception("Invalid DIMSE association port.", GeneralErrorCodes.InvalidParameter);
        }

        if ((typeof callingAeTitle !== "string") || (callingAeTitle.trim().length == 0) || (callingAeTitle.length > 16)
            || (/[^\x20-\x7E]|\\/.test(callingAeTitle))) {
            throw new Exception("Invalid DIMSE calling AE Title.", GeneralErrorCodes.InvalidParameter);
        }

        if ((typeof calledAeTitle !== "string") || (calledAeTitle.trim().length == 0) || (calledAeTitle.length > 16)
            || (/[^\x20-\x7E]|\\/.test(calledAeTitle))) {
            throw new Exception("Invalid DIMSE called AE Title.", GeneralErrorCodes.InvalidParameter);
        }

        var maxPduLength = this.resolveAssociationValue(association, "maxPduLength", 16384);
        if ((Number.isInteger(Number(maxPduLength)) == false) || (Number(maxPduLength) < 8) || (Number(maxPduLength) > 16 * 1024 * 1024)) {
            throw new Exception("Invalid DIMSE maxPduLength (8 through 16777216 bytes).", GeneralErrorCodes.InvalidParameter);
        }
        validatePositiveInteger(this.resolveAssociationValue(association, "associationTimeoutMs", 30000), "associationTimeoutMs", 2147483647);

    }

    /**
     * Resolve query/retrieve model UIDs.
     * @param {object} queryOptions Query options.
     * @returns {{ findSopClassUid: string, getSopClassUid: string }} Model SOP class UIDs.
     */
    resolveQueryModel(queryOptions) {

        var model = String(queryOptions.queryRetrieveModel || "study-root").toLowerCase();

        if (model == "patient-root") {
            return {
                findSopClassUid: PATIENT_ROOT_FIND_UID,
                moveSopClassUid: PATIENT_ROOT_MOVE_UID,
                getSopClassUid: PATIENT_ROOT_GET_UID
            };
        }

        if (model != "study-root") {
            throw new Exception(`Unsupported DIMSE query model '${model}'.`, GeneralErrorCodes.InvalidParameter);
        }

        return {
            findSopClassUid: STUDY_ROOT_FIND_UID,
            moveSopClassUid: STUDY_ROOT_MOVE_UID,
            getSopClassUid: STUDY_ROOT_GET_UID
        };

    }

    /**
     * Resolve read/query options.
     * @param {object | null} association Association input.
     * @param {object | null} options Read options.
     * @returns {object} Normalized query options.
     */
    resolveQueryOptions(association, options = null) {

        var defaults = this.resolveAssociationValue(association, "query", {}) || {};
        var readOptions = options || {};

        var queryOptions = Object.assign({}, defaults, readOptions);
        validateSignal(queryOptions.signal);
        for (var limit of ["maxIncomingPduLength", "maxCommandBytes", "maxDataSetBytes", "maxTotalDataSetBytes"]) {
            queryOptions[limit] = validatePositiveInteger(queryOptions[limit] ?? this._options[limit]
                ?? ((limit == "maxIncomingPduLength") ? 16 * 1024 * 1024 : ((limit == "maxCommandBytes") ? 1024 * 1024 : 512 * 1024 * 1024)), limit,
                (limit == "maxIncomingPduLength") ? 0xFFFFFFFF : Number.MAX_SAFE_INTEGER);
        }

        if (queryOptions.operation == null) {
            queryOptions.operation = "c-get";
        }
        else {
            queryOptions.operation = String(queryOptions.operation).toLowerCase().replace(/^c(find|get|move)$/, "c-$1");
        }
        if (["c-find", "c-get", "c-move"].includes(queryOptions.operation) == false) {
            throw new Exception(`Unsupported DIMSE query operation '${queryOptions.operation}'.`, GeneralErrorCodes.InvalidParameter);
        }
        queryOptions.queryRetrieveModel = String(queryOptions.queryRetrieveModel || "study-root").toLowerCase();
        this.resolveQueryModel(queryOptions);

        if (queryOptions.performFind == null) {
            queryOptions.performFind = true;
        }

        if (queryOptions.messageIdStart == null) {
            queryOptions.messageIdStart = 1;
        }

        if (queryOptions.priority == null) {
            queryOptions.priority = 0;
        }
        queryOptions.messageIdStart = validatePositiveInteger(queryOptions.messageIdStart, "messageIdStart", 65535);
        queryOptions.priority = Number(queryOptions.priority);
        if ([0, 1, 2].includes(queryOptions.priority) == false) {
            throw new Exception("Invalid DIMSE priority.", GeneralErrorCodes.InvalidParameter);
        }

        if (Array.isArray(queryOptions.queryTransferSyntaxUids) == false) {
            queryOptions.queryTransferSyntaxUids = [IMPLICIT_VR_LE, EXPLICIT_VR_LE];
        }

        if (Array.isArray(queryOptions.storageTransferSyntaxUids) == false) {
            queryOptions.storageTransferSyntaxUids = DEFAULT_STORAGE_TRANSFER_SYNTAX_UIDS.slice();
        }

        if (Array.isArray(queryOptions.storageSopClassUids) == false) {
            queryOptions.storageSopClassUids = ((queryOptions.operation == "c-move") || (queryOptions.operation == "c-find"))
                ? []
                : DEFAULT_STORAGE_SOP_CLASS_UIDS.slice();
        }
        queryOptions.queryTransferSyntaxUids = validateUidList(queryOptions.queryTransferSyntaxUids, "queryTransferSyntaxUids");
        if (queryOptions.queryTransferSyntaxUids.some((uid) => [IMPLICIT_VR_LE, EXPLICIT_VR_LE].includes(uid) == false)) {
            throw new Exception("DIMSE query identifiers support Implicit or Explicit VR Little Endian only.", GeneralErrorCodes.InvalidParameter);
        }
        queryOptions.storageTransferSyntaxUids = validateUidList(queryOptions.storageTransferSyntaxUids, "storageTransferSyntaxUids");
        if (queryOptions.storageSopClassUids.length > 0) {
            queryOptions.storageSopClassUids = validateUidList(queryOptions.storageSopClassUids, "storageSopClassUids");
        }
        if (queryOptions.storageSopClassUids.length > 126) {
            throw new Exception("DIMSE supports at most 128 presentation contexts.", GeneralErrorCodes.InvalidParameter);
        }
        if ((queryOptions.operation == "c-get") && (queryOptions.storageSopClassUids.length == 0)) {
            throw new Exception("DIMSE C-GET requires storageSopClassUids.", GeneralErrorCodes.InvalidParameter);
        }
        if (queryOptions.operationTimeoutMs != null) {
            queryOptions.operationTimeoutMs = validatePositiveInteger(queryOptions.operationTimeoutMs, "operationTimeoutMs", 2147483647);
        }
        if (queryOptions.signal?.aborted === true) {
            throw cancellationError(queryOptions.signal);
        }

        if (typeof queryOptions.boundary !== "string") {
            queryOptions.boundary = `easi-dimse-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
        }

        if (typeof queryOptions.moveDestinationAeTitle === "string") {
            queryOptions.moveDestinationAeTitle = queryOptions.moveDestinationAeTitle.trim();
        }
        if ((queryOptions.operation == "c-move")
            && ((typeof queryOptions.moveDestinationAeTitle !== "string") || (queryOptions.moveDestinationAeTitle.length == 0)
                || (queryOptions.moveDestinationAeTitle.length > 16) || (/[^\x20-\x7E]|\\/.test(queryOptions.moveDestinationAeTitle)))) {
            throw new Exception("DIMSE C-MOVE requires a valid moveDestinationAeTitle.", GeneralErrorCodes.InvalidParameter);
        }

        if (typeof queryOptions.moveStoreHost !== "string") {
            queryOptions.moveStoreHost = "127.0.0.1";
        }

        if (queryOptions.moveStorePort == null) {
            queryOptions.moveStorePort = 0;
        }

        if (queryOptions.moveStoreCalledAeTitle == null) {
            queryOptions.moveStoreCalledAeTitle = queryOptions.moveDestinationAeTitle || null;
        }

        if (queryOptions.moveStoreWaitTimeoutMs == null) {
            queryOptions.moveStoreWaitTimeoutMs = 15000;
        }

        if (queryOptions.moveStoreIdleGraceMs == null) {
            queryOptions.moveStoreIdleGraceMs = 250;
        }
        queryOptions.moveStoreWaitTimeoutMs = validatePositiveInteger(queryOptions.moveStoreWaitTimeoutMs, "moveStoreWaitTimeoutMs", 2147483647);
        if ((Number.isFinite(Number(queryOptions.moveStoreIdleGraceMs)) == false) || (Number(queryOptions.moveStoreIdleGraceMs) < 0)) {
            throw new Exception("Invalid DIMSE moveStoreIdleGraceMs.", GeneralErrorCodes.InvalidParameter);
        }

        if (queryOptions.onConcern == null) {
            queryOptions.onConcern = null;
        }
        else if (typeof queryOptions.onConcern !== "function") {
            throw new Exception("Invalid DIMSE onConcern callback.", GeneralErrorCodes.InvalidParameter);
        }

        return queryOptions;

    }

    /**
     * Resolve DIMSE C-ECHO options.
     * @param {object | null} association Association input.
     * @param {object | null} options Echo options.
     * @returns {object} Normalized echo options.
     */
    resolveEchoOptions(association, options = null) {

        var defaults = this.resolveAssociationValue(association, "verification", {}) || {};
        var echoOptions = Object.assign({}, defaults, options || {});
        validateSignal(echoOptions.signal);

        if (echoOptions.messageId == null) {
            echoOptions.messageId = 1;
        }
        echoOptions.messageId = Number(echoOptions.messageId);
        if ((Number.isInteger(echoOptions.messageId) == false) || (echoOptions.messageId <= 0) || (echoOptions.messageId > 65535)) {
            throw new Exception("Invalid DIMSE C-ECHO messageId.", GeneralErrorCodes.InvalidParameter);
        }

        if (Array.isArray(echoOptions.transferSyntaxUids) == false) {
            echoOptions.transferSyntaxUids = [IMPLICIT_VR_LE, EXPLICIT_VR_LE];
        }
        echoOptions.transferSyntaxUids = validateUidList(echoOptions.transferSyntaxUids, "transferSyntaxUids");
        for (var limit of ["maxIncomingPduLength", "maxCommandBytes", "maxDataSetBytes", "maxTotalDataSetBytes"]) {
            echoOptions[limit] = validatePositiveInteger(echoOptions[limit] ?? this._options[limit]
                ?? ((limit == "maxIncomingPduLength") ? 16 * 1024 * 1024 : ((limit == "maxCommandBytes") ? 1024 * 1024 : 512 * 1024 * 1024)), limit,
                (limit == "maxIncomingPduLength") ? 0xFFFFFFFF : Number.MAX_SAFE_INTEGER);
        }
        if (echoOptions.operationTimeoutMs != null) {
            echoOptions.operationTimeoutMs = validatePositiveInteger(echoOptions.operationTimeoutMs, "operationTimeoutMs", 2147483647);
        }
        if (echoOptions.signal?.aborted === true) {
            throw cancellationError(echoOptions.signal);
        }

        return echoOptions;

    }

    /**
     * Create one socket for the specified association.
     * @param {object | null} association Association options.
     * @param {object | null} options Abort signal and operation deadline options.
     * @returns {Promise<object>} Connected socket.
     */
    async connectSocket(association, options = null) {

        validateSignal(options?.signal);

        if (options?.signal?.aborted === true) {
            throw cancellationError(options.signal);
        }

        var socketModules = await this.resolveNodeSocketModules();
        var netModule = socketModules.net;
        var tlsModule = socketModules.tls;

        const host = this.resolveAssociationValue(association, "host");
        const port = Number(this.resolveAssociationValue(association, "port", 4242));
        const tlsOptions = this.resolveAssociationValue(association, "tls", false);
        const timeoutMs = Number(this.resolveAssociationValue(association, "associationTimeoutMs", 30000));

        return await new Promise((resolve, reject) => {

            var socket = null;
            var completed = false;
            var signal = options?.signal;
            var deadlineTimer = null;
            const onAbort = () => {
                socket.destroy(cancellationError(signal));
            };

            const onError = (error) => {
                if (completed == true) {
                    return;
                }
                completed = true;
                signal?.removeEventListener("abort", onAbort);
                if (deadlineTimer != null) clearTimeout(deadlineTimer);
                socket.destroy();
                reject(error);
            };

            const onConnect = () => {
                if (completed == true) {
                    return;
                }
                completed = true;
                signal?.removeEventListener("abort", onAbort);
                if (deadlineTimer != null) clearTimeout(deadlineTimer);
                resolve(socket);
            };

            if ((tlsOptions != null) && (tlsOptions !== false)) {
                var tlsSocketOptions = Object.assign({}, (typeof tlsOptions == "object") ? tlsOptions : {}, { host, port });
                socket = tlsModule.connect(tlsSocketOptions, onConnect);
            }
            else {
                socket = netModule.createConnection({ host, port }, onConnect);
            }

            socket.setNoDelay(true);
            socket.setTimeout(timeoutMs, () => {
                socket.destroy(new Exception("DIMSE association timed out.", GeneralErrorCodes.GeneralError));
            });
            socket.once("error", onError);
            signal?.addEventListener("abort", onAbort, { once: true });
            if (signal?.aborted === true) {
                onAbort();
            }
            if (options?.operationTimeoutMs != null) {
                var remainingMs = Math.max(1, options.operationTimeoutMs - (Date.now() - (options.startedAtMs ?? Date.now())));
                deadlineTimer = setTimeout(() => {
                    socket.destroy(new Exception("DIMSE operation timed out.", GeneralErrorCodes.GeneralError));
                }, remainingMs);
            }

        });

    }

    /**
     * Create one PDU reader queue for a socket.
     * @param {object} socket Socket instance.
     * @param {object | null} options PDU limits, abort signal, and operation deadline.
     * @returns {{ queue: object, cleanup: Function }} Queue and cleanup callback.
     */
    createPduReader(socket, options = null) {

        validateSignal(options?.signal);

        var buffer = new Uint8Array(0);
        var queue = createPromiseQueue();
        var maxIncomingPduLength = validatePositiveInteger(options?.maxIncomingPduLength ?? this._options.maxIncomingPduLength ?? 16 * 1024 * 1024, "maxIncomingPduLength", 0xFFFFFFFF);
        var maxPduLength = options?.maxPduLength ?? null;
        var signal = options?.signal;
        var timer = null;

        const append = (current, incoming) => {
            var result = new Uint8Array(current.length + incoming.length);
            result.set(current, 0);
            result.set(incoming, current.length);
            return result;
        };

        const parse = () => {
            while (buffer.length >= 6) {
                var pduType = buffer[0];
                var pduLength = (new DataView(buffer.buffer, buffer.byteOffset + 2, 4)).getUint32(0, false);
                if ((pduType < 1) || (pduType > 7) || (pduLength > maxIncomingPduLength)
                    || ((pduType == PDU_TYPES.P_DATA_TF) && (maxPduLength != null) && (pduLength > maxPduLength))
                    || ((pduType >= PDU_TYPES.A_RELEASE_RQ) && (pduLength != 4))
                    || ((pduType == PDU_TYPES.A_ASSOCIATE_RJ) && (pduLength != 4))) {
                    throw new Exception("Invalid or oversized DIMSE PDU.", GeneralErrorCodes.GeneralError);
                }
                var total = 6 + pduLength;
                if (buffer.length < total) {
                    return;
                }

                var payload = buffer.subarray(6, total);
                queue.push({
                    type: pduType,
                    payload
                });
                buffer = buffer.subarray(total);
            }
        };

        const onData = (chunk) => {
            try {
                var incoming = DimseTransportContract.toBytes(chunk);
                if (incoming == null) {
                    incoming = new Uint8Array(0);
                }
                buffer = append(buffer, incoming);
                parse();
            }
            catch (error) {
                queue.fail(error, true);
                socket.destroy();
            }
        };

        const onError = (error) => {
            queue.fail(error || new Exception("DIMSE socket failure.", GeneralErrorCodes.GeneralError), true);
        };

        const onClose = () => {
            queue.fail(new Exception((buffer.length > 0) ? "DIMSE socket closed with a truncated PDU." : "DIMSE socket closed.", GeneralErrorCodes.GeneralError));
        };

        const onAbort = () => {
            queue.fail(cancellationError(signal), true);
            socket.destroy();
        };

        socket.on("data", onData);
        socket.once("error", onError);
        socket.once("close", onClose);
        signal?.addEventListener("abort", onAbort, { once: true });
        if (signal?.aborted === true) {
            onAbort();
        }
        if (options?.operationTimeoutMs != null) {
            var remainingMs = Math.max(1, options.operationTimeoutMs - (Date.now() - (options.startedAtMs ?? Date.now())));
            timer = setTimeout(() => {
                queue.fail(new Exception("DIMSE operation timed out.", GeneralErrorCodes.GeneralError), true);
                socket.destroy();
            }, remainingMs);
        }

        return {
            queue,
            cleanup: () => {
                if (timer != null) {
                    clearTimeout(timer);
                }
                signal?.removeEventListener("abort", onAbort);
                socket.off("data", onData);
                socket.off("error", onError);
                socket.off("close", onClose);
            }
        };

    }

    /**
     * Write one PDU to the socket.
     * @param {object} socket Socket instance.
     * @param {Uint8Array} bytes PDU bytes.
     */
    async writePdu(socket, bytes) {

        await new Promise((resolve, reject) => {
            socket.write(Buffer.from(bytes), (error) => {
                if (error != null) {
                    reject(error);
                    return;
                }
                resolve();
            });
        });

    }

    /**
     * Build association request and requested presentation-context descriptors.
     * @param {object | null} association Association options.
     * @param {object} model Query model UIDs.
     * @param {object} queryOptions Query options.
     * @returns {{ pdu: Uint8Array, contexts: Array<object> }} Request PDU and context descriptors.
     */
    buildAssociateRq(association, model, queryOptions) {

        const calledAeTitle = padAeTitle(this.resolveAssociationValue(association, "calledAeTitle"));
        const callingAeTitle = padAeTitle(this.resolveAssociationValue(association, "callingAeTitle"));
        const maxPduLength = Number(this.resolveAssociationValue(association, "maxPduLength", 16384));
        const implementationClassUid = this.resolveAssociationValue(association, "implementationClassUid", DEFAULT_IMPLEMENTATION_CLASS_UID);
        const implementationVersionName = this.resolveAssociationValue(association, "implementationVersionName", DEFAULT_IMPLEMENTATION_VERSION_NAME);

        var contextId = 1;
        var contexts = [];

        const nextContextId = () => {
            var current = contextId;
            contextId += 2;
            return current;
        };

        contexts.push({
            id: nextContextId(),
            kind: "find",
            abstractSyntaxUid: model.findSopClassUid,
            transferSyntaxUids: queryOptions.queryTransferSyntaxUids.slice()
        });

        if (queryOptions.operation == "c-move") {
            contexts.push({
                id: nextContextId(),
                kind: "move",
                abstractSyntaxUid: model.moveSopClassUid,
                transferSyntaxUids: queryOptions.queryTransferSyntaxUids.slice()
            });
        }
        else if (queryOptions.operation == "c-get") {
            contexts.push({
                id: nextContextId(),
                kind: "get",
                abstractSyntaxUid: model.getSopClassUid,
                transferSyntaxUids: queryOptions.queryTransferSyntaxUids.slice()
            });
        }

        for (var i = 0; (queryOptions.operation == "c-get") && (i < queryOptions.storageSopClassUids.length); i++) {
            contexts.push({
                id: nextContextId(),
                kind: "store",
                abstractSyntaxUid: queryOptions.storageSopClassUids[i],
                transferSyntaxUids: queryOptions.storageTransferSyntaxUids.slice(),
                scuRole: false,
                scpRole: true
            });
        }

        const applicationContextItem = makeItem(0x10, toTextBytes(APPLICATION_CONTEXT_UID));

        var contextItems = [];
        for (var index = 0; index < contexts.length; index++) {

            var context = contexts[index];
            var abstractSyntaxItem = makeItem(0x30, toTextBytes(context.abstractSyntaxUid));

            var transferSyntaxItems = [];
            for (var tsIndex = 0; tsIndex < context.transferSyntaxUids.length; tsIndex++) {
                transferSyntaxItems.push(makeItem(0x40, toTextBytes(context.transferSyntaxUids[tsIndex])));
            }

            contextItems.push(makeItem(0x20, concatBytes([
                new Uint8Array([context.id & 0xFF, 0x00, 0x00, 0x00]),
                abstractSyntaxItem,
                concatBytes(transferSyntaxItems)
            ])));

        }

        const maximumLengthItem = makeItem(0x51, toUint32BE(maxPduLength));
        const implementationClassUidItem = makeItem(0x52, toTextBytes(implementationClassUid));
        const implementationVersionNameItem = makeItem(0x55, toTextBytes(implementationVersionName));

        var roleItems = [];
        for (var roleIndex = 0; (queryOptions.operation == "c-get") && (roleIndex < queryOptions.storageSopClassUids.length); roleIndex++) {
            roleItems.push(makeRoleSelectionItem(queryOptions.storageSopClassUids[roleIndex], false, true));
        }

        const userInformationItem = makeItem(0x50, concatBytes([
            maximumLengthItem,
            implementationClassUidItem,
            implementationVersionNameItem,
            concatBytes(roleItems)
        ]));

        const fixed = concatBytes([
            toUint16BE(0x0001),
            new Uint8Array([0x00, 0x00]),
            toTextBytes(calledAeTitle),
            toTextBytes(callingAeTitle),
            new Uint8Array(32)
        ]);

        return {
            pdu: makePdu(PDU_TYPES.A_ASSOCIATE_RQ, concatBytes([
                fixed,
                applicationContextItem,
                concatBytes(contextItems),
                userInformationItem
            ])),
            contexts
        };

    }

    /**
     * Build C-ECHO association request and echo presentation-context descriptors.
     * @param {object | null} association Association options.
     * @param {object} echoOptions C-ECHO options.
     * @returns {{ pdu: Uint8Array, contexts: Array<object> }} Request PDU and context descriptors.
     */
    buildEchoAssociateRq(association, echoOptions) {

        const calledAeTitle = padAeTitle(this.resolveAssociationValue(association, "calledAeTitle"));
        const callingAeTitle = padAeTitle(this.resolveAssociationValue(association, "callingAeTitle"));
        const maxPduLength = Number(this.resolveAssociationValue(association, "maxPduLength", 16384));
        const implementationClassUid = this.resolveAssociationValue(association, "implementationClassUid", DEFAULT_IMPLEMENTATION_CLASS_UID);
        const implementationVersionName = this.resolveAssociationValue(association, "implementationVersionName", DEFAULT_IMPLEMENTATION_VERSION_NAME);

        var contexts = [{
            id: 1,
            kind: "echo",
            abstractSyntaxUid: VERIFICATION_SOP_CLASS_UID,
            transferSyntaxUids: echoOptions.transferSyntaxUids.slice()
        }];

        const applicationContextItem = makeItem(0x10, toTextBytes(APPLICATION_CONTEXT_UID));

        var contextItems = [];
        for (var index = 0; index < contexts.length; index++) {

            var context = contexts[index];
            var abstractSyntaxItem = makeItem(0x30, toTextBytes(context.abstractSyntaxUid));

            var transferSyntaxItems = [];
            for (var tsIndex = 0; tsIndex < context.transferSyntaxUids.length; tsIndex++) {
                transferSyntaxItems.push(makeItem(0x40, toTextBytes(context.transferSyntaxUids[tsIndex])));
            }

            contextItems.push(makeItem(0x20, concatBytes([
                new Uint8Array([context.id & 0xFF, 0x00, 0x00, 0x00]),
                abstractSyntaxItem,
                concatBytes(transferSyntaxItems)
            ])));

        }

        const maximumLengthItem = makeItem(0x51, toUint32BE(maxPduLength));
        const implementationClassUidItem = makeItem(0x52, toTextBytes(implementationClassUid));
        const implementationVersionNameItem = makeItem(0x55, toTextBytes(implementationVersionName));

        const userInformationItem = makeItem(0x50, concatBytes([
            maximumLengthItem,
            implementationClassUidItem,
            implementationVersionNameItem
        ]));

        const fixed = concatBytes([
            toUint16BE(0x0001),
            new Uint8Array([0x00, 0x00]),
            toTextBytes(calledAeTitle),
            toTextBytes(callingAeTitle),
            new Uint8Array(32)
        ]);

        return {
            pdu: makePdu(PDU_TYPES.A_ASSOCIATE_RQ, concatBytes([
                fixed,
                applicationContextItem,
                concatBytes(contextItems),
                userInformationItem
            ])),
            contexts
        };

    }

    /**
     * Parse association accept and map accepted contexts.
     * @param {Uint8Array} payload Association AC payload.
     * @param {Array<object>} requestedContexts Requested context descriptors.
     * @returns {{ maxPduLength: number, contexts: Map<number, object> }} Parsed accept details.
     */
    parseAssociateAc(payload, requestedContexts) {

        if ((payload.length < 68) || ((new DataView(payload.buffer, payload.byteOffset, 2)).getUint16(0, false) != 1)) {
            throw new Exception("Invalid DIMSE association accept payload.", GeneralErrorCodes.GeneralError);
        }

        var offset = 68;
        var maxPduLength = 16384;
        var result = new Map();
        var roles = new Map();
        var applicationContextUid = null;

        while (offset < payload.length) {

            if ((offset + 4) > payload.length) {
                throw new Exception("Truncated DIMSE association item.", GeneralErrorCodes.GeneralError);
            }

            var type = payload[offset];
            var length = (new DataView(payload.buffer, payload.byteOffset + offset + 2, 2)).getUint16(0, false);
            var start = offset + 4;
            var stop = start + length;
            if (stop > payload.length) {
                throw new Exception("Truncated DIMSE association item.", GeneralErrorCodes.GeneralError);
            }

            var value = payload.subarray(start, stop);

            if (type == 0x10) {
                applicationContextUid = parseText(value);
            }

            if (type == 0x21) {

                if (value.length < 4) {
                    throw new Exception("Invalid DIMSE presentation context.", GeneralErrorCodes.GeneralError);
                }

                var contextId = value[0];
                var acceptance = value[2];
                var acceptedTransferSyntaxUid = null;

                var subOffset = 4;
                while (subOffset < value.length) {
                    if ((subOffset + 4) > value.length) {
                        throw new Exception("Truncated DIMSE transfer syntax item.", GeneralErrorCodes.GeneralError);
                    }
                    var subType = value[subOffset];
                    var subLength = (new DataView(value.buffer, value.byteOffset + subOffset + 2, 2)).getUint16(0, false);
                    var subStart = subOffset + 4;
                    var subStop = subStart + subLength;
                    if (subStop > value.length) {
                        throw new Exception("Truncated DIMSE transfer syntax item.", GeneralErrorCodes.GeneralError);
                    }

                    if (subType == 0x40) {
                        if (acceptedTransferSyntaxUid != null) {
                            throw new Exception("Duplicate DIMSE transfer syntax item.", GeneralErrorCodes.GeneralError);
                        }
                        acceptedTransferSyntaxUid = parseText(value.subarray(subStart, subStop));
                    }

                    subOffset = subStop;
                }

                var requested = requestedContexts.find((context) => context.id == contextId) || null;
                if ((requested == null) || (result.has(contextId)) || ((contextId % 2) != 1)
                    || (acceptance > 4) || ((acceptance == 0) && (requested.transferSyntaxUids.includes(acceptedTransferSyntaxUid) == false))) {
                    throw new Exception("DIMSE peer accepted an invalid context or unoffered transfer syntax.", GeneralErrorCodes.GeneralError);
                }

                result.set(contextId, {
                    accepted: (acceptance == 0x00),
                    reason: acceptance,
                    transferSyntaxUid: acceptedTransferSyntaxUid,
                    context: requested
                });

            }
            else if (type == 0x50) {

                var sub = 0;
                while (sub < value.length) {
                    if ((sub + 4) > value.length) {
                        throw new Exception("Truncated DIMSE user information item.", GeneralErrorCodes.GeneralError);
                    }
                    var subType = value[sub];
                    var subLength = (new DataView(value.buffer, value.byteOffset + sub + 2, 2)).getUint16(0, false);
                    var subStart = sub + 4;
                    var subStop = subStart + subLength;
                    if (subStop > value.length) {
                        throw new Exception("Truncated DIMSE user information item.", GeneralErrorCodes.GeneralError);
                    }

                    if ((subType == 0x51) && (subLength == 4)) {
                        maxPduLength = (new DataView(value.buffer, value.byteOffset + subStart, 4)).getUint32(0, false);
                    }
                    else if (subType == 0x51) {
                        throw new Exception("Invalid DIMSE maximum length item.", GeneralErrorCodes.GeneralError);
                    }
                    else if (subType == 0x54) {
                        if (subLength < 4) {
                            throw new Exception("Invalid DIMSE role selection item.", GeneralErrorCodes.GeneralError);
                        }
                        var uidLength = (new DataView(value.buffer, value.byteOffset + subStart, 2)).getUint16(0, false);
                        if ((uidLength + 4 != subLength) || (value[subStart + 2 + uidLength] > 1) || (value[subStart + 3 + uidLength] > 1)) {
                            throw new Exception("Invalid DIMSE role selection item.", GeneralErrorCodes.GeneralError);
                        }
                        var roleUid = parseText(value.subarray(subStart + 2, subStart + 2 + uidLength));
                        var requestedRole = requestedContexts.find((context) => (context.abstractSyntaxUid == roleUid) && (context.kind == "store"));
                        if ((requestedRole == null) || roles.has(roleUid)) {
                            throw new Exception("Unrequested or duplicate DIMSE role selection.", GeneralErrorCodes.GeneralError);
                        }
                        roles.set(roleUid, {
                            scuRole: (value[subStart + 2 + uidLength] == 1),
                            scpRole: (value[subStart + 3 + uidLength] == 1)
                        });
                        if (((requestedRole.scuRole === false) && (roles.get(roleUid).scuRole === true))
                            || ((requestedRole.scpRole === false) && (roles.get(roleUid).scpRole === true))) {
                            throw new Exception("DIMSE peer accepted an unrequested storage role.", GeneralErrorCodes.GeneralError);
                        }
                    }

                    sub = subStop;
                }

            }

            offset = stop;

        }

        if ((applicationContextUid != APPLICATION_CONTEXT_UID) || ((maxPduLength > 0) && (maxPduLength < 8))) {
            throw new Exception("Invalid DIMSE application context or maximum PDU length.", GeneralErrorCodes.GeneralError);
        }
        for (var accepted of result.values()) {
            var role = roles.get(accepted.context.abstractSyntaxUid);
            accepted.scuRole = (role != null) ? role.scuRole : true;
            accepted.scpRole = (role != null) ? role.scpRole : false;
        }

        return {
            maxPduLength,
            contexts: result
        };

    }

    /**
     * Resolve accepted context by kind.
     * @param {Map<number, object>} acceptedContexts Accepted contexts.
     * @param {string} kind Context kind to find.
     * @returns {object} Accepted context descriptor.
     */
    resolveAcceptedContextByKind(acceptedContexts, kind) {

        var entries = Array.from(acceptedContexts.values());
        for (var i = 0; i < entries.length; i++) {
            var entry = entries[i];
            if ((entry.accepted == true)
                && (entry.context != null)
                && (entry.context.kind == kind)) {
                return entry;
            }
        }

        return null;

    }

    /**
     * Resolve accepted storage context by SOP class UID.
     * @param {Map<number, object>} acceptedContexts Accepted contexts.
     * @param {string} sopClassUid Affected SOP class UID.
     * @returns {object | null} Accepted storage context.
     */
    resolveAcceptedStorageContext(acceptedContexts, sopClassUid) {

        var entries = Array.from(acceptedContexts.values());
        for (var i = 0; i < entries.length; i++) {

            var entry = entries[i];
            if ((entry.accepted != true) || (entry.context == null)) {
                continue;
            }

            if (entry.context.kind != "store") {
                continue;
            }

            if (entry.context.abstractSyntaxUid == sopClassUid) {
                return entry;
            }

        }

        return null;

    }

    /**
     * Build one P-DATA-TF PDU with one PDV fragment.
     * @param {number} presentationContextId Presentation context id.
     * @param {Uint8Array} fragment Fragment bytes.
     * @param {boolean} isCommand True for command PDV.
     * @param {boolean} isLast True for last fragment.
     * @returns {Uint8Array} PDU bytes.
     */
    buildPDataPdu(presentationContextId, fragment, isCommand, isLast) {

        var messageHeader = 0x00;
        if (isCommand == true) {
            messageHeader |= 0x01;
        }
        if (isLast == true) {
            messageHeader |= 0x02;
        }

        var pdvBody = concatBytes([
            new Uint8Array([presentationContextId & 0xFF, messageHeader & 0xFF]),
            fragment
        ]);

        var pdv = concatBytes([
            toUint32BE(pdvBody.length),
            pdvBody
        ]);

        return makePdu(PDU_TYPES.P_DATA_TF, pdv);

    }

    /**
     * Send one DIMSE request command and optional identifier dataset.
     * @param {object} socket Connected socket.
     * @param {number} contextId Presentation context id.
     * @param {number} maxPduLength Max PDU length.
     * @param {Uint8Array} commandBytes Request command bytes.
     * @param {Uint8Array | null} dataSetBytes Identifier data set bytes.
     */
    async sendDimseRequest(socket, contextId, maxPduLength, commandBytes, dataSetBytes = null) {

        var maxFragment = Number(maxPduLength || 16384) - 6;
        if (maxFragment < 2) {
            throw new Exception("DIMSE negotiated maximum PDU length is too small.", GeneralErrorCodes.GeneralError);
        }
        maxFragment -= (maxFragment % 2);
        for (var message of [{ bytes: commandBytes, isCommand: true }, { bytes: dataSetBytes, isCommand: false }]) {
            if (message.bytes == null) {
                continue;
            }
            for (var offset = 0; offset < message.bytes.length; offset += maxFragment) {
                var stop = Math.min(message.bytes.length, offset + maxFragment);
                await this.writePdu(socket, this.buildPDataPdu(contextId, message.bytes.subarray(offset, stop), message.isCommand, stop >= message.bytes.length));
            }
        }

    }

    /**
     * Build and queue complete PDV events.
     * @param {object} state PDV parsing state.
     * @param {Uint8Array} payload P-DATA payload.
     */
    pushPDataEvents(state, payload) {

        var offset = 0;

        if (payload.length == 0) {
            throw new Exception("Empty DIMSE P-DATA PDU.", GeneralErrorCodes.GeneralError);
        }
        if (state.fragmentBytes == null) {
            state.fragmentBytes = new Map();
        }
        while (offset < payload.length) {

            if ((offset + 4) > payload.length) {
                throw new Exception("Truncated DIMSE PDV length.", GeneralErrorCodes.GeneralError);
            }

            var pdvLength = (new DataView(payload.buffer, payload.byteOffset + offset, 4)).getUint32(0, false);
            offset += 4;

            if ((pdvLength < 2) || ((pdvLength % 2) != 0) || ((offset + pdvLength) > payload.length)) {
                throw new Exception("Invalid or truncated DIMSE PDV.", GeneralErrorCodes.GeneralError);
            }

            var contextId = payload[offset];
            var header = payload[offset + 1];
            if ((contextId == 0) || ((contextId % 2) != 1)) {
                throw new Exception("Invalid DIMSE PDV context or message control header.", GeneralErrorCodes.GeneralError);
            }
            var isCommand = ((header & 0x01) == 0x01);
            var isLast = ((header & 0x02) == 0x02);
            var bytes = payload.subarray(offset + 2, offset + pdvLength);
            offset += pdvLength;
            // Empty intermediate fragments carry no message data and must not
            // allocate unbounded fragment entries while bypassing byte limits.
            if ((bytes.length == 0) && (isLast == false)) {
                continue;
            }

            var key = `${contextId}:${isCommand ? "C" : "D"}`;
            var size = (state.fragmentBytes.get(key) || 0) + bytes.length;
            var maximum = isCommand
                ? Number(state.maxCommandBytes ?? this._options.maxCommandBytes ?? 1024 * 1024)
                : Number(state.maxDataSetBytes ?? this._options.maxDataSetBytes ?? 512 * 1024 * 1024);
            if (size > maximum) {
                throw new Exception(isCommand ? "DIMSE command exceeds maxCommandBytes." : "DIMSE dataset exceeds maxDataSetBytes.", GeneralErrorCodes.GeneralError);
            }
            state.fragmentBytes.set(key, size);
            state.bufferedFragmentBytes = (state.bufferedFragmentBytes || 0) + bytes.length;
            if (state.bufferedFragmentBytes > (state.maxTotalDataSetBytes ?? this._options.maxTotalDataSetBytes ?? 512 * 1024 * 1024)) {
                throw new Exception("DIMSE buffered fragments exceed maxTotalDataSetBytes.", GeneralErrorCodes.GeneralError);
            }
            if (state.fragments.has(key) == false) {
                state.fragments.set(key, []);
            }

            state.fragments.get(key).push(bytes);

            if (isLast == true) {
                var complete = concatBytes(state.fragments.get(key));
                state.fragments.delete(key);
                state.fragmentBytes.delete(key);
                state.bufferedFragmentBytes -= size;
                state.events.push({
                    type: "pdv",
                    contextId,
                    isCommand,
                    bytes: complete
                });
            }

        }

    }

    /**
     * Read the next normalized DIMSE event from the incoming PDU queue.
     * @param {object} queue PDU queue.
     * @param {object} state PDV event state.
     * @returns {Promise<object>} Next event.
     */
    async nextDimseEvent(queue, state) {

        while (state.events.length == 0) {

            var pdu = await queue.shift();

            if (pdu.type == PDU_TYPES.P_DATA_TF) {
                this.pushPDataEvents(state, pdu.payload);
                continue;
            }

            if (pdu.type == PDU_TYPES.A_ABORT) {
                return { type: "abort" };
            }

            if (pdu.type == PDU_TYPES.A_RELEASE_RQ) {
                return { type: "release-rq" };
            }

            if (pdu.type == PDU_TYPES.A_RELEASE_RP) {
                return { type: "release-rp" };
            }
            throw new Exception("Unexpected DIMSE PDU after association negotiation.", GeneralErrorCodes.GeneralError);

        }

        return state.events.shift();

    }

    /**
     * Receive one C-FIND identifier data-set that follows a pending response.
     * @param {object} queue PDU queue.
     * @param {object} state PDV event state.
     * @param {number} findContextId FIND presentation context ID.
     * @returns {Promise<Uint8Array>} Identifier data-set bytes.
     */
    async receiveFindIdentifierDataSet(queue, state, findContextId) {

        var event = await this.nextDimseEvent(queue, state);
        if ((event.type != "pdv") || (event.contextId != findContextId) || (event.isCommand !== false)) {
            throw new Exception("Expected DIMSE identifier dataset on its response presentation context.", GeneralErrorCodes.GeneralError);
        }
        if (event.bytes.length == 0) {
            throw new Exception("Empty DIMSE identifier dataset.", GeneralErrorCodes.GeneralError);
        }
        return event.bytes;

    }

    /**
     * Read one C-FIND response sequence until final status.
     * @param {object} queue PDU queue.
     * @param {object} state PDV event state.
     * @param {number} findContextId FIND presentation context ID.
     * @param {{ collectIdentifiers?: boolean, transferSyntaxUid?: string | null, sopClassUid?: string | null } | null} options Optional receive options.
     * @returns {Promise<Array<Uint8Array>>} Collected Part-10 C-FIND identifier payloads.
     */
    async receiveFindResponses(queue, state, findContextId, options = null) {

        var collectIdentifiers = (options?.collectIdentifiers === true);
        var transferSyntaxUid = options?.transferSyntaxUid || EXPLICIT_VR_LE;
        var sopClassUid = options?.sopClassUid || null;
        var identifiers = [];
        var count = 0;

        while (true) {
            var event = await this.nextDimseEvent(queue, state);
            if (event.type == "abort") {
                throw new Exception("DIMSE association aborted while waiting for C-FIND response.", GeneralErrorCodes.GeneralError);
            }
            var elements = readResponse(event, 0x8020, findContextId, options?.messageId, sopClassUid);
            var status = requireCommandUS(elements, "00000900");
            var hasDataSet = (requireCommandUS(elements, "00000800") != 0x0101);
            if ((status == 0xFF00) || (status == 0xFF01)) {
                if (hasDataSet == false) {
                    throw new Exception("Pending C-FIND response is missing its identifier dataset.", GeneralErrorCodes.GeneralError);
                }
                // A preliminary FIND must consume every identifier before GET/MOVE begins.
                var dataSet = await this.receiveFindIdentifierDataSet(queue, state, findContextId);
                count += 1;
                if (collectIdentifiers == true) {
                    state.totalDataSetBytes = (state.totalDataSetBytes || 0) + dataSet.length;
                    if (state.totalDataSetBytes > (state.maxTotalDataSetBytes ?? this._options.maxTotalDataSetBytes ?? 512 * 1024 * 1024)) {
                        throw new Exception("DIMSE results exceed maxTotalDataSetBytes.", GeneralErrorCodes.GeneralError);
                    }
                    identifiers.push(buildPart10FromDataSet(dataSet, {
                        transferSyntaxUid,
                        sopClassUid: sopClassUid || "",
                        sopInstanceUid: `2.25.${Date.now()}${count}`
                    }));
                }
                continue;
            }
            if (hasDataSet == true) {
                throw new Exception("Final C-FIND response must not contain an identifier.", GeneralErrorCodes.GeneralError);
            }
            state.finalResponse = Object.assign(responseDetails(elements), { count });
            if ((status == 0x0000) || ((status & 0xF000) == 0xB000)) {
                return identifiers;
            }
            throw failedResponse("C-FIND", state.finalResponse);
        }

    }

    /**
     * Receive one C-GET sequence while handling C-STORE sub-operations.
     * @param {object} socket Connected socket.
     * @param {object} queue PDU queue.
     * @param {object} state PDV event state.
     * @param {Map<number, object>} acceptedContexts Accepted context map.
     * @param {number} maxPduLength Max PDU length.
     * @param {number} getContextId GET presentation context ID.
     * @param {object | null} options Expected request message ID.
     * @returns {Promise<Array<Uint8Array>>} Retrieved Part-10 DICOM instances.
     */
    async receiveGetResponses(socket, queue, state, acceptedContexts, maxPduLength, getContextId, options = null) {

        var instances = [];
        var pendingStores = new Map();
        var getContext = acceptedContexts.get(getContextId);
        while (true) {
            var event = await this.nextDimseEvent(queue, state);
            if (event.type == "abort") {
                throw new Exception("DIMSE association aborted while waiting for C-GET response.", GeneralErrorCodes.GeneralError);
            }
            if (event.type != "pdv") {
                throw new Exception("Unexpected association release during C-GET.", GeneralErrorCodes.GeneralError);
            }
            if (event.isCommand == true) {
                var elements = parseCommandElements(event.bytes);
                var commandField = requireCommandUS(elements, "00000100");
                if (commandField == 0x0001) {
                    pendingStores.set(event.contextId, readStoreRequest(event, acceptedContexts, pendingStores, true));
                    continue;
                }
                elements = readResponse(event, 0x8010, getContextId, options?.messageId, getContext?.context?.abstractSyntaxUid);
                var details = responseDetails(elements);
                var hasDataSet = (requireCommandUS(elements, "00000800") != 0x0101);
                if ((details.status == 0xFF00) || (details.status == 0xFF01)) {
                    if (hasDataSet) {
                        throw new Exception("Pending C-GET response must not contain an identifier.", GeneralErrorCodes.GeneralError);
                    }
                    continue;
                }
                if (hasDataSet) {
                    if (details.status == 0) {
                        throw new Exception("Successful C-GET response must not contain an identifier.", GeneralErrorCodes.GeneralError);
                    }
                    details.failedSopInstanceUids = parseFailedSopInstanceUids(
                        await this.receiveFindIdentifierDataSet(queue, state, getContextId),
                        getContext.transferSyntaxUid
                    );
                }
                state.finalResponse = details;
                if ((pendingStores.size > 0) || (state.fragments.size > 0)) {
                    throw new Exception("C-GET completed before its C-STORE datasets were fully received.", GeneralErrorCodes.GeneralError);
                }
                if ((details.status == 0x0000) || ((details.status & 0xF000) == 0xB000)) {
                    if ((details.completed != null) && (details.warning != null)
                        && ((details.completed + details.warning) != instances.length)) {
                        throw new Exception("C-GET completed count does not match received instances.", GeneralErrorCodes.GeneralError);
                    }
                    if ((details.status == 0) && ((details.failed > 0) || (details.warning > 0))) {
                        throw new Exception("Successful C-GET response reports failed or warning sub-operations.", GeneralErrorCodes.GeneralError);
                    }
                    return instances;
                }
                throw failedResponse("C-GET", details);
            }
            var pending = pendingStores.get(event.contextId);
            if ((pending == null) || (event.bytes.length == 0)) {
                throw new Exception("Unexpected or empty C-STORE dataset during C-GET.", GeneralErrorCodes.GeneralError);
            }
            var accepted = acceptedContexts.get(event.contextId);
            state.totalDataSetBytes = (state.totalDataSetBytes || 0) + event.bytes.length;
            if (state.totalDataSetBytes > (state.maxTotalDataSetBytes ?? this._options.maxTotalDataSetBytes ?? 512 * 1024 * 1024)) {
                throw new Exception("DIMSE results exceed maxTotalDataSetBytes.", GeneralErrorCodes.GeneralError);
            }
            instances.push(buildPart10FromDataSet(event.bytes, {
                sopClassUid: pending.sopClassUid,
                sopInstanceUid: pending.sopInstanceUid,
                transferSyntaxUid: accepted.transferSyntaxUid
            }));
            await this.sendDimseRequest(socket, event.contextId, maxPduLength,
                encodeStoreResponseCommand(pending.sopClassUid, pending.sopInstanceUid, pending.messageId, 0), null);
            pendingStores.delete(event.contextId);
        }

    }

    /**
     * Evaluate inbound C-STORE association policy.
     * @param {object} request Parsed associate-rq details.
     * @param {object} socket Incoming socket.
     * @param {object} state Move-store state object.
     * @param {object} options Store SCP options.
     * @returns {{ accepted: boolean, reason?: string }} Decision.
     */
    evaluateStoreAssociationPolicy(request, socket, state, options) {

        var policy = options?.policy || null;
        if (policy == null) {
            return { accepted: true };
        }

        var remoteAddress = normalizeRemoteAddress(socket?.remoteAddress);
        var callingAeTitle = normalizeAeTitle(request?.callingAeTitle);
        var calledAeTitle = normalizeAeTitle(request?.calledAeTitle);
        var expectedCalledAeTitle = normalizeAeTitle(options?.calledAeTitle);

        if ((policy.maxActiveAssociations > 0)
            && (Number(state?.activeConnections?.size || 0) > policy.maxActiveAssociations)) {
            return { accepted: false, reason: "max-active-associations" };
        }

        if ((policy.allowedRemoteHosts.size > 0)
            && ((remoteAddress == null) || (policy.allowedRemoteHosts.has(remoteAddress) == false))) {
            return { accepted: false, reason: "remote-host-not-allowed" };
        }

        if ((remoteAddress != null) && (policy.deniedRemoteHosts.has(remoteAddress) == true)) {
            return { accepted: false, reason: "remote-host-denied" };
        }

        if ((policy.allowedCallingAeTitles.size > 0)
            && ((callingAeTitle == null) || (policy.allowedCallingAeTitles.has(callingAeTitle) == false))) {
            return { accepted: false, reason: "calling-ae-not-allowed" };
        }

        if ((callingAeTitle != null) && (policy.deniedCallingAeTitles.has(callingAeTitle) == true)) {
            return { accepted: false, reason: "calling-ae-denied" };
        }

        if ((expectedCalledAeTitle != null)
            && (calledAeTitle != null)
            && (calledAeTitle !== expectedCalledAeTitle)) {
            return { accepted: false, reason: "called-ae-mismatch" };
        }

        return { accepted: true };

    }

    /**
     * Emit one DIMSE concern callback (best-effort).
     * @param {object | null} options Store/query options.
     * @param {object | null} concern Concern payload.
     */
    emitConcern(options, concern = null) {

        if ((concern == null) || (typeof concern !== "object"))
            return;

        var callback = options?.onConcern;
        if (typeof callback !== "function")
            return;

        try {
            callback(concern);
        }
        catch (_error) {
            // Ignore callback failures so transport execution remains stable.
        }

    }

    /**
     * Reject one inbound association request using A-ASSOCIATE-RJ (or immediate socket close).
     * @param {object} socket Incoming socket.
     * @param {object} options Store SCP options.
     */
    async rejectStoreAssociation(socket, options = null) {

        var rejectWithAssociationRj = (options?.policy?.rejectWithAssociationRj !== false);

        if (rejectWithAssociationRj == true) {
            try {
                await this.writePdu(socket, buildAssociateRjPdu(0x01, 0x01, 0x01));
            }
            catch (_error) {
                // Ignore write failures and still close the socket.
            }
        }

    }

    /**
     * Start a temporary C-STORE SCP server for C-MOVE retrieval.
     * @param {object | null} association Association options.
     * @param {object} queryOptions Query options.
     * @returns {Promise<object>} Move store server state.
     */
    async startMoveStoreServer(association, queryOptions) {

        for (var limit of ["maxIncomingPduLength", "maxCommandBytes", "maxDataSetBytes", "maxTotalDataSetBytes"]) {
            queryOptions[limit] = validatePositiveInteger(queryOptions[limit] ?? this._options[limit]
                ?? ((limit == "maxIncomingPduLength") ? 16 * 1024 * 1024 : ((limit == "maxCommandBytes") ? 1024 * 1024 : 512 * 1024 * 1024)), limit,
                (limit == "maxIncomingPduLength") ? 0xFFFFFFFF : Number.MAX_SAFE_INTEGER);
        }

        var socketModules = await this.resolveNodeSocketModules();
        var netModule = socketModules.net;
        var tlsModule = socketModules.tls;

        var host = String(queryOptions.moveStoreHost || "127.0.0.1");
        var port = Number(queryOptions.moveStorePort || 0);
        var maxPduLength = Number(this.resolveAssociationValue(association, "maxPduLength", 16384));
        var allowedSopClassUids = Array.isArray(queryOptions.storageSopClassUids)
            ? queryOptions.storageSopClassUids.slice()
            : [];
        var preferredTransferSyntaxUids = Array.isArray(queryOptions.storageTransferSyntaxUids)
            ? queryOptions.storageTransferSyntaxUids.slice()
            : [];
        var moveStoreTls = ((queryOptions.moveStoreTls != null) && (queryOptions.moveStoreTls !== false))
            ? queryOptions.moveStoreTls
            : null;
        var rawPolicy = ((queryOptions.moveStorePolicy != null) && (typeof queryOptions.moveStorePolicy === "object"))
            ? queryOptions.moveStorePolicy
            : {};
        var policy = {
            allowedCallingAeTitles: normalizePolicyStringSet(rawPolicy.allowedCallingAeTitles, normalizeAeTitle),
            deniedCallingAeTitles: normalizePolicyStringSet(rawPolicy.deniedCallingAeTitles, normalizeAeTitle),
            allowedRemoteHosts: normalizePolicyStringSet(rawPolicy.allowedRemoteHosts, normalizeRemoteAddress),
            deniedRemoteHosts: normalizePolicyStringSet(rawPolicy.deniedRemoteHosts, normalizeRemoteAddress),
            maxActiveAssociations: Number(rawPolicy.maxActiveAssociations || 0),
            associationTimeoutMs: Number(rawPolicy.associationTimeoutMs || 30000),
            rejectWithAssociationRj: (rawPolicy.rejectWithAssociationRj !== false)
        };

        if ((Number.isFinite(policy.maxActiveAssociations) == false) || (policy.maxActiveAssociations < 0)) {
            policy.maxActiveAssociations = 0;
        }

        if ((Number.isFinite(policy.associationTimeoutMs) == false) || (policy.associationTimeoutMs <= 0)) {
            policy.associationTimeoutMs = 30000;
        }

        var moveStore = {
            host,
            port,
            state: {
                instances: [],
                activeConnections: new Set(),
                lastReceivedAt: 0,
                lastError: null,
                policyRejections: []
            },
            server: null,
            closed: false,
            policy,
            async close() {
                if ((this.server == null) || (this.closed == true)) {
                    return;
                }
                this.closed = true;
                for (var socket of this.state.activeConnections) {
                    socket.destroy();
                }

                await new Promise((resolve) => {
                    try {
                        this.server.close(() => resolve());
                    }
                    catch (_error) {
                        resolve();
                    }
                });
            }
        };

        var handleIncomingSocket = (socket) => {

            if ((moveStore.policy.associationTimeoutMs > 0) && (typeof socket.setTimeout === "function")) {
                socket.setTimeout(moveStore.policy.associationTimeoutMs, () => {
                    socket.destroy(new Exception("DIMSE incoming C-STORE association timed out.", GeneralErrorCodes.GeneralError));
                });
            }

            moveStore.state.activeConnections.add(socket);

            this.handleMoveStoreAssociation(socket, moveStore.state, {
                calledAeTitle: queryOptions.moveStoreCalledAeTitle,
                maxPduLength,
                allowedSopClassUids,
                preferredTransferSyntaxUids,
                policy: moveStore.policy,
                onConcern: queryOptions.onConcern,
                maxIncomingPduLength: queryOptions.maxIncomingPduLength,
                maxCommandBytes: queryOptions.maxCommandBytes,
                maxDataSetBytes: queryOptions.maxDataSetBytes,
                maxTotalDataSetBytes: queryOptions.maxTotalDataSetBytes
            }).catch((error) => {
                moveStore.state.lastError = (error != null)
                    ? error
                    : new Exception("C-MOVE store association failure.", GeneralErrorCodes.GeneralError);
            }).finally(() => {
                moveStore.state.activeConnections.delete(socket);
            });

        };

        if (moveStoreTls != null) {
            var tlsOptions = (typeof moveStoreTls === "object")
                ? Object.assign({}, moveStoreTls)
                : {};
            moveStore.server = tlsModule.createServer(tlsOptions, handleIncomingSocket);
        }
        else {
            moveStore.server = netModule.createServer(handleIncomingSocket);
        }

        moveStore.server.on("error", (error) => {
            moveStore.state.lastError = error;
        });

        await new Promise((resolve, reject) => {

            moveStore.server.once("error", reject);
            moveStore.server.listen(port, host, () => {
                moveStore.server.off("error", reject);
                resolve();
            });

        });

        var address = moveStore.server.address();
        moveStore.port = Number(address?.port || port);

        return moveStore;

    }

    /**
     * Handle one incoming C-STORE association during C-MOVE.
     * @param {object} socket Connected incoming socket.
     * @param {object} state Move store state.
     * @param {object} options Store SCP options.
     */
    async handleMoveStoreAssociation(socket, state, options) {

        var scope = this.createPduReader(socket, {
            maxPduLength: options.maxPduLength,
            maxIncomingPduLength: options.maxIncomingPduLength
        });

        try {

            var associateRq = await scope.queue.shift();
            if (associateRq.type != PDU_TYPES.A_ASSOCIATE_RQ) {
                throw new Exception("Invalid incoming C-STORE association request.", GeneralErrorCodes.GeneralError);
            }

            var request = parseAssociateRqPayload(associateRq.payload);
            if (request == null) {
                throw new Exception("Invalid C-STORE association payload.", GeneralErrorCodes.GeneralError);
            }

            var policyDecision = this.evaluateStoreAssociationPolicy(request, socket, state, options);
            if (policyDecision.accepted !== true) {

                var rejectionRecord = {
                    reason: policyDecision.reason || "policy-rejected",
                    callingAeTitle: request.callingAeTitle || null,
                    calledAeTitle: request.calledAeTitle || null,
                    remoteAddress: normalizeRemoteAddress(socket?.remoteAddress),
                    at: Date.now()
                };

                if (Array.isArray(state?.policyRejections) == true) {
                    state.policyRejections.push(rejectionRecord);
                }

                this.emitConcern(options, {
                    severity: "warning",
                    category: "Security",
                    code: "MoveStoreAssociationRejected",
                    actionTaken: "rejected",
                    scope: "Transport",
                    message: `Rejected inbound C-STORE association (${rejectionRecord.reason}).`,
                    reason: rejectionRecord.reason,
                    callingAeTitle: rejectionRecord.callingAeTitle,
                    calledAeTitle: rejectionRecord.calledAeTitle,
                    remoteAddress: rejectionRecord.remoteAddress
                });

                await this.rejectStoreAssociation(socket, options);
                return;

            }

            var acceptedContexts = new Map();
            for (var contextIndex = 0; contextIndex < request.contexts.length; contextIndex++) {

                var context = request.contexts[contextIndex];
                if (context == null) {
                    continue;
                }

                var abstractSyntaxUid = context.abstractSyntaxUid || null;
                if ((isLikelyStorageSopClassUid(abstractSyntaxUid) == false) && (abstractSyntaxUid != VERIFICATION_SOP_CLASS_UID)) {
                    continue;
                }

                if ((abstractSyntaxUid != VERIFICATION_SOP_CLASS_UID) && (Array.isArray(options.allowedSopClassUids) == true)
                    && (options.allowedSopClassUids.length > 0)
                    && (options.allowedSopClassUids.includes(abstractSyntaxUid) == false)) {
                    continue;
                }

                var acceptedTransferSyntaxUid = selectAcceptedTransferSyntaxUid(
                    context.transferSyntaxUids || [],
                    (abstractSyntaxUid == VERIFICATION_SOP_CLASS_UID) ? [IMPLICIT_VR_LE, EXPLICIT_VR_LE] : (options.preferredTransferSyntaxUids || [])
                );

                if (acceptedTransferSyntaxUid == null) {
                    continue;
                }

                acceptedContexts.set(context.id, {
                    abstractSyntaxUid,
                    transferSyntaxUid: acceptedTransferSyntaxUid
                });

            }

            await this.writePdu(socket, buildStoreScpAssociateAcPdu(
                request,
                acceptedContexts,
                Number(options.maxPduLength || 16384)
            ));

            var pendingStores = new Map();
            var pdvState = {
                fragments: new Map(),
                events: [],
                maxCommandBytes: options.maxCommandBytes,
                maxDataSetBytes: options.maxDataSetBytes,
                maxTotalDataSetBytes: options.maxTotalDataSetBytes
            };

            while (true) {

                var event = await this.nextDimseEvent(scope.queue, pdvState);

                if (event.type == "abort") {
                    if ((pendingStores.size > 0) || (pdvState.fragments.size > 0)) {
                        throw new Exception("C-STORE association aborted before its dataset was fully received.", GeneralErrorCodes.GeneralError);
                    }
                    return;
                }

                if (event.type == "release-rq") {
                    if ((pendingStores.size > 0) || (pdvState.fragments.size > 0)) {
                        throw new Exception("C-STORE association released before its dataset was fully received.", GeneralErrorCodes.GeneralError);
                    }
                    await this.writePdu(socket, makePdu(PDU_TYPES.A_RELEASE_RP, new Uint8Array(4)));
                    return;
                }

                if (event.type != "pdv") {
                    continue;
                }

                if (event.isCommand == true) {

                    var commandElements = parseCommandElements(event.bytes);
                    var commandField = decodeCommandUS(commandElements, "00000100", 0xFFFF);

                    if (commandField == 0x0030) {
                        var echoContext = acceptedContexts.get(event.contextId);
                        if ((echoContext?.abstractSyntaxUid != VERIFICATION_SOP_CLASS_UID)
                            || (decodeCommandUI(commandElements, "00000002") != VERIFICATION_SOP_CLASS_UID)
                            || (requireCommandUS(commandElements, "00000800") != 0x0101)) {
                            throw new Exception("Invalid C-ECHO request on storage association.", GeneralErrorCodes.GeneralError);
                        }
                        await this.sendDimseRequest(socket, event.contextId, request.maxPduLength,
                            encodeEchoResponseCommand(requireCommandUS(commandElements, "00000110")), null);
                        continue;
                    }

                    pendingStores.set(event.contextId, readStoreRequest(event, acceptedContexts, pendingStores));
                    continue;

                }

                var pendingStore = pendingStores.get(event.contextId);
                if ((pendingStore == null) || (event.bytes.length == 0)) {
                    throw new Exception("Unexpected or empty C-STORE dataset.", GeneralErrorCodes.GeneralError);
                }
                var acceptedContext = acceptedContexts.get(event.contextId);
                var retainedBytes = state.instances.reduce((total, instance) => total + instance.length - (parsePart10Meta(instance)?.dataSetOffset || 0), 0);
                if ((retainedBytes + event.bytes.length) > (options.maxTotalDataSetBytes ?? this._options.maxTotalDataSetBytes ?? 512 * 1024 * 1024)) {
                    throw new Exception("DIMSE results exceed maxTotalDataSetBytes.", GeneralErrorCodes.GeneralError);
                }
                state.instances.push(buildPart10FromDataSet(event.bytes, {
                    sopClassUid: pendingStore.sopClassUid,
                    sopInstanceUid: pendingStore.sopInstanceUid,
                    transferSyntaxUid: acceptedContext.transferSyntaxUid
                }));
                state.lastReceivedAt = Date.now();
                await this.sendDimseRequest(socket, event.contextId, request.maxPduLength,
                    encodeStoreResponseCommand(pendingStore.sopClassUid, pendingStore.sopInstanceUid, pendingStore.messageId, 0), null);
                pendingStores.delete(event.contextId);

            }

        }
        finally {
            scope.cleanup();
            if ((socket != null) && (typeof socket.destroy == "function")) {
                socket.destroy();
            }
        }

    }

    /**
     * Wait for temporary C-STORE server to quiesce after C-MOVE final status.
     * @param {object} moveStore Move store server.
     * @param {object} queryOptions Query options.
     */
    async waitForMoveStoreCompletion(moveStore, queryOptions) {

        var start = Date.now();
        var timeoutMs = Number(queryOptions.moveStoreWaitTimeoutMs ?? 15000);
        var idleGraceMs = Number(queryOptions.moveStoreIdleGraceMs ?? 250);

        while (true) {

            if (queryOptions.signal?.aborted === true) {
                throw cancellationError(queryOptions.signal);
            }
            if ((queryOptions.operationTimeoutMs != null)
                && ((Date.now() - queryOptions.startedAtMs) >= queryOptions.operationTimeoutMs)) {
                throw new Exception("DIMSE operation timed out.", GeneralErrorCodes.GeneralError);
            }

            if (moveStore.state.lastError != null) {
                throw moveStore.state.lastError;
            }

            var now = Date.now();
            var activeConnectionCount = moveStore.state.activeConnections.size;
            var lastReceivedAt = Number(moveStore.state.lastReceivedAt || 0);
            var idleDurationMs = (lastReceivedAt > 0)
                ? (now - lastReceivedAt)
                : (now - start);

            var expectedCount = queryOptions.expectedStoreCount;
            if ((activeConnectionCount == 0) && (idleDurationMs >= idleGraceMs)
                && ((expectedCount == null) || (moveStore.state.instances.length >= expectedCount))) {
                return;
            }

            if ((now - start) > timeoutMs) {
                throw new Exception("Timed out waiting for C-MOVE incoming store sub-operations.", GeneralErrorCodes.GeneralError);
            }

            await new Promise((resolve) => setTimeout(resolve, 50));

        }

    }

    /**
     * Receive C-MOVE responses until final status.
     * @param {object} queue PDU queue.
     * @param {object} state PDV event state.
     * @param {number} moveContextId MOVE presentation context ID.
     * @param {object | null} options Expected request message ID, SOP class, and identifier syntax.
     * @returns {Promise<object>} Final C-MOVE status details.
     */
    async receiveMoveResponses(queue, state, moveContextId, options = null) {

        while (true) {
            var event = await this.nextDimseEvent(queue, state);
            if (event.type == "abort") {
                throw new Exception("DIMSE association aborted while waiting for C-MOVE response.", GeneralErrorCodes.GeneralError);
            }
            var elements = readResponse(event, 0x8021, moveContextId, options?.messageId, options?.sopClassUid);
            var details = responseDetails(elements);
            var hasDataSet = (requireCommandUS(elements, "00000800") != 0x0101);
            if ((details.status == 0xFF00) || (details.status == 0xFF01)) {
                if (hasDataSet) {
                    throw new Exception("Pending C-MOVE response must not contain an identifier.", GeneralErrorCodes.GeneralError);
                }
                continue;
            }
            if (hasDataSet) {
                if (details.status == 0) {
                    throw new Exception("Successful C-MOVE response must not contain an identifier.", GeneralErrorCodes.GeneralError);
                }
                details.failedSopInstanceUids = parseFailedSopInstanceUids(
                    await this.receiveFindIdentifierDataSet(queue, state, moveContextId), options?.transferSyntaxUid || EXPLICIT_VR_LE);
            }
            state.finalResponse = details;
            if ((details.status == 0x0000) || ((details.status & 0xF000) == 0xB000)) {
                if ((details.status == 0) && ((details.failed > 0) || (details.warning > 0))) {
                    throw new Exception("Successful C-MOVE response reports failed or warning sub-operations.", GeneralErrorCodes.GeneralError);
                }
                return details;
            }
            throw failedResponse("C-MOVE", details);
        }

    }

    /**
     * Receive C-ECHO response and return final status.
     * @param {object} queue PDU queue.
     * @param {object} state PDV event state.
     * @param {number} echoContextId ECHO presentation context ID.
     * @param {object | null} options Expected request message ID.
     * @returns {Promise<object>} C-ECHO response details.
     */
    async receiveEchoResponse(queue, state, echoContextId, options = null) {

        var event = await this.nextDimseEvent(queue, state);
        if (event.type == "abort") {
            throw new Exception("DIMSE association aborted while waiting for C-ECHO response.", GeneralErrorCodes.GeneralError);
        }
        var elements = readResponse(event, 0x8030, echoContextId, options?.messageId, VERIFICATION_SOP_CLASS_UID);
        var details = responseDetails(elements);
        if (requireCommandUS(elements, "00000800") != 0x0101) {
            throw new Exception("C-ECHO response must not contain a dataset.", GeneralErrorCodes.GeneralError);
        }
        if (details.status != 0) {
            throw failedResponse("C-ECHO", details);
        }
        return details;

    }

    /**
     * Send A-RELEASE-RQ and wait for A-RELEASE-RP.
     * @param {object} socket Connected socket.
     * @param {object} queue PDU queue.
     * @param {object} state PDV event state.
     */
    async releaseAssociation(socket, queue, state) {

        await this.writePdu(socket, makePdu(PDU_TYPES.A_RELEASE_RQ, new Uint8Array(4)));

        while (true) {
            var event = await this.nextDimseEvent(queue, state);
            if (event.type == "release-rp") {
                return;
            }
            if (event.type == "abort") {
                throw new Exception("DIMSE association aborted while waiting for release response.", GeneralErrorCodes.GeneralError);
            }
            if (event.type == "release-rq") {
                await this.writePdu(socket, makePdu(PDU_TYPES.A_RELEASE_RP, new Uint8Array(4)));
                continue;
            }
            if (event.type == "pdv") {
                throw new Exception("Unexpected DIMSE data while releasing association.", GeneralErrorCodes.GeneralError);
            }
        }

    }

    /**
     * Build one DIMSE read envelope from retrieved instances.
     * @param {Array<Uint8Array>} instances Retrieved Part-10 instance byte arrays.
     * @param {object} queryOptions Query options.
     * @param {object | null} association Association metadata.
     * @param {object | null} diagnostics DIMSE diagnostics metadata.
     * @returns {object} Read envelope.
     */
    buildReadEnvelope(instances, queryOptions, association, diagnostics = null) {

        if ((instances == null) || (instances.length == 0)) {
            return Object.assign(DimseTransportContract.createReadEnvelope(new Uint8Array(0), {
                contentType: "application/dicom",
                contentLength: 0,
                metadata: {
                    count: 0,
                    sourceAssociation: association || null,
                    query: queryOptions,
                    dimse: diagnostics
                }
            }), { empty: true });
        }

        if (instances.length == 1) {
            return DimseTransportContract.createReadEnvelope(instances[0], {
                contentType: "application/dicom",
                contentLength: instances[0].length,
                metadata: {
                    count: 1,
                    sourceAssociation: association || null,
                    query: queryOptions,
                    dimse: diagnostics
                }
            });
        }

        var multipartBytes = encodeMultipartDicomParts(instances, queryOptions.boundary);

        return {
            stream: createSingleChunkStreamReader(multipartBytes),
            contentType: `multipart/related; type=\"application/dicom\"; boundary=${queryOptions.boundary}`,
            contentLength: multipartBytes.length,
            metadata: {
                count: instances.length,
                sourceAssociation: association || null,
                query: queryOptions,
                dimse: diagnostics
            }
        };

    }

    /**
     * Execute DIMSE C-ECHO (Verification SOP Class) against one association.
     * @param {object | null} association DIMSE association/source options.
     * @param {object | null} options Optional C-ECHO options.
     * @returns {Promise<object>} C-ECHO result.
     */
    async echo(association, options = null) {

        this.validateAssociation(association);

        var startedAtMs = Date.now();
        var echoOptions = this.resolveEchoOptions(association, options);
        echoOptions.startedAtMs = startedAtMs;
        var associate = this.buildEchoAssociateRq(association, echoOptions);

        var socket = await this.connectSocket(association, echoOptions);
        var scope = this.createPduReader(socket, Object.assign({}, echoOptions, {
            maxPduLength: Number(this.resolveAssociationValue(association, "maxPduLength", 16384))
        }));

        try {

            await this.writePdu(socket, associate.pdu);

            var ac = await scope.queue.shift();
            if (ac.type == PDU_TYPES.A_ASSOCIATE_RJ) {
                throw new Exception("DIMSE association rejected by peer.", GeneralErrorCodes.GeneralError);
            }
            if (ac.type != PDU_TYPES.A_ASSOCIATE_AC) {
                throw new Exception("Invalid DIMSE association response.", GeneralErrorCodes.GeneralError);
            }

            var acInfo = this.parseAssociateAc(ac.payload, associate.contexts);
            var echoContext = this.resolveAcceptedContextByKind(acInfo.contexts, "echo");

            if (echoContext == null) {
                throw new Exception("DIMSE C-ECHO presentation context was rejected by peer.", GeneralErrorCodes.GeneralError);
            }

            var state = {
                fragments: new Map(),
                events: [],
                maxCommandBytes: echoOptions.maxCommandBytes,
                maxTotalDataSetBytes: echoOptions.maxTotalDataSetBytes
            };

            var command = encodeEchoRequestCommand(echoOptions.messageId, VERIFICATION_SOP_CLASS_UID);
            await this.sendDimseRequest(socket, echoContext.context.id, acInfo.maxPduLength, command, null);

            var response = await this.receiveEchoResponse(scope.queue, state, echoContext.context.id, echoOptions);
            await this.releaseAssociation(socket, scope.queue, state);

            return {
                ok: true,
                status: response.status,
                durationMs: (Date.now() - startedAtMs),
                association: association || null,
                dimse: {
                    operation: "c-echo",
                    status: response.status,
                    messageId: echoOptions.messageId,
                    messageIdBeingRespondedTo: response.messageIdBeingRespondedTo
                }
            };

        }
        finally {
            scope.cleanup();
            if ((socket != null) && (typeof socket.destroy == "function")) {
                socket.destroy();
            }
        }

    }

    /**
     * Read one DIMSE Query/Retrieve source payload.
     * @param {object | null} association DIMSE association/source options.
     * @param {object | null} options Optional read options.
     * @returns {Promise<object>} Source payload envelope.
     */
    async read(association, options = null) {

        this.validateAssociation(association);

        var startedAtMs = Date.now();
        var queryOptions = this.resolveQueryOptions(association, options);
        queryOptions.startedAtMs = startedAtMs;
        var operation = String(queryOptions.operation || "c-get").toLowerCase();
        var diagnostics = {
            operation,
            startedAtMs,
            durationMs: 0,
            moveStore: null
        };
        var model = this.resolveQueryModel(queryOptions);
        // Validate identifier options before creating a network association.
        buildQueryIdentifierDataset(queryOptions, IMPLICIT_VR_LE);

        var associate = this.buildAssociateRq(association, model, queryOptions);

        var socket = await this.connectSocket(association, queryOptions);
        var scope = this.createPduReader(socket, Object.assign({}, queryOptions, {
            maxPduLength: Number(this.resolveAssociationValue(association, "maxPduLength", 16384))
        }));
        var moveStore = null;

        try {

            await this.writePdu(socket, associate.pdu);

            var ac = await scope.queue.shift();
            if (ac.type == PDU_TYPES.A_ASSOCIATE_RJ) {
                throw new Exception("DIMSE association rejected by peer.", GeneralErrorCodes.GeneralError);
            }
            if (ac.type != PDU_TYPES.A_ASSOCIATE_AC) {
                throw new Exception("Invalid DIMSE association response.", GeneralErrorCodes.GeneralError);
            }

            var acInfo = this.parseAssociateAc(ac.payload, associate.contexts);

            var findContext = this.resolveAcceptedContextByKind(acInfo.contexts, "find");

            var operationContext = null;
            if (operation == "c-move") {
                operationContext = this.resolveAcceptedContextByKind(acInfo.contexts, "move");
            }
            else if (operation == "c-get") {
                operationContext = this.resolveAcceptedContextByKind(acInfo.contexts, "get");
            }
            else if (operation == "c-find") {
                operationContext = findContext;
            }
            else {
                throw new Exception(`Unsupported DIMSE query operation '${operation}'.`, GeneralErrorCodes.InvalidParameter);
            }

            var state = {
                fragments: new Map(),
                events: [],
                maxCommandBytes: queryOptions.maxCommandBytes,
                maxDataSetBytes: queryOptions.maxDataSetBytes,
                maxTotalDataSetBytes: queryOptions.maxTotalDataSetBytes
            };

            var messageId = Number(queryOptions.messageIdStart || 1);
            var priority = Number(queryOptions.priority || 0);

            if ((queryOptions.performFind == true) && (operation != "c-find")) {

                if (findContext == null) {
                    throw new Exception("DIMSE C-FIND presentation context was rejected by peer.", GeneralErrorCodes.GeneralError);
                }

                var findCommand = encodeRequestCommand(0x0020, messageId, model.findSopClassUid, true, priority);
                var findIdentifierDataSet = buildQueryIdentifierDataset(queryOptions, findContext.transferSyntaxUid);
                await this.sendDimseRequest(socket, findContext.context.id, acInfo.maxPduLength, findCommand, findIdentifierDataSet);
                await this.receiveFindResponses(scope.queue, state, findContext.context.id, {
                    messageId, sopClassUid: model.findSopClassUid, transferSyntaxUid: findContext.transferSyntaxUid
                });
                diagnostics.find = state.finalResponse;
                state.finalResponse = null;
                messageId = (messageId % 65535) + 1;
            }

            if (operationContext == null) {
                throw new Exception(
                    `DIMSE ${operation.toUpperCase()} presentation context was rejected by peer.`,
                    GeneralErrorCodes.GeneralError
                );
            }

            if ((operation == "c-move")
                && ((typeof queryOptions.moveDestinationAeTitle !== "string")
                    || (queryOptions.moveDestinationAeTitle.length == 0))) {
                throw new Exception("DIMSE C-MOVE requires moveDestinationAeTitle.", GeneralErrorCodes.InvalidParameter);
            }

            if (operation == "c-move") {
                moveStore = await this.startMoveStoreServer(association, queryOptions);
                diagnostics.moveStore = {
                    host: moveStore.host,
                    port: moveStore.port,
                    calledAeTitle: normalizeAeTitle(queryOptions.moveStoreCalledAeTitle),
                    policyRejections: []
                };
            }

            var instances = [];

            if (operation == "c-find") {

                var findOnlyCommand = encodeRequestCommand(0x0020, messageId, model.findSopClassUid, true, priority);
                var findOnlyIdentifierDataSet = buildQueryIdentifierDataset(queryOptions, operationContext.transferSyntaxUid);
                await this.sendDimseRequest(socket, operationContext.context.id, acInfo.maxPduLength, findOnlyCommand, findOnlyIdentifierDataSet);

                instances = await this.receiveFindResponses(
                    scope.queue,
                    state,
                    operationContext.context.id,
                    {
                        collectIdentifiers: true,
                        transferSyntaxUid: operationContext.transferSyntaxUid,
                        sopClassUid: model.findSopClassUid,
                        messageId
                    }
                );

            }
            else if (operation == "c-get") {

                if (Array.from(acInfo.contexts.values()).some((entry) => (entry.accepted == true)
                    && (entry.context.kind == "store") && (entry.scpRole == true)) == false) {
                    throw new Exception("DIMSE C-GET requires an accepted Storage SCP role.", GeneralErrorCodes.GeneralError);
                }

                var getCommand = encodeRequestCommand(0x0010, messageId, model.getSopClassUid, true, priority);
                var getIdentifierDataSet = buildQueryIdentifierDataset(queryOptions, operationContext.transferSyntaxUid);
                await this.sendDimseRequest(socket, operationContext.context.id, acInfo.maxPduLength, getCommand, getIdentifierDataSet);

                instances = await this.receiveGetResponses(
                    socket,
                    scope.queue,
                    state,
                    acInfo.contexts,
                    acInfo.maxPduLength,
                    operationContext.context.id,
                    { messageId }
                );

            }
            else {

                var moveCommand = encodeMoveRequestCommand(
                    messageId,
                    model.moveSopClassUid,
                    queryOptions.moveDestinationAeTitle,
                    priority
                );
                var moveIdentifierDataSet = buildQueryIdentifierDataset(queryOptions, operationContext.transferSyntaxUid);
                await this.sendDimseRequest(socket, operationContext.context.id, acInfo.maxPduLength, moveCommand, moveIdentifierDataSet);

                var moveResponse = await this.receiveMoveResponses(scope.queue, state, operationContext.context.id, {
                    messageId, sopClassUid: model.moveSopClassUid, transferSyntaxUid: operationContext.transferSyntaxUid
                });
                if ((moveResponse.completed != null) && (moveResponse.warning != null)) {
                    queryOptions.expectedStoreCount = moveResponse.completed + moveResponse.warning;
                }
                await this.waitForMoveStoreCompletion(moveStore, queryOptions);
                instances = moveStore.state.instances.slice();
                if ((queryOptions.expectedStoreCount != null) && (instances.length != queryOptions.expectedStoreCount)) {
                    throw new Exception("C-MOVE completed count does not match received instances.", GeneralErrorCodes.GeneralError);
                }

                if ((diagnostics.moveStore != null) && (moveStore?.state != null)) {
                    diagnostics.moveStore.policyRejections = Array.isArray(moveStore.state.policyRejections)
                        ? moveStore.state.policyRejections.slice()
                        : [];
                }

            }

            try {
                await this.releaseAssociation(socket, scope.queue, state);
            }
            finally {
                if (moveStore != null) {
                    await moveStore.close();
                }
            }

            diagnostics.durationMs = (Date.now() - startedAtMs);
            diagnostics.finalResponse = state.finalResponse;
            return this.buildReadEnvelope(instances, queryOptions, association || null, diagnostics);

        }
        finally {
            if (moveStore != null) {
                await moveStore.close();
            }
            scope.cleanup();
            if ((socket != null) && (typeof socket.destroy == "function")) {
                socket.destroy();
            }
        }

    }

    /**
     * Construct one Node DIMSE Query/Retrieve source transport.
     * @param {object | null} defaultAssociation Optional default association options.
     * @param {object | null} options Optional transport defaults.
     */
    constructor(defaultAssociation = null, options = null) {
        super();
        this._defaultAssociation = defaultAssociation;
        this._options = options || {};
    }

}
