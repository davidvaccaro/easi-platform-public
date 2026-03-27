//
// DicomDocumentWrappingHandler.js - 1.0.0
//
// Stream DICOM Encapsulated Document Wrapping Handler Class
//

import JsonDataHandler from "./syntax/JsonDataHandler.js";
import DicomDataWriterHandler from "./DicomDataWriterHandler.js";
import DocumentWrapper from "../../dicom/documents/DocumentWrapper.js";

export default class DicomDocumentWrappingHandler extends JsonDataHandler {

    /**
     * Resolve media-type text from parser content-type metadata.
     * @param {string | object | null} contentType The source content-type.
     * @returns {string | null} The normalized media type.
     */
    resolveMediaType(contentType) {

        if (contentType == null)
            return null;

        if (typeof contentType == "string") {
            return contentType.split(";")[0].trim().toLowerCase();
        }

        if (typeof contentType == "object") {

            var mediaType = contentType.mediaType
                ?? contentType["content-type"]
                ?? null;

            if (typeof mediaType == "string") {
                return mediaType.split(";")[0].trim().toLowerCase();
            }

        }

        return null;

    }

    /**
     * Resolve the effective document wrapper.
     * @param {object | null} options Handler options.
     * @returns {DocumentWrapper | object} The wrapper.
     */
    resolveWrapper(options = null) {

        var wrapper = options?.wrapper ?? null;
        if ((wrapper != null) && (typeof wrapper.wrap == "function")) {
            return wrapper;
        }

        return new DocumentWrapper();

    }

    /**
     * Normalize one value to a descriptor array.
     * @param {*} value The source value.
     * @returns {Array<object>} The descriptor array.
     */
    resolveDescriptors(value) {
        return this.wrapper.resolveDescriptors(value);
    }

    /**
     * Resolve one descriptor from raw byte input.
     * @param {Uint8Array} bytes The raw payload bytes.
     * @param {string | object | null} contentType Source content-type metadata.
     * @returns {object} The resolved descriptor.
     */
    resolveRawDescriptor(bytes, contentType = null) {

        var descriptor = {};

        if ((this.options?.descriptor != null) && (typeof this.options.descriptor == "object")) {
            descriptor = Object.assign({}, this.options.descriptor);
        }

        var optionDescriptorFields = [
            "mimeType",
            "contentType",
            "type",
            "title",
            "documentTitle",
            "fileName",
            "sopClassUid",
            "sopClassUID",
            "modality",
            "transferSyntaxUid",
            "transferSyntaxUID",
            "studyInstanceUid",
            "studyInstanceUID",
            "seriesInstanceUid",
            "seriesInstanceUID",
            "sopInstanceUid",
            "sopInstanceUID",
            "seriesNumber",
            "instanceNumber",
            "implementationClassUid",
            "implementationClassUID",
            "implementationVersionName",
            "sourceApplicationEntityTitle"
        ];

        for (var i = 0; i < optionDescriptorFields.length; i++) {
            var fieldName = optionDescriptorFields[i];
            if ((descriptor[fieldName] == null) && (this.options?.[fieldName] != null)) {
                descriptor[fieldName] = this.options[fieldName];
            }
        }

        if ((descriptor.mimeType == null) && (descriptor.contentType == null) && (descriptor.type == null)) {
            var mediaType = this.resolveMediaType(contentType);
            if ((mediaType != null) && (mediaType.length > 0) && (mediaType.indexOf("multipart/") != 0)) {
                descriptor.mimeType = mediaType;
            }
        }

        descriptor.bytes = (bytes instanceof Uint8Array) ? bytes : new Uint8Array(0);

        return descriptor;

    }

    /**
     * Resolve one raw-byte payload from parser onEnd data.
     * @param {*} payload The parser onEnd payload.
     * @returns {{ bytes: Uint8Array, contentType: string | object | null } | null} The normalized payload.
     */
    resolveRawPayload(payload) {

        if ((payload == null) || (typeof payload != "object"))
            return null;

        if ((payload.sourceFormat != "byte") && (payload.bytes == null))
            return null;

        var bytes = payload.bytes;
        if ((bytes instanceof Uint8Array) == false) {
            bytes = new Uint8Array(0);
        }

        return {
            bytes: bytes,
            contentType: (payload.contentType ?? null)
        };

    }

    /**
     * Create one stable attribute order by tag group/element.
     * @param {Array<object>} attributes Source attributes.
     * @returns {Array<object>} Sorted attributes.
     */
    sortAttributes(attributes) {

        return [...(attributes ?? [])].sort((left, right) => {
            var leftGroup = Number(left?.tag?.Group ?? 0);
            var rightGroup = Number(right?.tag?.Group ?? 0);
            if (leftGroup != rightGroup) {
                return (leftGroup - rightGroup);
            }

            var leftElement = Number(left?.tag?.Element ?? 0);
            var rightElement = Number(right?.tag?.Element ?? 0);
            return (leftElement - rightElement);
        });

    }

    /**
     * Start parsing a new input payload.
     * @param {object | null} context Handler context.
     * @returns {object} The initialized context.
     */
    onStart(context) {

        var initialized = super.onStart(context);

        initialized.byteChunks = [];
        initialized.byteLength = 0;

        return initialized;

    }

    /**
     * Append one raw byte chunk from a byte parser.
     * @param {object} context Handler context.
     * @param {Uint8Array} chunk The current chunk.
     */
    onData(context, chunk) {

        if ((chunk == null) || (chunk.length == 0))
            return;

        context.byteChunks.push(chunk);
        context.byteLength += chunk.length;

    }

    /**
     * Serialize one instance to DICOM bytes.
     * @param {object} instance The source instance.
     * @returns {Promise<Uint8Array>} The serialized bytes.
     */
    async serializeInstance(instance) {

        var writer = new DicomDataWriterHandler({ collectOutput: true });
        var context = writer.onStartInstance(null);

        if (instance?.preamble != null) {
            await writer.onEndPreamble(context, instance.preamble);
        }

        if (instance?.prefix != null) {
            await writer.onEndPrefix(context, instance.prefix);
        }

        if (instance?.metaSet != null) {
            writer.onStartMetaSet(context);

            var metaAttributes = this.sortAttributes(instance.metaSet.attributes);
            for (var metaIndex = 0; metaIndex < metaAttributes.length; metaIndex++) {
                await writer.onEndAttribute(context, metaAttributes[metaIndex]);
            }

            writer.onEndMetaSet(context);
        }

        if (instance?.dataSet != null) {
            writer.onStartDataSet(context);

            var dataAttributes = this.sortAttributes(instance.dataSet.attributes);
            for (var dataIndex = 0; dataIndex < dataAttributes.length; dataIndex++) {
                await writer.onEndAttribute(context, dataAttributes[dataIndex]);
            }

            writer.onEndDataSet(context);
        }

        return writer.onEndInstance(context);

    }

    /**
     * Resolve JSON parser terminal payload to wrapped DICOM bytes.
     * @param {object} context Handler context.
     * @returns {Promise<Uint8Array | Array<Uint8Array>>} Wrapped DICOM bytes.
     */
    async onEnd(context, payload = null) {

        var rawPayload = this.resolveRawPayload(payload);
        var descriptors = null;

        if (rawPayload != null) {
            descriptors = [
                this.resolveRawDescriptor(rawPayload.bytes, rawPayload.contentType)
            ];
        }
        else {
            var jsonValue = super.onEnd(context);
            descriptors = this.resolveDescriptors(jsonValue);
        }

        var output = [];

        for (var i = 0; i < descriptors.length; i++) {
            var instance = this.wrapper.wrapDescriptor(descriptors[i], i, this.options);
            var bytes = await this.serializeInstance(instance);
            output.push(bytes);
        }

        return (output.length == 1) ? output[0] : output;

    }

    /**
     * Create one DICOM document wrapping handler.
     * @param {object | null} options Handler options.
     */
    constructor(options = null) {
        super();
        this.options = ((options != null) && (typeof options == "object")) ? options : {};
        this.wrapper = this.resolveWrapper(this.options);
    }

}
