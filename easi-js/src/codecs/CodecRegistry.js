//
// CodecRegistry.js
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

import TransferSyntax from "../dicom/TransferSyntax.js";

export default class CodecRegistry {

    /**
     * Normalize codec-registry validation options.
     * @param {{
     *   requireDefaultDecoder?: boolean,
     *   requiredTransferSyntaxes?: Array<TransferSyntax | string | null>,
     *   requiredEncoders?: Array<string | null>,
     *   requiredImageDecoders?: Array<string | null>
     * } | null} options Validation options.
     * @returns {{
     *   requireDefaultDecoder: boolean,
     *   requiredTransferSyntaxes: Array<TransferSyntax | string | null>,
     *   requiredEncoders: Array<string | null>,
     *   requiredImageDecoders: Array<string | null>,
     *   validateProviderFactories: boolean
     * }} Normalized options.
     */
    normalizeValidationOptions(options = null) {

        if ((options == null) || (typeof options !== "object")) {
            return {
                requireDefaultDecoder: true,
                requiredTransferSyntaxes: [],
                requiredEncoders: [],
                requiredImageDecoders: [],
                validateProviderFactories: true
            };
        }

        return {
            requireDefaultDecoder: (options.requireDefaultDecoder !== false),
            requiredTransferSyntaxes: Array.isArray(options.requiredTransferSyntaxes)
                ? options.requiredTransferSyntaxes
                : [],
            requiredEncoders: Array.isArray(options.requiredEncoders)
                ? options.requiredEncoders
                : [],
            requiredImageDecoders: Array.isArray(options.requiredImageDecoders)
                ? options.requiredImageDecoders
                : [],
            validateProviderFactories: (options.validateProviderFactories !== false)
        };

    }

    /**
     * Build one codec-registry validation issue model.
     * @param {string} code The issue code.
     * @param {string} message The issue message.
     * @param {object | null} details Optional issue details.
     * @returns {object} The validation issue.
     */
    createValidationIssue(code, message, details = null) {
        return Object.assign({
            code,
            message
        }, details ?? {});
    }

    /**
     * Determine if one object declares all required methods.
     * @param {object | null} candidate Candidate object.
     * @param {Array<string>} methodNames Required method names.
     * @returns {boolean} TRUE when all required methods exist.
     */
    hasRequiredMethods(candidate, methodNames) {

        if ((candidate == null) || (typeof candidate !== "object")) {
            return false;
        }

        for (var i = 0; i < methodNames.length; i++) {
            var methodName = methodNames[i];
            if (typeof candidate[methodName] !== "function") {
                return false;
            }
        }

        return true;

    }

    /**
     * Resolve missing required methods on one candidate.
     * @param {object | null} candidate Candidate object.
     * @param {Array<string>} methodNames Required method names.
     * @returns {Array<string>} Missing method names.
     */
    getMissingRequiredMethods(candidate, methodNames) {

        var missingMethods = [];

        if (Array.isArray(methodNames) != true) {
            return missingMethods;
        }

        for (var i = 0; i < methodNames.length; i++) {
            var methodName = methodNames[i];
            if (typeof candidate?.[methodName] !== "function") {
                missingMethods.push(methodName);
            }
        }

        return missingMethods;

    }

    /**
     * Determine if one function appears to be a class constructor.
     * @param {Function | null} candidate Candidate function.
     * @returns {boolean} TRUE when function source appears to be class syntax.
     */
    isClassConstructor(candidate) {

        if (typeof candidate !== "function") {
            return false;
        }

        var source = "";
        try {
            source = Function.prototype.toString.call(candidate);
        }
        catch (_error) {
            return false;
        }

        return source.trim().startsWith("class ");

    }

    /**
     * Describe one registration value for diagnostics.
     * @param {object | Function | null} registration Registration value.
     * @returns {string} Human-readable registration description.
     */
    describeRegistrationValue(registration) {

        if (registration == null) {
            return "null";
        }

        if (typeof registration === "function") {
            var name = registration.name || "(anonymous)";
            return this.isClassConstructor(registration)
                ? `class '${name}'`
                : `function '${name}'`;
        }

        if (typeof registration !== "object") {
            return `type '${typeof registration}'`;
        }

        var constructorName = registration?.constructor?.name || "Object";
        return `object instance '${constructorName}'`;

    }

    /**
     * Determine if one constructor prototype declares all required methods.
     * @param {Function | null} constructorFn Candidate constructor.
     * @param {Array<string>} methodNames Required method names.
     * @returns {boolean} TRUE when constructor prototype satisfies requirements.
     */
    constructorHasRequiredMethods(constructorFn, methodNames) {

        if (typeof constructorFn !== "function") {
            return false;
        }

        var prototype = constructorFn.prototype ?? null;
        if (prototype == null) {
            return false;
        }

        for (var i = 0; i < methodNames.length; i++) {
            var methodName = methodNames[i];
            if (typeof prototype[methodName] !== "function") {
                return false;
            }
        }

        return true;

    }

    /**
     * Resolve one normalized codec provider registration.
     * Supports constructor/class, instance, provider object ({ create(...) }), and factory function forms.
     * @param {object | Function | null} registration Candidate registration value.
     * @param {Array<string>} requiredMethods Required codec methods.
     * @param {string} registrationKind Human-readable kind label.
     * @returns {{ provider: Function, mode: string, constructor: Function | null } | null} Registration descriptor.
     */
    resolveRegistrationProvider(registration, requiredMethods, registrationKind) {

        if (registration == null) {
            return null;
        }

        if (typeof registration === "function") {

            if (this.constructorHasRequiredMethods(registration, requiredMethods) == true) {
                return {
                    provider: (context = null) => new registration(context),
                    mode: "constructor",
                    constructor: registration
                };
            }

            if (this.isClassConstructor(registration) == true) {
                var className = registration.name || "(anonymous)";
                var prototype = registration.prototype ?? {};
                var missingClassMethods = this.getMissingRequiredMethods(prototype, requiredMethods);
                throw new Error(
                    `Invalid ${registrationKind} registration. Constructor '${className}' is missing required method(s): ${missingClassMethods.join(", ")}.`
                );
            }

            return {
                provider: (context = null) => registration(context),
                mode: "factory",
                constructor: null
            };

        }

        if (typeof registration !== "object") {
            return null;
        }

        if (this.hasRequiredMethods(registration, requiredMethods) == true) {

            var registrationConstructor = (typeof registration.constructor === "function")
                ? registration.constructor
                : null;
            var canConstructFromInstance = (
                (registrationConstructor != null)
                && (this.constructorHasRequiredMethods(registrationConstructor, requiredMethods) == true)
            );

            return {
                provider: canConstructFromInstance
                    ? ((context = null) => new registrationConstructor(context))
                    : (() => registration),
                mode: canConstructFromInstance ? "instance-constructor" : "instance",
                constructor: registrationConstructor
            };
        }

        if (typeof registration.create === "function") {
            return {
                provider: (context = null) => registration.create(context),
                mode: "provider",
                constructor: null
            };
        }

        if (registration.default != null) {
            return this.resolveRegistrationProvider(registration.default, requiredMethods, registrationKind);
        }

        var missingObjectMethods = this.getMissingRequiredMethods(registration, requiredMethods);
        var requiredSummary = requiredMethods.join(", ");
        var missingSummary = (missingObjectMethods.length > 0)
            ? ` Missing required method(s): ${missingObjectMethods.join(", ")}.`
            : "";
        throw new Error(
            `Invalid ${registrationKind} registration. Expected constructor, instance, provider ({ create(...) }), or factory function with required method(s): ${requiredSummary}. Received ${this.describeRegistrationValue(registration)}.${missingSummary}`
        );

    }

    /**
     * Resolve one runtime codec instance from a provider.
     * @param {Function | null} provider The provider function.
     * @param {object | null} context Optional provider context.
     * @param {Array<string>} requiredMethods Required methods.
     * @param {string} missingMessage Error when provider is missing.
     * @param {string} invalidMessage Error when provider output is invalid.
     * @returns {object} The resolved codec instance.
     */
    resolveCodecInstance(provider, context, requiredMethods, missingMessage, invalidMessage, registrationKind = "codec") {

        if (typeof provider !== "function") {
            throw new Error(missingMessage);
        }

        var instance = provider(context);
        if ((instance != null) && (typeof instance.then === "function")) {
            throw new Error(
                `${invalidMessage} Provider returned a Promise; codec providers must resolve synchronously.`
            );
        }

        var missingMethods = this.getMissingRequiredMethods(instance, requiredMethods);
        if (missingMethods.length > 0) {
            throw new Error(
                `${invalidMessage} Resolved ${registrationKind} instance is missing required method(s): ${missingMethods.join(", ")}.`
            );
        }

        return instance;

    }

    /**
     * Validate one registration provider.
     * @param {Function | null} provider Provider function.
     * @param {Array<string>} requiredMethods Required methods.
     * @returns {{ ok: boolean, message: string | null }} Validation result.
     */
    validateRegistrationProvider(provider, requiredMethods, registrationKind = "codec") {

        if (typeof provider !== "function") {
            return {
                ok: false,
                message: `${registrationKind} registration provider is missing.`
            };
        }

        var instance = null;
        try {
            instance = provider(null);
        }
        catch (error) {
            return {
                ok: false,
                message: error?.message ?? "Provider threw during validation."
            };
        }

        if ((instance != null) && (typeof instance.then === "function")) {
            return {
                ok: false,
                message: `${registrationKind} registration provider returned a Promise. Codec providers must resolve synchronously.`
            };
        }

        var missingMethods = this.getMissingRequiredMethods(instance, requiredMethods);
        if (missingMethods.length > 0) {
            return {
                ok: false,
                message: `Resolved ${registrationKind} instance is missing required method(s): ${missingMethods.join(", ")}.`
            };
        }

        return { ok: true, message: null };

    }

    /**
     * Validate the current codec-registry state.
     * @param {{
     *   requireDefaultDecoder?: boolean,
     *   requiredTransferSyntaxes?: Array<TransferSyntax | string | null>,
     *   requiredEncoders?: Array<string | null>,
     *   requiredImageDecoders?: Array<string | null>,
     *   validateProviderFactories?: boolean
     * } | null} options Validation options.
     * @returns {{
     *   ok: boolean,
     *   errors: Array<object>,
     *   warnings: Array<object>
     * }} Validation report.
     */
    validate(options = null) {

        var normalizedOptions = this.normalizeValidationOptions(options);
        var report = {
            ok: true,
            errors: [],
            warnings: []
        };

        if ((this.decoderProviders == null) || (typeof this.decoderProviders !== "object")) {
            report.errors.push(this.createValidationIssue(
                "InvalidDecoderMap",
                "CodecRegistry decoder map is missing or invalid."
            ));
        }
        else {

            var decoderTransferSyntaxes = Object.keys(this.decoderProviders);
            for (var i = 0; i < decoderTransferSyntaxes.length; i++) {
                var transferSyntaxID = decoderTransferSyntaxes[i];
                var decoderProvider = this.decoderProviders[transferSyntaxID];

                if (typeof decoderProvider !== "function") {
                    report.errors.push(this.createValidationIssue(
                        "InvalidDecoderProvider",
                        `Decoder registration for transfer syntax '${transferSyntaxID}' is invalid.`,
                        { transferSyntaxID }
                    ));
                }
                else if (normalizedOptions.validateProviderFactories == true) {
                    var decoderValidation = this.validateRegistrationProvider(decoderProvider, ["decode"], "decoder");
                    if (decoderValidation.ok != true) {
                        report.errors.push(this.createValidationIssue(
                            "InvalidDecoderProviderOutput",
                            `Decoder provider for transfer syntax '${transferSyntaxID}' is invalid: ${decoderValidation.message}`,
                            { transferSyntaxID }
                        ));
                    }
                }
            }

            if (normalizedOptions.requireDefaultDecoder == true) {
                if (typeof this.decoderProviders[TransferSyntax.NONE.ID] !== "function") {
                    report.errors.push(this.createValidationIssue(
                        "MissingDefaultDecoder",
                        `CodecRegistry requires a default decoder for transfer syntax '${TransferSyntax.NONE.ID}'.`,
                        { transferSyntaxID: TransferSyntax.NONE.ID }
                    ));
                }
            }

            for (var r = 0; r < normalizedOptions.requiredTransferSyntaxes.length; r++) {
                var requiredTransferSyntax = normalizedOptions.requiredTransferSyntaxes[r];
                var requiredTransferSyntaxID = this.resolveTransferSyntaxID(requiredTransferSyntax);
                if (typeof this.decoderProviders[requiredTransferSyntaxID] !== "function") {
                    report.errors.push(this.createValidationIssue(
                        "MissingRequiredDecoder",
                        `CodecRegistry is missing decoder for transfer syntax '${requiredTransferSyntaxID}'.`,
                        { transferSyntaxID: requiredTransferSyntaxID }
                    ));
                }
            }

        }

        if ((this.imageDecoderProviders == null) || (typeof this.imageDecoderProviders !== "object")) {
            report.errors.push(this.createValidationIssue(
                "InvalidImageDecoderMap",
                "CodecRegistry image-decoder map is missing or invalid."
            ));
        }
        else {

            var imageFormats = Object.keys(this.imageDecoderProviders);
            for (var k = 0; k < imageFormats.length; k++) {
                var imageFormat = imageFormats[k];
                var imageDecoderProvider = this.imageDecoderProviders[imageFormat];

                if (typeof imageDecoderProvider !== "function") {
                    report.errors.push(this.createValidationIssue(
                        "InvalidImageDecoderProvider",
                        `Image decoder registration for format '${imageFormat}' is invalid.`,
                        { format: imageFormat }
                    ));
                }
                else if (normalizedOptions.validateProviderFactories == true) {
                    var imageDecoderValidation = this.validateRegistrationProvider(imageDecoderProvider, ["decodeImage"], "image decoder");
                    if (imageDecoderValidation.ok != true) {
                        report.errors.push(this.createValidationIssue(
                            "InvalidImageDecoderProviderOutput",
                            `Image decoder provider for format '${imageFormat}' is invalid: ${imageDecoderValidation.message}`,
                            { format: imageFormat }
                        ));
                    }
                }
            }

            for (var d = 0; d < normalizedOptions.requiredImageDecoders.length; d++) {
                var requiredImageFormat = this.normalizeImageFormat(normalizedOptions.requiredImageDecoders[d]);
                if (requiredImageFormat == null)
                    continue;

                if (typeof this.imageDecoderProviders[requiredImageFormat] !== "function") {
                    report.errors.push(this.createValidationIssue(
                        "MissingRequiredImageDecoder",
                        `CodecRegistry is missing image decoder for format '${requiredImageFormat}'.`,
                        { format: requiredImageFormat }
                    ));
                }
            }

        }

        if ((this.encoderProviders == null) || (typeof this.encoderProviders !== "object")) {
            report.errors.push(this.createValidationIssue(
                "InvalidEncoderMap",
                "CodecRegistry encoder map is missing or invalid."
            ));
        }
        else {

            var encoderFormats = Object.keys(this.encoderProviders);
            for (var j = 0; j < encoderFormats.length; j++) {
                var format = encoderFormats[j];
                var encoderProvider = this.encoderProviders[format];

                if (typeof encoderProvider !== "function") {
                    report.errors.push(this.createValidationIssue(
                        "InvalidEncoderProvider",
                        `Encoder registration for format '${format}' is invalid.`,
                        { format }
                    ));
                }
                else if (normalizedOptions.validateProviderFactories == true) {
                    var encoderValidation = this.validateRegistrationProvider(encoderProvider, ["encode"], "encoder");
                    if (encoderValidation.ok != true) {
                        report.errors.push(this.createValidationIssue(
                            "InvalidEncoderProviderOutput",
                            `Encoder provider for format '${format}' is invalid: ${encoderValidation.message}`,
                            { format }
                        ));
                    }
                }
            }

            for (var e = 0; e < normalizedOptions.requiredEncoders.length; e++) {
                var requiredFormat = this.normalizeFormat(normalizedOptions.requiredEncoders[e]);
                if (requiredFormat == null)
                    continue;
                if (typeof this.encoderProviders[requiredFormat] !== "function") {
                    report.errors.push(this.createValidationIssue(
                        "MissingRequiredEncoder",
                        `CodecRegistry is missing encoder for format '${requiredFormat}'.`,
                        { format: requiredFormat }
                    ));
                }
            }

        }

        report.ok = (report.errors.length == 0);
        return report;

    }

    /**
     * Validate and throw when current registry state is invalid.
     * @param {{
     *   requireDefaultDecoder?: boolean,
     *   requiredTransferSyntaxes?: Array<TransferSyntax | string | null>,
     *   requiredEncoders?: Array<string | null>,
     *   requiredImageDecoders?: Array<string | null>,
     *   validateProviderFactories?: boolean
     * } | null} options Validation options.
     * @returns {{
     *   ok: boolean,
     *   errors: Array<object>,
     *   warnings: Array<object>
     * }} Validation report.
     */
    assertValid(options = null) {

        var report = this.validate(options);
        if (report.ok == true)
            return report;

        var messages = report.errors.map((error) => error.message);
        throw new Error("CodecRegistry validation failed: " + messages.join(" | "));

    }

    /**
     * Clone this codec registry into a new independent registry.
     * @returns {CodecRegistry} A shallow-cloned codec registry.
     */
    clone() {

        var registry = new CodecRegistry();

        registry.decoderProviders = Object.assign({}, this.decoderProviders ?? {});
        registry.imageDecoderProviders = Object.assign({}, this.imageDecoderProviders ?? {});
        registry.encoderProviders = Object.assign({}, this.encoderProviders ?? {});

        // Legacy compatibility snapshots
        registry.decoderConstructors = Object.assign({}, this.decoderConstructors ?? {});
        registry.imageDecoderConstructors = Object.assign({}, this.imageDecoderConstructors ?? {});
        registry.encoders = Object.assign({}, this.encoders ?? {});

        return registry;

    }

    /**
     * Normalize an encoder format identifier.
     * @param {string | null} format The format identifier.
     * @returns {string | null} The normalized format identifier.
     */
    normalizeFormat(format) {
        if (format == null)
            return null;
        return String(format).trim().toLowerCase();
    }

    /**
     * Normalize one image-format or media-type identifier.
     * @param {string | null} formatOrMediaType Image-format or media-type.
     * @returns {string | null} Normalized image-format key.
     */
    normalizeImageFormat(formatOrMediaType) {

        if (formatOrMediaType == null)
            return null;

        var value = String(formatOrMediaType).trim().toLowerCase();
        if (value.length == 0)
            return null;

        if (value == "jpg")
            return "jpeg";

        if (value == "tif")
            return "tiff";

        if (value.indexOf("/") > -1) {

            if (value.indexOf("jpeg") > -1)
                return "jpeg";

            if (value.indexOf("png") > -1)
                return "png";

            if ((value.indexOf("tiff") > -1) || (value.indexOf("tif") > -1))
                return "tiff";

        }

        return value;

    }

    /**
     * Resolve a transfer-syntax identifier from a transfer-syntax-like value.
     * @param {TransferSyntax | string | null} transferSyntax The transfer syntax value.
     * @returns {string} The transfer syntax identifier.
     */
    resolveTransferSyntaxID(transferSyntax) {
        if (transferSyntax == null)
            return TransferSyntax.NONE.ID;
        if (typeof transferSyntax === "string")
            return transferSyntax;
        if (transferSyntax.ID != null)
            return transferSyntax.ID;
        return TransferSyntax.NONE.ID;
    }

    /**
     * Register a decoder provider for a transfer-syntax.
     * Supports constructor/class, instance, provider object ({ create(...) }), and factory function.
     * @param {TransferSyntax | string} transferSyntax The transfer-syntax.
     * @param {object | Function} decoderPrototypeOrConstructor Decoder instance prototype, constructor, provider, or factory.
     */
    setDecoderForTransferSyntax(transferSyntax, decoderPrototypeOrConstructor) {

        var transferSyntaxID = this.resolveTransferSyntaxID(transferSyntax);
        var descriptor = this.resolveRegistrationProvider(
            decoderPrototypeOrConstructor,
            ["decode"],
            "transfer-syntax decoder"
        );

        if (descriptor == null)
            return;

        this.decoderProviders[transferSyntaxID] = descriptor.provider;

        // Legacy compatibility snapshot
        this.decoderConstructors[transferSyntaxID] = descriptor.constructor ?? descriptor.provider;

    }

    /**
     * Resolve a decoder instance for one transfer-syntax.
     * @param {TransferSyntax | string | null} transferSyntax The transfer-syntax.
     * @param {object | null} dicomObject Optional DICOM object context.
     * @returns {object} Decoder instance.
     */
    createDecoderForTransferSyntax(transferSyntax, dicomObject = null) {

        var transferSyntaxID = this.resolveTransferSyntaxID(transferSyntax);
        var provider = this.decoderProviders[transferSyntaxID];

        if (provider == null) {
            provider = this.decoderProviders[TransferSyntax.NONE.ID] ?? null;
        }

        return this.resolveCodecInstance(
            provider,
            dicomObject,
            ["decode"],
            "CodecRegistry has no default decoder configured.",
            `Invalid decoder registration for transfer syntax '${transferSyntaxID}'.`,
            "decoder"
        );

    }

    /**
     * Resolve a decoder for a transfer-syntax.
     * @param {TransferSyntax | string | null} transferSyntax The transfer-syntax.
     * @param {object | null} dicomObject Optional DICOM object context.
     * @returns {object} A decoder instance.
     */
    getDecoderForTransferSyntax(transferSyntax, dicomObject = null) {
        return this.createDecoderForTransferSyntax(transferSyntax, dicomObject);
    }

    /**
     * Register one image decoder provider for a format/media-type key.
     * Supports constructor/class, instance, provider object ({ create(...) }), and factory function.
     * @param {string} formatOrMediaType Image format or media-type.
     * @param {object | Function} decoderPrototypeOrConstructor Decoder instance prototype, constructor, provider, or factory.
     */
    setDecoderForImageFormat(formatOrMediaType, decoderPrototypeOrConstructor) {

        var format = this.normalizeImageFormat(formatOrMediaType);
        if (format == null)
            return;

        var descriptor = this.resolveRegistrationProvider(
            decoderPrototypeOrConstructor,
            ["decodeImage"],
            "image decoder"
        );

        if (descriptor == null)
            return;

        this.imageDecoderProviders[format] = descriptor.provider;

        // Legacy compatibility snapshot
        this.imageDecoderConstructors[format] = descriptor.constructor ?? descriptor.provider;

    }

    /**
     * Register one image decoder provider for media-type key.
     * @param {string} mediaType Media-type key.
     * @param {object | Function} decoderPrototypeOrConstructor Decoder prototype, constructor, provider, or factory.
     */
    setDecoderForMediaType(mediaType, decoderPrototypeOrConstructor) {
        this.setDecoderForImageFormat(mediaType, decoderPrototypeOrConstructor);
    }

    /**
     * Resolve one image decoder instance by image format/media-type key.
     * @param {string} formatOrMediaType Image format or media-type.
     * @param {object | null} context Optional decoder context.
     * @returns {object | null} Decoder instance, when available.
     */
    createDecoderForImageFormat(formatOrMediaType, context = null) {

        var format = this.normalizeImageFormat(formatOrMediaType);
        if (format == null)
            return null;

        var provider = this.imageDecoderProviders[format] ?? null;
        if (provider == null)
            return null;

        return this.resolveCodecInstance(
            provider,
            context,
            ["decodeImage"],
            `No image decoder is registered for format '${format}'.`,
            `Invalid image decoder registration for format '${format}'.`,
            "image decoder"
        );

    }

    /**
     * Resolve one image decoder instance by image format/media-type key.
     * @param {string} formatOrMediaType Image format or media-type.
     * @param {object | null} context Optional decoder context.
     * @returns {object | null} Decoder instance, when available.
     */
    getDecoderForImageFormat(formatOrMediaType, context = null) {
        return this.createDecoderForImageFormat(formatOrMediaType, context);
    }

    /**
     * Resolve one image decoder instance by media-type key.
     * @param {string} mediaType Media-type key.
     * @param {object | null} context Optional decoder context.
     * @returns {object | null} Decoder instance, when available.
     */
    getDecoderForMediaType(mediaType, context = null) {
        return this.getDecoderForImageFormat(mediaType, context);
    }

    /**
     * Determine if one image decoder registration exists.
     * @param {string} formatOrMediaType Image format or media-type.
     * @returns {boolean} TRUE when the image decoder exists.
     */
    hasDecoderForImageFormat(formatOrMediaType) {
        var format = this.normalizeImageFormat(formatOrMediaType);
        if (format == null)
            return false;
        return (typeof this.imageDecoderProviders[format] === "function");
    }

    /**
     * Determine if one media-type image decoder registration exists.
     * @param {string} mediaType Media-type key.
     * @returns {boolean} TRUE when the image decoder exists.
     */
    hasDecoderForMediaType(mediaType) {
        return this.hasDecoderForImageFormat(mediaType);
    }

    /**
     * Determine if a decoder is explicitly registered for a transfer-syntax.
     * @param {TransferSyntax | string | null} transferSyntax The transfer-syntax.
     * @returns {boolean} TRUE when a specific decoder is registered.
     */
    hasDecoderForTransferSyntax(transferSyntax) {
        var transferSyntaxID = this.resolveTransferSyntaxID(transferSyntax);
        return (this.decoderProviders[transferSyntaxID] != null);
    }

    /**
     * Register an encoder provider for a named output format.
     * Supports constructor/class, instance, provider object ({ create(...) }), and factory function.
     * @param {string} format The output format identifier.
     * @param {object | Function} encoder Encoder instance, constructor, provider, or factory.
     */
    setEncoder(format, encoder) {

        var key = this.normalizeFormat(format);
        if (key == null)
            return;

        var descriptor = this.resolveRegistrationProvider(
            encoder,
            ["encode"],
            "encoder"
        );

        if (descriptor == null)
            return;

        this.encoderProviders[key] = descriptor.provider;

        // Legacy compatibility snapshot
        this.encoders[key] = encoder;

    }

    /**
     * Resolve an encoder instance by format identifier.
     * @param {string} format The output format identifier.
     * @returns {object | null} Encoder instance, when available.
     */
    createEncoder(format) {

        var key = this.normalizeFormat(format);
        if (key == null)
            return null;

        var provider = this.encoderProviders[key] ?? null;
        if (provider == null)
            return null;

        return this.resolveCodecInstance(
            provider,
            null,
            ["encode"],
            `No encoder is registered for format '${key}'.`,
            `Invalid encoder registration for format '${key}'.`,
            "encoder"
        );

    }

    /**
     * Resolve an encoder by format identifier.
     * @param {string} format The output format identifier.
     * @returns {object | null} The encoder, when available.
     */
    getEncoder(format) {
        return this.createEncoder(format);
    }

    /**
     * Determine if an encoder exists for the specified format.
     * @param {string} format The output format identifier.
     * @returns {boolean} TRUE when an encoder exists.
     */
    hasEncoder(format) {
        var key = this.normalizeFormat(format);
        if (key == null)
            return false;
        return (typeof this.encoderProviders[key] === "function");
    }

    /**
     * Construct a codec registry instance.
     */
    constructor() {
        this.decoderProviders = {};
        this.imageDecoderProviders = {};
        this.encoderProviders = {};

        // Legacy compatibility maps retained for transitional call sites/tests.
        this.decoderConstructors = {};
        this.imageDecoderConstructors = {};
        this.encoders = {};
    }

};
