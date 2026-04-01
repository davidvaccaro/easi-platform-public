//
// JpegLsDecoder.js
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

import Exception, { GeneralErrorCodes } from "../../environment/Exception.js";
import JpegDecoder from "./JpegDecoder.js";
import JpegLosslessDecoder from "./JpegLosslessDecoder.js";
import JpegLsRuntime from "../runtimes/JpegLsRuntime.js";

export default class JpegLsDecoder {

    static RuntimeDecoderClassNames = [
        "JpegLsDecoder",
        "JPEGLSDecoder",
        "JPEG_LS_Decoder",
        "CharLSDecoder",
        "Decoder"
    ];

    /**
     * Resolve optional runtime module synchronously.
     * @returns {object | null} JPEG-LS runtime module.
     */
    resolveRuntimeModule() {

        return JpegLsRuntime.resolveSync({
            jpeglsModule: this.jpeglsModule ?? this.jpegLsModule ?? null,
            jpeglsFactory: this.jpeglsFactory ?? this.jpegLsFactory ?? null,
            jpeglsModuleOptions: this.jpeglsModuleOptions ?? null
        });

    }

    /**
     * Copy one external result into destination.
     * @param {*} result External decoder result.
     * @param {Uint8Array} destination Destination RGBA bytes.
     * @param {number} destinationStart Destination start pixel index.
     * @returns {boolean} TRUE when copy succeeded.
     */
    applyExternalResult(result, destination, destinationStart) {

        if (result === true)
            return true;

        var rgba = null;
        if (result instanceof Uint8Array) {
            rgba = result;
        }
        else if (result?.rgba instanceof Uint8Array) {
            rgba = result.rgba;
        }
        else if (result?.data instanceof Uint8Array) {
            rgba = result.data;
        }

        if (rgba == null)
            return false;

        var destinationByteOffset = Math.max(0, (destinationStart * 4));
        var bytesToCopy = Math.min(rgba.length, (destination.length - destinationByteOffset));
        if (bytesToCopy <= 0)
            return false;

        destination.set(rgba.subarray(0, bytesToCopy), destinationByteOffset);
        return true;

    }

    decodeWithExternalDecoder(externalDecoder, source, sourceStart, sourceStop, destination, destinationStart) {

        if (externalDecoder == null)
            return false;

        var options = {
            rows: this.rows,
            columns: this.columns,
            samplesPerPixel: this.samplesPerPixel,
            bitsAllocated: this.bitsAllocated,
            bitsStored: this.bitsStored,
            pixelRepresentation: this.pixelRepresentation,
            planarConfiguration: this.planarConfiguration,
            photometricInterpretation: this.photometricInterpretation,
            redPaletteColorLookupTableData: this.redPaletteColorLookupTableData ?? null,
            greenPaletteColorLookupTableData: this.greenPaletteColorLookupTableData ?? null,
            bluePaletteColorLookupTableData: this.bluePaletteColorLookupTableData ?? null
        };

        if (typeof externalDecoder == "function") {
            var functionResult = externalDecoder({
                source,
                sourceStart,
                sourceStop,
                destination,
                destinationStart,
                options,
                dicomObject: this.dicomObject
            });
            return this.applyExternalResult(functionResult, destination, destinationStart);
        }

        if (typeof externalDecoder.decode == "function") {
            var decodeResult = externalDecoder.decode(source, sourceStart, sourceStop, destination, destinationStart, options);
            if (decodeResult === true)
                return true;
            return this.applyExternalResult(decodeResult, destination, destinationStart);
        }

        if (typeof externalDecoder.decodeFrame == "function") {
            var frame = source.subarray(sourceStart, (sourceStop == null ? source.length : sourceStop));
            var frameResult = externalDecoder.decodeFrame(frame, options);
            return this.applyExternalResult(frameResult, destination, destinationStart);
        }

        return false;

    }

    /**
     * Resolve a decoder surface from runtime module candidates.
     * @param {*} runtimeModule Runtime module candidate.
     * @returns {*} Decoder surface or null.
     */
    resolveRuntimeDecoder(runtimeModule) {

        if (runtimeModule == null)
            return null;

        if (typeof runtimeModule == "function")
            return runtimeModule;

        if ((runtimeModule.decode != null) || (runtimeModule.decodeFrame != null))
            return runtimeModule;

        for (var i = 0; i < JpegLsDecoder.RuntimeDecoderClassNames.length; i++) {
            var className = JpegLsDecoder.RuntimeDecoderClassNames[i];
            var candidateClass = runtimeModule[className];
            if (typeof candidateClass == "function")
                return new candidateClass();
        }

        return null;

    }

    /**
     * Decode JPEG-LS source bytes into RGBA destination bytes.
     * The built-in fallback chain attempts:
     *  1) External JPEG-LS decoder hook (optional)
     *  2) JPEG Lossless decoder (for mislabeled payloads)
     *  3) JPEG Baseline/Extended decoder (for mislabeled payloads)
     * @param {Uint8Array} source Source bytes.
     * @param {number} sourceStart Source start index.
     * @param {number | null} sourceStop Source stop index.
     * @param {Uint8Array} destination Destination RGBA bytes.
     * @param {number} destinationStart Destination start pixel index.
     * @returns {boolean} TRUE when decode succeeded.
     */
    decode(source, sourceStart, sourceStop, destination, destinationStart) {

        if ((source instanceof Uint8Array) == false) {
            throw new Exception(
                "Invalid JPEG-LS source bytes. Expected Uint8Array.",
                GeneralErrorCodes.InvalidParameter
            );
        }

        if ((destination instanceof Uint8Array) == false) {
            throw new Exception(
                "Invalid JPEG-LS destination bytes. Expected Uint8Array.",
                GeneralErrorCodes.InvalidParameter
            );
        }

        var errors = [];

        // Highest-priority override hook for direct dependency injection.
        if (this.jpegLsDecoder != null) {
            try {
                if (this.decodeWithExternalDecoder(this.jpegLsDecoder, source, sourceStart, sourceStop, destination, destinationStart) == true)
                    return true;
            }
            catch (overrideError) {
                errors.push(overrideError);
            }
        }

        // Resolve a shared runtime module/factory when configured.
        var runtimeModule = this.resolveRuntimeModule();
        if (runtimeModule != null) {
            var runtimeDecoder = this.resolveRuntimeDecoder(runtimeModule);
            if (runtimeDecoder != null) {
                try {
                    if (this.decodeWithExternalDecoder(runtimeDecoder, source, sourceStart, sourceStop, destination, destinationStart) == true)
                        return true;
                }
                catch (runtimeError) {
                    errors.push(runtimeError);
                }
            }
        }

        try {
            return this.jpegLosslessDecoder.decode(source, sourceStart, sourceStop, destination, destinationStart);
        }
        catch (jpegLosslessError) {
            errors.push(jpegLosslessError);
        }

        try {
            return this.jpegDecoder.decode(source, sourceStart, sourceStop, destination, destinationStart);
        }
        catch (jpegError) {
            errors.push(jpegError);
        }

        var firstError = (errors.length > 0) ? errors[0] : null;
        var detail = (firstError?.message ?? "No compatible JPEG-LS decoder implementation was available.");
        throw new Exception(
            "JPEG-LS decoding failed. Provide a JPEG-LS module/factory via options, constructor, JpegLsRuntime, or globalThis.EASIJpegLsModule. " + detail,
            GeneralErrorCodes.NotImplemented
        );

    }

    /**
     * Construct one JPEG-LS decoder instance.
     * @param {object | null} dicomObject Optional source DICOM object.
     */
    constructor(dicomObject) {

        this.dicomObject = dicomObject;
        this.jpegLosslessDecoder = new JpegLosslessDecoder(dicomObject);
        this.jpegDecoder = new JpegDecoder(dicomObject);
        this.jpegLsDecoder = null;
        this.jpegLsModule = null;
        this.jpegLsFactory = null;
        this.jpeglsModule = null;
        this.jpeglsFactory = null;
        this.jpeglsModuleOptions = null;

    }

};
