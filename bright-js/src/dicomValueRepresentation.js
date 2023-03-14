//
// DicomValueRepresentation.js - 1.0.0
//
// DICOM Value Representation Class
// https://dicom.nema.org/medical/dicom/current/output/html/part05.html#sect_6.2
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

class DicomValueRepresentation {

    /**
     * Find the value-representation by name (i.e. LO, SS, OB, OW, etc.)
     * @param {*} name The name of the value representation.
     * @returns  The value representation.
     */
    static find(name) {

        // Lookup the value-representation
        var valueRepresentation = value_representation_lookup[name];

        // Validate the value-representation
        if ((valueRepresentation == undefined) || (valueRepresentation == null))
            return undefined;

        // Return the value-representation POJO
        return valueRepresentation;

    }

    /**
     * Constructs a new value representation instance.
     * @param {*} data 
     */
    constructor(data) {
        Object.assign(this, data);
    }

};

var ValueRepresentationIDs = {
    AE: 'AE',
    AS: 'AS',
    AT: 'AT',
    CS: 'CS',
    DA: 'DA',
    DS: 'DS',
    DT: 'DT',
    FL: 'FL',
    FD: 'FD',
    IS: 'IS',
    LO: 'LO',
    LT: 'LT',
    OB: 'OB',
    OD: 'OD',
    OF: 'OF',
    OL: 'OL',
    OV: 'OV',
    OW: 'OW',
    PN: 'PN',
    SH: 'SH',
    SL: 'SL',
    SQ: 'SQ',
    SS: 'SS',
    ST: 'ST',
    SV: 'SV',
    TM: 'TM',
    UC: 'UC',
    UI: 'UI',
    UL: 'UL',
    UN: 'UN',
    UR: 'UR',
    US: 'US',
    UT: 'UT',
    UV: 'UV',
    NONE: 'NONE'
};

var ValueRepresentations = {

    // NONE DICOM Value Representation
    NONE: new DicomValueRepresentation({
        ID: ValueRepresentationIDs.NONE,
        Name: 'None',
        Length: 0,
        IsFixed: true
    }),

    // AE DICOM Value Representation
    AE: new DicomValueRepresentation({
        ID: ValueRepresentationIDs.AE,
        Name: 'Application Entity',
        Length: 16,
        IsFixed: false
    }),

    // AS DICOM Value Representation
    AS: new DicomValueRepresentation({
        ID: ValueRepresentationIDs.AS,
        Name: 'Age String',
        Length: 4,
        IsFixed: true
    }),

    // AT DICOM Value Representation
    AT: new DicomValueRepresentation({
        ID: ValueRepresentationIDs.AT,
        Name: 'Attribute Tag',
        Length: 4,
        IsFixed: true
    }),

    // CS DICOM Value Representation
    CS: new DicomValueRepresentation({
        ID: ValueRepresentationIDs.CS,
        Name: 'Code String',
        Length: 16,
        IsFixed: false
    }),

    // DA DICOM Value Representation
    DA: new DicomValueRepresentation({
        ID: ValueRepresentationIDs.DA,
        Name: 'Date',
        Length: 8,
        IsFixed: true
    }),

    // DS DICOM Value Representation
    DS: new DicomValueRepresentation({
        ID: ValueRepresentationIDs.DS,
        Name: 'Decimal String',
        Length: 16,
        IsFixed: false
    }),

    // DT DICOM Value Representation
    DT: new DicomValueRepresentation({
        ID: ValueRepresentationIDs.DT,
        Name: 'Date Time',
        Length: 26,
        IsFixed: false
    }),

    // FL DICOM Value Representation
    FL: new DicomValueRepresentation({
        ID: ValueRepresentationIDs.FL,
        Name: 'Floating Point Single',
        Length: 4,
        IsFixed: true
    }),

    // FD DICOM Value Representation
    FD: new DicomValueRepresentation({
        ID: ValueRepresentationIDs.FD,
        Name: 'Floating Point Double',
        Length: 8,
        IsFixed: true
    }),

    // IS DICOM Value Representation
    IS: new DicomValueRepresentation({
        ID: ValueRepresentationIDs.IS,
        Name: 'Integer String',
        Length: 12,
        IsFixed: false
    }),

    // LO DICOM Value Representation
    LO: new DicomValueRepresentation({
        ID: ValueRepresentationIDs.LO,
        Name: 'Long String',
        Length: 64,
        IsFixed: false
    }),

    // LT DICOM Value Representation
    LT: new DicomValueRepresentation({
        ID: ValueRepresentationIDs.LT,
        Name: 'Long Text',
        Length: 10240,
        IsFixed: false
    }),

    // OB DICOM Value Representation
    OB: new DicomValueRepresentation({
        ID: ValueRepresentationIDs.OB,
        Name: 'Other Byte',
        Length: null,
        IsFixed: false
    }),

    // OD DICOM Value Representation
    OD: new DicomValueRepresentation({
        ID: ValueRepresentationIDs.OD,
        Name: 'Other Double',
        Length: 4294967288,
        IsFixed: false
    }),

    // OF DICOM Value Representation
    OF: new DicomValueRepresentation({
        ID: ValueRepresentationIDs.OF,
        Name: 'Other Float',
        Length: 4294967292,
        IsFixed: false
    }),

    // OL DICOM Value Representation
    OL: new DicomValueRepresentation({
        ID: ValueRepresentationIDs.OL,
        Name: 'Other Long',
        Length: null,
        IsFixed: false
    }),

    // OV DICOM Value Representation
    OV: new DicomValueRepresentation({
        ID: ValueRepresentationIDs.OV,
        Name: 'Other 64-bit Very Long',
        Length: null,
        IsFixed: false
    }),

    // OW DICOM Value Representation
    OW: new DicomValueRepresentation({
        ID: ValueRepresentationIDs.OW,
        Name: 'Other Word',
        Length: null,
        IsFixed: false
    }),

    // PN DICOM Value Representation
    PN: new DicomValueRepresentation({
        ID: ValueRepresentationIDs.PN,
        Name: 'Person Name',
        Length: 64,
        IsFixed: false
    }),

    // SH DICOM Value Representation
    SH: new DicomValueRepresentation({
        ID: ValueRepresentationIDs.SH,
        Name: 'Short String',
        Length: 16,
        IsFixed: false
    }),

    // SL DICOM Value Representation
    SL: new DicomValueRepresentation({
        ID: ValueRepresentationIDs.SL,
        Name: 'Signed Long',
        Length: 4,
        IsFixed: true
    }),

    // SQ DICOM Value Representation
    SQ: new DicomValueRepresentation({
        ID: ValueRepresentationIDs.SQ,
        Name: 'Sequence of Items',
        Length: null,
        IsFixed: false
    }),

    // SS DICOM Value Representation
    SS: new DicomValueRepresentation({
        ID: ValueRepresentationIDs.SS,
        Name: 'Signed Short',
        Length: 2,
        IsFixed: true
    }),

    // ST DICOM Value Representation
    ST: new DicomValueRepresentation({
        ID: ValueRepresentationIDs.ST,
        Name: 'Short Text',
        Length: 1024,
        IsFixed: false
    }),

    // SV DICOM Value Representation
    SV: new DicomValueRepresentation({
        ID: ValueRepresentationIDs.SV,
        Name: 'Signed 64-bit Very Long',
        Length: 8,
        IsFixed: true
    }),

    // TM DICOM Value Representation
    TM: new DicomValueRepresentation({
        ID: ValueRepresentationIDs.TM,
        Name: 'Time',
        Length: 14,
        IsFixed: false
    }),

    // UC DICOM Value Representation
    UC: new DicomValueRepresentation({
        ID: ValueRepresentationIDs.UC,
        Name: 'Unlimited Characters',
        Length: 4294967294,
        IsFixed: false
    }),

    // UI DICOM Value Representation
    UI: new DicomValueRepresentation({
        ID: ValueRepresentationIDs.UI,
        Name: 'Unique Identifier (UID)',
        Length: 64,
        IsFixed: false
    }),

    // UL DICOM Value Representation
    UL: new DicomValueRepresentation({
        ID: ValueRepresentationIDs.UL,
        Name: 'Unsigned Long',
        Length: 4,
        IsFixed: true
    }),

    // UN DICOM Value Representation
    UN: new DicomValueRepresentation({
        ID: ValueRepresentationIDs.UN,
        Name: 'Unknown',
        Length: null,
        IsFixed: false
    }),

    // UR DICOM Value Representation
    UR: new DicomValueRepresentation({
        ID: ValueRepresentationIDs.UR,
        Name: 'Universal Resource Identifier or Universal Resource Locator (URI/URL)',
        Length: 4294967294,
        IsFixed: false
    }),

    // US DICOM Value Representation
    US: new DicomValueRepresentation({
        ID: ValueRepresentationIDs.US,
        Name: 'Unsigned Short',
        Length: 2,
        IsFixed: true
    }),

    // UT DICOM Value Representation
    UT: new DicomValueRepresentation({
        ID: ValueRepresentationIDs.UT,
        Name: 'Unlimited Text',
        Length: 4294967294,
        IsFixed: false
    }),

    // UV DICOM Value Representation
    UV: new DicomValueRepresentation({
        ID: ValueRepresentationIDs.UV,
        Name: 'Unsigned 64-bit Very Long',
        Length: 8,
        IsFixed: true
    }),

};

var value_representation_lookup = {
    'AE': ValueRepresentations.AE,
    'AS': ValueRepresentations.AS,
    'AT': ValueRepresentations.AT,
    'CS': ValueRepresentations.CS,
    'DA': ValueRepresentations.DA,
    'DS': ValueRepresentations.DS,
    'DT': ValueRepresentations.DT,
    'FL': ValueRepresentations.FL,
    'FD': ValueRepresentations.FD,
    'IS': ValueRepresentations.IS,
    'LO': ValueRepresentations.LO,
    'LT': ValueRepresentations.LT,
    'OB': ValueRepresentations.OB,
    'OD': ValueRepresentations.OD,
    'OF': ValueRepresentations.OF,
    'OL': ValueRepresentations.OL,
    'OV': ValueRepresentations.OV,
    'OW': ValueRepresentations.OW,
    'PN': ValueRepresentations.PN,
    'SH': ValueRepresentations.SH,
    'SL': ValueRepresentations.SL,
    'SQ': ValueRepresentations.SQ,
    'SS': ValueRepresentations.SS,
    'ST': ValueRepresentations.ST,
    'SV': ValueRepresentations.SV,
    'TM': ValueRepresentations.TM,
    'UC': ValueRepresentations.UC,
    'UI': ValueRepresentations.UI,
    'UL': ValueRepresentations.UL,
    'UN': ValueRepresentations.UN,
    'UR': ValueRepresentations.UR,
    'US': ValueRepresentations.US,
    'UT': ValueRepresentations.UT,
    'UV': ValueRepresentations.UV,
    'NONE': ValueRepresentations.NONE
};