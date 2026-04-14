//
// ImagingDataUtils.js
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

import PartContentType from "../readers/parts/PartContentType.js";

export default class ImagingDataUtils {

    /**
     * Parse/normalize one content-type source.
     * @param {string | object | null} contentType The content-type source.
     * @returns {object} Parsed content-type metadata.
     */
    static parseContentType(contentType = null) {
        return PartContentType.parse(contentType);
    }

    /**
     * Resolve lowercase media-type value from content-type source.
     * @param {string | object | null} contentType The content-type source.
     * @returns {string | null} The media-type.
     */
    static resolveMediaType(contentType = null) {

        var parsed = this.parseContentType(contentType);
        var mediaType = parsed?.mediaType ?? parsed?.["content-type"] ?? null;

        if ((mediaType == null) || (typeof mediaType !== "string"))
            return null;

        var normalized = mediaType.trim().toLowerCase();
        return (normalized.length > 0) ? normalized : null;

    }

    /**
     * Resolve source path metadata from content-type source.
     * @param {string | object | null} contentType The content-type source.
     * @returns {string | null} The source path.
     */
    static resolveSourcePath(contentType = null) {

        if ((contentType == null) || (typeof contentType !== "object"))
            return null;

        var sourcePath = contentType.sourcePath ?? contentType.path ?? null;
        if ((sourcePath == null) || (typeof sourcePath !== "string"))
            return null;

        return sourcePath;

    }

    /**
     * Determine whether bytes include DICOM Part10 prefix.
     * @param {Uint8Array | null} bytes Source bytes.
     * @returns {boolean} TRUE when bytes include `DICM` prefix marker.
     */
    static hasDicomPrefix(bytes) {

        if ((bytes == null) || (bytes.length < 132))
            return false;

        return (
            (bytes[128] == 0x44)
            && (bytes[129] == 0x49)
            && (bytes[130] == 0x43)
            && (bytes[131] == 0x4D)
        );

    }

    /**
     * Detect one standard image format from bytes and/or content-type metadata.
     * @param {Uint8Array | null} bytes Source bytes.
     * @param {string | object | null} contentType Content-type source.
     * @returns {"jpeg" | "png" | "tiff" | null} Detected image format.
     */
    static detectImageFormat(bytes = null, contentType = null) {

        var mediaType = this.resolveMediaType(contentType);

        if ((mediaType != null) && (mediaType.indexOf("jpeg") > -1))
            return "jpeg";

        if ((mediaType != null) && (mediaType.indexOf("png") > -1))
            return "png";

        if ((mediaType != null)
            && ((mediaType.indexOf("tiff") > -1) || (mediaType.indexOf("tif") > -1))) {
            return "tiff";
        }

        if ((bytes == null) || (bytes.length < 4))
            return null;

        // JPEG SOI + marker
        if ((bytes.length >= 3)
            && (bytes[0] == 0xFF)
            && (bytes[1] == 0xD8)
            && (bytes[2] == 0xFF)) {
            return "jpeg";
        }

        // PNG signature
        if ((bytes.length >= 8)
            && (bytes[0] == 0x89)
            && (bytes[1] == 0x50)
            && (bytes[2] == 0x4E)
            && (bytes[3] == 0x47)
            && (bytes[4] == 0x0D)
            && (bytes[5] == 0x0A)
            && (bytes[6] == 0x1A)
            && (bytes[7] == 0x0A)) {
            return "png";
        }

        // TIFF little-endian (II*\0) / big-endian (MM\0*)
        if (((bytes[0] == 0x49) && (bytes[1] == 0x49) && (bytes[2] == 0x2A) && (bytes[3] == 0x00))
            || ((bytes[0] == 0x4D) && (bytes[1] == 0x4D) && (bytes[2] == 0x00) && (bytes[3] == 0x2A))) {
            return "tiff";
        }

        return null;

    }

    /**
     * Resolve media-type from one known image format.
     * @param {"jpeg" | "png" | "tiff" | null} imageFormat Image format.
     * @returns {string | null} Media-type string.
     */
    static resolveImageMediaType(imageFormat = null) {

        if (imageFormat == "jpeg")
            return "image/jpeg";

        if (imageFormat == "png")
            return "image/png";

        if (imageFormat == "tiff")
            return "image/tiff";

        return null;

    }

    /**
     * Detect high-level imaging kind.
     * @param {Uint8Array | null} bytes Source bytes.
     * @param {string | object | null} contentType Content-type source.
     * @returns {"dicom" | "image" | "unknown"} Detected kind.
     */
    static detectImagingKind(bytes = null, contentType = null) {

        var mediaType = this.resolveMediaType(contentType);

        if ((mediaType != null) && ((mediaType.indexOf("dicom") > -1) || (mediaType.indexOf("application/dcm") > -1))) {
            return "dicom";
        }

        if (this.hasDicomPrefix(bytes) == true)
            return "dicom";

        if (this.detectImageFormat(bytes, contentType) != null)
            return "image";

        return "unknown";

    }

    /**
     * Build parsed content-type metadata with optional source metadata.
     * @param {string | object | null} contentType Content-type source.
     * @param {string | null} sourcePath Optional source path.
     * @param {string | null} fileName Optional source file name.
     * @returns {object} Parsed content-type metadata.
     */
    static buildContentType(contentType = null, sourcePath = null, fileName = null) {

        var parsed = this.parseContentType(contentType);

        if ((sourcePath != null) && (typeof sourcePath === "string")) {
            parsed.sourcePath = sourcePath;
        }

        if ((fileName != null) && (typeof fileName === "string")) {
            parsed.fileName = fileName;
        }

        return parsed;

    }

}
