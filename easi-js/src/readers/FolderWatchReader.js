//
// FolderWatchReader.js
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
import FileStreamReader from "./FileStreamReader.js";
import ImagingDataUtils from "../utils/ImagingDataUtils.js";

export default class FolderWatchReader {

    /**
     * Indicates this reader is source-bound.
     * @returns {boolean} TRUE.
     */
    get isSourceBound() {
        return true;
    }

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
            throw new Exception("FolderWatchReader requires a Node.js runtime.", GeneralErrorCodes.NotImplemented, error);
        }

    }

    /**
     * Sleep for the specified interval.
     * @param {number} milliseconds The interval in milliseconds.
     * @returns {Promise<void>} A promise that resolves after the interval.
     */
    async sleep(milliseconds) {

        if (milliseconds <= 0)
            return;

        await new Promise((resolve) => setTimeout(resolve, milliseconds));

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
     * Normalize folder watch options.
     * @param {object | null} options Raw options.
     * @returns {{ recursive: boolean, includeHidden: boolean, extensions: Set<string> | null, processExistingOnStart: boolean, settleMs: number, stableChecks: number, dedupeWindowMs: number, reconcileIntervalMs: number, maxQueue: number, overflow: "fail" | "drop-oldest" | "drop-newest" }} Normalized options.
     */
    normalizeWatchOptions(options = null) {

        var settleMs = Math.max(0, Math.trunc(Number(options?.settleMs ?? 200)));
        var stableChecks = Math.max(1, Math.trunc(Number(options?.stableChecks ?? 2)));
        var dedupeWindowMs = Math.max(0, Math.trunc(Number(options?.dedupeWindowMs ?? 500)));
        var reconcileIntervalMs = Math.max(0, Math.trunc(Number(options?.reconcileIntervalMs ?? 1000)));
        var maxQueue = Math.max(0, Math.trunc(Number(options?.maxQueue ?? 0)));

        var overflow = String(options?.overflow ?? "fail").toLowerCase().trim();
        if ((overflow != "fail") && (overflow != "drop-oldest") && (overflow != "drop-newest")) {
            throw new Exception(
                "Invalid folder watch overflow mode. Expected 'fail', 'drop-oldest', or 'drop-newest'.",
                GeneralErrorCodes.InvalidParameter
            );
        }

        return {
            recursive: (options?.recursive === true),
            includeHidden: (options?.includeHidden === true),
            extensions: this.normalizeExtensions(options?.extensions ?? null),
            processExistingOnStart: (options?.processExistingOnStart === true),
            settleMs: settleMs,
            stableChecks: stableChecks,
            dedupeWindowMs: dedupeWindowMs,
            reconcileIntervalMs: reconcileIntervalMs,
            maxQueue: maxQueue,
            overflow: overflow
        };

    }

    /**
     * Ensure Node filesystem modules are loaded.
     */
    async ensureNodeModules() {

        if (this._fs == null) {
            this._fs = await this.loadNodeModule("node:fs");
        }

        if (this._fsPromises == null) {
            this._fsPromises = await this.loadNodeModule("node:fs/promises");
        }

        if (this._path == null) {
            this._path = await this.loadNodeModule("node:path");
        }

    }

    /**
     * Assert one source is a directory path.
     * @param {string} source Directory path.
     */
    async assertDirectory(source) {

        if ((source == null) || (typeof source !== "string") || (source.length == 0)) {
            throw new Exception("Invalid folder watch source. Expected directory path string.", GeneralErrorCodes.InvalidParameter);
        }

        var stat = await this._fsPromises.stat(source);
        if (stat.isDirectory() != true) {
            throw new Exception("Invalid folder watch source. Expected a directory path.", GeneralErrorCodes.InvalidParameter);
        }

    }

    /**
     * Enumerate current files for a directory scan.
     * @param {string} rootPath Directory path.
     * @param {object} options Normalized watch options.
     * @returns {Promise<Array<{ path: string, stat: any }>>} File descriptors.
     */
    async enumerateFiles(rootPath, options) {

        var files = [];

        const walk = async (currentPath) => {

            var entries = await this._fsPromises.readdir(currentPath, { withFileTypes: true });

            for (var i = 0; i < entries.length; i++) {

                var entry = entries[i];
                if ((options.includeHidden == false) && (this.isHiddenName(entry.name) == true)) {
                    continue;
                }

                var resolved = this._path.join(currentPath, entry.name);

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

                files.push({
                    path: resolved,
                    stat: await this._fsPromises.stat(resolved)
                });

            }

        };

        await walk(rootPath);
        return files;

    }

    /**
     * Flush queued file paths to pending read waiters.
     */
    flushReadWaiters() {

        while ((this._readWaiters.length > 0) && (this._queue.length > 0)) {
            var waiter = this._readWaiters.shift();
            var nextPath = this._queue.shift();
            this._queuedPathSet.delete(nextPath);
            waiter.resolve(nextPath);
        }

    }

    /**
     * Reject pending read waiters with the supplied error.
     * @param {Error} error The error.
     */
    rejectReadWaiters(error) {

        while (this._readWaiters.length > 0) {
            var waiter = this._readWaiters.shift();
            waiter.reject(error);
        }

    }

    /**
     * Prune stale dedupe markers.
     * @param {number} now Current timestamp.
     * @param {number} dedupeWindowMs Dedupe window.
     */
    pruneRecentMarkers(now, dedupeWindowMs) {

        if (this._recentPaths.size < 4096)
            return;

        var maxAge = Math.max(1000, dedupeWindowMs * 4);
        for (var [path, timestamp] of this._recentPaths.entries()) {
            if ((now - timestamp) > maxAge) {
                this._recentPaths.delete(path);
            }
        }

    }

    /**
     * Enqueue one file path according to queue policies.
     * @param {string} filePath File path.
     * @param {object} options Normalized watch options.
     */
    enqueuePath(filePath, options) {

        var now = Date.now();
        this.pruneRecentMarkers(now, options.dedupeWindowMs);

        var lastSeen = this._recentPaths.get(filePath);
        if ((lastSeen != null) && ((now - lastSeen) < options.dedupeWindowMs))
            return;

        this._recentPaths.set(filePath, now);

        if (this._queuedPathSet.has(filePath) == true)
            return;

        if ((options.maxQueue > 0) && (this._queue.length >= options.maxQueue)) {

            if (options.overflow == "drop-oldest") {
                var dropped = this._queue.shift();
                this._queuedPathSet.delete(dropped);
            }
            else if (options.overflow == "drop-newest") {
                return;
            }
            else {
                throw new Exception("Folder watch queue overflow.", GeneralErrorCodes.GeneralError);
            }

        }

        this._queue.push(filePath);
        this._queuedPathSet.add(filePath);
        this.flushReadWaiters();

    }

    /**
     * Handle background watch errors.
     * @param {Error} error Background error.
     */
    handleBackgroundError(error) {

        this._fatalError = error;
        this.rejectReadWaiters(error);

    }

    /**
     * Determine whether one fs.watch error is recoverable.
     * Recoverable errors disable native watch hooks but keep reconcile scanning active.
     * @param {Error | null} error Candidate error.
     * @returns {boolean} TRUE when recoverable.
     */
    isRecoverableWatchError(error) {

        var code = String(error?.code ?? "").toUpperCase();
        return (
            (code == "EMFILE")
            || (code == "ENOSPC")
            || (code == "ERR_FEATURE_UNAVAILABLE_ON_PLATFORM")
            || (code == "ERR_FEATURE_UNAVAILABLE_ON_PLATFORM_FOR_WORKER")
        );

    }

    /**
     * Scan the directory tree and enqueue detected new/changed files.
     * @param {boolean} includeExisting Indicates existing files should be enqueued.
     */
    async scanAndQueue(includeExisting = false) {

        if (this._running != true)
            return;

        var options = this._activeWatchOptions;
        var files = await this.enumerateFiles(this._activeSource, options);
        var seenPaths = new Set();

        for (var i = 0; i < files.length; i++) {

            var file = files[i];
            seenPaths.add(file.path);

            var prior = this._knownFiles.get(file.path);
            var hasChanged = (
                (prior == null)
                || (prior.size !== file.stat.size)
                || (prior.mtimeMs !== file.stat.mtimeMs)
            );

            this._knownFiles.set(file.path, {
                size: file.stat.size,
                mtimeMs: file.stat.mtimeMs
            });

            if ((includeExisting == true) || (hasChanged == true)) {
                this.enqueuePath(file.path, options);
            }

        }

        for (var knownPath of this._knownFiles.keys()) {
            if (seenPaths.has(knownPath) == false) {
                this._knownFiles.delete(knownPath);
            }
        }

    }

    /**
     * Determine whether one path should be ignored before stat/open.
     * @param {string} filePath Candidate file path.
     * @param {object} options Normalized watch options.
     * @returns {boolean} TRUE when path should be ignored.
     */
    shouldIgnorePath(filePath, options) {

        var name = this._path.basename(filePath);
        if ((options.includeHidden == false) && (this.isHiddenName(name) == true))
            return true;

        if (this.matchesExtension(filePath, options.extensions) == false)
            return true;

        return false;

    }

    /**
     * Resolve one stable file stat snapshot.
     * @param {string} filePath Candidate file path.
     * @param {object} options Normalized watch options.
     * @returns {Promise<object | null>} Stable stat or null when unavailable.
     */
    async resolveStableStat(filePath, options) {

        var lastSnapshot = null;
        var stableCount = 0;

        for (var i = 0; i < options.stableChecks; i++) {

            var stat = null;
            try {
                stat = await this._fsPromises.stat(filePath);
            }
            catch (_error) {
                return null;
            }

            if (stat.isFile() != true)
                return null;

            if ((lastSnapshot != null)
                && (lastSnapshot.size == stat.size)
                && (lastSnapshot.mtimeMs == stat.mtimeMs)) {
                stableCount += 1;
            }
            else {
                stableCount = 1;
            }

            lastSnapshot = {
                size: stat.size,
                mtimeMs: stat.mtimeMs
            };

            if (stableCount >= options.stableChecks) {
                return stat;
            }

            if ((i + 1) < options.stableChecks) {
                await this.sleep(options.settleMs);
            }

        }

        return null;

    }

    /**
     * Check one changed path and enqueue when stable and changed.
     * @param {string} filePath Candidate file path.
     */
    async checkPathAndQueue(filePath) {

        if (this._running != true)
            return;

        var options = this._activeWatchOptions;
        if (this.shouldIgnorePath(filePath, options) == true)
            return;

        var stat = await this.resolveStableStat(filePath, options);
        if (stat == null)
            return;

        var prior = this._knownFiles.get(filePath);
        var hasChanged = (
            (prior == null)
            || (prior.size !== stat.size)
            || (prior.mtimeMs !== stat.mtimeMs)
        );

        this._knownFiles.set(filePath, {
            size: stat.size,
            mtimeMs: stat.mtimeMs
        });

        if (hasChanged == true) {
            this.enqueuePath(filePath, options);
        }

    }

    /**
     * Schedule one full directory rescan.
     */
    scheduleRescan() {

        if (this._running != true)
            return;

        if (this._rescanTimer != null)
            return;

        this._rescanTimer = setTimeout(async () => {
            this._rescanTimer = null;
            try {
                await this.scanAndQueue(false);
            }
            catch (error) {
                this.handleBackgroundError(error);
            }
        }, this._activeWatchOptions.settleMs);

    }

    /**
     * Schedule one path-level check after settle delay.
     * @param {string} filePath Candidate file path.
     */
    schedulePathCheck(filePath) {

        if (this._running != true)
            return;

        if (this._pathTimers.has(filePath) == true) {
            clearTimeout(this._pathTimers.get(filePath));
        }

        var timer = setTimeout(async () => {
            this._pathTimers.delete(filePath);
            try {
                await this.checkPathAndQueue(filePath);
            }
            catch (error) {
                this.handleBackgroundError(error);
            }
        }, this._activeWatchOptions.settleMs);

        this._pathTimers.set(filePath, timer);

    }

    /**
     * Start underlying fs watcher(s) when supported.
     */
    startFsWatchers() {

        try {
            var watcher = this._fs.watch(
                this._activeSource,
                {
                    recursive: this._activeWatchOptions.recursive
                },
                (_eventType, filename) => {
                    if (this._running != true)
                        return;

                    if ((filename == null) || (String(filename).length == 0)) {
                        this.scheduleRescan();
                        return;
                    }

                    var candidatePath = this._path.join(this._activeSource, String(filename));
                    this.schedulePathCheck(candidatePath);
                }
            );

            if ((watcher != null) && (typeof watcher.on === "function")) {
                watcher.on("error", (error) => {
                    if (this.isRecoverableWatchError(error) == true) {
                        try {
                            watcher.close();
                        }
                        catch (_closeError) {
                        }
                        return;
                    }
                    this.handleBackgroundError(error);
                });
            }

            this._watchers.push(watcher);
        }
        catch (_error) {
            // fs.watch support varies by OS/filesystem. Reconcile scanning remains active.
        }

    }

    /**
     * Build per-file read options for delegated file reader.
     * @param {string} filePath File path.
     * @param {object | null} options Read options.
     * @returns {object} Delegated read options.
     */
    buildPerFileReadOptions(filePath, options = null) {

        var delegated = Object.assign({}, options || {});
        delete delegated.recursive;
        delete delegated.includeHidden;
        delete delegated.extensions;
        delete delegated.processExistingOnStart;
        delete delegated.settleMs;
        delete delegated.stableChecks;
        delete delegated.dedupeWindowMs;
        delete delegated.reconcileIntervalMs;
        delete delegated.maxQueue;
        delete delegated.overflow;
        delete delegated.onEmit;

        var fileName = this._path.basename(filePath);
        var baseContentType = delegated.contentType;
        if (baseContentType == null) {
            baseContentType = this._fileReader.inferContentType(filePath);
        }

        delegated.contentType = ImagingDataUtils.buildContentType(baseContentType, filePath, fileName);
        return delegated;

    }

    /**
     * Start one source-bound folder watch lifecycle.
     * @param {string | null} source Folder source path.
     * @param {object | null} options Watch/read options.
     * @returns {Promise<object>} Listener metadata.
     */
    async start(source = null, options = null) {

        await this.ensureNodeModules();

        var resolvedSource = (source != null) ? source : this._source;
        await this.assertDirectory(resolvedSource);

        this._activeSource = resolvedSource;
        this._activeReadOptions = options;
        this._activeWatchOptions = this.normalizeWatchOptions(options);
        this._fatalError = null;
        this._running = true;
        this._stopping = false;

        this._queue = [];
        this._queuedPathSet.clear();
        this._knownFiles.clear();
        this._recentPaths.clear();

        if (this._activeWatchOptions.processExistingOnStart === true) {
            await this.scanAndQueue(true);
        }
        else {
            await this.scanAndQueue(false);
            this._queue = [];
            this._queuedPathSet.clear();
        }

        this.startFsWatchers();

        if (this._activeWatchOptions.reconcileIntervalMs > 0) {
            this._reconcileTimer = setInterval(() => {
                this.scanAndQueue(false).catch((error) => {
                    this.handleBackgroundError(error);
                });
            }, this._activeWatchOptions.reconcileIntervalMs);
        }

        return {
            source: this._activeSource
        };

    }

    /**
     * Await the next queued file path.
     * @returns {Promise<string>} Next file path.
     */
    async nextQueuedPath() {

        if (this._fatalError != null) {
            throw this._fatalError;
        }

        if (this._queue.length > 0) {
            var path = this._queue.shift();
            this._queuedPathSet.delete(path);
            return path;
        }

        return new Promise((resolve, reject) => {
            this._readWaiters.push({ resolve, reject });
        });

    }

    /**
     * Read the next queued file transaction.
     * @param {string | null} _source Source value (ignored in active watch lifecycle).
     * @param {object | null} options Read options.
     * @returns {Promise<object>} Parser result.
     */
    async read(_source = null, options = null) {

        if (this._running != true) {
            throw new Exception("Folder watcher is not running. Start the pipeline listener first.", GeneralErrorCodes.InvalidParameter);
        }

        var filePath = await this.nextQueuedPath();
        var perFileOptions = this.buildPerFileReadOptions(
            filePath,
            (options != null) ? options : this._activeReadOptions
        );

        return this._fileReader.read(filePath, perFileOptions);

    }

    /**
     * Stop folder watch lifecycle.
     */
    async stop() {

        if (this._running != true)
            return;

        this._stopping = true;
        this._running = false;

        if (this._reconcileTimer != null) {
            clearInterval(this._reconcileTimer);
            this._reconcileTimer = null;
        }

        if (this._rescanTimer != null) {
            clearTimeout(this._rescanTimer);
            this._rescanTimer = null;
        }

        for (var timer of this._pathTimers.values()) {
            clearTimeout(timer);
        }
        this._pathTimers.clear();

        for (var i = 0; i < this._watchers.length; i++) {
            var watcher = this._watchers[i];
            if ((watcher != null) && (typeof watcher.close === "function")) {
                try {
                    watcher.close();
                }
                catch (_error) {
                }
            }
        }
        this._watchers = [];

        this._queue = [];
        this._queuedPathSet.clear();

        this.rejectReadWaiters(
            new Exception("Folder watcher stopped.", GeneralErrorCodes.GeneralError)
        );

        this._stopping = false;

    }

    /**
     * Set the parser.
     * @param {object} parser The parser.
     */
    set parser(parser) {
        this._fileReader.parser = parser;
    }

    /**
     * Get the parser.
     * @returns {object} The parser.
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
        this._fileReader.onPart = onPart;
    }

    /**
     * Get the onPart callback.
     * @returns {Function | null} The onPart callback.
     */
    get onPart() {
        return this._onPart;
    }

    /**
     * Create one folder watch reader.
     * @param {string | null} source Default folder source path.
     * @param {FileStreamReader | null} fileReader Optional delegated file reader.
     */
    constructor(source = null, fileReader = null) {
        this._source = source;
        this._fileReader = (fileReader != null) ? fileReader : new FileStreamReader();
        this._onPart = null;

        this._fs = null;
        this._fsPromises = null;
        this._path = null;

        this._running = false;
        this._stopping = false;
        this._fatalError = null;

        this._activeSource = null;
        this._activeReadOptions = null;
        this._activeWatchOptions = null;

        this._watchers = [];
        this._reconcileTimer = null;
        this._rescanTimer = null;
        this._pathTimers = new Map();

        this._queue = [];
        this._queuedPathSet = new Set();
        this._readWaiters = [];
        this._knownFiles = new Map();
        this._recentPaths = new Map();
    }

}
