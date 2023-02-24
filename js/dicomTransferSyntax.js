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

var TransferSyntaxApplicationType = {
    SingleFrame: 'SingleFrame',
    MultiFrame: 'MultiFrame',
    SingleAndMultiFrame: 'SingleAndMultiFrame',
    Video: 'Video',
    Text: 'Text',
    Other: 'Other',
    XML: 'XML',
    All: 'All'
};

class DicomTransferSyntax {

    // Find a transfer-syntax by the tag-id (e.g. 00020000 = (0002, 0000))
    static find(id) {

        // Lookup the transfer-syntax
        var transferSyntax = syntax_type_lookup[id];

        // Validate the transfer-syntax
        if ((transferSyntax == undefined) || (transferSyntax == null))
            return undefined;

        // Return the transfer-syntax POJO
        return transferSyntax;

    };

    constructor(data) {
        Object.assign(this, data);
    }

};

var TransferSyntax = {

    // NONE DICOM Transfer Syntaxes
    NONE: new DicomTransferSyntax({
        ID: '0',
        Name: 'None',
        IsLittleEndian: false,
        IsExplicit: false,
        IsCompressed: false,
        IsLossy: false,
        ApplicationType: TransferSyntaxApplicationType.All,
        IsRetired: false
    }),

    // Uncompressed DICOM Transfer Syntaxes
    ImplicitVRLittleEndian: new DicomTransferSyntax({
        ID: '1.2.840.10008.1.2',
        Name: 'Implicit VR Little Endian',
        IsLittleEndian: true,
        IsExplicit: false,
        IsCompressed: false,
        IsLossy: false,
        ApplicationType: TransferSyntaxApplicationType.All,
        IsRetired: false
    }),
    ExplicitVRLittleEndian: new DicomTransferSyntax({
        ID: '1.2.840.10008.1.2.1',
        Name: 'Explicit VR Little Endian',
        IsLittleEndian: true,
        IsExplicit: true,
        IsCompressed: false,
        IsLossy: false,
        ApplicationType: TransferSyntaxApplicationType.All,
        IsRetired: false
    }),
    ExplicitVRBigEndian: new DicomTransferSyntax({
        ID: '1.2.840.10008.1.2.2',
        Name: 'Explicit VR Big Endian',
        IsLittleEndian: false,
        IsExplicit: true,
        IsCompressed: false,
        IsLossy: false,
        ApplicationType: TransferSyntaxApplicationType.All,
        IsRetired: false
    }),
    ExplicitVRLittleEndianDeflated: new DicomTransferSyntax({
        ID: '1.2.840.10008.1.2.1.99',
        Name: 'Deflated Explicit VR Little Endian',
        IsLittleEndian: true,
        IsExplicit: true,
        IsCompressed: true,
        IsLossy: false,
        ApplicationType: TransferSyntaxApplicationType.All,
        IsRetired: false
    }),

    // Lossy Comporessed DICOM Transfer Syntaxes
    JPEG8Baseline: new DicomTransferSyntax({
        ID: '1.2.840.10008.1.2.4.50',
        Name: 'JPEG Baseline (Lossy JPEG 8-bit Image Compression)',
        IsLittleEndian: true,
        IsExplicit: true,
        IsCompressed: true,
        IsLossy: true,
        ApplicationType: TransferSyntaxApplicationType.SingleFrame,
        IsRetired: false
    }),
    JPEG12Extended: new DicomTransferSyntax({
        ID: '1.2.840.10008.1.2.4.51',
        Name: 'JPEG Extended (Lossy JPEG 12-bit Image Compression)',
        IsLittleEndian: true,
        IsExplicit: true,
        IsCompressed: true,
        IsLossy: true,
        ApplicationType: TransferSyntaxApplicationType.SingleFrame,
        IsRetired: false
    }),
    JPEGLSLossy: new DicomTransferSyntax({
        ID: '1.2.840.10008.1.2.4.81',
        Name: 'JPEG-LS Lossy',
        IsLittleEndian: true,
        IsExplicit: true,
        IsCompressed: true,
        IsLossy: true,
        ApplicationType: TransferSyntaxApplicationType.SingleFrame,
        IsRetired: false
    }),
    JPEG2000Lossy: new DicomTransferSyntax({
        ID: '1.2.840.10008.1.2.4.91',
        Name: 'JPEG 2000 Lossy',
        IsLittleEndian: true,
        IsExplicit: true,
        IsCompressed: true,
        IsLossy: true,
        ApplicationType: TransferSyntaxApplicationType.SingleAndMultiFrame,
        IsRetired: false
    }),
    JPEG2000MultiComponent: new DicomTransferSyntax({
        ID: '1.2.840.10008.1.2.4.93',
        Name: 'JPEG 2000 Multicomponent Lossy',
        IsLittleEndian: true,
        IsExplicit: true,
        IsCompressed: true,
        IsLossy: true,
        ApplicationType: TransferSyntaxApplicationType.SingleAndMultiFrame,
        IsRetired: false
    }),
    JPIPReferenced: new DicomTransferSyntax({
        ID: '1.2.840.10008.1.2.4.94',
        Name: 'JPIP Referenced',
        IsLittleEndian: true,
        IsExplicit: true,
        IsCompressed: false,
        IsLossy: true,
        ApplicationType: TransferSyntaxApplicationType.SingleFrame,
        IsRetired: false
    }),
    JPIPReferencedDeflated: new DicomTransferSyntax({
        ID: '1.2.840.10008.1.2.4.95',
        Name: 'JPIP Referenced Deflate',
        IsLittleEndian: true,
        IsExplicit: true,
        IsCompressed: true,
        IsLossy: true,
        ApplicationType: TransferSyntaxApplicationType.SingleFrame,
        IsRetired: false
    }),

    // Lossless Comporessed DICOM Transfer Syntaxes
    JPEGLossless: new DicomTransferSyntax({
        ID: '1.2.840.10008.1.2.4.57',
        Name: 'JPEG Lossless (Non-hierarchical)',
        IsLittleEndian: true,
        IsExplicit: true,
        IsCompressed: true,
        IsLossy: false,
        ApplicationType: TransferSyntaxApplicationType.SingleFrame,
        IsRetired: false
    }),
    JPEGLosslessFirstOrder: new DicomTransferSyntax({
        ID: '1.2.840.10008.1.2.4.70',
        Name: 'JPEG Lossless (Non-hierarchical) First Order Predication',
        IsLittleEndian: true,
        IsExplicit: true,
        IsCompressed: true,
        IsLossy: false,
        ApplicationType: TransferSyntaxApplicationType.SingleFrame,
        IsRetired: false
    }),
    JPEGLSLossless: new DicomTransferSyntax({
        ID: '1.2.840.10008.1.2.4.80',
        Name: 'JPEG-LS Lossless',
        IsLittleEndian: true,
        IsExplicit: true,
        IsCompressed: true,
        IsLossy: false,
        ApplicationType: TransferSyntaxApplicationType.SingleFrame,
        IsRetired: false
    }),
    JPEG2000Lossless: new DicomTransferSyntax({
        ID: '1.2.840.10008.1.2.4.90',
        Name: 'JPEG 2000 Lossless',
        IsLittleEndian: true,
        IsExplicit: true,
        IsCompressed: true,
        IsLossy: false,
        ApplicationType: TransferSyntaxApplicationType.SingleAndMultiFrame,
        IsRetired: false
    }),
    JPEG2000LosslessMultiComponent: new DicomTransferSyntax({
        ID: '1.2.840.10008.1.2.4.92',
        Name: 'JPEG 2000 Multicomponent Lossless',
        IsLittleEndian: true,
        IsExplicit: true,
        IsCompressed: true,
        IsLossy: false,
        ApplicationType: TransferSyntaxApplicationType.SingleAndMultiFrame,
        IsRetired: false
    }),
    RLELossless: new DicomTransferSyntax({
        ID: '1.2.840.10008.1.2.5',
        Name: 'RLE Lossless',
        IsLittleEndian: true,
        IsExplicit: true,
        IsCompressed: true,
        IsLossy: false,
        ApplicationType: TransferSyntaxApplicationType.SingleFrame,
        IsRetired: false
    }),

    // Video Formats
    MPEG2: new DicomTransferSyntax({
        ID: '1.2.840.10008.1.2.4.100',
        Name: 'MPEG-2 (Main Level)',
        IsLittleEndian: true,
        IsExplicit: true,
        IsCompressed: true,
        IsLossy: true,
        ApplicationType:
            TransferSyntaxApplicationType.Video,
        IsRetired: false
    }),
    MPEG2HighLevel: new DicomTransferSyntax({
        ID: '1.2.840.10008.1.2.4.101',
        Name: 'MPEG-2 (High Level)',
        IsLittleEndian: true,
        IsExplicit: true,
        IsCompressed: true,
        IsLossy: true,
        ApplicationType:
            TransferSyntaxApplicationType.Video,
        IsRetired: false
    }),
    MPEG4: new DicomTransferSyntax({
        ID: '1.2.840.10008.1.2.4.102',
        Name: 'MPEG-4 AVC/H.264',
        IsLittleEndian: true,
        IsExplicit: true,
        IsCompressed: true,
        IsLossy: false,
        ApplicationType: TransferSyntaxApplicationType.Video,
        IsRetired: false
    }),
    MPEG4DBCompatible: new DicomTransferSyntax({
        ID: '1.2.840.10008.1.2.4.103',
        Name: 'MPEG-4 AVC/H.264 BD-compatible',
        IsLittleEndian: true,
        IsExplicit: true,
        IsCompressed: true,
        IsLossy: false,
        ApplicationType: TransferSyntaxApplicationType.Video,
        IsRetired: false
    }),
    MPEG4For2D: new DicomTransferSyntax({
        ID: '1.2.840.10008.1.2.4.104',
        Name: 'MPEG-4 For 2D Video',
        IsLittleEndian: true,
        IsExplicit: true,
        IsCompressed: true,
        IsLossy: false,
        ApplicationType: TransferSyntaxApplicationType.Video,
        IsRetired: false
    }),
    MPEG4For3D: new DicomTransferSyntax({
        ID: '1.2.840.10008.1.2.4.105',
        Name: 'MPEG-4 For 3D Video',
        IsLittleEndian: true,
        IsExplicit: true,
        IsCompressed: true,
        IsLossy: false,
        ApplicationType:
            TransferSyntaxApplicationType.Video,
        IsRetired: false
    }),
    MPEG4Stereo: new DicomTransferSyntax({
        ID: '1.2.840.10008.1.2.4.106',
        Name: 'MPEG-4 Stereo',
        IsLittleEndian: true,
        IsExplicit: true,
        IsCompressed: true,
        IsLossy: false,
        ApplicationType: TransferSyntaxApplicationType.Video,
        IsRetired: false
    }),
    HEVC: new DicomTransferSyntax({
        ID: '1.2.840.10008.1.2.4.107',
        Name: 'HEVC/H.265 Main Profile (Level 5.1)',
        IsLittleEndian: true,
        IsExplicit: true,
        IsCompressed: true,
        IsLossy: false,
        ApplicationType:
            TransferSyntaxApplicationType.Video,
        IsRetired: false
    }),
    HEVCMain10: new DicomTransferSyntax({
        ID: '1.2.840.10008.1.2.4.108',
        Name: 'HEVC/H.265 Main 10 Profile (Level 5.1)',
        IsLittleEndian: true,
        IsExplicit: true,
        IsCompressed: true,
        IsLossy: false,
        ApplicationType: TransferSyntaxApplicationType.Video,
        IsRetired: false
    }),

    // Document Encapsulation
    RFC2557MIMEEncapsulation: new DicomTransferSyntax({
        ID: '1.2.840.10008.1.2.6.1',
        Name: 'RFC 2557 MIME Encapsulation',
        IsLittleEndian: true,
        IsExplicit: true,
        IsCompressed: false,
        IsLossy: false,
        ApplicationType: TransferSyntaxApplicationType.Other,
        IsRetired: false
    }),
    XMLEncoded: new DicomTransferSyntax({
        ID: '1.2.840.10008.1.2.6.2',
        Name: 'XML Encoded',
        IsLittleEndian: true,
        IsExplicit: true,
        IsCompressed: false,
        IsLossy: false,
        ApplicationType: TransferSyntaxApplicationType.XML,
        IsRetired: false
    }),

    // Vendor Specific
    Papyrus3: new DicomTransferSyntax({
        ID: '1.2.840.10008.1.20',
        Name: 'Papyrus 3 Implicit VR Little Endian',
        IsLittleEndian: true,
        IsExplicit: true,
        IsCompressed: false,
        IsLossy: false,
        ApplicationType: TransferSyntaxApplicationType.Other,
        IsRetired: false
    }),
    GEImplicitVRWithBigEndianPixels: new DicomTransferSyntax({
        ID: '1.2.840.113619.5.2',
        Name: 'GE Implicit VR Little Endian Except Big Endian Pixels',
        IsLittleEndian: true,
        IsExplicit: false,
        IsCompressed: false,
        IsLossy: false,
        ApplicationType: TransferSyntaxApplicationType.Other,
        IsRetired: false
    }),
    PixelMedBzip2: new DicomTransferSyntax({
        ID: '1.3.6.1.4.1.5962.300.1',
        Name: 'PixelMed Bzip2 Explicit VR Little Endian',
        IsLittleEndian: true,
        IsExplicit: true,
        IsCompressed: false,
        IsLossy: false,
        ApplicationType: TransferSyntaxApplicationType.Other,
        IsRetired: false
    }),
    PixelMedEncapsulated: new DicomTransferSyntax({
        ID: '1.3.6.1.4.1.5962.300.2',
        Name: 'PixelMed Encapsulated Raw Little Endian',
        IsLittleEndian: true,
        IsExplicit: true,
        IsCompressed: false,
        IsLossy: false,
        ApplicationType: TransferSyntaxApplicationType.Other,
        IsRetired: false
    }),
    AlgotecCompressed: new DicomTransferSyntax({
        ID: '1.2.840.113704.7.0.4.4',
        Name: 'Algotec Compressed',
        IsLittleEndian: true,
        IsExplicit: true,
        IsCompressed: false,
        IsLossy: false,
        ApplicationType: TransferSyntaxApplicationType.Other,
        IsRetired: false
    }),
    ALIWavelet: new DicomTransferSyntax({
        ID: '1.2.840.113711.1.2.100.1',
        Name: 'ALI Wavelet',
        IsLittleEndian: true,
        IsExplicit: true,
        IsCompressed: false,
        IsLossy: false,
        ApplicationType: TransferSyntaxApplicationType.Other,
        IsRetired: false
    }),

    // Retired Transfer Syntaxes
    JPEGExtended3And5: new DicomTransferSyntax({
        ID: '1.2.840.10008.1.2.4.52',
        Name: 'JPEG Extended (Processes 3 and 5)',
        IsLittleEndian: true,
        IsExplicit: true,
        IsCompressed: true,
        IsLossy: true,
        ApplicationType: TransferSyntaxApplicationType.SingleFrame,
        IsRetired: true
    }),
    JPEGSpectral6And8: new DicomTransferSyntax({
        ID: '1.2.840.10008.1.2.4.53',
        Name: 'JPEG Spectral Selection Non-hierarchical (Processes 6 and 8)',
        IsLittleEndian: true,
        IsExplicit: true,
        IsCompressed: true,
        IsLossy: true,
        ApplicationType: TransferSyntaxApplicationType.SingleFrame,
        IsRetired: true
    }),
    JPEGSpectral7And9: new DicomTransferSyntax({
        ID: '1.2.840.10008.1.2.4.54',
        Name: 'JPEG Spectral Selection Non-hierarchical (Processes 7 and 9)',
        IsLittleEndian: true,
        IsExplicit: true,
        IsCompressed: true,
        IsLossy: true,
        ApplicationType: TransferSyntaxApplicationType.SingleFrame,
        IsRetired: true
    }),
    JPEGFullProgression10And12: new DicomTransferSyntax({
        ID: '1.2.840.10008.1.2.4.55',
        Name: 'JPEG Full Progression Non-hierarchical (Processes 10 and 12)',
        IsLittleEndian: true,
        IsExplicit: true,
        IsCompressed: true,
        IsLossy: true,
        ApplicationType: TransferSyntaxApplicationType.SingleFrame,
        IsRetired: true
    }),
    JPEGFullProgression11And13: new DicomTransferSyntax({
        ID: '1.2.840.10008.1.2.4.56',
        Name: 'JPEG Full Progression Non-hierarchical (Processes 11 and 13)',
        IsLittleEndian: true,
        IsExplicit: true,
        IsCompressed: true,
        IsLossy: true,
        ApplicationType: TransferSyntaxApplicationType.SingleFrame,
        IsRetired: true
    }),
    JPEGLossless15: new DicomTransferSyntax({
        ID: '1.2.840.10008.1.2.4.58',
        Name: 'JPEG Lossless Non-hierarchical (Processes 15)',
        IsLittleEndian: true,
        IsExplicit: true,
        IsCompressed: true,
        IsLossy: false,
        ApplicationType: TransferSyntaxApplicationType.SingleFrame,
        IsRetired: true
    }),
    JPEGExtended16And18: new DicomTransferSyntax({
        ID: '1.2.840.10008.1.2.4.59',
        Name: 'JPEG Extended Hierarchical (Processes 16 and 18)',
        IsLittleEndian: true,
        IsExplicit: true,
        IsCompressed: true,
        IsLossy: true,
        ApplicationType: TransferSyntaxApplicationType.SingleFrame,
        IsRetired: true
    }),
    JPEGExtended17And19: new DicomTransferSyntax({
        ID: '1.2.840.10008.1.2.4.60',
        Name: 'JPEG Extended Hierarchical (Processes 17 and 19)',
        IsLittleEndian: true,
        IsExplicit: true,
        IsCompressed: true,
        IsLossy: true,
        ApplicationType: TransferSyntaxApplicationType.SingleFrame,
        IsRetired: true
    }),
    JPEGSpectral20And22: new DicomTransferSyntax({
        ID: '1.2.840.10008.1.2.4.61',
        Name: 'JPEG Spectral Selection Hierarchical (Processes 20 and 22)',
        IsLittleEndian: true,
        IsExplicit: true,
        IsCompressed: true,
        IsLossy: true,
        ApplicationType: TransferSyntaxApplicationType.SingleFrame,
        IsRetired: true
    }),
    JPEGSpectral21And23: new DicomTransferSyntax({
        ID: '1.2.840.10008.1.2.4.62',
        Name: 'JPEG Spectral Selection Hierarchical (Processes 21 and 23)',
        IsLittleEndian: true,
        IsExplicit: true,
        IsCompressed: true,
        IsLossy: true,
        ApplicationType: TransferSyntaxApplicationType.SingleFrame,
        IsRetired: true
    }),
    JPEGFullProgression24And26: new DicomTransferSyntax({
        ID: '1.2.840.10008.1.2.4.63',
        Name: 'JPEG Full Progression Hierarchical (Processes 24 and 26)',
        IsLittleEndian: true,
        IsExplicit: true,
        IsCompressed: true,
        IsLossy: true,
        ApplicationType: TransferSyntaxApplicationType.SingleFrame,
        IsRetired: true
    }),
    JPEGFullProgression25And27: new DicomTransferSyntax({
        ID: '1.2.840.10008.1.2.4.64',
        Name: 'JPEG Full Progression Hierarchical (Processes 25 and 27)',
        IsLittleEndian: true,
        IsExplicit: true,
        IsCompressed: true,
        IsLossy: true,
        ApplicationType: TransferSyntaxApplicationType.SingleFrame,
        IsRetired: true
    }),
    JPEGLossless28: new DicomTransferSyntax({
        ID: '1.2.840.10008.1.2.4.65',
        Name: 'JPEG Lossless Non-hierarchical (Processes 28)',
        IsLittleEndian: true,
        IsExplicit: true,
        IsCompressed: true,
        IsLossy: false,
        ApplicationType: TransferSyntaxApplicationType.SingleFrame,
        IsRetired: true
    }),
    JPEGLossless29: new DicomTransferSyntax({
        ID: '1.2.840.10008.1.2.4.66',
        Name: 'JPEG Lossless Non-hierarchical (Processes 29)',
        IsLittleEndian: true,
        IsExplicit: true,
        IsCompressed: true,
        IsLossy: false,
        ApplicationType: TransferSyntaxApplicationType.SingleFrame,
        IsRetired: true
    })

};

var transfer_syntax_lookup = {

    // Uncompressed DICOM Transfer Syntaxes
    '1.2.840.10008.1.2': TransferSyntax.ImplicitVRLittleEndian,
    '1.2.840.10008.1.2.1': TransferSyntax.ExplicitVRLittleEndian,
    '1.2.840.10008.1.2.2': TransferSyntax.ExplicitVRBigEndian,
    '1.2.840.10008.1.2.1.99': TransferSyntax.ExplicitVRLittleEndianDeflated,

    // Lossy Comporessed DICOM Transfer Syntaxes
    '1.2.840.10008.1.2.4.50': TransferSyntax.JPEG8Baseline,
    '1.2.840.10008.1.2.4.51': TransferSyntax.JPEG12Extended,
    '1.2.840.10008.1.2.4.81': TransferSyntax.JPEGLSLossy,
    '1.2.840.10008.1.2.4.91': TransferSyntax.JPEG2000Lossy,
    '1.2.840.10008.1.2.4.93': TransferSyntax.JPEG2000MultiComponent,
    '1.2.840.10008.1.2.4.94': TransferSyntax.JPIPReferenced,
    '1.2.840.10008.1.2.4.95': TransferSyntax.JPIPReferencedDeflated,

    // Lossless Comporessed DICOM Transfer Syntaxes
    '1.2.840.10008.1.2.4.57': TransferSyntax.JPEGLossless,
    '1.2.840.10008.1.2.4.70': TransferSyntax.JPEGLosslessFirstOrder,
    '1.2.840.10008.1.2.4.80': TransferSyntax.JPEGLSLossless,
    '1.2.840.10008.1.2.4.90': TransferSyntax.JPEG2000Lossless,
    '1.2.840.10008.1.2.4.92': TransferSyntax.JPEG2000LosslessMultiComponent,
    '1.2.840.10008.1.2.5': TransferSyntax.RLELossless,

    // Video Formats
    '1.2.840.10008.1.2.4.100': TransferSyntax.MPEG2,
    '1.2.840.10008.1.2.4.101': TransferSyntax.MPEG2HighLevel,
    '1.2.840.10008.1.2.4.102': TransferSyntax.MPEG4,
    '1.2.840.10008.1.2.4.103': TransferSyntax.MPEG4DBCompatible,
    '1.2.840.10008.1.2.4.104': TransferSyntax.MPEG4For2D,
    '1.2.840.10008.1.2.4.105': TransferSyntax.MPEG4For3D,
    '1.2.840.10008.1.2.4.106': TransferSyntax.MPEG4Stereo,
    '1.2.840.10008.1.2.4.107': TransferSyntax.HEVC,
    '1.2.840.10008.1.2.4.108': TransferSyntax.HEVCMain10,

    // Document Encapsulation
    '1.2.840.10008.1.2.6.1': TransferSyntax.RFC2557MIMEEncapsulation,
    '1.2.840.10008.1.2.6.2': TransferSyntax.XMLEncoded,

    // Other
    '1.2.840.10008.1.20': TransferSyntax.Papyrus3,
    '1.2.840.113619.5.2': TransferSyntax.GEImplicitVRWithBigEndianPixels,
    '1.3.6.1.4.1.5962.300.1': TransferSyntax.PixelMedBzip2,
    '1.3.6.1.4.1.5962.300.2': TransferSyntax.PixelMedEncapsulated,
    '1.2.840.113704.7.0.4.4': TransferSyntax.AlgotecCompressed,
    '1.2.840.113711.1.2.100.1': TransferSyntax.ALIWavelet,

    // Retired Transfer Syntaxes
    '1.2.840.10008.1.2.4.52': TransferSyntax.JPEGExtended3And5,
    '1.2.840.10008.1.2.4.53': TransferSyntax.JPEGSpectral6And8,
    '1.2.840.10008.1.2.4.54': TransferSyntax.JPEGSpectral7And9,
    '1.2.840.10008.1.2.4.55': TransferSyntax.JPEGFullProgression10And12,
    '1.2.840.10008.1.2.4.56': TransferSyntax.JPEGFullProgression11And13,
    '1.2.840.10008.1.2.4.58': TransferSyntax.JPEGLossless15,
    '1.2.840.10008.1.2.4.59': TransferSyntax.JPEGExtended16And18,
    '1.2.840.10008.1.2.4.60': TransferSyntax.JPEGExtended17And19,
    '1.2.840.10008.1.2.4.61': TransferSyntax.JPEGSpectral20And22,
    '1.2.840.10008.1.2.4.62': TransferSyntax.JPEGSpectral21And23,
    '1.2.840.10008.1.2.4.63': TransferSyntax.JPEGFullProgression24And26,
    '1.2.840.10008.1.2.4.64': TransferSyntax.JPEGFullProgression25And27,
    '1.2.840.10008.1.2.4.65': TransferSyntax.JPEGLossless28,
    '1.2.840.10008.1.2.4.66': TransferSyntax.JPEGLossless29

};
