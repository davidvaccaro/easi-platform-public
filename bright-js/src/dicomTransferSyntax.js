//
// TransferSyntax.js - 1.0.0
//
// DICOM Transfer Syntax Class 
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

export default class DicomTransferSyntax {

    // Find a transfer-syntax by the tag-id (e.g. 00020000 = (0002, 0000))
    static find(id) {

        // Lookup the transfer-syntax
        return TransferSyntaxes[id];

    };

    constructor(data) {
        Object.assign(this, data);
    }

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
	'0': new DicomTransferSyntax({ ID: '0', Name: 'None', IsLittleEndian: false, IsExplicit: false, IsCompressed: false, IsLossy: false, ApplicationType: TransferSyntaxApplicationType.All, IsRetired: false }),
	'1.2.840.10008.1.2': new DicomTransferSyntax({ ID: '1.2.840.10008.1.2', Name: 'Implicit VR Little Endian', IsLittleEndian: true, IsExplicit: false, IsCompressed: false, IsLossy: false, ApplicationType: TransferSyntaxApplicationType.All, IsRetired: false }),
	'1.2.840.10008.1.2.1': new DicomTransferSyntax({ ID: '1.2.840.10008.1.2.1', Name: 'Explicit VR Little Endian', IsLittleEndian: true, IsExplicit: true, IsCompressed: false, IsLossy: false, ApplicationType: TransferSyntaxApplicationType.All, IsRetired: false }),
	'1.2.840.10008.1.2.2': new DicomTransferSyntax({ ID: '1.2.840.10008.1.2.2', Name: 'Explicit VR Big Endian', IsLittleEndian: false, IsExplicit: true, IsCompressed: false, IsLossy: false, ApplicationType: TransferSyntaxApplicationType.All, IsRetired: true }),
	'1.2.840.10008.1.2.1.98': new DicomTransferSyntax({ ID: '1.2.840.10008.1.2.1.98', Name: 'Encapsulated Uncompressed Explicit VR Little Endian', IsLittleEndian: true, IsExplicit: true, IsCompressed: false, IsLossy: false, ApplicationType: TransferSyntaxApplicationType.All, IsRetired: false }),
	'1.2.840.10008.1.2.1.99': new DicomTransferSyntax({ ID: '1.2.840.10008.1.2.1.99', Name: 'Deflated Explicit VR Little Endian', IsLittleEndian: true, IsExplicit: true, IsCompressed: true, IsLossy: false, ApplicationType: TransferSyntaxApplicationType.ALL, IsRetired: false }),
	'1.2.840.10008.1.2.4.50': new DicomTransferSyntax({ ID: '1.2.840.10008.1.2.4.50', Name: 'JPEG Baseline (Process 1) (Lossy JPEG 8-bit Image Compression)', IsLittleEndian: true, IsExplicit: true, IsCompressed: true, IsLossy: true, ApplicationType: TransferSyntaxApplicationType.SingleFrame, IsRetired: false }),
	'1.2.840.10008.1.2.4.51': new DicomTransferSyntax({ ID: '1.2.840.10008.1.2.4.51', Name: 'JPEG Extended (Process 2 & 4) (Lossy JPEG 12-bit Image Compression)', IsLittleEndian: true, IsExplicit: true, IsCompressed: true, IsLossy: true, ApplicationType: TransferSyntaxApplicationType.SingleFrame, IsRetired: false }),
	'1.2.840.10008.1.2.4.52': new DicomTransferSyntax({ ID: '1.2.840.10008.1.2.4.52', Name: 'JPEG Extended (Process 3 & 5)', IsLittleEndian: true, IsExplicit: true, IsCompressed: true, IsLossy: true, ApplicationType: TransferSyntaxApplicationType.SingleFrame, IsRetired: true }),
	'1.2.840.10008.1.2.4.53': new DicomTransferSyntax({ ID: '1.2.840.10008.1.2.4.53', Name: 'JPEG Spectral Selection Non-Hierarchical (Process 6 and 8)', IsLittleEndian: true, IsExplicit: true, IsCompressed: true, IsLossy: true, ApplicationType: TransferSyntaxApplicationType.SingleFrame, IsRetired: true }),
	'1.2.840.10008.1.2.4.54': new DicomTransferSyntax({ ID: '1.2.840.10008.1.2.4.54', Name: 'JPEG Spectral Selection Non-Hierarchical (Process 7 and 9)', IsLittleEndian: true, IsExplicit: true, IsCompressed: true, IsLossy: true, ApplicationType: TransferSyntaxApplicationType.SingleFrame, IsRetired: true }),
	'1.2.840.10008.1.2.4.55': new DicomTransferSyntax({ ID: '1.2.840.10008.1.2.4.55', Name: 'JPEG Full Progression Non-Hierarchical (Process 10 and 12)', IsLittleEndian: true, IsExplicit: true, IsCompressed: true, IsLossy: true, ApplicationType: TransferSyntaxApplicationType.SingleFrame, IsRetired: true }),
	'1.2.840.10008.1.2.4.56': new DicomTransferSyntax({ ID: '1.2.840.10008.1.2.4.56', Name: 'JPEG Full Progression Non-Hierarchical (Process 11 and 13)', IsLittleEndian: true, IsExplicit: true, IsCompressed: true, IsLossy: true, ApplicationType: TransferSyntaxApplicationType.SingleFrame, IsRetired: true }),
	'1.2.840.10008.1.2.4.57': new DicomTransferSyntax({ ID: '1.2.840.10008.1.2.4.57', Name: 'JPEG Lossless (Non-hierarchical)', IsLittleEndian: true, IsExplicit: true, IsCompressed: true, IsLossy: false, ApplicationType: TransferSyntaxApplicationType.SingleFrame, IsRetired: false }),
	'1.2.840.10008.1.2.4.58': new DicomTransferSyntax({ ID: '1.2.840.10008.1.2.4.58', Name: 'JPEG Lossless Non-hierarchical (Processes 15)', IsLittleEndian: true, IsExplicit: true, IsCompressed: true, IsLossy: false, ApplicationType: TransferSyntaxApplicationType.SingleFrame, IsRetired: true }),
	'1.2.840.10008.1.2.4.59': new DicomTransferSyntax({ ID: '1.2.840.10008.1.2.4.59', Name: 'JPEG Extended Hierarchical (Processes 16 and 18)', IsLittleEndian: true, IsExplicit: true, IsCompressed: true, IsLossy: true, ApplicationType: TransferSyntaxApplicationType.SingleFrame, IsRetired: true }),
	'1.2.840.10008.1.2.4.60': new DicomTransferSyntax({ ID: '1.2.840.10008.1.2.4.60', Name: 'JPEG Extended Hierarchical (Processes 17 and 19)', IsLittleEndian: true, IsExplicit: true, IsCompressed: true, IsLossy: true, ApplicationType: TransferSyntaxApplicationType.SingleFrame, IsRetired: true }),
	'1.2.840.10008.1.2.4.61': new DicomTransferSyntax({ ID: '1.2.840.10008.1.2.4.61', Name: 'JPEG Spectral Selection Hierarchical (Processes 20 and 22)', IsLittleEndian: true, IsExplicit: true, IsCompressed: true, IsLossy: true, ApplicationType: TransferSyntaxApplicationType.SingleFrame, IsRetired: true }),
	'1.2.840.10008.1.2.4.62': new DicomTransferSyntax({ ID: '1.2.840.10008.1.2.4.62', Name: 'JPEG Spectral Selection Hierarchical (Processes 21 and 23)', IsLittleEndian: true, IsExplicit: true, IsCompressed: true, IsLossy: true, ApplicationType: TransferSyntaxApplicationType.SingleFrame, IsRetired: true }),
	'1.2.840.10008.1.2.4.63': new DicomTransferSyntax({ ID: '1.2.840.10008.1.2.4.63', Name: 'JPEG Full Progression Hierarchical (Processes 24 and 26)', IsLittleEndian: true, IsExplicit: true, IsCompressed: true, IsLossy: true, ApplicationType: TransferSyntaxApplicationType.SingleFrame, IsRetired: true }),
	'1.2.840.10008.1.2.4.64': new DicomTransferSyntax({ ID: '1.2.840.10008.1.2.4.64', Name: 'JPEG Full Progression Hierarchical (Processes 25 and 27)', IsLittleEndian: true, IsExplicit: true, IsCompressed: true, IsLossy: true, ApplicationType: TransferSyntaxApplicationType.SingleFrame, IsRetired: true }),
	'1.2.840.10008.1.2.4.65': new DicomTransferSyntax({ ID: '1.2.840.10008.1.2.4.65', Name: 'JPEG Lossless Hierarchical (Processes 28)', IsLittleEndian: true, IsExplicit: true, IsCompressed: true, IsLossy: false, ApplicationType: TransferSyntaxApplicationType.SingleFrame, IsRetired: true }),
	'1.2.840.10008.1.2.4.66': new DicomTransferSyntax({ ID: '1.2.840.10008.1.2.4.66', Name: 'JPEG Lossless Hierarchical (Processes 29)', IsLittleEndian: true, IsExplicit: true, IsCompressed: true, IsLossy: false, ApplicationType: TransferSyntaxApplicationType.SingleFrame, IsRetired: true }),
	'1.2.840.10008.1.2.4.70': new DicomTransferSyntax({ ID: '1.2.840.10008.1.2.4.70', Name: 'JPEG Lossless (Non-hierarchical) First Order Predication', IsLittleEndian: true, IsExplicit: true, IsCompressed: true, IsLossy: false, ApplicationType: TransferSyntaxApplicationType.SingleFrame, IsRetired: false }),
	'1.2.840.10008.1.2.4.80': new DicomTransferSyntax({ ID: '1.2.840.10008.1.2.4.80', Name: 'JPEG-LS Lossless Image Compression', IsLittleEndian: true, IsExplicit: true, IsCompressed: true, IsLossy: false, ApplicationType: TransferSyntaxApplicationType.SingleFrame, IsRetired: false }),
	'1.2.840.10008.1.2.4.81': new DicomTransferSyntax({ ID: '1.2.840.10008.1.2.4.81', Name: 'JPEG-LS Lossy (Near-Lossless) Image Compression', IsLittleEndian: true, IsExplicit: true, IsCompressed: true, IsLossy: true, ApplicationType: TransferSyntaxApplicationType.SingleFrame, IsRetired: false }),
	'1.2.840.10008.1.2.4.90': new DicomTransferSyntax({ ID: '1.2.840.10008.1.2.4.90', Name: 'JPEG 2000 Image Compression (Lossless Only)', IsLittleEndian: true, IsExplicit: true, IsCompressed: true, IsLossy: false, ApplicationType: TransferSyntaxApplicationType.SingleFrame, IsRetired: false }),
	'1.2.840.10008.1.2.4.91': new DicomTransferSyntax({ ID: '1.2.840.10008.1.2.4.91', Name: 'JPEG 2000 Image Compression', IsLittleEndian: true, IsExplicit: true, IsCompressed: true, IsLossy: true, ApplicationType: TransferSyntaxApplicationType.SingleFrame, IsRetired: false }),
	'1.2.840.10008.1.2.4.92': new DicomTransferSyntax({ ID: '1.2.840.10008.1.2.4.92', Name: 'JPEG 2000 Part 2 Multi-component Image Compression (Lossless Only)', IsLittleEndian: true, IsExplicit: true, IsCompressed: true, IsLossy: false, ApplicationType: TransferSyntaxApplicationType.SingleAndMultiFrame, IsRetired: false }),
	'1.2.840.10008.1.2.4.93': new DicomTransferSyntax({ ID: '1.2.840.10008.1.2.4.93', Name: 'JPEG 2000 Part 2 Multi-component Image Compression', IsLittleEndian: true, IsExplicit: true, IsCompressed: true, IsLossy: true, ApplicationType: TransferSyntaxApplicationType.SingleAndMultiFrame, IsRetired: false }),
	'1.2.840.10008.1.2.4.94': new DicomTransferSyntax({ ID: '1.2.840.10008.1.2.4.94', Name: 'JPIP Referenced', IsLittleEndian: true, IsExplicit: true, IsCompressed: false, IsLossy: false, ApplicationType: TransferSyntaxApplicationType.SingleFrame, IsRetired: false }),
	'1.2.840.10008.1.2.4.95': new DicomTransferSyntax({ ID: '1.2.840.10008.1.2.4.95', Name: 'JJPIP Referenced Deflate', IsLittleEndian: true, IsExplicit: true, IsCompressed: true, IsLossy: true, ApplicationType: TransferSyntaxApplicationType.SingleFrame, IsRetired: false }),
	'1.2.840.10008.1.2.4.100': new DicomTransferSyntax({ ID: '1.2.840.10008.1.2.4.100', Name: 'MPEG2 Main Profile and Level', IsLittleEndian: true, IsExplicit: true, IsCompressed: true, IsLossy: true, ApplicationType: TransferSyntaxApplicationType.Video, IsRetired: false }),
	'1.2.840.10008.1.2.4.100.1': new DicomTransferSyntax({ ID: '1.2.840.10008.1.2.4.100.1', Name: 'Fragmentable MPEG2 Main Profile and Level', IsLittleEndian: true, IsExplicit: true, IsCompressed: true, IsLossy: true, ApplicationType: TransferSyntaxApplicationType.Video, IsRetired: false }),
	'1.2.840.10008.1.2.4.101': new DicomTransferSyntax({ ID: '1.2.840.10008.1.2.4.101', Name: 'MPEG2 Main Profile and High Level', IsLittleEndian: true, IsExplicit: true, IsCompressed: true, IsLossy: true, ApplicationType: TransferSyntaxApplicationType.Video, IsRetired: false }),
	'1.2.840.10008.1.2.4.101.1': new DicomTransferSyntax({ ID: '1.2.840.10008.1.2.4.101.1', Name: 'Fragmentable MPEG2 Main Profile and High Level', IsLittleEndian: true, IsExplicit: true, IsCompressed: true, IsLossy: true, ApplicationType: TransferSyntaxApplicationType.Video, IsRetired: false }),
	'1.2.840.10008.1.2.4.102': new DicomTransferSyntax({ ID: '1.2.840.10008.1.2.4.102', Name: 'MPEG-4 AVC H.264 High Profile Level 4.1', IsLittleEndian: true, IsExplicit: true, IsCompressed: true, IsLossy: false, ApplicationType: TransferSyntaxApplicationType.Video, IsRetired: false }),
	'1.2.840.10008.1.2.4.102.1': new DicomTransferSyntax({ ID: '1.2.840.10008.1.2.4.102.1', Name: 'Fragmentable MPEG-4 AVC H.264 High Profile Level 4.1', IsLittleEndian: true, IsExplicit: true, IsCompressed: true, IsLossy: false, ApplicationType: TransferSyntaxApplicationType.Video, IsRetired: false }),
	'1.2.840.10008.1.2.4.103': new DicomTransferSyntax({ ID: '1.2.840.10008.1.2.4.103', Name: 'MPEG-4 AVC H.264 BD-compatible High Profile Level 4.1', IsLittleEndian: true, IsExplicit: true, IsCompressed: true, IsLossy: false, ApplicationType: TransferSyntaxApplicationType.Video, IsRetired: false }),
	'1.2.840.10008.1.2.4.103.1': new DicomTransferSyntax({ ID: '1.2.840.10008.1.2.4.103.1', Name: 'Fragmentable MPEG-4 AVC H.264 BD-compatible High Profile Level 4.1', IsLittleEndian: true, IsExplicit: true, IsCompressed: true, IsLossy: false, ApplicationType: TransferSyntaxApplicationType.Video, IsRetired: false }),
	'1.2.840.10008.1.2.4.104': new DicomTransferSyntax({ ID: '1.2.840.10008.1.2.4.104', Name: 'MPEG-4 AVC H.264 High Profile Level 4.2 For 2D Video', IsLittleEndian: true, IsExplicit: true, IsCompressed: true, IsLossy: false, ApplicationType: TransferSyntaxApplicationType.Video, IsRetired: false }),
	'1.2.840.10008.1.2.4.104.1': new DicomTransferSyntax({ ID: '1.2.840.10008.1.2.4.104.1', Name: 'Fragmentable MPEG-4 AVC H.264 High Profile Level 4.2 For 2D Video', IsLittleEndian: true, IsExplicit: true, IsCompressed: true, IsLossy: false, ApplicationType: TransferSyntaxApplicationType.Video, IsRetired: false }),
	'1.2.840.10008.1.2.4.105': new DicomTransferSyntax({ ID: '1.2.840.10008.1.2.4.105', Name: 'MPEG-4 AVC H.264 High Profile Level 4.2 For 3D Video', IsLittleEndian: true, IsExplicit: true, IsCompressed: true, IsLossy: false, ApplicationType: TransferSyntaxApplicationType.Video, IsRetired: false }),
	'1.2.840.10008.1.2.4.105.1': new DicomTransferSyntax({ ID: '1.2.840.10008.1.2.4.105.1', Name: 'Fragmentable MPEG-4 AVC H.264 High Profile Level 4.2 For 3D Video', IsLittleEndian: true, IsExplicit: true, IsCompressed: true, IsLossy: false, ApplicationType: TransferSyntaxApplicationType.Video, IsRetired: false }),
	'1.2.840.10008.1.2.4.106': new DicomTransferSyntax({ ID: '1.2.840.10008.1.2.4.106', Name: 'MPEG-4 AVC H.264 Stereo High Profile Level 4.2', IsLittleEndian: true, IsExplicit: true, IsCompressed: true, IsLossy: false, ApplicationType: TransferSyntaxApplicationType.Video, IsRetired: false }),
	'1.2.840.10008.1.2.4.106.1': new DicomTransferSyntax({ ID: '1.2.840.10008.1.2.4.106.1', Name: 'Fragmentable MPEG-4 AVC H.264 Stereo High Profile Level 4.2', IsLittleEndian: true, IsExplicit: true, IsCompressed: true, IsLossy: false, ApplicationType: TransferSyntaxApplicationType.Video, IsRetired: false }),
	'1.2.840.10008.1.2.4.107': new DicomTransferSyntax({ ID: '1.2.840.10008.1.2.4.107', Name: 'HEVC H.265 Main Profile Level 5.1', IsLittleEndian: true, IsExplicit: true, IsCompressed: true, IsLossy: false, ApplicationType: TransferSyntaxApplicationType.Video, IsRetired: false }),
	'1.2.840.10008.1.2.4.108': new DicomTransferSyntax({ ID: '1.2.840.10008.1.2.4.108', Name: 'HEVC H.265 Main 10 Profile Level 5.1', IsLittleEndian: true, IsExplicit: true, IsCompressed: true, IsLossy: false, ApplicationType: TransferSyntaxApplicationType.Video, IsRetired: false }),
	'1.2.840.10008.1.2.5': new DicomTransferSyntax({ ID: '1.2.840.10008.1.2.5', Name: 'RLE Lossless', IsLittleEndian: true, IsExplicit: true, IsCompressed: true, IsLossy: false, ApplicationType: TransferSyntaxApplicationType.SingleFrame, IsRetired: false }),
	'1.2.840.10008.1.2.6.1': new DicomTransferSyntax({ ID: '1.2.840.10008.1.2.6.1', Name: 'RFC 2557 MIME encapsulation', IsLittleEndian: true, IsExplicit: true, IsCompressed: false, IsLossy: false, ApplicationType: TransferSyntaxApplicationType.Other, IsRetired: true }),
	'1.2.840.10008.1.2.6.2': new DicomTransferSyntax({ ID: '1.2.840.10008.1.2.6.2', Name: 'XML Encoding', IsLittleEndian: true, IsExplicit: true, IsCompressed: false, IsLossy: false, ApplicationType: TransferSyntaxApplicationType.XML, IsRetired: true }),
	'1.2.840.10008.1.2.7.1': new DicomTransferSyntax({ ID: '1.2.840.10008.1.2.7.1', Name: 'SMPTE ST 2110-20 Uncompressed Progressive Active Video', IsLittleEndian: true, IsExplicit: true, IsCompressed: false, IsLossy: false, ApplicationType: TransferSyntaxApplicationType.Video, IsRetired: false }),
	'1.2.840.10008.1.2.7.2': new DicomTransferSyntax({ ID: '1.2.840.10008.1.2.7.2', Name: 'SMPTE ST 2110-20 Uncompressed Interlaced Active Video', IsLittleEndian: true, IsExplicit: true, IsCompressed: false, IsLossy: false, ApplicationType: TransferSyntaxApplicationType.Video, IsRetired: false }),
	'1.2.840.10008.1.2.7.3': new DicomTransferSyntax({ ID: '1.2.840.10008.1.2.7.3', Name: 'SMPTE ST 2110-30 PCM Digital Audio', IsLittleEndian: true, IsExplicit: true, IsCompressed: false, IsLossy: false, ApplicationType: TransferSyntaxApplicationType.Audio, IsRetired: false }),
	'1.2.840.10008.1.20': new DicomTransferSyntax({ ID: '1.2.840.10008.1.20', Name: 'Papyrus 3 Implicit VR Little Endian', IsLittleEndian: true, IsExplicit: true, IsCompressed: false, IsLossy: false, ApplicationType: TransferSyntaxApplicationType.Other, IsRetired: true }),
	'1.2.840.113619.5.2': new DicomTransferSyntax({ ID: '1.2.840.113619.5.2', Name: 'GE Implicit VR Little Endian Except Big Endian Pixels', IsLittleEndian: true, IsExplicit: false, IsCompressed: false, IsLossy: false, ApplicationType: TransferSyntaxApplicationType.Other, IsRetired: false }),
	'1.3.6.1.4.1.5962.300.1': new DicomTransferSyntax({ ID: '1.3.6.1.4.1.5962.300.1', Name: 'PixelMed Bzip2 Explicit VR Little Endian', IsLittleEndian: true, IsExplicit: true, IsCompressed: false, IsLossy: false, ApplicationType: TransferSyntaxApplicationType.Other, IsRetired: false }),
	'1.3.6.1.4.1.5962.300.2': new DicomTransferSyntax({ ID: '1.3.6.1.4.1.5962.300.2', Name: 'PixelMed Encapsulated Raw Little Endian', IsLittleEndian: true, IsExplicit: true, IsCompressed: false, IsLossy: false, ApplicationType: TransferSyntaxApplicationType.Other, IsRetired: false }),
	'1.2.840.113704.7.0.4.4': new DicomTransferSyntax({ ID: '1.2.840.113704.7.0.4.4', Name: 'Algotec Compressed', IsLittleEndian: true, IsExplicit: true, IsCompressed: true, IsLossy: false, ApplicationType: TransferSyntaxApplicationType.Other, IsRetired: false }),
	'1.2.840.113711.1.2.100.1': new DicomTransferSyntax({ ID: '1.2.840.113711.1.2.100.1', Name: 'ALI Wavelet', IsLittleEndian: true, IsExplicit: true, IsCompressed: false, IsLossy: false, ApplicationType: TransferSyntaxApplicationType.Other, IsRetired: false })
};

export var TransferSyntax = {
	NONE: TransferSyntaxes['0'],
	ImplicitVRLittleEndian: TransferSyntaxes['1.2.840.10008.1.2'],
	ExplicitVRLittleEndian: TransferSyntaxes['1.2.840.10008.1.2.1'],
	ExplicitVRBigEndian: TransferSyntaxes['1.2.840.10008.1.2.2'],
	EncapsulatedUncompressedExplicitVRLittleEndian: TransferSyntaxes['1.2.840.10008.1.2.1.98'],
	DeflatedExplicitVRLittleEndian: TransferSyntaxes['1.2.840.10008.1.2.1.99'],
	JPEGBaseline8Bit: TransferSyntaxes['1.2.840.10008.1.2.4.50'],
	JPEGExtended12Bit: TransferSyntaxes['1.2.840.10008.1.2.4.51'],
	JPEGExtended35: TransferSyntaxes['1.2.840.10008.1.2.4.52'],
	JPEGSpectralSelectionNonHierarchical68: TransferSyntaxes['1.2.840.10008.1.2.4.53'],
	JPEGSpectralSelectionNonHierarchical79: TransferSyntaxes['1.2.840.10008.1.2.4.54'],
	JPEGFullProgressionNonHierarchical1012: TransferSyntaxes['1.2.840.10008.1.2.4.55'],
	JPEGFullProgressionNonHierarchical1113: TransferSyntaxes['1.2.840.10008.1.2.4.56'],
	JPEGLossless: TransferSyntaxes['1.2.840.10008.1.2.4.57'],
	JPEGLosslessNonHierarchical15: TransferSyntaxes['1.2.840.10008.1.2.4.58'],
	JPEGExtendedHierarchical1618: TransferSyntaxes['1.2.840.10008.1.2.4.59'],
	JPEGExtendedHierarchical1719: TransferSyntaxes['1.2.840.10008.1.2.4.60'],
	JPEGSpectralSelectionHierarchical2022: TransferSyntaxes['1.2.840.10008.1.2.4.61'],
	JPEGSpectralSelectionHierarchical2123: TransferSyntaxes['1.2.840.10008.1.2.4.62'],
	JPEGFullProgressionHierarchical2426: TransferSyntaxes['1.2.840.10008.1.2.4.63'],
	JPEGFullProgressionHierarchical2527: TransferSyntaxes['1.2.840.10008.1.2.4.64'],
	JPEGLosslessHierarchical28: TransferSyntaxes['1.2.840.10008.1.2.4.65'],
	JPEGLosslessHierarchical29: TransferSyntaxes['1.2.840.10008.1.2.4.66'],
	JPEGLosslessSV1: TransferSyntaxes['1.2.840.10008.1.2.4.70'],
	JPEGLSLossless: TransferSyntaxes['1.2.840.10008.1.2.4.80'],
	JPEGLSNearLossless: TransferSyntaxes['1.2.840.10008.1.2.4.81'],
	JPEG2000Lossless: TransferSyntaxes['1.2.840.10008.1.2.4.90'],
	JPEG2000: TransferSyntaxes['1.2.840.10008.1.2.4.91'],
	JPEG2000MCLossless: TransferSyntaxes['1.2.840.10008.1.2.4.92'],
	JPEG2000MC: TransferSyntaxes['1.2.840.10008.1.2.4.93'],
	JPIPReferenced: TransferSyntaxes['1.2.840.10008.1.2.4.94'],
	JPIPReferencedDeflate: TransferSyntaxes['1.2.840.10008.1.2.4.95'],
	MPEG2MPML: TransferSyntaxes['1.2.840.10008.1.2.4.100'],
	MPEG2MPMLF: TransferSyntaxes['1.2.840.10008.1.2.4.100.1'],
	MPEG2MPHL: TransferSyntaxes['1.2.840.10008.1.2.4.101'],
	MPEG2MPHLF: TransferSyntaxes['1.2.840.10008.1.2.4.101.1'],
	MPEG4HP41: TransferSyntaxes['1.2.840.10008.1.2.4.102'],
	MPEG4HP41F: TransferSyntaxes['1.2.840.10008.1.2.4.102.1'],
	MPEG4HP41BD: TransferSyntaxes['1.2.840.10008.1.2.4.103'],
	MPEG4HP41BDF: TransferSyntaxes['1.2.840.10008.1.2.4.103.1'],
	MPEG4HP422D: TransferSyntaxes['1.2.840.10008.1.2.4.104'],
	MPEG4HP422DF: TransferSyntaxes['1.2.840.10008.1.2.4.104.1'],
	MPEG4HP423D: TransferSyntaxes['1.2.840.10008.1.2.4.105'],
	MPEG4HP423DF: TransferSyntaxes['1.2.840.10008.1.2.4.105.1'],
	MPEG4HP42STEREO: TransferSyntaxes['1.2.840.10008.1.2.4.106'],
	MPEG4HP42STEREOF: TransferSyntaxes['1.2.840.10008.1.2.4.106.1'],
	HEVCMP51: TransferSyntaxes['1.2.840.10008.1.2.4.107'],
	HEVCM10P51: TransferSyntaxes['1.2.840.10008.1.2.4.108'],
	RLELossless: TransferSyntaxes['1.2.840.10008.1.2.5'],
	RFC2557MIMEEncapsulation: TransferSyntaxes['1.2.840.10008.1.2.6.1'],
	XMLEncoding: TransferSyntaxes['1.2.840.10008.1.2.6.2'],
	SMPTEST211020UncompressedProgressiveActiveVideo: TransferSyntaxes['1.2.840.10008.1.2.7.1'],
	SMPTEST211020UncompressedInterlacedActiveVideo: TransferSyntaxes['1.2.840.10008.1.2.7.2'],
	SMPTEST211030PCMDigitalAudio: TransferSyntaxes['1.2.840.10008.1.2.7.3'],
	Papyrus3ImplicitVRLittleEndian: TransferSyntaxes['1.2.840.10008.1.20'],
	GEImplicitVRLittleEndianExceptBigEndianPixels: TransferSyntaxes['1.2.840.113619.5.2'],
	PixelMedBzip2ExplicitVRLittleEndian: TransferSyntaxes['1.3.6.1.4.1.5962.300.1'],
	PixelMedEncapsulatedRawLittleEndian: TransferSyntaxes['1.3.6.1.4.1.5962.300.2'],
	AlgotecCompressed: TransferSyntaxes['1.2.840.113704.7.0.4.4'],
	ALIWavelet: TransferSyntaxes['1.2.840.113711.1.2.100.1']
};
