//
// JpegLsRuntime.js - 1.0.0
//
// JPEG-LS Runtime Resolver
//

export default class JpegLsRuntime {

    /**
     * Determine whether one value is promise-like.
     * @param {*} value Candidate value.
     * @returns {boolean} TRUE when value is thenable.
     */
    static isThenable(value) {
        return ((value != null) && (typeof value.then == "function"));
    }

    /**
     * Normalize one runtime factory candidate.
     * @param {*} value Candidate value.
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
     * Set the shared JPEG-LS module instance.
     * @param {object | null} module JPEG-LS module.
     */
    static setModule(module) {
        JpegLsRuntime.module = module ?? null;
        JpegLsRuntime.modulePromise = null;
    }

    /**
     * Set the shared JPEG-LS factory.
     * @param {Function | object | null} factory JPEG-LS factory.
     */
    static setFactory(factory) {
        JpegLsRuntime.factory = JpegLsRuntime.normalizeFactory(factory);
        JpegLsRuntime.modulePromise = null;
    }

    /**
     * Clear shared runtime cache.
     */
    static clear() {
        JpegLsRuntime.module = null;
        JpegLsRuntime.factory = null;
        JpegLsRuntime.modulePromise = null;
    }

    /**
     * Resolve one JPEG-LS module synchronously.
     * If only async factory is available, returns null.
     * @param {object | null} options Resolution options.
     * @returns {object | null} JPEG-LS module.
     */
    static resolveSync(options = null) {

        var explicitModule = options?.jpeglsModule ?? null;
        if (explicitModule != null)
            return explicitModule;

        if (JpegLsRuntime.module != null)
            return JpegLsRuntime.module;

        var globalModule = (globalThis?.EASIJpegLsModule ?? globalThis?.EASIJPEGLSModule ?? null);
        if (globalModule != null) {
            JpegLsRuntime.module = globalModule;
            return JpegLsRuntime.module;
        }

        var factory = JpegLsRuntime.normalizeFactory(
            options?.jpeglsFactory
            ?? JpegLsRuntime.factory
            ?? globalThis?.EASIJpegLsFactory
            ?? globalThis?.EASIJPEGLSFactory
            ?? null
        );

        if (factory == null)
            return null;

        var resolved = factory(options?.jpeglsModuleOptions ?? {});
        if (JpegLsRuntime.isThenable(resolved) == true)
            return null;

        JpegLsRuntime.module = resolved ?? null;
        return JpegLsRuntime.module;

    }

    /**
     * Resolve one JPEG-LS module asynchronously.
     * @param {object | null} options Resolution options.
     * @returns {Promise<object | null>} JPEG-LS module.
     */
    static async resolve(options = null) {

        var sync = JpegLsRuntime.resolveSync(options);
        if (sync != null)
            return sync;

        var factory = JpegLsRuntime.normalizeFactory(
            options?.jpeglsFactory
            ?? JpegLsRuntime.factory
            ?? globalThis?.EASIJpegLsFactory
            ?? globalThis?.EASIJPEGLSFactory
            ?? null
        );

        if (factory == null)
            return null;

        // Keep explicit per-call factories isolated from shared cache.
        if (options?.jpeglsFactory != null) {
            var direct = factory(options?.jpeglsModuleOptions ?? {});
            return JpegLsRuntime.isThenable(direct) ? await direct : direct;
        }

        if (JpegLsRuntime.modulePromise == null) {
            JpegLsRuntime.modulePromise = Promise.resolve(
                factory(options?.jpeglsModuleOptions ?? {})
            );
        }

        JpegLsRuntime.module = await JpegLsRuntime.modulePromise;
        return JpegLsRuntime.module;

    }

};

JpegLsRuntime.module = null;
JpegLsRuntime.factory = null;
JpegLsRuntime.modulePromise = null;
