//
// DicomTag.js - 1.0.0
//
// DICOM Tag Class 
//
// David Vaccaro, Xinonix Interactive Development, Inc / Copyright 2021
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
//

var TemplateLookup = {};

class DicomTag {

	/**
	 * Constructs a proper DICOM Tag identifier from a specified group and element. (e.g. 00020000)
	 * @param {*} group The specified DICOM Group Number.
	 * @param {*} element The specified DICOM Element Number.
	 * @returns The DICOM tag identifier.
	 */
	static identifier(group, element) {
		return (
			('0000' + DicomUtilities.bytesToUnsignedInteger(group).toString(16)).substr(-4)
			+
			('0000' + DicomUtilities.bytesToUnsignedInteger(element).toString(16)).substr(-4)
		).toUpperCase();
	}
	
	/**
	 * Find the DicomTag instance for the specified tag identifier (e.g. 00020000 = (0002, 0000)).
	 */
	static find(id) {

		// Loopup the tag
		var tag = Tags[id];

		// Check for private
		if (tag == null) {

			// Parse the group key
			var groupKey = id.substr(0, 4);

			// Parse the element key
			var elementKey = id.substr(4, 4);

			// Parse the group
			var group = parseInt(groupKey, 16);

			// Parse the group
			var element = parseInt(elementKey, 16);

			// Handle "Private Creator" Tag
			if (DicomTag.isPrivateCreatorIDTag(group, element)) {
				tag = new DicomTag({ 
					ID: id, 
					Tag: '(' + groupKey + ', ' + elementKey + ')', 
					Group: group, 
					Element: element, 
					VR: ValueRepresentations.LO, 
					VM: { Exact: 1 },
					Name: 'Private Creator ID', 
					IsRetired: false,
					IsPrivate: true 
				});
			}
			else if (DicomTag.isPrivateTag(group, element)) {
				tag = new DicomTag({ 
					ID: id, 
					Tag: '(' + groupKey + ', ' + elementKey + ')', 
					Group: group, 
					Element: element, 
					VR: null, 
					VM: { Exact: 1 },
					Name: 'Private Tag', 
					IsRetired: false,
					IsPrivate: true
				});
			}
			else if (element == 0) {
				tag = new DicomTag({ 
					ID: id, 
					Tag: '(' + groupKey + ', ' + elementKey + ')', 
					Group: group, 
					Element: element, 
					VR: ValueRepresentations.UL, 
					VM: { Exact: 1 },
					Name: 'Group Length (Retired)', 
					IsRetired: true,
					IsPrivate: false
				});
			}
			else {

				// Populate templates (if needed)
				if (Object.keys(TemplateLookup).length == 0) {

					// Select the tags that are templates
					var templateTags = Object.keys(Tag).filter(element => element.indexOf("x") != -1);

					// Loop over the tags with "x"
					for (var i = 0; i < templateTags.length; i++) {

						// Establish the templat class key
						var classKey = templateTags[i].substring(0, 2);

						// Create the template class lookup (if needed)
						if (TemplateLookup[classKey] == null) {
							TemplateLookup[classKey] = [];
						}

						// Determine the template size
						var templateSize = (templateTags[i].match(/\x/g) || []).length;

						// Build the template
						var template = '';

						if (templateSize == 4) {
							template = templateTags[i].replace('xxxx', '[0-9A-F]{4}');
						}
						else if (templateSize == 3) {
							template = templateTags[i].replace('xxx', '[0-9A-F]{3}');
						}
						else if (templateSize == 2) {
							template = templateTags[i].replace('xx', '[0-9A-F]{2}');
						}
						else {
							template = templateTags[i].replace('x', '[0-9A-F]{1}');
						}

						// Add the template 
						TemplateLookup[classKey].push({ 
							Template: template, 
							Tag: Tag[templateTags[i]] 
						});

					}

				}

				// See if there is any "template based" tags that match

				// Establish the list of prospect templates based on the key
				var templates = TemplateLookup[id.substring(0, 2)];

				if (templates != null) {

					// Loop over the prospect templates
					for (var i = 0; i < templates.length; i++) {

						// If the template matched, return the tag
						if (id.match(templates[i].Template) != null) {

							// Create the dynamic tag
							tag = new DicomTag({ 
								ID: id, 
								Tag: '(' + groupKey + ', ' + elementKey + ')', 
								Group: group, 
								Element: element, 
								VR: templates[i].Tag.VR, 
								VM: templates[i].Tag.VM,
								Name: templates[i].Tag.Name, 
								IsRetired: templates[i].Tag.IsRetired,
								IsPrivate: templates[i].Tag.IsPrivate
							});

							// Found so break
							break;

						}

					}

				}

			}

		}

		// Validate the tag
		if (tag == null) {
			console.log("Failed to find tag: " + id);
			return null;
		}

		// Return the tag POJO
		return tag;

	};

	/**
	 * Determine if the specified group and element identify a DICOM Private Creator 
	 * @param {*} group The specified DICOM Group Number.
	 * @param {*} element The specified DICOM Element Number.
	 * https://dicom.nema.org/medical/dicom/current/output/chtml/part05/sect_7.8.html
	 */
	static isPrivateCreatorIDTag(group, element) {
		return ((element >= 16) && (element <= 255));
	}

	/**
	 * Determine if the specified group and element identify a DICOM Private Creator 
	 * @param {*} group The specified DICOM Group Number.
	 * @param {*} element The specified DICOM Element Number.
	 * https://dicom.nema.org/medical/dicom/current/output/chtml/part05/sect_7.8.html
	 */
	static isPrivateTag(group, element) {
		return ((element >= 4096) && (element <= 4351));
	}

	/**
	 * Construct a new DicomTag from the specified data.
	 */
	constructor(data) {
		Object.assign(this, data);
	}

};

// Node Module Exports
if (typeof module === 'object' && module.exports) {
    module.exports = { DicomTag };
}