//
// TransferSyntax.js
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

export default class TransferSyntax {

    // Find a transfer-syntax by the tag-id (e.g. 00020000 = (0002, 0000))
    static find(id) {

        // Lookup the transfer-syntax
        return TransferSyntaxes[id];

    };

    constructor(data) {
        Object.assign(this, data);
    }

    // INSERT ACCESSORS	
    static get NONE() { return TransferSyntaxes['0'] }
    static get ImplicitVRLittleEndian() { return TransferSyntaxes['1.2.840.10008.1.2'] }
    static get ExplicitVRLittleEndian() { return TransferSyntaxes['1.2.840.10008.1.2.1'] }
    static get ExplicitVRBigEndian() { return TransferSyntaxes['1.2.840.10008.1.2.2'] }
    static get EncapsulatedUncompressedExplicitVRLittleEndian() { return TransferSyntaxes['1.2.840.10008.1.2.1.98'] }
    static get DeflatedExplicitVRLittleEndian() { return TransferSyntaxes['1.2.840.10008.1.2.1.99'] }
    static get JPEGBaseline8Bit() { return TransferSyntaxes['1.2.840.10008.1.2.4.50'] }
    static get JPEGExtended12Bit() { return TransferSyntaxes['1.2.840.10008.1.2.4.51'] }
    static get JPEGExtended35() { return TransferSyntaxes['1.2.840.10008.1.2.4.52'] }
    static get JPEGSpectralSelectionNonHierarchical68() { return TransferSyntaxes['1.2.840.10008.1.2.4.53'] }
    static get JPEGSpectralSelectionNonHierarchical79() { return TransferSyntaxes['1.2.840.10008.1.2.4.54'] }
    static get JPEGFullProgressionNonHierarchical1012() { return TransferSyntaxes['1.2.840.10008.1.2.4.55'] }
    static get JPEGFullProgressionNonHierarchical1113() { return TransferSyntaxes['1.2.840.10008.1.2.4.56'] }
    static get JPEGLossless() { return TransferSyntaxes['1.2.840.10008.1.2.4.57'] }
    static get JPEGLosslessNonHierarchical15() { return TransferSyntaxes['1.2.840.10008.1.2.4.58'] }
    static get JPEGExtendedHierarchical1618() { return TransferSyntaxes['1.2.840.10008.1.2.4.59'] }
    static get JPEGExtendedHierarchical1719() { return TransferSyntaxes['1.2.840.10008.1.2.4.60'] }
    static get JPEGSpectralSelectionHierarchical2022() { return TransferSyntaxes['1.2.840.10008.1.2.4.61'] }
    static get JPEGSpectralSelectionHierarchical2123() { return TransferSyntaxes['1.2.840.10008.1.2.4.62'] }
    static get JPEGFullProgressionHierarchical2426() { return TransferSyntaxes['1.2.840.10008.1.2.4.63'] }
    static get JPEGFullProgressionHierarchical2527() { return TransferSyntaxes['1.2.840.10008.1.2.4.64'] }
    static get JPEGLosslessHierarchical28() { return TransferSyntaxes['1.2.840.10008.1.2.4.65'] }
    static get JPEGLosslessHierarchical29() { return TransferSyntaxes['1.2.840.10008.1.2.4.66'] }
    static get JPEGLosslessSV1() { return TransferSyntaxes['1.2.840.10008.1.2.4.70'] }
    static get JPEGLSLossless() { return TransferSyntaxes['1.2.840.10008.1.2.4.80'] }
    static get JPEGLSNearLossless() { return TransferSyntaxes['1.2.840.10008.1.2.4.81'] }
    static get JPEG2000Lossless() { return TransferSyntaxes['1.2.840.10008.1.2.4.90'] }
    static get JPEG2000() { return TransferSyntaxes['1.2.840.10008.1.2.4.91'] }
    static get JPEG2000MCLossless() { return TransferSyntaxes['1.2.840.10008.1.2.4.92'] }
    static get JPEG2000MC() { return TransferSyntaxes['1.2.840.10008.1.2.4.93'] }
    static get JPIPReferenced() { return TransferSyntaxes['1.2.840.10008.1.2.4.94'] }
    static get JPIPReferencedDeflate() { return TransferSyntaxes['1.2.840.10008.1.2.4.95'] }
    static get MPEG2MPML() { return TransferSyntaxes['1.2.840.10008.1.2.4.100'] }
    static get MPEG2MPMLF() { return TransferSyntaxes['1.2.840.10008.1.2.4.100.1'] }
    static get MPEG2MPHL() { return TransferSyntaxes['1.2.840.10008.1.2.4.101'] }
    static get MPEG2MPHLF() { return TransferSyntaxes['1.2.840.10008.1.2.4.101.1'] }
    static get MPEG4HP41() { return TransferSyntaxes['1.2.840.10008.1.2.4.102'] }
    static get MPEG4HP41F() { return TransferSyntaxes['1.2.840.10008.1.2.4.102.1'] }
    static get MPEG4HP41BD() { return TransferSyntaxes['1.2.840.10008.1.2.4.103'] }
    static get MPEG4HP41BDF() { return TransferSyntaxes['1.2.840.10008.1.2.4.103.1'] }
    static get MPEG4HP422D() { return TransferSyntaxes['1.2.840.10008.1.2.4.104'] }
    static get MPEG4HP422DF() { return TransferSyntaxes['1.2.840.10008.1.2.4.104.1'] }
    static get MPEG4HP423D() { return TransferSyntaxes['1.2.840.10008.1.2.4.105'] }
    static get MPEG4HP423DF() { return TransferSyntaxes['1.2.840.10008.1.2.4.105.1'] }
    static get MPEG4HP42STEREO() { return TransferSyntaxes['1.2.840.10008.1.2.4.106'] }
    static get MPEG4HP42STEREOF() { return TransferSyntaxes['1.2.840.10008.1.2.4.106.1'] }
    static get HEVCMP51() { return TransferSyntaxes['1.2.840.10008.1.2.4.107'] }
    static get HEVCM10P51() { return TransferSyntaxes['1.2.840.10008.1.2.4.108'] }
    static get JPEGXLLossless() { return TransferSyntaxes['1.2.840.10008.1.2.4.110'] }
    static get JPEGXLJPEGRecompression() { return TransferSyntaxes['1.2.840.10008.1.2.4.111'] }
    static get JPEGXL() { return TransferSyntaxes['1.2.840.10008.1.2.4.112'] }
    static get HTJ2KLossless() { return TransferSyntaxes['1.2.840.10008.1.2.4.201'] }
    static get HTJ2KLosslessRPCL() { return TransferSyntaxes['1.2.840.10008.1.2.4.202'] }
    static get HTJ2K() { return TransferSyntaxes['1.2.840.10008.1.2.4.203'] }
    static get JPIPHTJ2KReferenced() { return TransferSyntaxes['1.2.840.10008.1.2.4.204'] }
    static get JPIPHTJ2KReferencedDeflate() { return TransferSyntaxes['1.2.840.10008.1.2.4.205'] }
    static get RLELossless() { return TransferSyntaxes['1.2.840.10008.1.2.5'] }
    static get RFC2557MIMEEncapsulation() { return TransferSyntaxes['1.2.840.10008.1.2.6.1'] }
    static get XMLEncoding() { return TransferSyntaxes['1.2.840.10008.1.2.6.2'] }
    static get SMPTEST211020UncompressedProgressiveActiveVideo() { return TransferSyntaxes['1.2.840.10008.1.2.7.1'] }
    static get SMPTEST211020UncompressedInterlacedActiveVideo() { return TransferSyntaxes['1.2.840.10008.1.2.7.2'] }
    static get SMPTEST211030PCMDigitalAudio() { return TransferSyntaxes['1.2.840.10008.1.2.7.3'] }
    static get DeflatedImageFrameCompression() { return TransferSyntaxes['1.2.840.10008.1.2.8.1'] }
    static get Papyrus3ImplicitVRLittleEndian() { return TransferSyntaxes['1.2.840.10008.1.20'] }
    static get GEImplicitVRLittleEndianExceptBigEndianPixels() { return TransferSyntaxes['1.2.840.113619.5.2'] }
    static get PixelMedBzip2ExplicitVRLittleEndian() { return TransferSyntaxes['1.3.6.1.4.1.5962.300.1'] }
    static get PixelMedEncapsulatedRawLittleEndian() { return TransferSyntaxes['1.3.6.1.4.1.5962.300.2'] }
    static get AlgotecCompressed() { return TransferSyntaxes['1.2.840.113704.7.0.4.4'] }
    static get ALIWavelet() { return TransferSyntaxes['1.2.840.113711.1.2.100.1'] }
    // INSERT ACCESSORS	

};

export var TransferSyntaxApplicationType = {
    SingleFrame: 'SingleFrame',
    MultiFrame: 'MultiFrame',
    SingleAndMultiFrame: 'SingleAndMultiFrame',
    Video: 'Video',
    Audio: 'Audio',
    Text: 'Text',
    Other: 'Other',
    XML: 'XML',
    All: 'All'
};

// BELOW CODE GENERATED ON: 3/23/2023 11:09:45 AM

export var TransferSyntaxes = {
	'0': new TransferSyntax({ ID: '0', Name: 'None', IsLittleEndian: true, IsExplicit: false, IsCompressed: false, IsLossy: false, ApplicationType: TransferSyntaxApplicationType.All, IsRetired: false }),
	'1.2.840.10008.1.2': new TransferSyntax({ ID: '1.2.840.10008.1.2', Name: 'Implicit VR Little Endian', IsLittleEndian: true, IsExplicit: false, IsCompressed: false, IsLossy: false, ApplicationType: TransferSyntaxApplicationType.All, IsRetired: false }),
	'1.2.840.10008.1.2.1': new TransferSyntax({ ID: '1.2.840.10008.1.2.1', Name: 'Explicit VR Little Endian', IsLittleEndian: true, IsExplicit: true, IsCompressed: false, IsLossy: false, ApplicationType: TransferSyntaxApplicationType.All, IsRetired: false }),
	'1.2.840.10008.1.2.2': new TransferSyntax({ ID: '1.2.840.10008.1.2.2', Name: 'Explicit VR Big Endian', IsLittleEndian: false, IsExplicit: true, IsCompressed: false, IsLossy: false, ApplicationType: TransferSyntaxApplicationType.All, IsRetired: true }),
	'1.2.840.10008.1.2.1.98': new TransferSyntax({ ID: '1.2.840.10008.1.2.1.98', Name: 'Encapsulated Uncompressed Explicit VR Little Endian', IsLittleEndian: true, IsExplicit: true, IsCompressed: false, IsLossy: false, ApplicationType: TransferSyntaxApplicationType.All, IsRetired: false }),
	'1.2.840.10008.1.2.1.99': new TransferSyntax({ ID: '1.2.840.10008.1.2.1.99', Name: 'Deflated Explicit VR Little Endian', IsLittleEndian: true, IsExplicit: true, IsCompressed: true, IsLossy: false, ApplicationType: TransferSyntaxApplicationType.ALL, IsRetired: false }),
	'1.2.840.10008.1.2.4.50': new TransferSyntax({ ID: '1.2.840.10008.1.2.4.50', Name: 'JPEG Baseline (Process 1) (Lossy JPEG 8-bit Image Compression)', IsLittleEndian: true, IsExplicit: true, IsCompressed: true, IsLossy: true, ApplicationType: TransferSyntaxApplicationType.SingleFrame, IsRetired: false }),
	'1.2.840.10008.1.2.4.51': new TransferSyntax({ ID: '1.2.840.10008.1.2.4.51', Name: 'JPEG Extended (Process 2 & 4) (Lossy JPEG 12-bit Image Compression)', IsLittleEndian: true, IsExplicit: true, IsCompressed: true, IsLossy: true, ApplicationType: TransferSyntaxApplicationType.SingleFrame, IsRetired: false }),
	'1.2.840.10008.1.2.4.52': new TransferSyntax({ ID: '1.2.840.10008.1.2.4.52', Name: 'JPEG Extended (Process 3 & 5)', IsLittleEndian: true, IsExplicit: true, IsCompressed: true, IsLossy: true, ApplicationType: TransferSyntaxApplicationType.SingleFrame, IsRetired: true }),
	'1.2.840.10008.1.2.4.53': new TransferSyntax({ ID: '1.2.840.10008.1.2.4.53', Name: 'JPEG Spectral Selection Non-Hierarchical (Process 6 and 8)', IsLittleEndian: true, IsExplicit: true, IsCompressed: true, IsLossy: true, ApplicationType: TransferSyntaxApplicationType.SingleFrame, IsRetired: true }),
	'1.2.840.10008.1.2.4.54': new TransferSyntax({ ID: '1.2.840.10008.1.2.4.54', Name: 'JPEG Spectral Selection Non-Hierarchical (Process 7 and 9)', IsLittleEndian: true, IsExplicit: true, IsCompressed: true, IsLossy: true, ApplicationType: TransferSyntaxApplicationType.SingleFrame, IsRetired: true }),
	'1.2.840.10008.1.2.4.55': new TransferSyntax({ ID: '1.2.840.10008.1.2.4.55', Name: 'JPEG Full Progression Non-Hierarchical (Process 10 and 12)', IsLittleEndian: true, IsExplicit: true, IsCompressed: true, IsLossy: true, ApplicationType: TransferSyntaxApplicationType.SingleFrame, IsRetired: true }),
	'1.2.840.10008.1.2.4.56': new TransferSyntax({ ID: '1.2.840.10008.1.2.4.56', Name: 'JPEG Full Progression Non-Hierarchical (Process 11 and 13)', IsLittleEndian: true, IsExplicit: true, IsCompressed: true, IsLossy: true, ApplicationType: TransferSyntaxApplicationType.SingleFrame, IsRetired: true }),
	'1.2.840.10008.1.2.4.57': new TransferSyntax({ ID: '1.2.840.10008.1.2.4.57', Name: 'JPEG Lossless (Non-hierarchical)', IsLittleEndian: true, IsExplicit: true, IsCompressed: true, IsLossy: false, ApplicationType: TransferSyntaxApplicationType.SingleFrame, IsRetired: false }),
	'1.2.840.10008.1.2.4.58': new TransferSyntax({ ID: '1.2.840.10008.1.2.4.58', Name: 'JPEG Lossless Non-hierarchical (Processes 15)', IsLittleEndian: true, IsExplicit: true, IsCompressed: true, IsLossy: false, ApplicationType: TransferSyntaxApplicationType.SingleFrame, IsRetired: true }),
	'1.2.840.10008.1.2.4.59': new TransferSyntax({ ID: '1.2.840.10008.1.2.4.59', Name: 'JPEG Extended Hierarchical (Processes 16 and 18)', IsLittleEndian: true, IsExplicit: true, IsCompressed: true, IsLossy: true, ApplicationType: TransferSyntaxApplicationType.SingleFrame, IsRetired: true }),
	'1.2.840.10008.1.2.4.60': new TransferSyntax({ ID: '1.2.840.10008.1.2.4.60', Name: 'JPEG Extended Hierarchical (Processes 17 and 19)', IsLittleEndian: true, IsExplicit: true, IsCompressed: true, IsLossy: true, ApplicationType: TransferSyntaxApplicationType.SingleFrame, IsRetired: true }),
	'1.2.840.10008.1.2.4.61': new TransferSyntax({ ID: '1.2.840.10008.1.2.4.61', Name: 'JPEG Spectral Selection Hierarchical (Processes 20 and 22)', IsLittleEndian: true, IsExplicit: true, IsCompressed: true, IsLossy: true, ApplicationType: TransferSyntaxApplicationType.SingleFrame, IsRetired: true }),
	'1.2.840.10008.1.2.4.62': new TransferSyntax({ ID: '1.2.840.10008.1.2.4.62', Name: 'JPEG Spectral Selection Hierarchical (Processes 21 and 23)', IsLittleEndian: true, IsExplicit: true, IsCompressed: true, IsLossy: true, ApplicationType: TransferSyntaxApplicationType.SingleFrame, IsRetired: true }),
	'1.2.840.10008.1.2.4.63': new TransferSyntax({ ID: '1.2.840.10008.1.2.4.63', Name: 'JPEG Full Progression Hierarchical (Processes 24 and 26)', IsLittleEndian: true, IsExplicit: true, IsCompressed: true, IsLossy: true, ApplicationType: TransferSyntaxApplicationType.SingleFrame, IsRetired: true }),
	'1.2.840.10008.1.2.4.64': new TransferSyntax({ ID: '1.2.840.10008.1.2.4.64', Name: 'JPEG Full Progression Hierarchical (Processes 25 and 27)', IsLittleEndian: true, IsExplicit: true, IsCompressed: true, IsLossy: true, ApplicationType: TransferSyntaxApplicationType.SingleFrame, IsRetired: true }),
	'1.2.840.10008.1.2.4.65': new TransferSyntax({ ID: '1.2.840.10008.1.2.4.65', Name: 'JPEG Lossless Hierarchical (Processes 28)', IsLittleEndian: true, IsExplicit: true, IsCompressed: true, IsLossy: false, ApplicationType: TransferSyntaxApplicationType.SingleFrame, IsRetired: true }),
	'1.2.840.10008.1.2.4.66': new TransferSyntax({ ID: '1.2.840.10008.1.2.4.66', Name: 'JPEG Lossless Hierarchical (Processes 29)', IsLittleEndian: true, IsExplicit: true, IsCompressed: true, IsLossy: false, ApplicationType: TransferSyntaxApplicationType.SingleFrame, IsRetired: true }),
	'1.2.840.10008.1.2.4.70': new TransferSyntax({ ID: '1.2.840.10008.1.2.4.70', Name: 'JPEG Lossless (Non-hierarchical) First Order Predication', IsLittleEndian: true, IsExplicit: true, IsCompressed: true, IsLossy: false, ApplicationType: TransferSyntaxApplicationType.SingleFrame, IsRetired: false }),
	'1.2.840.10008.1.2.4.80': new TransferSyntax({ ID: '1.2.840.10008.1.2.4.80', Name: 'JPEG-LS Lossless Image Compression', IsLittleEndian: true, IsExplicit: true, IsCompressed: true, IsLossy: false, ApplicationType: TransferSyntaxApplicationType.SingleFrame, IsRetired: false }),
	'1.2.840.10008.1.2.4.81': new TransferSyntax({ ID: '1.2.840.10008.1.2.4.81', Name: 'JPEG-LS Lossy (Near-Lossless) Image Compression', IsLittleEndian: true, IsExplicit: true, IsCompressed: true, IsLossy: true, ApplicationType: TransferSyntaxApplicationType.SingleFrame, IsRetired: false }),
	'1.2.840.10008.1.2.4.90': new TransferSyntax({ ID: '1.2.840.10008.1.2.4.90', Name: 'JPEG 2000 Image Compression (Lossless Only)', IsLittleEndian: true, IsExplicit: true, IsCompressed: true, IsLossy: false, ApplicationType: TransferSyntaxApplicationType.SingleFrame, IsRetired: false }),
	'1.2.840.10008.1.2.4.91': new TransferSyntax({ ID: '1.2.840.10008.1.2.4.91', Name: 'JPEG 2000 Image Compression', IsLittleEndian: true, IsExplicit: true, IsCompressed: true, IsLossy: true, ApplicationType: TransferSyntaxApplicationType.SingleFrame, IsRetired: false }),
	'1.2.840.10008.1.2.4.92': new TransferSyntax({ ID: '1.2.840.10008.1.2.4.92', Name: 'JPEG 2000 Part 2 Multi-component Image Compression (Lossless Only)', IsLittleEndian: true, IsExplicit: true, IsCompressed: true, IsLossy: false, ApplicationType: TransferSyntaxApplicationType.SingleAndMultiFrame, IsRetired: false }),
	'1.2.840.10008.1.2.4.93': new TransferSyntax({ ID: '1.2.840.10008.1.2.4.93', Name: 'JPEG 2000 Part 2 Multi-component Image Compression', IsLittleEndian: true, IsExplicit: true, IsCompressed: true, IsLossy: true, ApplicationType: TransferSyntaxApplicationType.SingleAndMultiFrame, IsRetired: false }),
	'1.2.840.10008.1.2.4.94': new TransferSyntax({ ID: '1.2.840.10008.1.2.4.94', Name: 'JPIP Referenced', IsLittleEndian: true, IsExplicit: true, IsCompressed: false, IsLossy: false, ApplicationType: TransferSyntaxApplicationType.SingleFrame, IsRetired: false }),
	'1.2.840.10008.1.2.4.95': new TransferSyntax({ ID: '1.2.840.10008.1.2.4.95', Name: 'JJPIP Referenced Deflate', IsLittleEndian: true, IsExplicit: true, IsCompressed: true, IsLossy: true, ApplicationType: TransferSyntaxApplicationType.SingleFrame, IsRetired: false }),
	'1.2.840.10008.1.2.4.100': new TransferSyntax({ ID: '1.2.840.10008.1.2.4.100', Name: 'MPEG2 Main Profile and Level', IsLittleEndian: true, IsExplicit: true, IsCompressed: true, IsLossy: true, ApplicationType: TransferSyntaxApplicationType.Video, IsRetired: false }),
	'1.2.840.10008.1.2.4.100.1': new TransferSyntax({ ID: '1.2.840.10008.1.2.4.100.1', Name: 'Fragmentable MPEG2 Main Profile and Level', IsLittleEndian: true, IsExplicit: true, IsCompressed: true, IsLossy: true, ApplicationType: TransferSyntaxApplicationType.Video, IsRetired: false }),
	'1.2.840.10008.1.2.4.101': new TransferSyntax({ ID: '1.2.840.10008.1.2.4.101', Name: 'MPEG2 Main Profile and High Level', IsLittleEndian: true, IsExplicit: true, IsCompressed: true, IsLossy: true, ApplicationType: TransferSyntaxApplicationType.Video, IsRetired: false }),
	'1.2.840.10008.1.2.4.101.1': new TransferSyntax({ ID: '1.2.840.10008.1.2.4.101.1', Name: 'Fragmentable MPEG2 Main Profile and High Level', IsLittleEndian: true, IsExplicit: true, IsCompressed: true, IsLossy: true, ApplicationType: TransferSyntaxApplicationType.Video, IsRetired: false }),
	'1.2.840.10008.1.2.4.102': new TransferSyntax({ ID: '1.2.840.10008.1.2.4.102', Name: 'MPEG-4 AVC H.264 High Profile Level 4.1', IsLittleEndian: true, IsExplicit: true, IsCompressed: true, IsLossy: false, ApplicationType: TransferSyntaxApplicationType.Video, IsRetired: false }),
	'1.2.840.10008.1.2.4.102.1': new TransferSyntax({ ID: '1.2.840.10008.1.2.4.102.1', Name: 'Fragmentable MPEG-4 AVC H.264 High Profile Level 4.1', IsLittleEndian: true, IsExplicit: true, IsCompressed: true, IsLossy: false, ApplicationType: TransferSyntaxApplicationType.Video, IsRetired: false }),
	'1.2.840.10008.1.2.4.103': new TransferSyntax({ ID: '1.2.840.10008.1.2.4.103', Name: 'MPEG-4 AVC H.264 BD-compatible High Profile Level 4.1', IsLittleEndian: true, IsExplicit: true, IsCompressed: true, IsLossy: false, ApplicationType: TransferSyntaxApplicationType.Video, IsRetired: false }),
	'1.2.840.10008.1.2.4.103.1': new TransferSyntax({ ID: '1.2.840.10008.1.2.4.103.1', Name: 'Fragmentable MPEG-4 AVC H.264 BD-compatible High Profile Level 4.1', IsLittleEndian: true, IsExplicit: true, IsCompressed: true, IsLossy: false, ApplicationType: TransferSyntaxApplicationType.Video, IsRetired: false }),
	'1.2.840.10008.1.2.4.104': new TransferSyntax({ ID: '1.2.840.10008.1.2.4.104', Name: 'MPEG-4 AVC H.264 High Profile Level 4.2 For 2D Video', IsLittleEndian: true, IsExplicit: true, IsCompressed: true, IsLossy: false, ApplicationType: TransferSyntaxApplicationType.Video, IsRetired: false }),
	'1.2.840.10008.1.2.4.104.1': new TransferSyntax({ ID: '1.2.840.10008.1.2.4.104.1', Name: 'Fragmentable MPEG-4 AVC H.264 High Profile Level 4.2 For 2D Video', IsLittleEndian: true, IsExplicit: true, IsCompressed: true, IsLossy: false, ApplicationType: TransferSyntaxApplicationType.Video, IsRetired: false }),
	'1.2.840.10008.1.2.4.105': new TransferSyntax({ ID: '1.2.840.10008.1.2.4.105', Name: 'MPEG-4 AVC H.264 High Profile Level 4.2 For 3D Video', IsLittleEndian: true, IsExplicit: true, IsCompressed: true, IsLossy: false, ApplicationType: TransferSyntaxApplicationType.Video, IsRetired: false }),
	'1.2.840.10008.1.2.4.105.1': new TransferSyntax({ ID: '1.2.840.10008.1.2.4.105.1', Name: 'Fragmentable MPEG-4 AVC H.264 High Profile Level 4.2 For 3D Video', IsLittleEndian: true, IsExplicit: true, IsCompressed: true, IsLossy: false, ApplicationType: TransferSyntaxApplicationType.Video, IsRetired: false }),
	'1.2.840.10008.1.2.4.106': new TransferSyntax({ ID: '1.2.840.10008.1.2.4.106', Name: 'MPEG-4 AVC H.264 Stereo High Profile Level 4.2', IsLittleEndian: true, IsExplicit: true, IsCompressed: true, IsLossy: false, ApplicationType: TransferSyntaxApplicationType.Video, IsRetired: false }),
	'1.2.840.10008.1.2.4.106.1': new TransferSyntax({ ID: '1.2.840.10008.1.2.4.106.1', Name: 'Fragmentable MPEG-4 AVC H.264 Stereo High Profile Level 4.2', IsLittleEndian: true, IsExplicit: true, IsCompressed: true, IsLossy: false, ApplicationType: TransferSyntaxApplicationType.Video, IsRetired: false }),
	'1.2.840.10008.1.2.4.107': new TransferSyntax({ ID: '1.2.840.10008.1.2.4.107', Name: 'HEVC H.265 Main Profile Level 5.1', IsLittleEndian: true, IsExplicit: true, IsCompressed: true, IsLossy: false, ApplicationType: TransferSyntaxApplicationType.Video, IsRetired: false }),
	'1.2.840.10008.1.2.4.108': new TransferSyntax({ ID: '1.2.840.10008.1.2.4.108', Name: 'HEVC H.265 Main 10 Profile Level 5.1', IsLittleEndian: true, IsExplicit: true, IsCompressed: true, IsLossy: false, ApplicationType: TransferSyntaxApplicationType.Video, IsRetired: false }),
	'1.2.840.10008.1.2.4.110': new TransferSyntax({ ID: '1.2.840.10008.1.2.4.110', Name: 'JPEG XL Lossless', IsLittleEndian: true, IsExplicit: true, IsCompressed: true, IsLossy: false, ApplicationType: TransferSyntaxApplicationType.SingleFrame, IsRetired: false }),
	'1.2.840.10008.1.2.4.111': new TransferSyntax({ ID: '1.2.840.10008.1.2.4.111', Name: 'JPEG XL JPEG Recompression', IsLittleEndian: true, IsExplicit: true, IsCompressed: true, IsLossy: false, ApplicationType: TransferSyntaxApplicationType.SingleFrame, IsRetired: false }),
	'1.2.840.10008.1.2.4.112': new TransferSyntax({ ID: '1.2.840.10008.1.2.4.112', Name: 'JPEG XL', IsLittleEndian: true, IsExplicit: true, IsCompressed: true, IsLossy: true, ApplicationType: TransferSyntaxApplicationType.SingleFrame, IsRetired: false }),
	'1.2.840.10008.1.2.4.201': new TransferSyntax({ ID: '1.2.840.10008.1.2.4.201', Name: 'High-Throughput JPEG 2000 Image Compression (Lossless Only)', IsLittleEndian: true, IsExplicit: true, IsCompressed: true, IsLossy: false, ApplicationType: TransferSyntaxApplicationType.SingleFrame, IsRetired: false }),
	'1.2.840.10008.1.2.4.202': new TransferSyntax({ ID: '1.2.840.10008.1.2.4.202', Name: 'High-Throughput JPEG 2000 with RPCL Options Image Compression (Lossless Only)', IsLittleEndian: true, IsExplicit: true, IsCompressed: true, IsLossy: false, ApplicationType: TransferSyntaxApplicationType.SingleFrame, IsRetired: false }),
	'1.2.840.10008.1.2.4.203': new TransferSyntax({ ID: '1.2.840.10008.1.2.4.203', Name: 'High-Throughput JPEG 2000 Image Compression', IsLittleEndian: true, IsExplicit: true, IsCompressed: true, IsLossy: true, ApplicationType: TransferSyntaxApplicationType.SingleFrame, IsRetired: false }),
	'1.2.840.10008.1.2.4.204': new TransferSyntax({ ID: '1.2.840.10008.1.2.4.204', Name: 'JPIP HTJ2K Referenced', IsLittleEndian: true, IsExplicit: true, IsCompressed: false, IsLossy: false, ApplicationType: TransferSyntaxApplicationType.SingleFrame, IsRetired: false }),
	'1.2.840.10008.1.2.4.205': new TransferSyntax({ ID: '1.2.840.10008.1.2.4.205', Name: 'JPIP HTJ2K Referenced Deflate', IsLittleEndian: true, IsExplicit: true, IsCompressed: true, IsLossy: true, ApplicationType: TransferSyntaxApplicationType.SingleFrame, IsRetired: false }),
	'1.2.840.10008.1.2.5': new TransferSyntax({ ID: '1.2.840.10008.1.2.5', Name: 'RLE Lossless', IsLittleEndian: true, IsExplicit: true, IsCompressed: true, IsLossy: false, ApplicationType: TransferSyntaxApplicationType.SingleFrame, IsRetired: false }),
	'1.2.840.10008.1.2.6.1': new TransferSyntax({ ID: '1.2.840.10008.1.2.6.1', Name: 'RFC 2557 MIME encapsulation', IsLittleEndian: true, IsExplicit: true, IsCompressed: false, IsLossy: false, ApplicationType: TransferSyntaxApplicationType.Other, IsRetired: true }),
	'1.2.840.10008.1.2.6.2': new TransferSyntax({ ID: '1.2.840.10008.1.2.6.2', Name: 'XML Encoding', IsLittleEndian: true, IsExplicit: true, IsCompressed: false, IsLossy: false, ApplicationType: TransferSyntaxApplicationType.XML, IsRetired: true }),
	'1.2.840.10008.1.2.7.1': new TransferSyntax({ ID: '1.2.840.10008.1.2.7.1', Name: 'SMPTE ST 2110-20 Uncompressed Progressive Active Video', IsLittleEndian: true, IsExplicit: true, IsCompressed: false, IsLossy: false, ApplicationType: TransferSyntaxApplicationType.Video, IsRetired: false }),
	'1.2.840.10008.1.2.7.2': new TransferSyntax({ ID: '1.2.840.10008.1.2.7.2', Name: 'SMPTE ST 2110-20 Uncompressed Interlaced Active Video', IsLittleEndian: true, IsExplicit: true, IsCompressed: false, IsLossy: false, ApplicationType: TransferSyntaxApplicationType.Video, IsRetired: false }),
	'1.2.840.10008.1.2.7.3': new TransferSyntax({ ID: '1.2.840.10008.1.2.7.3', Name: 'SMPTE ST 2110-30 PCM Digital Audio', IsLittleEndian: true, IsExplicit: true, IsCompressed: false, IsLossy: false, ApplicationType: TransferSyntaxApplicationType.Audio, IsRetired: false }),
	'1.2.840.10008.1.2.8.1': new TransferSyntax({ ID: '1.2.840.10008.1.2.8.1', Name: 'Deflated Image Frame Compression', IsLittleEndian: true, IsExplicit: true, IsCompressed: true, IsLossy: false, ApplicationType: TransferSyntaxApplicationType.SingleAndMultiFrame, IsRetired: false }),
	'1.2.840.10008.1.20': new TransferSyntax({ ID: '1.2.840.10008.1.20', Name: 'Papyrus 3 Implicit VR Little Endian', IsLittleEndian: true, IsExplicit: true, IsCompressed: false, IsLossy: false, ApplicationType: TransferSyntaxApplicationType.Other, IsRetired: true }),
	'1.2.840.113619.5.2': new TransferSyntax({ ID: '1.2.840.113619.5.2', Name: 'GE Implicit VR Little Endian Except Big Endian Pixels', IsLittleEndian: true, IsExplicit: false, IsCompressed: false, IsLossy: false, ApplicationType: TransferSyntaxApplicationType.Other, IsRetired: false }),
	'1.3.6.1.4.1.5962.300.1': new TransferSyntax({ ID: '1.3.6.1.4.1.5962.300.1', Name: 'PixelMed Bzip2 Explicit VR Little Endian', IsLittleEndian: true, IsExplicit: true, IsCompressed: false, IsLossy: false, ApplicationType: TransferSyntaxApplicationType.Other, IsRetired: false }),
	'1.3.6.1.4.1.5962.300.2': new TransferSyntax({ ID: '1.3.6.1.4.1.5962.300.2', Name: 'PixelMed Encapsulated Raw Little Endian', IsLittleEndian: true, IsExplicit: true, IsCompressed: false, IsLossy: false, ApplicationType: TransferSyntaxApplicationType.Other, IsRetired: false }),
	'1.2.840.113704.7.0.4.4': new TransferSyntax({ ID: '1.2.840.113704.7.0.4.4', Name: 'Algotec Compressed', IsLittleEndian: true, IsExplicit: true, IsCompressed: true, IsLossy: false, ApplicationType: TransferSyntaxApplicationType.Other, IsRetired: false }),
	'1.2.840.113711.1.2.100.1': new TransferSyntax({ ID: '1.2.840.113711.1.2.100.1', Name: 'ALI Wavelet', IsLittleEndian: true, IsExplicit: true, IsCompressed: false, IsLossy: false, ApplicationType: TransferSyntaxApplicationType.Other, IsRetired: false })
};
