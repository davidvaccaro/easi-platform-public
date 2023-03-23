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

export default class DicomValueRepresentation {

    /**
     * Find the value-representation by name (i.e. LO, SS, OB, OW, etc.)
     * @param {*} name The name of the value representation.
     * @returns  The value representation.
     */
    static find(name) {

        // Lookup the value-representation
        var valueRepresentation = ValueRepresentations[name];

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

// BELOW CODE GENERATED ON: 3/23/2023 11:09:45 AM

export var ValueRepresentations = {
	'NONE': new DicomValueRepresentation({ ID: 'NONE', Name: 'None', Length: 0, IsFixed: true }),
	'AE': new DicomValueRepresentation({ ID: 'AE', Name: 'Application Entity', Length: 16, IsFixed: false }),
	'AS': new DicomValueRepresentation({ ID: 'AS', Name: 'Age String', Length: 4, IsFixed: true }),
	'AT': new DicomValueRepresentation({ ID: 'AT', Name: 'Attribute Tag', Length: 4, IsFixed: true }),
	'CS': new DicomValueRepresentation({ ID: 'CS', Name: 'Code String', Length: 16, IsFixed: false }),
	'DA': new DicomValueRepresentation({ ID: 'DA', Name: 'Date', Length: 8, IsFixed: true }),
	'DS': new DicomValueRepresentation({ ID: 'DS', Name: 'Decimal String', Length: 16, IsFixed: false }),
	'DT': new DicomValueRepresentation({ ID: 'DT', Name: 'Date Time', Length: 26, IsFixed: false }),
	'FL': new DicomValueRepresentation({ ID: 'FL', Name: 'Floating Point Single', Length: 4, IsFixed: true }),
	'FD': new DicomValueRepresentation({ ID: 'FD', Name: 'Floating Point Double', Length: 8, IsFixed: true }),
	'IS': new DicomValueRepresentation({ ID: 'IS', Name: 'Integer String', Length: 12, IsFixed: false }),
	'LO': new DicomValueRepresentation({ ID: 'LO', Name: 'Long String', Length: 64, IsFixed: false }),
	'LT': new DicomValueRepresentation({ ID: 'LT', Name: 'Long Text', Length: 10240, IsFixed: false }),
	'OB': new DicomValueRepresentation({ ID: 'OB', Name: 'Other Byte', Length: null, IsFixed: false }),
	'OD': new DicomValueRepresentation({ ID: 'OD', Name: 'Other Double', Length: 4294967288, IsFixed: false }),
	'OF': new DicomValueRepresentation({ ID: 'OF', Name: 'Other Float', Length: 4294967292, IsFixed: false }),
	'OL': new DicomValueRepresentation({ ID: 'OL', Name: 'Other Long', Length: null, IsFixed: false }),
	'OV': new DicomValueRepresentation({ ID: 'OV', Name: 'Other 64-bit Very Long', Length: null, IsFixed: false }),
	'OW': new DicomValueRepresentation({ ID: 'OW', Name: 'Other Word', Length: null, IsFixed: false }),
	'PN': new DicomValueRepresentation({ ID: 'PN', Name: 'Person Name', Length: 64, IsFixed: false }),
	'SH': new DicomValueRepresentation({ ID: 'SH', Name: 'Short String', Length: 16, IsFixed: false }),
	'SL': new DicomValueRepresentation({ ID: 'SL', Name: 'Signed Long', Length: 4, IsFixed: true }),
	'SQ': new DicomValueRepresentation({ ID: 'SQ', Name: 'Sequence of Items', Length: null, IsFixed: false }),
	'SS': new DicomValueRepresentation({ ID: 'SS', Name: 'Signed Short', Length: 2, IsFixed: true }),
	'ST': new DicomValueRepresentation({ ID: 'ST', Name: 'Short Text', Length: 1024, IsFixed: false }),
	'SV': new DicomValueRepresentation({ ID: 'SV', Name: 'Signed 64-bit Very Long', Length: 8, IsFixed: true }),
	'TM': new DicomValueRepresentation({ ID: 'TM', Name: 'Time', Length: 14, IsFixed: false }),
	'UC': new DicomValueRepresentation({ ID: 'UC', Name: 'Unlimited Characters', Length: 4294967294, IsFixed: false }),
	'UI': new DicomValueRepresentation({ ID: 'UI', Name: 'Unique Identifier (UID)', Length: 64, IsFixed: false }),
	'UL': new DicomValueRepresentation({ ID: 'UL', Name: 'Unsigned Long', Length: 4, IsFixed: true }),
	'UN': new DicomValueRepresentation({ ID: 'UN', Name: 'Unknown', Length: null, IsFixed: false }),
	'UR': new DicomValueRepresentation({ ID: 'UR', Name: 'Universal Resource Identifier or Universal Resource Locator (URI/URL)', Length: 4294967294, IsFixed: false }),
	'US': new DicomValueRepresentation({ ID: 'US', Name: 'Unsigned Short', Length: 2, IsFixed: true }),
	'UT': new DicomValueRepresentation({ ID: 'UT', Name: 'Unlimited Text', Length: 4294967294, IsFixed: false }),
	'UV': new DicomValueRepresentation({ ID: 'UV', Name: 'Unsigned 64-bit Very Long', Length: 8, IsFixed: true })
};

export var ValueRepresentation = {
	NONE: ValueRepresentations['NONE'],
	AE: ValueRepresentations['AE'],
	AS: ValueRepresentations['AS'],
	AT: ValueRepresentations['AT'],
	CS: ValueRepresentations['CS'],
	DA: ValueRepresentations['DA'],
	DS: ValueRepresentations['DS'],
	DT: ValueRepresentations['DT'],
	FL: ValueRepresentations['FL'],
	FD: ValueRepresentations['FD'],
	IS: ValueRepresentations['IS'],
	LO: ValueRepresentations['LO'],
	LT: ValueRepresentations['LT'],
	OB: ValueRepresentations['OB'],
	OD: ValueRepresentations['OD'],
	OF: ValueRepresentations['OF'],
	OL: ValueRepresentations['OL'],
	OV: ValueRepresentations['OV'],
	OW: ValueRepresentations['OW'],
	PN: ValueRepresentations['PN'],
	SH: ValueRepresentations['SH'],
	SL: ValueRepresentations['SL'],
	SQ: ValueRepresentations['SQ'],
	SS: ValueRepresentations['SS'],
	ST: ValueRepresentations['ST'],
	SV: ValueRepresentations['SV'],
	TM: ValueRepresentations['TM'],
	UC: ValueRepresentations['UC'],
	UI: ValueRepresentations['UI'],
	UL: ValueRepresentations['UL'],
	UN: ValueRepresentations['UN'],
	UR: ValueRepresentations['UR'],
	US: ValueRepresentations['US'],
	UT: ValueRepresentations['UT'],
	UV: ValueRepresentations['UV']
};
