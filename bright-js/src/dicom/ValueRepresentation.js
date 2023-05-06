//
// ValueRepresentation.js - 1.0.0
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

export default class ValueRepresentation {

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

    // INSERT ACCESSORS	
    static get NONE() { return ValueRepresentations['NONE'] }
    static get AE() { return ValueRepresentations['AE'] }
    static get AS() { return ValueRepresentations['AS'] }
    static get AT() { return ValueRepresentations['AT'] }
    static get CS() { return ValueRepresentations['CS'] }
    static get DA() { return ValueRepresentations['DA'] }
    static get DS() { return ValueRepresentations['DS'] }
    static get DT() { return ValueRepresentations['DT'] }
    static get FL() { return ValueRepresentations['FL'] }
    static get FD() { return ValueRepresentations['FD'] }
    static get IS() { return ValueRepresentations['IS'] }
    static get LO() { return ValueRepresentations['LO'] }
    static get LT() { return ValueRepresentations['LT'] }
    static get OB() { return ValueRepresentations['OB'] }
    static get OD() { return ValueRepresentations['OD'] }
    static get OF() { return ValueRepresentations['OF'] }
    static get OL() { return ValueRepresentations['OL'] }
    static get OV() { return ValueRepresentations['OV'] }
    static get OW() { return ValueRepresentations['OW'] }
    static get PN() { return ValueRepresentations['PN'] }
    static get SH() { return ValueRepresentations['SH'] }
    static get SL() { return ValueRepresentations['SL'] }
    static get SQ() { return ValueRepresentations['SQ'] }
    static get SS() { return ValueRepresentations['SS'] }
    static get ST() { return ValueRepresentations['ST'] }
    static get SV() { return ValueRepresentations['SV'] }
    static get TM() { return ValueRepresentations['TM'] }
    static get UC() { return ValueRepresentations['UC'] }
    static get UI() { return ValueRepresentations['UI'] }
    static get UL() { return ValueRepresentations['UL'] }
    static get UN() { return ValueRepresentations['UN'] }
    static get UR() { return ValueRepresentations['UR'] }
    static get US() { return ValueRepresentations['US'] }
    static get UT() { return ValueRepresentations['UT'] }
    static get UV() { return ValueRepresentations['UV'] }
    // INSERT ACCESSORS	

};

// BELOW CODE GENERATED ON: 3/23/2023 11:09:45 AM

export var ValueRepresentations = {
	'NONE': new ValueRepresentation({ ID: 'NONE', Name: 'None', Length: 0, IsFixed: true }),
	'AE': new ValueRepresentation({ ID: 'AE', Name: 'Application Entity', Length: 16, IsFixed: false }),
	'AS': new ValueRepresentation({ ID: 'AS', Name: 'Age String', Length: 4, IsFixed: true }),
	'AT': new ValueRepresentation({ ID: 'AT', Name: 'Attribute Tag', Length: 4, IsFixed: true }),
	'CS': new ValueRepresentation({ ID: 'CS', Name: 'Code String', Length: 16, IsFixed: false }),
	'DA': new ValueRepresentation({ ID: 'DA', Name: 'Date', Length: 8, IsFixed: true }),
	'DS': new ValueRepresentation({ ID: 'DS', Name: 'Decimal String', Length: 16, IsFixed: false }),
	'DT': new ValueRepresentation({ ID: 'DT', Name: 'Date Time', Length: 26, IsFixed: false }),
	'FL': new ValueRepresentation({ ID: 'FL', Name: 'Floating Point Single', Length: 4, IsFixed: true }),
	'FD': new ValueRepresentation({ ID: 'FD', Name: 'Floating Point Double', Length: 8, IsFixed: true }),
	'IS': new ValueRepresentation({ ID: 'IS', Name: 'Integer String', Length: 12, IsFixed: false }),
	'LO': new ValueRepresentation({ ID: 'LO', Name: 'Long String', Length: 64, IsFixed: false }),
	'LT': new ValueRepresentation({ ID: 'LT', Name: 'Long Text', Length: 10240, IsFixed: false }),
	'OB': new ValueRepresentation({ ID: 'OB', Name: 'Other Byte', Length: null, IsFixed: false }),
	'OD': new ValueRepresentation({ ID: 'OD', Name: 'Other Double', Length: 4294967288, IsFixed: false }),
	'OF': new ValueRepresentation({ ID: 'OF', Name: 'Other Float', Length: 4294967292, IsFixed: false }),
	'OL': new ValueRepresentation({ ID: 'OL', Name: 'Other Long', Length: null, IsFixed: false }),
	'OV': new ValueRepresentation({ ID: 'OV', Name: 'Other 64-bit Very Long', Length: null, IsFixed: false }),
	'OW': new ValueRepresentation({ ID: 'OW', Name: 'Other Word', Length: null, IsFixed: false }),
	'PN': new ValueRepresentation({ ID: 'PN', Name: 'Person Name', Length: 64, IsFixed: false }),
	'SH': new ValueRepresentation({ ID: 'SH', Name: 'Short String', Length: 16, IsFixed: false }),
	'SL': new ValueRepresentation({ ID: 'SL', Name: 'Signed Long', Length: 4, IsFixed: true }),
	'SQ': new ValueRepresentation({ ID: 'SQ', Name: 'Sequence of Items', Length: null, IsFixed: false }),
	'SS': new ValueRepresentation({ ID: 'SS', Name: 'Signed Short', Length: 2, IsFixed: true }),
	'ST': new ValueRepresentation({ ID: 'ST', Name: 'Short Text', Length: 1024, IsFixed: false }),
	'SV': new ValueRepresentation({ ID: 'SV', Name: 'Signed 64-bit Very Long', Length: 8, IsFixed: true }),
	'TM': new ValueRepresentation({ ID: 'TM', Name: 'Time', Length: 14, IsFixed: false }),
	'UC': new ValueRepresentation({ ID: 'UC', Name: 'Unlimited Characters', Length: 4294967294, IsFixed: false }),
	'UI': new ValueRepresentation({ ID: 'UI', Name: 'Unique Identifier (UID)', Length: 64, IsFixed: false }),
	'UL': new ValueRepresentation({ ID: 'UL', Name: 'Unsigned Long', Length: 4, IsFixed: true }),
	'UN': new ValueRepresentation({ ID: 'UN', Name: 'Unknown', Length: null, IsFixed: false }),
	'UR': new ValueRepresentation({ ID: 'UR', Name: 'Universal Resource Identifier or Universal Resource Locator (URI/URL)', Length: 4294967294, IsFixed: false }),
	'US': new ValueRepresentation({ ID: 'US', Name: 'Unsigned Short', Length: 2, IsFixed: true }),
	'UT': new ValueRepresentation({ ID: 'UT', Name: 'Unlimited Text', Length: 4294967294, IsFixed: false }),
	'UV': new ValueRepresentation({ ID: 'UV', Name: 'Unsigned 64-bit Very Long', Length: 8, IsFixed: true })
};