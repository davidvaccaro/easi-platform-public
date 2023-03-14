//
// DicomPerformanceEmitter.js - 1.0.0
//
// DICOM Performance Emitter Class (TEST)
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

class DicomPerformanceEmitter {

    reset() {
        console.log('Reset');
    }

    startInstance() {
        console.log('Start Instance');
    }

    startPreamble(preamble) {
        console.log('Start Preamble');
    }

    startPrefix(prefix) {
        console.log('Start Prefix');
    }

    startAttribute(attribute) {
        console.log('Start Attribute');
    }

    startSequence(sequence) {
        console.log('Start Sequence');
    }

    appendAttribute(attribute) {
        console.log('Append Attribute: ' + attribute.length() + ' bytes');
    }

    appendSequence(sequence) {
        console.log('Append Sequence: ' + sequence.length() + ' bytes');
    }

    startMetaSet() {
        console.log('Start MetaSet');
    }

    startDataSet() {
        console.log('Start DataSet');
    }

    endPreamble(preamble) {
        console.log('End Preamble');
    }

    endPrefix(prefix) {
        console.log('End Prefix');
    }

    endAttribute(attribute) {
        console.log('End Attribute');
    }

    endSequence(sequence) {
        console.log('End Sequence');
    }

    endMetaSet() {
        console.log('End MetaSet');
    }

    endDataSet() {
        console.log('End DataSet');
    }

    endInstance() {
        console.log('End Instance');
    }

    constructor() {
    }

};