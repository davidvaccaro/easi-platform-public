//
// FolderStreamReader.js
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
import { Status } from "../parsers/Status.js";
import FileStreamReader from "./FileStreamReader.js";
import ImagingDataUtils from "../utils/ImagingDataUtils.js";

export default class FolderStreamReader {

    /**
     * Load a Node module in a runtime-compatible way.
     * @param {string} moduleName The Node module name.
     * @returns {Promise<any>} The loaded module.
     */
    async loadNodeModule(moduleName) {

        try {
            if (typeof require === "function") {
                return require(moduleName);
            }
        }
        catch (_error) {
        }

        try {
            return await import(moduleName);
        }
        catch (error) {
            throw new Exception("FolderStreamReader requires a Node.js runtime.", GeneralErrorCodes.NotImplemented, error);
        }

    }

    /**
     * Normalize one extension filter value to dotted lowercase form.
     * @param {string} extension Extension value.
     * @returns {string | null} Normalized extension.
     */
    normalizeExtension(extension) {

        if ((extension == null) || (typeof extension !== "string"))
            return null;

        var trimmed = extension.trim().toLowerCase();
        if (trimmed.length == 0)
            return null;

        if (trimmed.startsWith(".") == false) {
            trimmed = `.${trimmed}`;
        }

        return trimmed;

    }

    /**
     * Normalize extension filter list.
     * @param {Array<string> | string | null} extensions Extension filter values.
     * @returns {Set<string> | null} Normalized extension set.
     */
    normalizeExtensions(extensions = null) {

        if (extensions == null)
            return null;

        var values = Array.isArray(extensions) ? extensions : [extensions];
        var set = new Set();

        for (var i = 0; i < values.length; i++) {
            var normalized = this.normalizeExtension(values[i]);
            if (normalized != null) {
                set.add(normalized);
            }
        }

        return (set.size > 0) ? set : null;

    }

    /**
     * Determine whether one file name appears hidden.
     * @param {string} name File name.
     * @returns {boolean} TRUE when hidden.
     */
    isHiddenName(name) {
        return ((typeof name == "string") && (name.length > 1) && (name.startsWith(".")));
    }

    /**
     * Determine whether one file path matches extension filter.
     * @param {string} filePath File path.
     * @param {Set<string> | null} extensionSet Extension filter set.
     * @returns {boolean} TRUE when included.
     */
    matchesExtension(filePath, extensionSet = null) {

        if (extensionSet == null)
            return true;

        var lower = String(filePath || "").toLowerCase();
        for (var extension of extensionSet) {
            if (lower.endsWith(extension)) {
                return true;
            }
        }

        return false;

    }

    /**
     * Normalize folder read options.
     * @param {object | null} options Read options.
     * @returns {{ recursive: boolean, includeHidden: boolean, extensions: Set<string> | null, maxFiles: number, sort: "name" | "mtime" | "none", continueOnError: boolean, onEmit: Function | null }} Normalized options.
     */
    normalizeOptions(options = null) {

        var recursive = (options?.recursive === true);
        var includeHidden = (options?.includeHidden === true);
        var maxFiles = Number(options?.maxFiles ?? 0);
        var sort = String(options?.sort ?? "name").toLowerCase().trim();

        if ((sort != "name") && (sort != "mtime") && (sort != "none")) {
            sort = "name";
        }

        if ((Number.isFinite(maxFiles) == false) || (maxFiles < 0)) {
            maxFiles = 0;
        }
        else {
            maxFiles = Math.floor(maxFiles);
        }

        var onEmit = null;
        if ((options != null) && (Object.prototype.hasOwnProperty.call(options, "onEmit") == true)) {
            onEmit = options.onEmit;
            if ((onEmit != null) && (typeof onEmit !== "function")) {
                throw new Exception('Invalid "onEmit" option. Expected function or null.', GeneralErrorCodes.InvalidParameter);
            }
        }
        else {
            onEmit = this.onPart;
        }

        return {
            recursive: recursive,
            includeHidden: includeHidden,
            extensions: this.normalizeExtensions(options?.extensions ?? null),
            maxFiles: maxFiles,
            sort: sort,
            continueOnError: (options?.continueOnError === true),
            onEmit: onEmit
        };

    }

    /**
     * Read one source directory recursively.
     * @param {string} rootPath Root path.
     * @param {object} options Normalized folder options.
     * @returns {Promise<Array<{ path: string, stat: any }>>} File descriptors.
     */
    async enumerateFiles(rootPath, options) {

        var fsPromises = await this.loadNodeModule("node:fs/promises");
        var path = await this.loadNodeModule("node:path");

        var stats = await fsPromises.stat(rootPath);
        if (stats.isDirectory() != true) {
            throw new Exception("Invalid folder source. Expected a directory path.", GeneralErrorCodes.InvalidParameter);
        }

        var files = [];

        const walk = async (currentPath) => {

            var entries = await fsPromises.readdir(currentPath, { withFileTypes: true });

            for (var i = 0; i < entries.length; i++) {

                var entry = entries[i];
                if ((options.includeHidden == false) && (this.isHiddenName(entry.name) == true)) {
                    continue;
                }

                var resolved = path.join(currentPath, entry.name);

                if (entry.isDirectory() == true) {
                    if (options.recursive == true) {
                        await walk(resolved);
                    }
                    continue;
                }

                if (entry.isFile() != true)
                    continue;

                if (this.matchesExtension(resolved, options.extensions) == false)
                    continue;

                var stat = await fsPromises.stat(resolved);
                files.push({
                    path: resolved,
                    stat: stat
                });

                if ((options.maxFiles > 0) && (files.length >= options.maxFiles)) {
                    return;
                }

            }

        };

        await walk(rootPath);

        if (options.sort == "mtime") {
            files.sort((a, b) => (a.stat.mtimeMs - b.stat.mtimeMs));
        }
        else if (options.sort == "name") {
            files.sort((a, b) => a.path.localeCompare(b.path));
        }

        return files;

    }

    /**
     * Build per-file read options sent to the delegated file reader.
     * @param {string} filePath File path.
     * @param {object | null} options Read options.
     * @returns {object | null} Delegated read options.
     */
    buildPerFileReadOptions(filePath, options = null) {

        var delegated = Object.assign({}, options || {});
        delete delegated.recursive;
        delete delegated.includeHidden;
        delete delegated.extensions;
        delete delegated.maxFiles;
        delete delegated.sort;
        delete delegated.continueOnError;
        delete delegated.onEmit;

        var pathModule = this._pathModule;
        var fileName = ((pathModule != null) && (typeof pathModule.basename == "function"))
            ? pathModule.basename(filePath)
            : null;

        var baseContentType = delegated.contentType;
        if (baseContentType == null) {
            baseContentType = this._fileReader.inferContentType(filePath);
        }

        delegated.contentType = ImagingDataUtils.buildContentType(baseContentType, filePath, fileName);

        return delegated;

    }

    /**
     * Read one folder source.
     * @param {string} source The folder path.
     * @param {object | null} options Folder read options.
     * @returns {Promise<Array<*>>} Collection of parsed file results.
     */
    async read(source, options = null) {

        if ((source == null) || (typeof source !== "string") || (source.length == 0)) {
            throw new Exception("Invalid folder source. Expected folder path string.", GeneralErrorCodes.InvalidParameter);
        }

        if (this._pathModule == null) {
            this._pathModule = await this.loadNodeModule("node:path");
        }

        var normalized = this.normalizeOptions(options);
        var files = await this.enumerateFiles(source, normalized);
        var results = [];

        for (var i = 0; i < files.length; i++) {

            var file = files[i];

            try {

                var perFileOptions = this.buildPerFileReadOptions(file.path, options);
                var result = await this._fileReader.read(file.path, perFileOptions);

                if (normalized.onEmit != null) {
                    var emitStatus = await normalized.onEmit(result);

                    if (emitStatus === Status.FAIL) {
                        throw new Exception("Failed processing emitted result.", GeneralErrorCodes.GeneralError);
                    }

                    if (emitStatus === Status.STOP) {
                        results.push(result);
                        break;
                    }

                    if (emitStatus === Status.JUMP) {
                        continue;
                    }

                }

                results.push(result);

            }
            catch (error) {

                if (normalized.continueOnError == true) {
                    continue;
                }

                throw error;

            }

        }

        return results;

    }

    /**
     * Set the current parser.
     * @param {DataParser} parser The parser.
     */
    set parser(parser) {
        this._fileReader.parser = parser;
    }

    /**
     * Get the current parser.
     * @returns {DataParser} The parser.
     */
    get parser() {
        return this._fileReader.parser;
    }

    /**
     * Set the onPart callback.
     * @param {Function | null} onPart The onPart callback.
     */
    set onPart(onPart) {
        this._onPart = onPart;
    }

    /**
     * Get the onPart callback.
     * @returns {Function | null} The onPart callback.
     */
    get onPart() {
        return this._onPart;
    }

    /**
     * Create one folder stream reader.
     * @param {FileStreamReader | null} fileReader Optional file-stream reader.
     */
    constructor(fileReader = null) {
        this._fileReader = (fileReader != null) ? fileReader : new FileStreamReader();
        this._onPart = null;
        this._pathModule = null;
    }

}
