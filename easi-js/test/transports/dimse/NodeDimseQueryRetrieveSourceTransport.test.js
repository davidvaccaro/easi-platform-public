import net from "node:net";

import EASI from "../../../src/EASI.js";
import Tag from "../../../src/dicom/Tag.js";
import Exception, { GeneralErrorCodes } from "../../../src/environment/Exception.js";
import NodeDimseCStoreScuTransport from "../../../src/transports/dimse/NodeDimseCStoreScuTransport.js";
import NodeDimseQueryRetrieveSourceTransport from "../../../src/transports/dimse/NodeDimseQueryRetrieveSourceTransport.js";
import { dimseSocketTest } from "./DimseSocketTestGate.js";

const fs = require("fs");
const path = require("path");

const EXPLICIT_VR_LE = "1.2.840.10008.1.2.1";

const STUDY_ROOT_FIND_UID = "1.2.840.10008.5.1.4.1.2.2.1";
const STUDY_ROOT_MOVE_UID = "1.2.840.10008.5.1.4.1.2.2.2";
const STUDY_ROOT_GET_UID = "1.2.840.10008.5.1.4.1.2.2.3";

function toUint16BE(value) {
  var bytes = new Uint8Array(2);
  new DataView(bytes.buffer).setUint16(0, value >>> 0, false);
  return bytes;
}

function toUint16LE(value) {
  var bytes = new Uint8Array(2);
  new DataView(bytes.buffer).setUint16(0, value >>> 0, true);
  return bytes;
}

function toUint32BE(value) {
  var bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setUint32(0, value >>> 0, false);
  return bytes;
}

function toUint32LE(value) {
  var bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setUint32(0, value >>> 0, true);
  return bytes;
}

function toTextBytes(value) {
  return new TextEncoder().encode(String(value));
}

function padEven(valueBytes, padByte = 0x00) {

  if (valueBytes.length % 2 == 0) {
    return valueBytes;
  }

  var padded = new Uint8Array(valueBytes.length + 1);
  padded.set(valueBytes, 0);
  padded[padded.length - 1] = padByte;

  return padded;

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
  payload]);


}

function makePdu(type, payload) {
  return concatBytes([
  new Uint8Array([type, 0x00]),
  toUint32BE(payload.length),
  payload]);

}

function encodeCommandElement(group, element, valueBytes) {

  return concatBytes([
  toUint16LE(group),
  toUint16LE(element),
  toUint32LE(valueBytes.length),
  valueBytes]);


}

function encodeCommandUI(group, element, value) {
  return encodeCommandElement(group, element, padEven(toTextBytes(value), 0x00));
}

function encodeCommandUS(group, element, value) {
  return encodeCommandElement(group, element, toUint16LE(value));
}

function encodeCommandUL(group, element, value) {
  return encodeCommandElement(group, element, toUint32LE(value));
}

function encodeTextValue(vr, value) {

  var padByte = vr == "UI" ? 0x00 : 0x20;
  return padEven(toTextBytes(value || ""), padByte);

}

function encodeExplicitVRElement(tagId, vr, valueBytes) {

  var group = parseInt(tagId.substring(0, 4), 16);
  var element = parseInt(tagId.substring(4, 8), 16);

  var shortVr = vr == "AE" ||
  vr == "AS" ||
  vr == "AT" ||
  vr == "CS" ||
  vr == "DA" ||
  vr == "DS" ||
  vr == "DT" ||
  vr == "FL" ||
  vr == "FD" ||
  vr == "IS" ||
  vr == "LO" ||
  vr == "LT" ||
  vr == "PN" ||
  vr == "SH" ||
  vr == "SL" ||
  vr == "SS" ||
  vr == "ST" ||
  vr == "TM" ||
  vr == "UI" ||
  vr == "UL" ||
  vr == "US";

  if (shortVr == true) {
    return concatBytes([
    toUint16LE(group),
    toUint16LE(element),
    toTextBytes(vr),
    toUint16LE(valueBytes.length),
    valueBytes]);

  }

  return concatBytes([
  toUint16LE(group),
  toUint16LE(element),
  toTextBytes(vr),
  new Uint8Array([0x00, 0x00]),
  toUint32LE(valueBytes.length),
  valueBytes]);


}

function encodeFindRspCommand(sopClassUid, messageIdBeingRespondedTo, status = 0x0000, hasDataSet = false) {

  var body = concatBytes([
  encodeCommandUI(0x0000, 0x0002, sopClassUid),
  encodeCommandUS(0x0000, 0x0100, 0x8020), // C-FIND-RSP
  encodeCommandUS(0x0000, 0x0120, messageIdBeingRespondedTo),
  encodeCommandUS(0x0000, 0x0800, hasDataSet ? 0x0000 : 0x0101),
  encodeCommandUS(0x0000, 0x0900, status)]);


  return concatBytes([
  encodeCommandUL(0x0000, 0x0000, body.length),
  body]);


}

function encodeGetRspCommand(sopClassUid, messageIdBeingRespondedTo, status = 0x0000, counts = null) {

  var bodyChunks = [
  encodeCommandUI(0x0000, 0x0002, sopClassUid),
  encodeCommandUS(0x0000, 0x0100, 0x8010), // C-GET-RSP
  encodeCommandUS(0x0000, 0x0120, messageIdBeingRespondedTo),
  encodeCommandUS(0x0000, 0x0800, 0x0101),
  encodeCommandUS(0x0000, 0x0900, status)];


  if (counts != null) {
    if (counts.remaining != null) {
      bodyChunks.push(encodeCommandUS(0x0000, 0x1020, counts.remaining));
    }
    if (counts.completed != null) {
      bodyChunks.push(encodeCommandUS(0x0000, 0x1021, counts.completed));
    }
    if (counts.failed != null) {
      bodyChunks.push(encodeCommandUS(0x0000, 0x1022, counts.failed));
    }
    if (counts.warning != null) {
      bodyChunks.push(encodeCommandUS(0x0000, 0x1023, counts.warning));
    }
  }

  var body = concatBytes(bodyChunks);

  return concatBytes([
  encodeCommandUL(0x0000, 0x0000, body.length),
  body]);


}

function encodeMoveRspCommand(sopClassUid, messageIdBeingRespondedTo, status = 0x0000, counts = null) {

  var bodyChunks = [
  encodeCommandUI(0x0000, 0x0002, sopClassUid),
  encodeCommandUS(0x0000, 0x0100, 0x8021), // C-MOVE-RSP
  encodeCommandUS(0x0000, 0x0120, messageIdBeingRespondedTo),
  encodeCommandUS(0x0000, 0x0800, 0x0101),
  encodeCommandUS(0x0000, 0x0900, status)];


  if (counts != null) {
    if (counts.remaining != null) {
      bodyChunks.push(encodeCommandUS(0x0000, 0x1020, counts.remaining));
    }
    if (counts.completed != null) {
      bodyChunks.push(encodeCommandUS(0x0000, 0x1021, counts.completed));
    }
    if (counts.failed != null) {
      bodyChunks.push(encodeCommandUS(0x0000, 0x1022, counts.failed));
    }
    if (counts.warning != null) {
      bodyChunks.push(encodeCommandUS(0x0000, 0x1023, counts.warning));
    }
  }

  var body = concatBytes(bodyChunks);

  return concatBytes([
  encodeCommandUL(0x0000, 0x0000, body.length),
  body]);


}

function encodeStoreRqCommand(sopClassUid, sopInstanceUid, messageId, priority = 0x0000) {

  var body = concatBytes([
  encodeCommandUI(0x0000, 0x0002, sopClassUid),
  encodeCommandUS(0x0000, 0x0100, 0x0001),
  encodeCommandUS(0x0000, 0x0110, messageId),
  encodeCommandUS(0x0000, 0x0700, priority),
  encodeCommandUS(0x0000, 0x0800, 0x0000),
  encodeCommandUI(0x0000, 0x1000, sopInstanceUid)]);


  return concatBytes([
  encodeCommandUL(0x0000, 0x0000, body.length),
  body]);


}

function buildPDataCommandPdu(contextId, commandBytes) {
  var pdvBody = concatBytes([
  new Uint8Array([contextId, 0x03]), // command + last
  commandBytes]);

  var pdv = concatBytes([toUint32BE(pdvBody.length), pdvBody]);
  return makePdu(0x04, pdv);
}

function buildPDataDataSetPdu(contextId, dataSetBytes, isLast = true) {
  var pdvBody = concatBytes([
  new Uint8Array([contextId, isLast ? 0x02 : 0x00]),
  dataSetBytes]);

  var pdv = concatBytes([toUint32BE(pdvBody.length), pdvBody]);
  return makePdu(0x04, pdv);
}

function parseCommandElements(bytes) {

  var elements = new Map();
  var offset = 0;

  while (offset + 8 <= bytes.length) {

    var view = new DataView(bytes.buffer, bytes.byteOffset + offset, 8);
    var group = view.getUint16(0, true);
    var element = view.getUint16(2, true);
    var length = view.getUint32(4, true);
    offset += 8;

    if (offset + length > bytes.length) {
      break;
    }

    var tag = group.toString(16).padStart(4, "0").toUpperCase() +
    element.toString(16).padStart(4, "0").toUpperCase();
    elements.set(tag, bytes.subarray(offset, offset + length));
    offset += length;

  }

  return elements;

}

function decodeCommandUS(elements, tag, defaultValue = 0) {
  var value = elements.get(tag);
  if (value == null || value.length < 2) {
    return defaultValue;
  }
  return new DataView(value.buffer, value.byteOffset, value.byteLength).getUint16(0, true);
}

function decodeCommandUI(elements, tag, defaultValue = "") {
  var value = elements.get(tag);
  if (value == null) {
    return defaultValue;
  }
  return new TextDecoder().decode(value).replace(/\0/g, "").trim();
}

function decodeCommandText(elements, tag, defaultValue = "") {
  var value = elements.get(tag);
  if (value == null) {
    return defaultValue;
  }
  return new TextDecoder().decode(value).replace(/\0/g, "").trim();
}

function parsePdusFromBuffer(buffer) {

  var pdus = [];
  var offset = 0;

  while (offset + 6 <= buffer.length) {
    var type = buffer[offset];
    var length = new DataView(buffer.buffer, buffer.byteOffset + offset + 2, 4).getUint32(0, false);
    var total = 6 + length;
    if (offset + total > buffer.length) {
      break;
    }
    pdus.push({
      type,
      payload: buffer.subarray(offset + 6, offset + total)
    });
    offset += total;
  }

  return {
    consumed: offset,
    pdus
  };

}

function parseAssociateRq(payload) {

  var details = {
    calledAeTitle: new TextDecoder().decode(payload.subarray(4, 20)).trim(),
    callingAeTitle: new TextDecoder().decode(payload.subarray(20, 36)).trim(),
    contexts: []
  };

  var offset = 68;
  while (offset + 4 <= payload.length) {

    var itemType = payload[offset];
    var itemLength = new DataView(payload.buffer, payload.byteOffset + offset + 2, 2).getUint16(0, false);
    var itemStart = offset + 4;
    var itemStop = itemStart + itemLength;
    if (itemStop > payload.length) {
      break;
    }

    if (itemType == 0x20) {

      var contextId = payload[itemStart];
      var sub = itemStart + 4;
      var abstractSyntaxUid = null;
      var transferSyntaxUids = [];

      while (sub + 4 <= itemStop) {
        var subType = payload[sub];
        var subLength = new DataView(payload.buffer, payload.byteOffset + sub + 2, 2).getUint16(0, false);
        var subStart = sub + 4;
        var subStop = subStart + subLength;
        if (subStop > itemStop) {
          break;
        }

        if (subType == 0x30) {
          abstractSyntaxUid = new TextDecoder().decode(payload.subarray(subStart, subStop));
        } else
        if (subType == 0x40) {
          transferSyntaxUids.push(new TextDecoder().decode(payload.subarray(subStart, subStop)));
        }

        sub = subStop;
      }

      details.contexts.push({
        id: contextId,
        abstractSyntaxUid,
        transferSyntaxUids
      });

    }

    offset = itemStop;

  }

  return details;

}

function buildAssociateAcPdu(requestDetails, storeSopClassUid) {

  var applicationContextItem = makeItem(0x10, toTextBytes("1.2.840.10008.3.1.1.1"));

  var contextItems = [];
  for (var i = 0; i < requestDetails.contexts.length; i++) {

    var context = requestDetails.contexts[i];
    var accepted = false;

    if (context.abstractSyntaxUid == STUDY_ROOT_FIND_UID ||
    context.abstractSyntaxUid == STUDY_ROOT_MOVE_UID ||
    context.abstractSyntaxUid == STUDY_ROOT_GET_UID ||
    context.abstractSyntaxUid == storeSopClassUid) {
      accepted = true;
    }

    var chosenTransferSyntax = context.transferSyntaxUids[0] || EXPLICIT_VR_LE;

    var body = [
    new Uint8Array([context.id, 0x00, accepted ? 0x00 : 0x03, 0x00])];


    if (accepted == true) {
      body.push(makeItem(0x40, toTextBytes(chosenTransferSyntax)));
    }

    contextItems.push(makeItem(0x21, concatBytes(body)));

  }

  var maxLengthItem = makeItem(0x51, toUint32BE(16384));
  var userInfoItem = makeItem(0x50, maxLengthItem);

  var fixed = concatBytes([
  toUint16BE(0x0001),
  new Uint8Array([0x00, 0x00]),
  toTextBytes(requestDetails.calledAeTitle.padEnd(16, " ").slice(0, 16)),
  toTextBytes(requestDetails.callingAeTitle.padEnd(16, " ").slice(0, 16)),
  new Uint8Array(32)]);


  return makePdu(0x02, concatBytes([
  fixed,
  applicationContextItem,
  concatBytes(contextItems),
  userInfoItem]));


}

function resolveEasiJsRoot() {

  var marker = `${path.sep}easi-js`;
  var cwd = process.cwd();
  var markerIndex = cwd.lastIndexOf(marker);

  if (markerIndex > -1) {
    return cwd.substring(0, markerIndex + marker.length);
  }

  return cwd;

}

function readDicomBytes(fileName) {
  const easiJsRoot = resolveEasiJsRoot();
  const filePath = path.join(easiJsRoot, "..", "data", "dicoms", fileName);
  return new Uint8Array(fs.readFileSync(filePath));
}

async function reserveLocalPort() {

  var probe = net.createServer();

  try {
    await new Promise((resolve, reject) => {
      probe.listen(0, "127.0.0.1", () => resolve());
      probe.once("error", reject);
    });

    var address = probe.address();
    return Number(address?.port || 0);
  } finally
  {
    await new Promise((resolve) => {
      probe.close(() => resolve());
    });
  }

}

function readMetaElementHeader(bytes, offset) {

  if (offset + 8 > bytes.length) {
    return null;
  }

  var view = new DataView(bytes.buffer, bytes.byteOffset + offset, Math.min(12, bytes.length - offset));
  var group = view.getUint16(0, true);
  var element = view.getUint16(2, true);
  var vr = String.fromCharCode(bytes[offset + 4]) + String.fromCharCode(bytes[offset + 5]);

  var longVr = vr == "OB" || vr == "OD" || vr == "OF" || vr == "OL" || vr == "OV" ||
  vr == "OW" || vr == "SQ" || vr == "UC" || vr == "UR" || vr == "UT" || vr == "UN";

  var headerLength = longVr ? 12 : 8;
  if (offset + headerLength > bytes.length) {
    return null;
  }

  var length = longVr ?
  new DataView(bytes.buffer, bytes.byteOffset + offset + 8, 4).getUint32(0, true) :
  new DataView(bytes.buffer, bytes.byteOffset + offset + 6, 2).getUint16(0, true);

  return { group, element, headerLength, length };

}

function parsePart10Meta(bytes) {

  if (bytes == null || bytes.length < 132) {
    return null;
  }

  if (bytes[128] != 0x44 || bytes[129] != 0x49 || bytes[130] != 0x43 || bytes[131] != 0x4D) {
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

    var valueText = new TextDecoder().decode(bytes.subarray(valueStart, valueStop)).replace(/\0/g, "").trim();

    if (header.group == 0x0002 && header.element == 0x0002) {
      meta.sopClassUid = valueText;
    } else
    if (header.group == 0x0002 && header.element == 0x0003) {
      meta.sopInstanceUid = valueText;
    } else
    if (header.group == 0x0002 && header.element == 0x0010) {
      meta.transferSyntaxUid = valueText;
    }

    offset = valueStop;

  }

  meta.dataSetOffset = Math.min(offset, bytes.length);
  return meta;

}

function createMockDimseQueryRetrieveScp(storePayload, findResultDataSets = null) {

  var requestDetails = null;
  var sawFind = false;
  var sawGet = false;
  var sawStoreResponse = false;

  var findContextId = 0;
  var getContextId = 0;
  var storeContextId = 0;

  var storeMessageId = 700;
  var getMessageId = 0;

  var fragments = new Map();

  const server = net.createServer((socket) => {

    var buffer = new Uint8Array(0);

    const append = (left, right) => {
      var result = new Uint8Array(left.length + right.length);
      result.set(left, 0);
      result.set(right, left.length);
      return result;
    };

    const pushPdvEvents = (payload) => {

      var events = [];
      var offset = 0;

      while (offset + 4 <= payload.length) {

        var pdvLength = new DataView(payload.buffer, payload.byteOffset + offset, 4).getUint32(0, false);
        offset += 4;

        if (offset + pdvLength > payload.length) {
          break;
        }

        var contextId = payload[offset];
        var header = payload[offset + 1];
        var isCommand = (header & 0x01) == 0x01;
        var isLast = (header & 0x02) == 0x02;
        var bytes = payload.subarray(offset + 2, offset + pdvLength);
        offset += pdvLength;

        var key = `${contextId}:${isCommand ? "C" : "D"}`;
        if (fragments.has(key) == false) {
          fragments.set(key, []);
        }
        fragments.get(key).push(bytes);

        if (isLast == true) {
          events.push({
            contextId,
            isCommand,
            bytes: concatBytes(fragments.get(key))
          });
          fragments.delete(key);
        }

      }

      return events;

    };

    socket.on("data", (chunk) => {

      buffer = append(buffer, new Uint8Array(chunk));
      var parsed = parsePdusFromBuffer(buffer);
      buffer = buffer.subarray(parsed.consumed);

      for (var i = 0; i < parsed.pdus.length; i++) {

        var pdu = parsed.pdus[i];

        if (pdu.type == 0x01) {

          requestDetails = parseAssociateRq(pdu.payload);
          for (var contextIndex = 0; contextIndex < requestDetails.contexts.length; contextIndex++) {
            var context = requestDetails.contexts[contextIndex];
            if (context.abstractSyntaxUid == STUDY_ROOT_FIND_UID) {
              findContextId = context.id;
            } else
            if (context.abstractSyntaxUid == STUDY_ROOT_GET_UID) {
              getContextId = context.id;
            } else
            if (context.abstractSyntaxUid == storePayload.sopClassUid) {
              storeContextId = context.id;
            }
          }

          socket.write(Buffer.from(buildAssociateAcPdu(requestDetails, storePayload.sopClassUid)));
          continue;

        }

        if (pdu.type == 0x04) {

          var events = pushPdvEvents(pdu.payload);

          for (var eventIndex = 0; eventIndex < events.length; eventIndex++) {

            var event = events[eventIndex];
            if (event.isCommand != true) {
              continue;
            }

            var elements = parseCommandElements(event.bytes);
            var commandField = decodeCommandUS(elements, "00000100", 0xFFFF);

            if (commandField == 0x0020) {

              sawFind = true;
              var findMessageId = decodeCommandUS(elements, "00000110", 1);
              var responses = Array.isArray(findResultDataSets) == true ? findResultDataSets : null;

              if (responses != null && responses.length > 0) {

                for (var findIndex = 0; findIndex < responses.length; findIndex++) {
                  socket.write(Buffer.from(buildPDataCommandPdu(
                  findContextId,
                  encodeFindRspCommand(STUDY_ROOT_FIND_UID, findMessageId, 0xFF00, true))));


                  socket.write(Buffer.from(buildPDataDataSetPdu(
                  findContextId,
                  responses[findIndex],
                  true)));

                }

                socket.write(Buffer.from(buildPDataCommandPdu(
                findContextId,
                encodeFindRspCommand(STUDY_ROOT_FIND_UID, findMessageId, 0x0000))));


              } else
              {

                socket.write(Buffer.from(buildPDataCommandPdu(
                findContextId,
                encodeFindRspCommand(STUDY_ROOT_FIND_UID, findMessageId, 0xFF00))));


                socket.write(Buffer.from(buildPDataCommandPdu(
                findContextId,
                encodeFindRspCommand(STUDY_ROOT_FIND_UID, findMessageId, 0x0000))));


              }

              continue;

            }

            if (commandField == 0x0010) {

              sawGet = true;
              getMessageId = decodeCommandUS(elements, "00000110", 2);

              socket.write(Buffer.from(buildPDataCommandPdu(
              getContextId,
              encodeGetRspCommand(STUDY_ROOT_GET_UID, getMessageId, 0xFF00, {
                remaining: 1,
                completed: 0,
                failed: 0,
                warning: 0
              }))));


              socket.write(Buffer.from(buildPDataCommandPdu(
              storeContextId,
              encodeStoreRqCommand(storePayload.sopClassUid, storePayload.sopInstanceUid, storeMessageId))));


              socket.write(Buffer.from(buildPDataDataSetPdu(
              storeContextId,
              storePayload.dataSetBytes,
              true)));


              continue;

            }

            if (commandField == 0x8001) {

              var respondedTo = decodeCommandUS(elements, "00000120", 0);
              if (respondedTo == storeMessageId) {
                sawStoreResponse = true;

                socket.write(Buffer.from(buildPDataCommandPdu(
                getContextId,
                encodeGetRspCommand(STUDY_ROOT_GET_UID, getMessageId, 0x0000, {
                  remaining: 0,
                  completed: 1,
                  failed: 0,
                  warning: 0
                }))));

              }

              continue;

            }

          }

          continue;

        }

        if (pdu.type == 0x05) {
          socket.write(Buffer.from(makePdu(0x06, new Uint8Array(4))));
          socket.end();
          continue;
        }

      }

    });

  });

  return {
    get state() {
      return {
        sawFind,
        sawGet,
        sawStoreResponse,
        findContextId,
        getContextId,
        storeContextId
      };
    },
    async start() {
      await new Promise((resolve, reject) => {
        server.listen(0, "127.0.0.1", () => resolve());
        server.once("error", reject);
      });
      var address = server.address();
      return {
        host: "127.0.0.1",
        port: address.port
      };
    },
    async stop() {
      await new Promise((resolve) => {
        server.close(() => resolve());
      });
    }
  };

}

function createMockDimseQueryRetrieveMoveScp(storePayload, moveRoute) {

  var requestDetails = null;
  var sawFind = false;
  var sawMove = false;
  var sawMoveStoreDelivered = false;
  var moveDestinationAeTitle = null;
  var moveFailure = null;

  var findContextId = 0;
  var moveContextId = 0;

  var fragments = new Map();

  const server = net.createServer((socket) => {

    var buffer = new Uint8Array(0);

    const append = (left, right) => {
      var result = new Uint8Array(left.length + right.length);
      result.set(left, 0);
      result.set(right, left.length);
      return result;
    };

    const pushPdvEvents = (payload) => {

      var events = [];
      var offset = 0;

      while (offset + 4 <= payload.length) {

        var pdvLength = new DataView(payload.buffer, payload.byteOffset + offset, 4).getUint32(0, false);
        offset += 4;

        if (offset + pdvLength > payload.length) {
          break;
        }

        var contextId = payload[offset];
        var header = payload[offset + 1];
        var isCommand = (header & 0x01) == 0x01;
        var isLast = (header & 0x02) == 0x02;
        var bytes = payload.subarray(offset + 2, offset + pdvLength);
        offset += pdvLength;

        var key = `${contextId}:${isCommand ? "C" : "D"}`;
        if (fragments.has(key) == false) {
          fragments.set(key, []);
        }
        fragments.get(key).push(bytes);

        if (isLast == true) {
          events.push({
            contextId,
            isCommand,
            bytes: concatBytes(fragments.get(key))
          });
          fragments.delete(key);
        }

      }

      return events;

    };

    socket.on("data", (chunk) => {

      buffer = append(buffer, new Uint8Array(chunk));
      var parsed = parsePdusFromBuffer(buffer);
      buffer = buffer.subarray(parsed.consumed);

      for (var i = 0; i < parsed.pdus.length; i++) {

        var pdu = parsed.pdus[i];

        if (pdu.type == 0x01) {

          requestDetails = parseAssociateRq(pdu.payload);
          for (var contextIndex = 0; contextIndex < requestDetails.contexts.length; contextIndex++) {
            var context = requestDetails.contexts[contextIndex];
            if (context.abstractSyntaxUid == STUDY_ROOT_FIND_UID) {
              findContextId = context.id;
            } else
            if (context.abstractSyntaxUid == STUDY_ROOT_MOVE_UID) {
              moveContextId = context.id;
            }
          }

          socket.write(Buffer.from(buildAssociateAcPdu(requestDetails, storePayload.sopClassUid)));
          continue;

        }

        if (pdu.type == 0x04) {

          var events = pushPdvEvents(pdu.payload);

          for (var eventIndex = 0; eventIndex < events.length; eventIndex++) {

            var event = events[eventIndex];
            if (event.isCommand != true) {
              continue;
            }

            var elements = parseCommandElements(event.bytes);
            var commandField = decodeCommandUS(elements, "00000100", 0xFFFF);

            if (commandField == 0x0020) {

              sawFind = true;
              var findMessageId = decodeCommandUS(elements, "00000110", 1);

              socket.write(Buffer.from(buildPDataCommandPdu(
              findContextId,
              encodeFindRspCommand(STUDY_ROOT_FIND_UID, findMessageId, 0xFF00))));


              socket.write(Buffer.from(buildPDataCommandPdu(
              findContextId,
              encodeFindRspCommand(STUDY_ROOT_FIND_UID, findMessageId, 0x0000))));


              continue;

            }

            if (commandField == 0x0021) {

              sawMove = true;
              var moveMessageId = decodeCommandUS(elements, "00000110", 2);
              moveDestinationAeTitle = decodeCommandText(elements, "00000600", "");

              (async () => {

                socket.write(Buffer.from(buildPDataCommandPdu(
                moveContextId,
                encodeMoveRspCommand(STUDY_ROOT_MOVE_UID, moveMessageId, 0xFF00, {
                  remaining: 1,
                  completed: 0,
                  failed: 0,
                  warning: 0
                }))));


                try {

                  if (moveDestinationAeTitle != moveRoute.calledAeTitle) {
                    throw new Error(`Unknown move destination AE '${moveDestinationAeTitle}'.`);
                  }

                  var cstore = new NodeDimseCStoreScuTransport();
                  await cstore.write({
                    host: moveRoute.host,
                    port: moveRoute.port,
                    callingAeTitle: moveRoute.callingAeTitle || "MOCK_QR_SCP",
                    calledAeTitle: moveRoute.calledAeTitle
                  }, storePayload.part10Bytes);
                  sawMoveStoreDelivered = true;

                  socket.write(Buffer.from(buildPDataCommandPdu(
                  moveContextId,
                  encodeMoveRspCommand(STUDY_ROOT_MOVE_UID, moveMessageId, 0x0000, {
                    remaining: 0,
                    completed: 1,
                    failed: 0,
                    warning: 0
                  }))));


                }
                catch (error) {

                  moveFailure = error;

                  socket.write(Buffer.from(buildPDataCommandPdu(
                  moveContextId,
                  encodeMoveRspCommand(STUDY_ROOT_MOVE_UID, moveMessageId, 0xA801, {
                    remaining: 0,
                    completed: 0,
                    failed: 1,
                    warning: 0
                  }))));


                }

              })();

              continue;

            }

          }

          continue;

        }

        if (pdu.type == 0x05) {
          socket.write(Buffer.from(makePdu(0x06, new Uint8Array(4))));
          socket.end();
          continue;
        }

      }

    });

  });

  return {
    get state() {
      return {
        sawFind,
        sawMove,
        sawMoveStoreDelivered,
        moveDestinationAeTitle,
        moveFailure,
        findContextId,
        moveContextId
      };
    },
    async start() {
      await new Promise((resolve, reject) => {
        server.listen(0, "127.0.0.1", () => resolve());
        server.once("error", reject);
      });
      var address = server.address();
      return {
        host: "127.0.0.1",
        port: address.port
      };
    },
    async stop() {
      await new Promise((resolve) => {
        server.close(() => resolve());
      });
    }
  };

}

dimseSocketTest("Test: NodeDimseQueryRetrieveSourceTransport executes C-FIND + C-GET and emits retrieved DICOM instance", async () => {

  const sampleBytes = readDicomBytes("0002.DCM");
  const sampleMeta = parsePart10Meta(sampleBytes);

  const storePayload = {
    sopClassUid: sampleMeta.sopClassUid,
    sopInstanceUid: sampleMeta.sopInstanceUid,
    part10Bytes: sampleBytes,
    dataSetBytes: sampleBytes.subarray(sampleMeta.dataSetOffset),
    transferSyntaxUid: sampleMeta.transferSyntaxUid || EXPLICIT_VR_LE
  };

  const mockScp = createMockDimseQueryRetrieveScp(storePayload);
  const endpoint = await mockScp.start();

  try {

    const sourceAssociation = {
      host: endpoint.host,
      port: endpoint.port,
      callingAeTitle: "EASI_QR",
      calledAeTitle: "MOCK_SCP"
    };

    const transport = new NodeDimseQueryRetrieveSourceTransport();

    const pipeline = EASI.pipelineBuilder().
    fromDimseAssociation(sourceAssociation, transport).
    ofDicomData().
    toInstances().
    build();

    const result = await pipeline.process(null, null, { sourceOptions: {
        queryRetrieveModel: "study-root",
        queryRetrieveLevel: "IMAGE",
        studyInstanceUid: "1.2.3.4.5.6",
        seriesInstanceUid: "1.2.3.4.5.6.7",
        sopInstanceUid: sampleMeta.sopInstanceUid,
        performFind: true,
        storageSopClassUids: [sampleMeta.sopClassUid],
        storageTransferSyntaxUids: [sampleMeta.transferSyntaxUid || EXPLICIT_VR_LE]
      } });

    expect(result).not.toBeNull();
    expect(result.dataSet.value(Tag.SOPInstanceUID)).toBe(sampleMeta.sopInstanceUid);

    expect(mockScp.state.sawFind).toBe(true);
    expect(mockScp.state.sawGet).toBe(true);
    expect(mockScp.state.sawStoreResponse).toBe(true);

  } finally
  {
    await mockScp.stop();
  }

});

dimseSocketTest("Test: NodeDimseQueryRetrieveSourceTransport executes C-FIND only and emits identifier instances", async () => {

  const sampleBytes = readDicomBytes("0002.DCM");
  const sampleMeta = parsePart10Meta(sampleBytes);

  const storePayload = {
    sopClassUid: sampleMeta.sopClassUid,
    sopInstanceUid: sampleMeta.sopInstanceUid,
    part10Bytes: sampleBytes,
    dataSetBytes: sampleBytes.subarray(sampleMeta.dataSetOffset),
    transferSyntaxUid: sampleMeta.transferSyntaxUid || EXPLICIT_VR_LE
  };

  const firstSopInstanceUid = "1.2.826.0.1.3680043.2.1125.1";
  const secondSopInstanceUid = "1.2.826.0.1.3680043.2.1125.2";

  const findResultDataSets = [
  concatBytes([
  encodeExplicitVRElement("00080052", "CS", encodeTextValue("CS", "IMAGE")),
  encodeExplicitVRElement("0020000D", "UI", encodeTextValue("UI", "1.2.826.0.1.3680043.2.1125.100")),
  encodeExplicitVRElement("0020000E", "UI", encodeTextValue("UI", "1.2.826.0.1.3680043.2.1125.100.1")),
  encodeExplicitVRElement("00080018", "UI", encodeTextValue("UI", firstSopInstanceUid))]),

  concatBytes([
  encodeExplicitVRElement("00080052", "CS", encodeTextValue("CS", "IMAGE")),
  encodeExplicitVRElement("0020000D", "UI", encodeTextValue("UI", "1.2.826.0.1.3680043.2.1125.100")),
  encodeExplicitVRElement("0020000E", "UI", encodeTextValue("UI", "1.2.826.0.1.3680043.2.1125.100.2")),
  encodeExplicitVRElement("00080018", "UI", encodeTextValue("UI", secondSopInstanceUid))])];



  const mockScp = createMockDimseQueryRetrieveScp(storePayload, findResultDataSets);
  const endpoint = await mockScp.start();

  try {

    const sourceAssociation = {
      host: endpoint.host,
      port: endpoint.port,
      callingAeTitle: "EASI_QR",
      calledAeTitle: "MOCK_SCP"
    };

    const transport = new NodeDimseQueryRetrieveSourceTransport();
    const emitted = [];

    const asInstances = (value) => {
      if (value == null) {
        return [];
      }
      if (Array.isArray(value) == true) {
        return value.filter((item) => item?.dataSet != null);
      }
      if (value?.dataSet != null) {
        return [value];
      }
      return [];
    };

    const collectSopInstanceUids = (values) => {
      var ordered = [];
      var seen = new Set();
      for (var i = 0; i < values.length; i++) {
        var instances = asInstances(values[i]);
        for (var j = 0; j < instances.length; j++) {
          var uid = instances[j].dataSet?.value(Tag.SOPInstanceUID) || null;
          if (uid != null && seen.has(uid) == false) {
            seen.add(uid);
            ordered.push(uid);
          }
        }
      }
      return ordered;
    };

    const pipeline = EASI.pipelineBuilder().
    fromDimseAssociation(sourceAssociation, transport).
    ofDicomData().
    withOnEmit((instance) => {
      emitted.push(instance);
    }).
    toInstances().
    build();

    const result = await pipeline.process(null, null, { sourceOptions: {
        operation: "c-find",
        performFind: false,
        queryRetrieveModel: "study-root",
        queryRetrieveLevel: "IMAGE",
        studyInstanceUid: "1.2.826.0.1.3680043.2.1125.100",
        queryTransferSyntaxUids: [EXPLICIT_VR_LE]
      } });

    var emittedSopInstanceUids = collectSopInstanceUids(emitted);
    var resultSopInstanceUids = collectSopInstanceUids([result]);

    expect(result).not.toBeNull();
    expect(Array.isArray(emittedSopInstanceUids)).toBe(true);
    expect(emittedSopInstanceUids).toEqual([firstSopInstanceUid, secondSopInstanceUid]);
    expect(resultSopInstanceUids).toContain(secondSopInstanceUid);

    expect(mockScp.state.sawFind).toBe(true);
    expect(mockScp.state.sawGet).toBe(false);
    expect(mockScp.state.sawStoreResponse).toBe(false);

  } finally
  {
    await mockScp.stop();
  }

});

dimseSocketTest("Test: NodeDimseQueryRetrieveSourceTransport executes C-FIND + C-MOVE and receives retrieved instance through local store SCP", async () => {

  const sampleBytes = readDicomBytes("0002.DCM");
  const sampleMeta = parsePart10Meta(sampleBytes);

  const moveStorePort = await reserveLocalPort();
  const moveDestinationAeTitle = "EASI_MOVE_DEST";

  const storePayload = {
    sopClassUid: sampleMeta.sopClassUid,
    sopInstanceUid: sampleMeta.sopInstanceUid,
    part10Bytes: sampleBytes,
    dataSetBytes: sampleBytes.subarray(sampleMeta.dataSetOffset),
    transferSyntaxUid: sampleMeta.transferSyntaxUid || EXPLICIT_VR_LE
  };

  const mockScp = createMockDimseQueryRetrieveMoveScp(storePayload, {
    host: "127.0.0.1",
    port: moveStorePort,
    calledAeTitle: moveDestinationAeTitle,
    callingAeTitle: "MOCK_QR_SCP"
  });
  const endpoint = await mockScp.start();

  try {

    const sourceAssociation = {
      host: endpoint.host,
      port: endpoint.port,
      callingAeTitle: "EASI_QR",
      calledAeTitle: "MOCK_SCP"
    };

    const transport = new NodeDimseQueryRetrieveSourceTransport();

    const pipeline = EASI.pipelineBuilder().
    fromDimseAssociation(sourceAssociation, transport).
    ofDicomData().
    toInstances().
    build();

    const result = await pipeline.process(null, null, { sourceOptions: {
        operation: "c-move",
        queryRetrieveModel: "study-root",
        queryRetrieveLevel: "IMAGE",
        studyInstanceUid: "1.2.3.4.5.6",
        seriesInstanceUid: "1.2.3.4.5.6.7",
        sopInstanceUid: sampleMeta.sopInstanceUid,
        performFind: true,
        moveDestinationAeTitle,
        moveStoreHost: "127.0.0.1",
        moveStorePort,
        moveStoreCalledAeTitle: moveDestinationAeTitle,
        storageSopClassUids: [sampleMeta.sopClassUid],
        storageTransferSyntaxUids: [sampleMeta.transferSyntaxUid || EXPLICIT_VR_LE]
      } });

    expect(result).not.toBeNull();
    expect(result.dataSet.value(Tag.SOPInstanceUID)).toBe(sampleMeta.sopInstanceUid);

    expect(mockScp.state.sawFind).toBe(true);
    expect(mockScp.state.sawMove).toBe(true);
    expect(mockScp.state.sawMoveStoreDelivered).toBe(true);
    expect(mockScp.state.moveDestinationAeTitle).toBe(moveDestinationAeTitle);
    expect(mockScp.state.moveFailure).toBeNull();

  } finally
  {
    await mockScp.stop();
  }

});

test("Test: NodeDimseQueryRetrieveSourceTransport validates required association fields", async () => {

  const transport = new NodeDimseQueryRetrieveSourceTransport();

  try {
    await transport.read({
      host: "",
      port: 104,
      callingAeTitle: "EASI",
      calledAeTitle: "ORTHANC"
    });
  }
  catch (error) {
    expect(error instanceof Exception).toBe(true);
    expect(error.code).toBe(GeneralErrorCodes.InvalidParameter);
    return;
  }

  throw new Error("Expected invalid association read to throw.");

});

test("Test: NodeDimseQueryRetrieveSourceTransport validates onConcern callback type", () => {

  const transport = new NodeDimseQueryRetrieveSourceTransport();

  try {
    transport.resolveQueryOptions({
      host: "127.0.0.1",
      port: 104,
      callingAeTitle: "EASI",
      calledAeTitle: "ORTHANC"
    }, {
      operation: "c-find",
      onConcern: "not-a-function"
    });
  }
  catch (error) {
    expect(error instanceof Exception).toBe(true);
    expect(error.code).toBe(GeneralErrorCodes.InvalidParameter);
    return;
  }

  throw new Error("Expected invalid onConcern callback to throw.");

});

test("Test: NodeDimseQueryRetrieveSourceTransport buildReadEnvelope includes DIMSE diagnostics metadata", () => {

  const transport = new NodeDimseQueryRetrieveSourceTransport();
  const bytes = new Uint8Array([1, 2, 3, 4]);
  const diagnostics = {
    operation: "c-store-scp",
    startedAtMs: Date.now(),
    durationMs: 7,
    moveStore: {
      host: "127.0.0.1",
      port: 4104,
      calledAeTitle: "EASI_MOVE_DEST",
      policyRejections: []
    }
  };

  const envelope = transport.buildReadEnvelope([bytes], { operation: "c-store-scp" }, {
    host: "127.0.0.1",
    port: 4104,
    calledAeTitle: "EASI_MOVE_DEST"
  }, diagnostics);

  expect(envelope).toBeDefined();
  expect(envelope.metadata).toBeDefined();
  expect(envelope.metadata.dimse).toEqual(diagnostics);

});