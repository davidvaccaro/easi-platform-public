//
// FileStreamReader.js
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

import Exception from '../environment/Exception.js';
import { GeneralErrorCodes } from '../environment/Exception.js';
import PartStreamReader from './PartStreamReader.js';
import NodeStreamAdapterReader from './NodeStreamAdapterReader.js';
import ImagingDataUtils from '../utils/ImagingDataUtils.js';

export default class FileStreamReader {

    /**
     * Load a Node module in a runtime-compatible way.
     * @param {string} moduleName The Node module name.
     * @returns {Promise<any>} The loaded module.
     */
    async loadNodeModule(moduleName) {

        try {
            if (typeof require === 'function') {
                return require(moduleName);
            }
        }
        catch (err) {
        }

        try {
            return await import(moduleName);
        }
        catch (err) {
            throw new Exception('FileStreamReader requires a Node.js runtime.', GeneralErrorCodes.NotImplemented, err);
        }

    }

    /**
     * Infer a content-type value from file path extension.
     * @param {string} filePath The file path.
     * @returns {string} The inferred content-type.
     */
    inferContentType(filePath) {

        var lower = String(filePath || '').toLowerCase();

        if (lower.endsWith('.json'))
            return 'application/dicom+json';

        if (lower.endsWith('.jpg') || lower.endsWith('.jpeg'))
            return 'image/jpeg';

        if (lower.endsWith('.png'))
            return 'image/png';

        if (lower.endsWith('.tif') || lower.endsWith('.tiff'))
            return 'image/tiff';

        if (lower.endsWith('.gif'))
            return 'image/gif';

        if (lower.endsWith('.pdf'))
            return 'application/pdf';

        if (lower.endsWith('.htm') || lower.endsWith('.html'))
            return 'text/html';

        if (lower.endsWith('.doc'))
            return 'application/msword';

        if (lower.endsWith('.docx'))
            return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

        if (lower.endsWith('.stl'))
            return 'model/stl';

        if (lower.endsWith('.obj'))
            return 'model/obj';

        if (lower.endsWith('.mtl'))
            return 'model/mtl';

        if (lower.endsWith('.xml'))
            return 'application/dicom+xml';

        return 'application/dicom';

    }

    /**
     * Read one file-like browser source.
     * @param {object} file The browser File/Blob-like object.
     * @param {{ contentType?: string | object, contentLength?: number | string | null, onEmit?: Function | null } | null} options Optional read options.
     * @returns {Promise<object>} The parser result.
     */
    async readBrowserFile(file, options = null) {

        if ((file != null) && (typeof file.stream === 'function')) {
            var streamOptions = {
                contentType: (options?.contentType != null) ? options.contentType : (file.type || 'application/dicom'),
                contentLength: (options?.contentLength != null) ? options.contentLength : (file.size ?? null)
            };

            if ((options != null) && (Object.prototype.hasOwnProperty.call(options, 'onEmit') == true)) {
                streamOptions.onEmit = options.onEmit;
            }

            return this._partReader.readStream(file.stream(), streamOptions);
        }

        if ((file != null) && (typeof file.arrayBuffer === 'function')) {
            var bytes = new Uint8Array(await file.arrayBuffer());
            return this._partReader.readData(bytes);
        }

        throw new Exception('Invalid file source. Expected path string, File, or Blob.', GeneralErrorCodes.InvalidParameter);

    }

    /**
     * Read one Node file path source.
     * @param {string} filePath The file path.
     * @param {{ contentType?: string | object, contentLength?: number | string | null, onEmit?: Function | null } | null} options Optional read options.
     * @returns {Promise<object>} The parser result.
     */
    async readNodeFile(filePath, options = null) {

        var fs = await this.loadNodeModule('node:fs');
        var fsPromises = await this.loadNodeModule('node:fs/promises');
        var path = await this.loadNodeModule('node:path');

        var stat = await fsPromises.stat(filePath);
        var stream = fs.createReadStream(filePath);
        var inferredContentType = this.inferContentType(filePath);
        var contentType = (options?.contentType != null) ? options.contentType : inferredContentType;

        var streamOptions = {
            contentType: ImagingDataUtils.buildContentType(
                contentType,
                filePath,
                path.basename(filePath)
            ),
            contentLength: (options?.contentLength != null) ? options.contentLength : stat.size
        };

        if ((options != null) && (Object.prototype.hasOwnProperty.call(options, 'onEmit') == true)) {
            streamOptions.onEmit = options.onEmit;
        }

        return this._nodeStreamReader.read(stream, streamOptions);

    }

    /**
     * Read one file source.
     * @param {string | object} source File path string or browser File/Blob-like object.
     * @param {{ contentType?: string | object, contentLength?: number | string | null, onEmit?: Function | null } | null} options Optional read options.
     * @returns {Promise<object>} The parser result.
     */
    read(source, options = null) {

        if (typeof source === 'string') {
            return this.readNodeFile(source, options);
        }

        return this.readBrowserFile(source, options);

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
     * Create one file stream reader.
     * @param {PartStreamReader | null} partReader Optional part reader.
     */
    constructor(partReader = null) {
        this._partReader = (partReader != null) ? partReader : new PartStreamReader();
        this._nodeStreamReader = new NodeStreamAdapterReader(this._partReader);
    }

}
