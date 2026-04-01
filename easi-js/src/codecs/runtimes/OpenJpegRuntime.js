//
// OpenJpegRuntime.js
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
