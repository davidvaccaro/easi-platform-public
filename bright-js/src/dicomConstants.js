//
// DicomConstants.js - 1.0.0
//
// DICOM Constants Class 
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

class DicomConstants {

    // The standard length of the DICOM preamble
    // https://dicom.nema.org/medical/dicom/current/output/html/part10.html#chapter_7
    static get PreambleLength() { return 128; }

    // The standard length of the DICOM prefix
    // https://dicom.nema.org/medical/dicom/current/output/html/part10.html#chapter_7
    static get PrefixLength() { return 4; }

    // The standard DICOM prefix value
    // https://dicom.nema.org/medical/dicom/current/output/html/part10.html#chapter_7
    static get PrefixValue() { return 'DICM'; }

    // The standard length of the DICOM Data Element "Group"
    // https://dicom.nema.org/medical/dicom/current/output/html/part05.html#sect_7.1.1
    static get GroupLength() { return 2; }

    // The standard length of the DICOM Data Element "Element"
    // https://dicom.nema.org/medical/dicom/current/output/html/part05.html#sect_7.1.1
    static get ElementLength() { return 2; }

    // The standard length of the DICOM Data Element "Value Representation"
    // https://dicom.nema.org/medical/dicom/current/output/html/part05.html#sect_7.1.1
    static get ValueRepresentationLength() { return 2; }

    // The standard length of the DICOM Data Element "Reserved"
    // https://dicom.nema.org/medical/dicom/current/output/html/part05.html#sect_7.1.1
    static get ReservedLength() { return 2; }

    // The standard length of the DICOM Data Element "Value Length" (32 bit)
    // https://dicom.nema.org/medical/dicom/current/output/html/part05.html#sect_7.1.1
    static get ValueLength32() { return 4; }

    // The standard length of the DICOM Data Element "Value Length" (16 bit)
    // https://dicom.nema.org/medical/dicom/current/output/html/part05.html#sect_7.1.1
    static get ValueLength16() { return 2; }

    // Undefined Length: The Data Element Length Field shall contain a Value FFFFFFFFH to indicate an Undefined 
    // Sequence length. It shall be used in conjunction with a Sequence Delimitation Item. A Sequence Delimitation 
    // Item shall be included after the last Item in the sequence. Its Item Tag shall be (FFFE,E0DD) with an Item 
    // Length of 00000000H. No Value shall be present. A Sequence containing zero Items is encoded by a Sequence 
    // Delimitation Item only.
    // https://dicom.nema.org/medical/dicom/current/output/chtml/part05/sect_7.5.2.html
    static get UndefinedLength() { return 4294967295; }

    constructor() {
    }

};

// Node Module Exports
if (typeof module === 'object' && module.exports) {
    module.exports = { DicomConstants };
}