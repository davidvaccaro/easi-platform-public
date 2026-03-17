//
// OpenJpegRuntime.js - 1.0.0
//
// OpenJPEG Runtime Resolver
//

export default class OpenJpegRuntime {

    /**
     * Determine whether one value is promise-like.
     * @param {*} value The value to evaluate.
     * @returns {boolean} TRUE when thenable.
     */
    static isThenable(value) {
        return ((value != null) && (typeof value.then == "function"));
    }

    /**
     * Normalize one factory value.
     * @param {*} value Candidate factory value.
     * @returns {Function | null} Factory function.
     */
    static normalizeFactory(value) {

        var candidates = [
            value,
            value?.default,
            value?.["module.exports"],
            value?.default?.default,
            value?.default?.["module.exports"],
            value?.["module.exports"]?.default
        ];

        for (var i = 0; i < candidates.length; i++) {
            if (typeof candidates[i] == "function")
                return candidates[i];
        }

        return null;

    }

    /**
     * Set the shared OpenJPEG module instance.
     * @param {object | null} module OpenJPEG module.
     */
    static setModule(module) {
        OpenJpegRuntime.module = module ?? null;
        OpenJpegRuntime.modulePromise = null;
    }

    /**
     * Set the shared OpenJPEG factory.
     * @param {Function | object | null} factory OpenJPEG factory.
     */
    static setFactory(factory) {
        OpenJpegRuntime.factory = OpenJpegRuntime.normalizeFactory(factory);
        OpenJpegRuntime.modulePromise = null;
    }

    /**
     * Clear shared runtime state.
     */
    static clear() {
        OpenJpegRuntime.module = null;
        OpenJpegRuntime.factory = null;
        OpenJpegRuntime.modulePromise = null;
    }

    /**
     * Resolve an OpenJPEG module synchronously.
     * If only async factory is available this returns null.
     * @param {object | null} options Resolution options.
     * @returns {object | null} OpenJPEG module.
     */
    static resolveSync(options = null) {

        var explicitModule = options?.openjpegModule ?? null;
        if (explicitModule != null)
            return explicitModule;

        if (OpenJpegRuntime.module != null)
            return OpenJpegRuntime.module;

        var globalModule = globalThis?.EASIOpenJPEGModule ?? null;
        if (globalModule != null) {
            OpenJpegRuntime.module = globalModule;
            return OpenJpegRuntime.module;
        }

        var factory = OpenJpegRuntime.normalizeFactory(
            options?.openjpegFactory ??
            OpenJpegRuntime.factory ??
            globalThis?.EASIOpenJPEGFactory ??
            null
        );

        if (factory == null)
            return null;

        var resolved = factory(options?.openjpegModuleOptions ?? {});
        if (OpenJpegRuntime.isThenable(resolved) == true)
            return null;

        OpenJpegRuntime.module = resolved ?? null;
        return OpenJpegRuntime.module;

    }

    /**
     * Resolve an OpenJPEG module asynchronously.
     * @param {object | null} options Resolution options.
     * @returns {Promise<object | null>} OpenJPEG module.
     */
    static async resolve(options = null) {

        var sync = OpenJpegRuntime.resolveSync(options);
        if (sync != null)
            return sync;

        var factory = OpenJpegRuntime.normalizeFactory(
            options?.openjpegFactory ??
            OpenJpegRuntime.factory ??
            globalThis?.EASIOpenJPEGFactory ??
            null
        );

        if (factory == null)
            return null;

        // Keep explicit per-call factories isolated from shared cache.
        if (options?.openjpegFactory != null) {
            var direct = factory(options?.openjpegModuleOptions ?? {});
            return OpenJpegRuntime.isThenable(direct) ? await direct : direct;
        }

        if (OpenJpegRuntime.modulePromise == null) {
            OpenJpegRuntime.modulePromise = Promise.resolve(
                factory(options?.openjpegModuleOptions ?? {})
            );
        }

        OpenJpegRuntime.module = await OpenJpegRuntime.modulePromise;
        return OpenJpegRuntime.module;

    }

};

OpenJpegRuntime.module = null;
OpenJpegRuntime.factory = null;
OpenJpegRuntime.modulePromise = null;
