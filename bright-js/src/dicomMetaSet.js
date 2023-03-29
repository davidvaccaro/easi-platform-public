//
// DicomMetaSet.js - 1.0.0
//
// DICOM Meta Set Class 
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

import DicomAttributeSet from './dicomAttributeSet.js';
import DicomSOPClass, { SOPClass } from './dicomSOPClass.js';
import DicomTransferSyntax from './dicomTransferSyntax.js';
import { TransferSyntax } from './dicomTransferSyntax.js';
import { Tag } from './dicomTag.js'

export default class DicomMetaSet extends DicomAttributeSet {

    /**
     * Gets the File Meta Information Group Length.
     * @returns The length value.
     */
    get groupLength() {
        return this.value(Tag.FileMetaInformationGroupLength, 0);
    }

    /**
     * Get the File Meta Information Version.
     * @returns The File Meta Information Version value.
     */
    get version() {
        return this.value(Tag.FileMetaInformationVersion);
    }

    /**
     * Get the Media Storage SOP Class UID.
     * @returns The Media Storage SOP Class UID value.
     */
    get mediaStorageSOPClassUID() {
        return DicomSOPClass.find(this.value(Tag.MediaStorageSOPClassUID, SOPClass.NONE.ID));
    }

    /**
     * Get the Media Storage SOP Instance UID.
     * @returns The Media Storage SOP Instance UID value.
     */
    get mediaStorageSOPInstanceUID() {
        return this.value(Tag.MediaStorageSOPInstanceUID);
    }

    /**
     * Get the Transfer Syntax UID.
     * @returns The Transfer Syntax UID value.
     */
    get transferSyntaxUID() {
        return DicomTransferSyntax.find(this.value(Tag.TransferSyntaxUID, TransferSyntax.NONE.ID));
    }

    /**
     * Get the Implementation Class UID.
     * @returns The Implementation Class UID value.
     */
    get implementationClassUID() {
        return this.value(Tag.ImplementationClassUID);
    }

    /**
     * Get the Implementation Version Name.
     * @returns The Implementation Version Name value.
     */
    get implementationVersionName() {
        return this.value(Tag.ImplementationVersionName);
    }

    /**
     * Get the Source Application Entity Title.
     * @returns The Source Application Entity Title value.
     */
    get sourceApplicationEntityTitle() {
        return this.value(Tag.SourceApplicationEntityTitle);
    }

    /**
     * Get the Sending Application Entity Title.
     * @returns The Sending Application Entity Title value.
     */
    get sendingApplicationEntityTitle() {
        return this.value(Tag.SendingApplicationEntityTitle);
    }

    /**
     * Get the Receiving Application Entity Title.
     * @returns The Receiving Application Entity Title value.
     */
    get receivingApplicationEntityTitle() {
        return this.value(Tag.ReceivingApplicationEntityTitle);
    }

    /**
     * Get the Private Information Creator UID.
     * @returns The Private Information Creator UID value.
     */
    get privateInformationCreatorUid() {
        return this.value(Tag.PrivateInformationCreatorUID);
    }

    /**
     * Get the Private Information.
     * @returns The Private Information value.
     */
    get privateInformation() {
        return this.value(Tag.PrivateInformation);
    }
    
    /**
     * Construct an "empty" new DICOM meta-set
     */
    constructor() {

        // Call the super constructor
        super();

    }

};