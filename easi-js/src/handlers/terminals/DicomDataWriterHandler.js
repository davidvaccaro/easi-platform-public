//
// DicomDataWriterHandler.js
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

import Constants from "../../dicom/Constants.js";
import Tag from "../../dicom/Tag.js";
import TransferSyntax from "../../dicom/TransferSyntax.js";
import ValueRepresentations from "../../dicom/ValueRepresentation.js";
import PipelineOperationResult from "../../pipelines/PipelineOperationResult.js";

const ExplicitLongLengthVRs = new Set(['OB', 'OD', 'OF', 'OL', 'OV', 'OW', 'SQ', 'SV', 'UC', 'UR', 'UT', 'UN', 'UV']);

const BinaryPadVRs = new Set(['OB', 'OD', 'OF', 'OL', 'OV', 'OW', 'UN', 'AT']);

const TextPadNullVRs = new Set(['UI']);

const NumericVRs = new Set(['US', 'SS', 'UL', 'SL', 'UV', 'SV', 'FL', 'FD']);

export default class DicomDataWriterHandler {

    /**
     * Resolve the effective value-representation for a tag/data-element.
     * @param {Tag|Attribute|AttributeSequence|null} source The source object.
     * @returns {ValueRepresentation} The resolved value-representation.
     */
    resolveValueRepresentation(source) {

        var valueRepresentation = source?.vr
            ?? source?.valueRepresentation
            ?? source?.tag?.VR
            ?? source?.VR
            ?? null;

        if (valueRepresentation == null)
            valueRepresentation = ValueRepresentations.UN;

        return valueRepresentation;

    }

    /**
     * Emit a chunk to the configured output callback and/or in-memory collection.
     * @param {Uint8Array} chunk The data chunk to emit.
     */
    async emit(chunk) {

        if ((chunk == null) || (chunk.length == 0))
            return;

        this.bytesWritten += chunk.length;

        if (this.onChunk != null) {
            const result = this.onChunk(chunk);
            if (result instanceof Promise) {
                await result;
            }
        }

        if (this.collectOutput == true) {
            this.outputChunks.push(chunk);
        }

    }

    /**
     * Build one contiguous output array from collected output chunks.
     * @returns {Uint8Array} The combined output bytes.
     */
    toOutputBytes() {

        if (this.outputChunks.length == 0)
            return new Uint8Array(0);

        if (this.outputChunks.length == 1)
            return this.outputChunks[0];

        var result = new Uint8Array(this.bytesWritten);
        var offset = 0;

        for (var i = 0; i < this.outputChunks.length; i++) {
            result.set(this.outputChunks[i], offset);
            offset += this.outputChunks[i].length;
        }

        return result;

    }

    /**
     * Determine if the current transfer-syntax should write explicit VR.
     * @param {TransferSyntax} transferSyntax The active transfer-syntax.
     * @returns {boolean} TRUE when explicit VR should be written.
     */
    isExplicit(transferSyntax) {
        return ((transferSyntax != null) && (transferSyntax.IsExplicit == true));
    }

    /**
     * Determine if the current transfer-syntax is little endian.
     * @param {TransferSyntax} transferSyntax The active transfer-syntax.
     * @returns {boolean} TRUE when little endian should be written.
     */
    isLittleEndian(transferSyntax) {
        if (transferSyntax == null)
            return true;

        // Treat unresolved syntax ("NONE") as implicit-little-endian to avoid
        // emitting big-endian byte order for raw data-set streams.
        if ((transferSyntax == TransferSyntax.NONE) || (transferSyntax?.ID == TransferSyntax.NONE.ID))
            return true;
        return (transferSyntax.IsLittleEndian == true);
    }

    /**
     * Convert a DICOM tag to 4 raw bytes in the active transfer-syntax endian order.
     * @param {Tag} tag The DICOM tag.
     * @param {TransferSyntax} transferSyntax The active transfer-syntax.
     * @returns {Uint8Array} The encoded tag bytes.
     */
    encodeTag(tag, transferSyntax) {

        var bytes = new Uint8Array(4);
        var littleEndian = this.isLittleEndian(transferSyntax);
        var view = new DataView(bytes.buffer);

        view.setUint16(0, tag.Group, littleEndian);
        view.setUint16(2, tag.Element, littleEndian);

        return bytes;

    }

    /**
     * Encode an unsigned 16-bit value in the active transfer-syntax endian order.
     * @param {number} value The value to encode.
     * @param {TransferSyntax} transferSyntax The active transfer-syntax.
     * @returns {Uint8Array} The encoded bytes.
     */
    encodeUInt16(value, transferSyntax) {

        var bytes = new Uint8Array(2);
        var view = new DataView(bytes.buffer);
        view.setUint16(0, value, this.isLittleEndian(transferSyntax));

        return bytes;

    }

    /**
     * Encode an unsigned 32-bit value in the active transfer-syntax endian order.
     * @param {number} value The value to encode.
     * @param {TransferSyntax} transferSyntax The active transfer-syntax.
     * @returns {Uint8Array} The encoded bytes.
     */
    encodeUInt32(value, transferSyntax) {

        var bytes = new Uint8Array(4);
        var view = new DataView(bytes.buffer);
        view.setUint32(0, value >>> 0, this.isLittleEndian(transferSyntax));

        return bytes;

    }

    /**
     * Pad a value byte array to even length as required by DICOM.
     * @param {Uint8Array} bytes The input bytes.
     * @param {string} vrID The DICOM VR identifier.
     * @returns {Uint8Array} The padded bytes.
     */
    padValueBytes(bytes, vrID = null) {

        if ((bytes.length % 2) == 0)
            return bytes;

        var padByte = 0x00;
        if ((vrID != null) && (BinaryPadVRs.has(vrID) == false) && (TextPadNullVRs.has(vrID) == false)) {
            padByte = 0x20;
        }

        var padded = new Uint8Array(bytes.length + 1);
        padded.set(bytes, 0);
        padded[padded.length - 1] = padByte;

        return padded;

    }

    /**
     * Encode one numeric value for a numeric VR.
     * @param {string} vrID The VR identifier.
     * @param {number | bigint} value The value to encode.
     * @param {TransferSyntax} transferSyntax The active transfer-syntax.
     * @returns {Uint8Array} The encoded bytes.
     */
    encodeNumericValue(vrID, value, transferSyntax) {

        var littleEndian = this.isLittleEndian(transferSyntax);

        switch (vrID) {
            case 'US': {
                var us = new Uint8Array(2);
                (new DataView(us.buffer)).setUint16(0, Number(value), littleEndian);
                return us;
            }
            case 'SS': {
                var ss = new Uint8Array(2);
                (new DataView(ss.buffer)).setInt16(0, Number(value), littleEndian);
                return ss;
            }
            case 'UL': {
                var ul = new Uint8Array(4);
                (new DataView(ul.buffer)).setUint32(0, Number(value), littleEndian);
                return ul;
            }
            case 'SL': {
                var sl = new Uint8Array(4);
                (new DataView(sl.buffer)).setInt32(0, Number(value), littleEndian);
                return sl;
            }
            case 'FL': {
                var fl = new Uint8Array(4);
                (new DataView(fl.buffer)).setFloat32(0, Number(value), littleEndian);
                return fl;
            }
            case 'FD': {
                var fd = new Uint8Array(8);
                (new DataView(fd.buffer)).setFloat64(0, Number(value), littleEndian);
                return fd;
            }
            case 'UV': {
                var uv = new Uint8Array(8);
                var uvView = new DataView(uv.buffer);
                if (typeof uvView.setBigUint64 === 'function') {
                    uvView.setBigUint64(0, BigInt(value), littleEndian);
                }
                else {
                    uvView.setUint32(0, Number(BigInt(value) & 0xFFFFFFFFn), littleEndian);
                    uvView.setUint32(4, Number((BigInt(value) >> 32n) & 0xFFFFFFFFn), littleEndian);
                }
                return uv;
            }
            case 'SV': {
                var sv = new Uint8Array(8);
                var svView = new DataView(sv.buffer);
                if (typeof svView.setBigInt64 === 'function') {
                    svView.setBigInt64(0, BigInt(value), littleEndian);
                }
                else {
                    var big = BigInt(value);
                    svView.setUint32(0, Number(big & 0xFFFFFFFFn), littleEndian);
                    svView.setInt32(4, Number((big >> 32n) & 0xFFFFFFFFn), littleEndian);
                }
                return sv;
            }
            default:
                return (new TextEncoder()).encode(String(value));
        }

    }

    /**
     * Format a Date value as a DA, DT or TM DICOM string.
     * @param {Date} value The date value.
     * @param {string} vrID The target VR.
     * @returns {string} The formatted value.
     */
    formatDateValue(value, vrID) {

        var pad2 = function(number) { return String(number).padStart(2, '0'); };
        var year = String(value.getFullYear()).padStart(4, '0');
        var month = pad2(value.getMonth() + 1);
        var day = pad2(value.getDate());
        var hour = pad2(value.getHours());
        var minute = pad2(value.getMinutes());
        var second = pad2(value.getSeconds());

        if (vrID == 'DA')
            return year + month + day;

        if (vrID == 'TM')
            return hour + minute + second + '.000000';

        if (vrID == 'DT') {
            var offsetMinutes = -value.getTimezoneOffset();
            var sign = (offsetMinutes >= 0) ? '+' : '-';
            var offsetAbs = Math.abs(offsetMinutes);
            var offsetHours = pad2(Math.floor(offsetAbs / 60));
            var offsetMins = pad2(offsetAbs % 60);
            return year + month + day + hour + minute + second + '.000000' + sign + offsetHours + offsetMins;
        }

        return value.toISOString();

    }

    /**
     * Resolve serialized value bytes for an attribute.
     * @param {Attribute} attribute The attribute to serialize.
     * @returns {Uint8Array} The serialized value bytes.
     */
    resolveAttributeValueBytes(attribute) {

        var valueRepresentation = this.resolveValueRepresentation(attribute);
        var vrID = valueRepresentation?.ID ?? null;
        var transferSyntax = attribute.transferSyntax;

        // Preserve original raw bytes when no override is present.
        if (attribute._value == null) {
            return this.padValueBytes(attribute.access(), vrID);
        }

        var value = attribute._value;

        if (value == null) {
            return new Uint8Array(0);
        }

        if (value instanceof Uint8Array) {
            return this.padValueBytes(value, vrID);
        }

        if (ArrayBuffer.isView(value)) {
            return this.padValueBytes(
                new Uint8Array(value.buffer, value.byteOffset, value.byteLength),
                vrID
            );
        }

        if (value instanceof ArrayBuffer) {
            return this.padValueBytes(new Uint8Array(value), vrID);
        }

        if (value instanceof Date) {
            return this.padValueBytes(
                (new TextEncoder()).encode(this.formatDateValue(value, vrID)),
                vrID
            );
        }

        if (vrID == 'AT') {

            var identifier = null;
            if ((typeof value === 'string') && (value.length > 0)) {
                identifier = value.replace(/[^0-9a-fA-F]/g, '').toUpperCase();
            }
            else if ((value?.Group != null) && (value?.Element != null)) {
                identifier = Tag.identifier(value.Group, value.Element);
            }
            else if ((value?.ID != null) && (typeof value.ID === 'string')) {
                identifier = value.ID.toUpperCase();
            }

            if ((identifier != null) && (identifier.length == 8)) {
                var group = parseInt(identifier.substring(0, 4), 16);
                var element = parseInt(identifier.substring(4, 8), 16);
                var atBytes = new Uint8Array(4);
                var atView = new DataView(atBytes.buffer);
                atView.setUint16(0, group, this.isLittleEndian(transferSyntax));
                atView.setUint16(2, element, this.isLittleEndian(transferSyntax));
                return atBytes;
            }

        }

        if (NumericVRs.has(vrID)) {

            if (Array.isArray(value)) {

                if (value.length == 0)
                    return new Uint8Array(0);

                var chunks = value.map((element) => this.encodeNumericValue(vrID, element, transferSyntax));
                var length = chunks.reduce((sum, bytes) => sum + bytes.length, 0);
                var packed = new Uint8Array(length);
                var offset = 0;
                for (var index = 0; index < chunks.length; index++) {
                    packed.set(chunks[index], offset);
                    offset += chunks[index].length;
                }
                return packed;

            }

            return this.encodeNumericValue(vrID, value, transferSyntax);

        }

        if (vrID == 'PN') {
            // DICOM JSON PN values contain separate script representations.
            // Preserve their positions, including an absent Alphabetic group.
            var names = (Array.isArray(value) ? value : [value]).map((name) => {
                if (name == null)
                    return '';
                if (typeof name === 'string')
                    return name;
                if ((typeof name !== 'object') || Array.isArray(name))
                    throw new Error('Invalid DICOM PN representation; expected a string or object.');
                if (['alphabetic', 'ideographic', 'phonetic'].includes(name.type)) {
                    var legacyKey = name.type[0].toUpperCase() + name.type.substring(1);
                    name = { [legacyKey]: name.value };
                }
                var groups = ['Alphabetic', 'Ideographic', 'Phonetic'].map((key) => name[key] ?? '');
                if (groups.some((group) => typeof group !== 'string'))
                    throw new Error('Invalid DICOM PN representation; expected strings.');
                while ((groups.length > 0) && (groups[groups.length - 1] === ''))
                    groups.pop();
                return groups.join('=');
            });
            return this.padValueBytes((new TextEncoder()).encode(names.join('\\')), vrID);
        }

        if (Array.isArray(value)) {
            if (value.length == 0)
                return new Uint8Array(0);

            if (value.every((element) => Number.isInteger(element) && (element >= 0) && (element <= 255))) {
                return this.padValueBytes(Uint8Array.from(value), vrID);
            }

            return this.padValueBytes(
                (new TextEncoder()).encode(value.map((element) => String(element)).join('\\')),
                vrID
            );
        }

        return this.padValueBytes((new TextEncoder()).encode(String(value)), vrID);

    }

    /**
     * Serialize a DICOM data-element header.
     * @param {Tag} tag The data-element tag.
     * @param {ValueRepresentation} valueRepresentation The value representation.
     * @param {number} valueLength The value length.
     * @param {TransferSyntax} transferSyntax The active transfer-syntax.
     * @returns {Uint8Array} The serialized header.
     */
    serializeHeader(tag, valueRepresentation, valueLength, transferSyntax) {

        if (valueRepresentation == null)
            valueRepresentation = ValueRepresentations.UN;

        var vrID = valueRepresentation?.ID || null;
        var isControlTag = ((tag?.Group == 0xFFFE) && ((tag == Tag.Item) || (tag == Tag.ItemDelimitationItem) || (tag == Tag.SequenceDelimitationItem)));
        var isExplicit = this.isExplicit(transferSyntax);

        if ((isExplicit == true) && (isControlTag == false) && ((vrID == null) || (vrID.length < 2))) {
            valueRepresentation = ValueRepresentations.UN;
            vrID = valueRepresentation.ID;
        }

        var usesLongLength = isControlTag || (isExplicit == false) || ExplicitLongLengthVRs.has(vrID);
        var headerLength = usesLongLength ? ((isExplicit && (isControlTag == false)) ? 12 : 8) : 8;

        var result = new Uint8Array(headerLength);
        var offset = 0;

        var tagBytes = this.encodeTag(tag, transferSyntax);
        result.set(tagBytes, offset);
        offset += tagBytes.length;

        if ((isExplicit == true) && (isControlTag == false)) {

            result[offset] = vrID.charCodeAt(0);
            result[offset + 1] = vrID.charCodeAt(1);
            offset += 2;

            if (usesLongLength == true) {
                result[offset] = 0;
                result[offset + 1] = 0;
                offset += 2;

                result.set(this.encodeUInt32(valueLength, transferSyntax), offset);
                offset += 4;
            }
            else {
                result.set(this.encodeUInt16(valueLength, transferSyntax), offset);
                offset += 2;
            }

        }
        else {
            result.set(this.encodeUInt32(valueLength, transferSyntax), offset);
            offset += 4;
        }

        return result;

    }

    /**
     * Serialize one full attribute payload (header + value + optional delimiter).
     * @param {Attribute} attribute The attribute to serialize.
     */
    async emitAttribute(attribute) {

        if (this.emittedAttributes.has(attribute))
            return;

        this.currentTransferSyntax = attribute.transferSyntax;

        var valueBytes = this.resolveAttributeValueBytes(attribute);
        var isUndefinedLength = (attribute.valueLength == Constants.UndefinedLength);
        var valueLength = isUndefinedLength ? Constants.UndefinedLength : valueBytes.length;
        var headerBytes = this.serializeHeader(
            attribute.tag,
            this.resolveValueRepresentation(attribute),
            valueLength,
            attribute.transferSyntax
        );

        await this.emit(headerBytes);
        await this.emit(valueBytes);

        if (isUndefinedLength == true) {
            await this.emit(this.serializeHeader(
                Tag.SequenceDelimitationItem,
                Tag.SequenceDelimitationItem.VR,
                0,
                attribute.transferSyntax
            ));
        }

        this.emittedAttributes.add(attribute);

    }

    /**
     * Ensure one streamed attribute header is emitted once before streamed chunks.
     * @param {Attribute} attribute The streamed attribute.
     */
    async ensureStreamAttributeHeader(attribute) {

        if (this.streamedAttributeHeaders.has(attribute))
            return;

        this.currentTransferSyntax = attribute.transferSyntax;

        await this.emit(this.serializeHeader(
            attribute.tag,
            this.resolveValueRepresentation(attribute),
            attribute.valueLength,
            attribute.transferSyntax
        ));

        this.streamedAttributeHeaders.add(attribute);

    }

    /**
     * Reset one streaming instance output state.
     */
    resetInstanceState() {

        this.bytesWritten = 0;
        this.outputChunks = [];
        this.sequenceSyntaxStack = [];
        this.currentTransferSyntax = TransferSyntax.NONE;
        this.emittedAttributes = new WeakSet();
        this.streamedAttributeHeaders = new WeakSet();

    }

    onReset() {
    }

    onStartInstance(context) {

        if (context == null) {
            context = {
                results: []
            };
        }

        this.resetInstanceState();
        return context;

    }

    onStartPreamble(context, preamble) {
    }

    onStartPrefix(context, prefix) {
    }

    onStartMetaSet(context) {
        this.currentTransferSyntax = TransferSyntax.ExplicitVRLittleEndian;
    }

    onStartDataSet(context) {
    }

    onStartAttribute(context, attribute) {
    }

    async onStartSequence(context, sequence) {

        this.currentTransferSyntax = sequence.transferSyntax;
        this.sequenceSyntaxStack.push(this.currentTransferSyntax);

        // Always write undefined-length sequences so nested length recalculation is unnecessary.
        await this.emit(this.serializeHeader(
            sequence.tag,
            this.resolveValueRepresentation(sequence),
            Constants.UndefinedLength,
            sequence.transferSyntax
        ));

    }

    async onStartItem(context) {

        var itemTransferSyntax = this.currentTransferSyntax;
        if (this.sequenceSyntaxStack.length > 0) {
            itemTransferSyntax = this.sequenceSyntaxStack[this.sequenceSyntaxStack.length - 1];
        }

        await this.emit(this.serializeHeader(
            Tag.Item,
            Tag.Item.VR,
            Constants.UndefinedLength,
            itemTransferSyntax
        ));

    }

    async onAppendAttribute(context, attribute) {

        // Streamed attributes are emitted by onAttributeChunk and finalized in onEndAttribute.
        if (attribute?.isBulkStreamed == true)
            return;

        // Undefined-length attributes (for example encapsulated PixelData) may complete here.
        if ((attribute.valueLength == Constants.UndefinedLength) && (attribute.isComplete == true)) {
            await this.emitAttribute(attribute);
        }

    }

    /**
     * Stream raw value chunks for bulk-streamed attributes.
     * @param {object} context Handler context.
     * @param {{ attribute: Attribute, chunk: Uint8Array, isFinalChunk: boolean }} payload Chunk payload.
     */
    async onAttributeChunk(context, payload) {

        var attribute = payload?.attribute;
        var chunk = payload?.chunk;
        var isFinalChunk = (payload?.isFinalChunk == true);

        if ((attribute == null) || (attribute.isBulkStreamed != true))
            return;

        await this.ensureStreamAttributeHeader(attribute);
        await this.emit(chunk);

        if ((isFinalChunk == true) && (attribute.valueLength == Constants.UndefinedLength)) {

            await this.emit(this.serializeHeader(
                Tag.SequenceDelimitationItem,
                Tag.SequenceDelimitationItem.VR,
                0,
                attribute.transferSyntax
            ));

            this.emittedAttributes.add(attribute);

        }

    }

    async onEndPreamble(context, preamble) {
        await this.emit(preamble.access());
    }

    async onEndPrefix(context, prefix) {
        await this.emit(prefix.access());
    }

    async onEndAttribute(context, attribute) {

        if (attribute?.isBulkStreamed == true) {

            await this.ensureStreamAttributeHeader(attribute);

            if ((attribute.valueLength == Constants.UndefinedLength) && (this.emittedAttributes.has(attribute) == false)) {
                await this.emit(this.serializeHeader(
                    Tag.SequenceDelimitationItem,
                    Tag.SequenceDelimitationItem.VR,
                    0,
                    attribute.transferSyntax
                ));
            }

            this.emittedAttributes.add(attribute);
            return;

        }

        await this.emitAttribute(attribute);

    }

    async onEndSequence(context, sequence) {

        await this.emit(this.serializeHeader(
            Tag.SequenceDelimitationItem,
            Tag.SequenceDelimitationItem.VR,
            0,
            sequence.transferSyntax
        ));

        if (this.sequenceSyntaxStack.length > 0) {
            this.sequenceSyntaxStack.pop();
        }

        if (this.sequenceSyntaxStack.length > 0) {
            this.currentTransferSyntax = this.sequenceSyntaxStack[this.sequenceSyntaxStack.length - 1];
        }

    }

    async onEndItem(context) {

        var itemTransferSyntax = this.currentTransferSyntax;
        if (this.sequenceSyntaxStack.length > 0) {
            itemTransferSyntax = this.sequenceSyntaxStack[this.sequenceSyntaxStack.length - 1];
        }

        await this.emit(this.serializeHeader(
            Tag.ItemDelimitationItem,
            Tag.ItemDelimitationItem.VR,
            0,
            itemTransferSyntax
        ));

    }

    onEndMetaSet(context) {
    }

    onEndDataSet(context) {
    }

    onEndInstance(context) {

        var result = null;
        if (this.collectOutput == true) {
            result = this.toOutputBytes();
        }
        else {
            result = PipelineOperationResult.fromTerminal(
                "toDicomData",
                this.bytesWritten,
                null,
                null
            );
        }

        context.results.push(result);

        return (context.results.length == 1) ? result : context.results;

    }

    onError(context, error) {
    }

    onProgress(context, progress) {
    }

    /**
     * Create a DICOM native data writer handler.
     * @param {{ onChunk?: Function, collectOutput?: boolean } | null} options Options for chunk emission and output collection.
     */
    constructor(options = null) {

        if (options == null) {
            options = {};
        }

        this.onChunk = options.onChunk || null;
        this.collectOutput = (options.collectOutput != null)
            ? (options.collectOutput == true)
            : (this.onChunk == null);

        this.resetInstanceState();

    }

};
