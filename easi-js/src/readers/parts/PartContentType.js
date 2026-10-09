//
// PartContentType.js
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

const CONTENT_TYPE_PARAMETERS = String.raw`;\s*([^;=\s]+)\s*=\s*("(?:\\.|[^"\\])*"|[^;]*)`;

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

        if ((typeof source === 'object') && (source.headers != null)) {
            return this.toHeaderValue(source.headers);
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

        if (Array.isArray(source)) {
            var headerEntry = source.find((entry) => Array.isArray(entry) && String(entry[0]).toLowerCase() === 'content-type');
            return (headerEntry != null) ? String(headerEntry[1]) : null;
        }

        if (typeof source === 'object') {
            var headerName = Object.keys(source).find((name) => name.toLowerCase() === 'content-type');
            if (headerName != null)
                return String(source[headerName]);
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

            parsed['content-type'] = String(parsed['content-type'] || parsed.mediaType).toLowerCase().trim();
            parsed.mediaType = parsed['content-type'];
            parsed.isMultiPart = ((parsed.mediaType.startsWith('multipart/')) || (parsed.isMultiPart === true));

            return parsed;

        }

        var contentType = {};
        var header = this.toHeaderValue(source);

        if (header != null) {

            var headerText = String(header);
            contentType['content-type'] = headerText.split(';', 1)[0].toLowerCase().trim();

            // Quoted parameter values can contain semicolons, equals signs and escapes.
            var parameters = new RegExp(CONTENT_TYPE_PARAMETERS, 'g');
            var match;
            while ((match = parameters.exec(headerText)) != null) {
                var name = match[1].toLowerCase();
                var value = match[2].trim();
                if (value.startsWith('"') && value.endsWith('"'))
                    value = value.substring(1, value.length - 1).replace(/\\(.)/g, '$1');

                // The related-part type is a media type; boundaries and other values are case-sensitive.
                contentType[name] = (name === 'type') ? value.toLowerCase() : value;
            }

        }

        contentType.isMultiPart = ((contentType['content-type'] != null) && (contentType['content-type'].startsWith('multipart/')));
        contentType.mediaType = contentType['content-type'] || null;

        return contentType;

    }

}
