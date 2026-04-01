//
// DicomEntityHandler.js
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

import DicomInstanceHandler from './DicomInstanceHandler.js';
import Entity from '../../dicom/entities/Entity.js';
import Image from '../../dicom/entities/Image.js';
import WorklistItem from '../../dicom/entities/WorklistItem.js';
import KeyObjectSelection from '../../dicom/entities/KeyObjectSelection.js';
import StructuredReport from '../../dicom/entities/StructuredReport.js';
import Segmentation from '../../dicom/entities/Segmentation.js';
import EncapsulatedDocument from '../../dicom/entities/EncapsulatedDocument.js';
import Waveform from '../../dicom/entities/Waveform.js';
import PresentationState from '../../dicom/entities/PresentationState.js';
import Modality from '../../dicom/Modality.js';
import SOPClass from '../../dicom/SOPClass.js';
import Tag from '../../dicom/Tag.js';

export default class DicomEntityHandler extends DicomInstanceHandler {

    /**
     * Determine whether the SOP class is a Structured Report storage class.
     * @param {string | null} sopClassUid The SOP Class UID.
     * @returns {boolean} TRUE when Structured Report.
     */
    isStructuredReportSopClass(sopClassUid) {
        return DicomEntityHandler.StructuredReportSopClassUids.has(sopClassUid);
    }

    /**
     * Determine whether the SOP class is a waveform storage class.
     * @param {string | null} sopClassUid The SOP Class UID.
     * @returns {boolean} TRUE when waveform storage.
     */
    isWaveformSopClass(sopClassUid) {
        return DicomEntityHandler.WaveformSopClassUids.has(sopClassUid);
    }

    /**
     * Determine whether the SOP class is an encapsulated document class.
     * @param {string | null} sopClassUid The SOP Class UID.
     * @returns {boolean} TRUE when encapsulated document.
     */
    isEncapsulatedDocumentSopClass(sopClassUid) {
        return DicomEntityHandler.EncapsulatedDocumentSopClassUids.has(sopClassUid);
    }

    /**
     * Determine whether the SOP class is a presentation state class.
     * @param {string | null} sopClassUid The SOP Class UID.
     * @returns {boolean} TRUE when presentation state.
     */
    isPresentationStateSopClass(sopClassUid) {
        return DicomEntityHandler.PresentationStateSopClassUids.has(sopClassUid);
    }

    /**
     * Convert one instance to its matching entity.
     * @param {object | null} instance The source instance.
     * @returns {object | null} The resolved entity.
     */
    toEntity(instance) {

        if (instance == null)
            return null;

        if (instance.dataSet == null)
            return new Entity(instance);

        var dataSet = instance.dataSet;
        var modality = dataSet.value(Tag.Modality, null);
        var sopClassUid = dataSet.value(Tag.SOPClassUID, null);

        var hasTag = (tag) => {

            if (typeof dataSet.has == 'function')
                return (dataSet.has(tag) == true);

            if (typeof dataSet.find == 'function')
                return (dataSet.find(tag) != null);

            return (dataSet.value(tag, null) != null);

        };

        if ((sopClassUid == SOPClass.KeyObjectSelectionDocumentStorage.ID)
            || (modality == Modality.KO.ID)) {
            return new KeyObjectSelection(instance);
        }

        if ((sopClassUid == SOPClass.SegmentationStorage.ID)
            || (modality == Modality.SEG.ID)) {
            return new Segmentation(instance);
        }

        if (this.isStructuredReportSopClass(sopClassUid)
            || (modality == Modality.SR.ID)) {
            return new StructuredReport(instance);
        }

        if (this.isEncapsulatedDocumentSopClass(sopClassUid)
            || (modality == Modality.DOC.ID)) {
            return new EncapsulatedDocument(instance);
        }

        if (this.isWaveformSopClass(sopClassUid)
            || (modality == Modality.ECG.ID)
            || (modality == Modality.EEG.ID)
            || (modality == Modality.EMG.ID)
            || (modality == Modality.EOG.ID)
            || (modality == Modality.RESP.ID)
            || (modality == Modality.HD.ID)) {
            return new Waveform(instance);
        }

        if (this.isPresentationStateSopClass(sopClassUid)
            || (modality == Modality.PR.ID)) {
            return new PresentationState(instance);
        }

        if ((hasTag(Tag.ScheduledProcedureStepSequence) == true)
            || (hasTag(Tag.RequestedProcedureID) == true)) {
            return new WorklistItem(instance);
        }

        return new Image(instance);

    }

    /**
     * Returns the current data product constructed by this handler.
     * @returns The current data product.
     */
    onEndInstance(context) {

        // Build instances exactly as the canonical instance handler
        var result = super.onEndInstance(context);

        // Convert the emitted instance payload to entities
        if (Array.isArray(result)) {
            return result.map((instance) => this.toEntity(instance));
        }

        return this.toEntity(result);

    }

    constructor() {
        super();
    }

};

DicomEntityHandler.StructuredReportSopClassUids = new Set([
    SOPClass.BasicTextSRStorage.ID,
    SOPClass.EnhancedSRStorage.ID,
    SOPClass.ComprehensiveSRStorage.ID,
    SOPClass.Comprehensive3DSRStorage.ID
]);

DicomEntityHandler.EncapsulatedDocumentSopClassUids = new Set([
    SOPClass.EncapsulatedPDFStorage.ID,
    SOPClass.EncapsulatedCDAStorage.ID,
    SOPClass.EncapsulatedSTLStorage.ID,
    SOPClass.EncapsulatedOBJStorage.ID,
    SOPClass.EncapsulatedMTLStorage.ID
]);

DicomEntityHandler.WaveformSopClassUids = new Set([
    SOPClass.TwelveLeadECGWaveformStorage.ID,
    SOPClass.GeneralECGWaveformStorage.ID,
    SOPClass.AmbulatoryECGWaveformStorage.ID,
    SOPClass.General32bitECGWaveformStorage.ID,
    SOPClass.HemodynamicWaveformStorage.ID,
    SOPClass.CardiacElectrophysiologyWaveformStorage.ID,
    SOPClass.BasicVoiceAudioWaveformStorage.ID,
    SOPClass.GeneralAudioWaveformStorage.ID,
    SOPClass.ArterialPulseWaveformStorage.ID,
    SOPClass.RespiratoryWaveformStorage.ID,
    SOPClass.MultichannelRespiratoryWaveformStorage.ID,
    SOPClass.RoutineScalpElectroencephalogramWaveformStorage.ID,
    SOPClass.ElectromyogramWaveformStorage.ID,
    SOPClass.ElectrooculogramWaveformStorage.ID,
    SOPClass.SleepElectroencephalogramWaveformStorage.ID,
    SOPClass.BodyPositionWaveformStorage.ID
]);

DicomEntityHandler.PresentationStateSopClassUids = new Set([
    SOPClass.GrayscaleSoftcopyPresentationStateStorage.ID,
    SOPClass.ColorSoftcopyPresentationStateStorage.ID,
    SOPClass.PseudoColorSoftcopyPresentationStateStorage.ID,
    SOPClass.BlendingSoftcopyPresentationStateStorage.ID,
    SOPClass.XAXRFGrayscaleSoftcopyPresentationStateStorage.ID,
    SOPClass.VariableModalityLUTSoftcopyPresentationStateStorage.ID
]);
