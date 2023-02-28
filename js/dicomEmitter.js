//
// dicomEmitter.js - 1.0.0
//
// DICOM Emitter Class 
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

class DicomEmitter {

    startPart(part) {

        if (part == null) {
            this.startInstance();
        }
        else if (part instanceof DicomPreamble)
            this.startPreamble(part);
        else if (part instanceof DicomPrefix)
            this.startPrefix(part);
        else if (part instanceof DicomAttributeSequence)
            this.startAttributeSequence(part);
        else if (part instanceof DicomAttribute)
            this.startAttribute(part);
        else if (part instanceof DicomMetaSet)
            this.startMetaSet(part);
        else if (part instanceof DicomDataSet)
            this.startDataSet(part);

    }

    endPart(part) {

        if (part == null) {
            this.endInstance();
        }
        else if (part instanceof DicomPreamble)
            this.endPreamble(part);
        else if (part instanceof DicomPrefix)
            this.endPrefix(part);
        else if (part instanceof DicomAttributeSequence)
            this.endAttributeSequence(part);
        else if (part instanceof DicomAttribute)
            this.endAttribute(part);
        else if (part instanceof DicomMetaSet)
            this.endMetaSet(part);
        else if (part instanceof DicomDataSet)
            this.endDataSet(part);

    }

    startInstance() {
        var stop = 1;
    }

    startPreamble(preamble) {
        var stop = 1;
    }

    startPrefix(prefix) {
        var stop = 1;
    }

    startAttribute(attribute) {
        var stop = 1;
    }

    startAttributeSequence(attribute) {
        var stop = 1;
    }

    startMetaSet(meta) {
        var stop = 1;
    }

    startDataSet(data) {
        var stop = 1;
    }

    endPreamble(preamble) {
        var stop = 1;
    }

    endPrefix(prefix) {
        var stop = 1;
    }

    endAttribute(attribute) {
        var stop = 1;
    }

    endAttributeSequence(attribute) {
        var stop = 1;
    }

    endMetaSet(meta) {
        var stop = 1;
    }

    endDataSet(data) {
        var stop = 1;
    }

    endInstance() {
        var stop = 1;
    }

    constructor() {
    }

}
