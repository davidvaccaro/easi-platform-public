//
// PartContentType.js - 1.0.0
//
// PartContentType Helper
//

export default class PartContentType {

    /**
     * Normalize the input to a content-type header string.
     * @param {string | object | null} source Header source.
     * @returns {string | null} The normalized header value.
     */
    static toHeaderValue(source) {

        if (source == null)
            return null;

        if (typeof source === 'string')
            return source;

        if ((typeof source === 'object') && (typeof source.get === 'function')) {
            return source.get('content-type');
        }

        if ((typeof source === 'object') && (source.headers != null) && (typeof source.headers.get === 'function')) {
            return source.headers.get('content-type');
        }

        if ((typeof source === 'object') && (source.contentType != null)) {
            return this.toHeaderValue(source.contentType);
        }

        if ((typeof source === 'object') && (source['content-type'] != null)) {
            return String(source['content-type']);
        }

        if ((typeof source === 'object') && (source.content_type != null)) {
            return String(source.content_type);
        }

        return null;

    }

    /**
     * Parse one content-type header string to structured values.
     * @param {string | object | null} source Header source.
     * @returns {object} Parsed content-type metadata.
     */
    static parse(source = null) {

        // Already-parsed content-type object support.
        if ((source != null)
            && (typeof source === 'object')
            && (source.isMultiPart != null)
            && ((source['content-type'] != null) || (source.mediaType != null))) {

            var parsed = Object.assign({}, source);

            if (parsed['content-type'] == null) {
                parsed['content-type'] = String(parsed.mediaType).toLowerCase().trim();
            }

            parsed.mediaType = String(parsed['content-type']).toLowerCase().trim();
            parsed.isMultiPart = ((parsed.mediaType.indexOf('multipart/') > -1) || (parsed.isMultiPart === true));

            return parsed;

        }

        var contentType = {};
        var header = this.toHeaderValue(source);

        if (header != null) {

            var parts = String(header).split(';');

            contentType['content-type'] = parts[0]
                .replaceAll('"', '')
                .toLowerCase()
                .trim();

            for (var i = 1; i < parts.length; i++) {

                var part = parts[i];
                if (part.indexOf('=') < 0)
                    continue;

                var nameValue = part
                    .replaceAll('"', '')
                    .trim()
                    .split('=');

                if (nameValue.length < 2)
                    continue;

                var name = String(nameValue[0]).toLowerCase().trim();
                var value = nameValue.slice(1).join('=').toLowerCase().trim();
                contentType[name] = value;

            }

        }

        contentType.isMultiPart = ((contentType['content-type'] != null) && (contentType['content-type'].indexOf('multipart/') > -1));
        contentType.mediaType = contentType['content-type'] || null;

        return contentType;

    }

}
