
//
// Status.js - 1.0.0
//
// Parse Status Class
// https://dicom.nema.org/medical/dicom/current/output/html/part05.html#chapter_7
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

/**
 * Enumeration for the status of a parseing session.
 * @readonly
 * @enum {symbol}
 */
export var Status = {

    /** @description Continue processing. */
    CONTINUE: Symbol('CONTINUE'),

    /** @description The current parsed "element" data should be hopped through. Parse whatever remining data is required to hop through the current data by a specified number of bytes. */    
    HOP: Symbol('HOP'),

    /** @description The current parsed data "element" should be skipped over entierly. Parse whatever remining data is required to skip over the current data "element". */    
    SKIP: Symbol('SKIP'),

    /** @description The current parsed data "part" should be jumpped over entierly. Parse whatever remining data is required to jump over the current data "part". */    
    JUMP: Symbol('JUMP'),

    /** @description The current parsed objective is complete. Stop reading and parsing additional data. */    
    STOP: Symbol('STOP'),

    /** @description The current parse session failed. Stop reading and parsing additional data. */    
    FAIL: Symbol('FAIL'),

    /** @description The current parse session succeeded in parseing all available data. */
    SUCCESS: Symbol('SUCCESS')

};