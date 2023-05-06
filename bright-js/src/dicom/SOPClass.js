//
// SOPClass.js - 1.0.0
//
// DICOM SOP Class 
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

export default class SOPClass {

    // Find a sop class by sop class id (e.g. 1.2.3.4..)
    static find(id) {

        // Lookup the sop class
        return SOPClasses[id];

    };

    constructor(data) {
        Object.assign(this, data);
    }

    // INSERT ACCESSORS	
    static get Verification() { return SOPClasses['1.2.840.10008.1.1'] }
    static get MediaStorageDirectoryStorage() { return SOPClasses['1.2.840.10008.1.3.10'] }
    static get BasicStudyContentNotification() { return SOPClasses['1.2.840.10008.1.9'] }
    static get StorageCommitmentPushModel() { return SOPClasses['1.2.840.10008.1.20.1'] }
    static get StorageCommitmentPullModel() { return SOPClasses['1.2.840.10008.1.20.2'] }
    static get ProceduralEventLogging() { return SOPClasses['1.2.840.10008.1.40'] }
    static get SubstanceAdministrationLogging() { return SOPClasses['1.2.840.10008.1.42'] }
    static get DetachedPatientManagement() { return SOPClasses['1.2.840.10008.3.1.2.1.1'] }
    static get DetachedVisitManagement() { return SOPClasses['1.2.840.10008.3.1.2.2.1'] }
    static get DetachedStudyManagement() { return SOPClasses['1.2.840.10008.3.1.2.3.1'] }
    static get StudyComponentManagement() { return SOPClasses['1.2.840.10008.3.1.2.3.2'] }
    static get ModalityPerformedProcedureStep() { return SOPClasses['1.2.840.10008.3.1.2.3.3'] }
    static get ModalityPerformedProcedureStepRetrieve() { return SOPClasses['1.2.840.10008.3.1.2.3.4'] }
    static get ModalityPerformedProcedureStepNotification() { return SOPClasses['1.2.840.10008.3.1.2.3.5'] }
    static get DetachedResultsManagement() { return SOPClasses['1.2.840.10008.3.1.2.5.1'] }
    static get DetachedInterpretationManagement() { return SOPClasses['1.2.840.10008.3.1.2.6.1'] }
    static get BasicFilmSession() { return SOPClasses['1.2.840.10008.5.1.1.1'] }
    static get BasicFilmBox() { return SOPClasses['1.2.840.10008.5.1.1.2'] }
    static get BasicGrayscaleImageBox() { return SOPClasses['1.2.840.10008.5.1.1.4'] }
    static get BasicColorImageBox() { return SOPClasses['1.2.840.10008.5.1.1.4.1'] }
    static get ReferencedImageBox() { return SOPClasses['1.2.840.10008.5.1.1.4.2'] }
    static get PrintJob() { return SOPClasses['1.2.840.10008.5.1.1.14'] }
    static get BasicAnnotationBox() { return SOPClasses['1.2.840.10008.5.1.1.15'] }
    static get Printer() { return SOPClasses['1.2.840.10008.5.1.1.16'] }
    static get PrinterConfigurationRetrieval() { return SOPClasses['1.2.840.10008.5.1.1.16.376'] }
    static get VOILUTBox() { return SOPClasses['1.2.840.10008.5.1.1.22'] }
    static get PresentationLUT() { return SOPClasses['1.2.840.10008.5.1.1.23'] }
    static get ImageOverlayBox() { return SOPClasses['1.2.840.10008.5.1.1.24'] }
    static get BasicPrintImageOverlayBox() { return SOPClasses['1.2.840.10008.5.1.1.24.1'] }
    static get PrintQueueManagement() { return SOPClasses['1.2.840.10008.5.1.1.26'] }
    static get StoredPrintStorage() { return SOPClasses['1.2.840.10008.5.1.1.27'] }
    static get HardcopyGrayscaleImageStorage() { return SOPClasses['1.2.840.10008.5.1.1.29'] }
    static get HardcopyColorImageStorage() { return SOPClasses['1.2.840.10008.5.1.1.30'] }
    static get PullPrintRequest() { return SOPClasses['1.2.840.10008.5.1.1.31'] }
    static get MediaCreationManagement() { return SOPClasses['1.2.840.10008.5.1.1.33'] }
    static get DisplaySystem() { return SOPClasses['1.2.840.10008.5.1.1.40'] }
    static get ComputedRadiographyImageStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.1'] }
    static get DigitalXRayImageStorageForPresentation() { return SOPClasses['1.2.840.10008.5.1.4.1.1.1.1'] }
    static get DigitalXRayImageStorageForProcessing() { return SOPClasses['1.2.840.10008.5.1.4.1.1.1.1.1'] }
    static get DigitalMammographyXRayImageStorageForPresentation() { return SOPClasses['1.2.840.10008.5.1.4.1.1.1.2'] }
    static get DigitalMammographyXRayImageStorageForProcessing() { return SOPClasses['1.2.840.10008.5.1.4.1.1.1.2.1'] }
    static get DigitalIntraOralXRayImageStorageForPresentation() { return SOPClasses['1.2.840.10008.5.1.4.1.1.1.3'] }
    static get DigitalIntraOralXRayImageStorageForProcessing() { return SOPClasses['1.2.840.10008.5.1.4.1.1.1.3.1'] }
    static get CTImageStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.2'] }
    static get EnhancedCTImageStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.2.1'] }
    static get LegacyConvertedEnhancedCTImageStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.2.2'] }
    static get UltrasoundMultiFrameImageStorageRetired() { return SOPClasses['1.2.840.10008.5.1.4.1.1.3'] }
    static get UltrasoundMultiFrameImageStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.3.1'] }
    static get MRImageStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.4'] }
    static get EnhancedMRImageStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.4.1'] }
    static get MRSpectroscopyStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.4.2'] }
    static get EnhancedMRColorImageStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.4.3'] }
    static get LegacyConvertedEnhancedMRImageStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.4.4'] }
    static get NuclearMedicineImageStorageRetired() { return SOPClasses['1.2.840.10008.5.1.4.1.1.5'] }
    static get UltrasoundImageStorageRetired() { return SOPClasses['1.2.840.10008.5.1.4.1.1.6'] }
    static get UltrasoundImageStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.6.1'] }
    static get EnhancedUSVolumeStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.6.2'] }
    static get SecondaryCaptureImageStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.7'] }
    static get MultiFrameSingleBitSecondaryCaptureImageStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.7.1'] }
    static get MultiFrameGrayscaleByteSecondaryCaptureImageStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.7.2'] }
    static get MultiFrameGrayscaleWordSecondaryCaptureImageStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.7.3'] }
    static get MultiFrameTrueColorSecondaryCaptureImageStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.7.4'] }
    static get StandaloneOverlayStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.8'] }
    static get StandaloneCurveStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.9'] }
    static get WaveformStorageTrial() { return SOPClasses['1.2.840.10008.5.1.4.1.1.9.1'] }
    static get TwelveLeadECGWaveformStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.9.1.1'] }
    static get GeneralECGWaveformStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.9.1.2'] }
    static get AmbulatoryECGWaveformStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.9.1.3'] }
    static get HemodynamicWaveformStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.9.2.1'] }
    static get CardiacElectrophysiologyWaveformStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.9.3.1'] }
    static get BasicVoiceAudioWaveformStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.9.4.1'] }
    static get GeneralAudioWaveformStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.9.4.2'] }
    static get ArterialPulseWaveformStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.9.5.1'] }
    static get RespiratoryWaveformStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.9.6.1'] }
    static get MultichannelRespiratoryWaveformStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.9.6.2'] }
    static get RoutineScalpElectroencephalogramWaveformStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.9.7.1'] }
    static get ElectromyogramWaveformStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.9.7.2'] }
    static get ElectrooculogramWaveformStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.9.7.3'] }
    static get SleepElectroencephalogramWaveformStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.9.7.4'] }
    static get BodyPositionWaveformStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.9.8.1'] }
    static get StandaloneModalityLUTStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.10'] }
    static get StandaloneVOILUTStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.11'] }
    static get GrayscaleSoftcopyPresentationStateStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.11.1'] }
    static get ColorSoftcopyPresentationStateStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.11.2'] }
    static get PseudoColorSoftcopyPresentationStateStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.11.3'] }
    static get BlendingSoftcopyPresentationStateStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.11.4'] }
    static get XAXRFGrayscaleSoftcopyPresentationStateStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.11.5'] }
    static get GrayscalePlanarMPRVolumetricPresentationStateStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.11.6'] }
    static get CompositingPlanarMPRVolumetricPresentationStateStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.11.7'] }
    static get AdvancedBlendingPresentationStateStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.11.8'] }
    static get VolumeRenderingVolumetricPresentationStateStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.11.9'] }
    static get SegmentedVolumeRenderingVolumetricPresentationStateStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.11.10'] }
    static get MultipleVolumeRenderingVolumetricPresentationStateStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.11.11'] }
    static get XRayAngiographicImageStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.12.1'] }
    static get EnhancedXAImageStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.12.1.1'] }
    static get XRayRadiofluoroscopicImageStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.12.2'] }
    static get EnhancedXRFImageStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.12.2.1'] }
    static get XRayAngiographicBiPlaneImageStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.12.3'] }
    static get XRay3DAngiographicImageStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.13.1.1'] }
    static get XRay3DCraniofacialImageStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.13.1.2'] }
    static get BreastTomosynthesisImageStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.13.1.3'] }
    static get BreastProjectionXRayImageStorageForPresentation() { return SOPClasses['1.2.840.10008.5.1.4.1.1.13.1.4'] }
    static get BreastProjectionXRayImageStorageForProcessing() { return SOPClasses['1.2.840.10008.5.1.4.1.1.13.1.5'] }
    static get IntravascularOpticalCoherenceTomographyImageStorageForPresentation() { return SOPClasses['1.2.840.10008.5.1.4.1.1.14.1'] }
    static get IntravascularOpticalCoherenceTomographyImageStorageForProcessing() { return SOPClasses['1.2.840.10008.5.1.4.1.1.14.2'] }
    static get NuclearMedicineImageStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.20'] }
    static get ParametricMapStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.30'] }
    static get RawDataStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.66'] }
    static get SpatialRegistrationStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.66.1'] }
    static get SpatialFiducialsStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.66.2'] }
    static get DeformableSpatialRegistrationStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.66.3'] }
    static get SegmentationStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.66.4'] }
    static get SurfaceSegmentationStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.66.5'] }
    static get TractographyResultsStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.66.6'] }
    static get RealWorldValueMappingStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.67'] }
    static get SurfaceScanMeshStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.68.1'] }
    static get SurfaceScanPointCloudStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.68.2'] }
    static get VLImageStorageTrial() { return SOPClasses['1.2.840.10008.5.1.4.1.1.77.1'] }
    static get VLMultiFrameImageStorageTrial() { return SOPClasses['1.2.840.10008.5.1.4.1.1.77.2'] }
    static get VLEndoscopicImageStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.77.1.1'] }
    static get VideoEndoscopicImageStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.77.1.1.1'] }
    static get VLMicroscopicImageStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.77.1.2'] }
    static get VideoMicroscopicImageStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.77.1.2.1'] }
    static get VLSlideCoordinatesMicroscopicImageStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.77.1.3'] }
    static get VLPhotographicImageStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.77.1.4'] }
    static get VideoPhotographicImageStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.77.1.4.1'] }
    static get OphthalmicPhotography8BitImageStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.77.1.5.1'] }
    static get OphthalmicPhotography16BitImageStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.77.1.5.2'] }
    static get StereometricRelationshipStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.77.1.5.3'] }
    static get OphthalmicTomographyImageStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.77.1.5.4'] }
    static get WideFieldOphthalmicPhotographyStereographicProjectionImageStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.77.1.5.5'] }
    static get WideFieldOphthalmicPhotography3DCoordinatesImageStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.77.1.5.6'] }
    static get OphthalmicOpticalCoherenceTomographyEnFaceImageStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.77.1.5.7'] }
    static get OphthalmicOpticalCoherenceTomographyBscanVolumeAnalysisStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.77.1.5.8'] }
    static get VLWholeSlideMicroscopyImageStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.77.1.6'] }
    static get DermoscopicPhotographyImageStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.77.1.7'] }
    static get LensometryMeasurementsStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.78.1'] }
    static get AutorefractionMeasurementsStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.78.2'] }
    static get KeratometryMeasurementsStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.78.3'] }
    static get SubjectiveRefractionMeasurementsStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.78.4'] }
    static get VisualAcuityMeasurementsStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.78.5'] }
    static get SpectaclePrescriptionReportStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.78.6'] }
    static get OphthalmicAxialMeasurementsStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.78.7'] }
    static get IntraocularLensCalculationsStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.78.8'] }
    static get MacularGridThicknessAndVolumeReportStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.79.1'] }
    static get OphthalmicVisualFieldStaticPerimetryMeasurementsStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.80.1'] }
    static get OphthalmicThicknessMapStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.81.1'] }
    static get CornealTopographyMapStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.82.1'] }
    static get TextSRStorageTrial() { return SOPClasses['1.2.840.10008.5.1.4.1.1.88.1'] }
    static get AudioSRStorageTrial() { return SOPClasses['1.2.840.10008.5.1.4.1.1.88.2'] }
    static get DetailSRStorageTrial() { return SOPClasses['1.2.840.10008.5.1.4.1.1.88.3'] }
    static get ComprehensiveSRStorageTrial() { return SOPClasses['1.2.840.10008.5.1.4.1.1.88.4'] }
    static get BasicTextSRStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.88.11'] }
    static get EnhancedSRStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.88.22'] }
    static get ComprehensiveSRStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.88.33'] }
    static get Comprehensive3DSRStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.88.34'] }
    static get ExtensibleSRStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.88.35'] }
    static get ProcedureLogStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.88.40'] }
    static get MammographyCADSRStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.88.50'] }
    static get KeyObjectSelectionDocumentStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.88.59'] }
    static get ChestCADSRStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.88.65'] }
    static get XRayRadiationDoseSRStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.88.67'] }
    static get RadiopharmaceuticalRadiationDoseSRStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.88.68'] }
    static get ColonCADSRStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.88.69'] }
    static get ImplantationPlanSRStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.88.70'] }
    static get AcquisitionContextSRStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.88.71'] }
    static get SimplifiedAdultEchoSRStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.88.72'] }
    static get PatientRadiationDoseSRStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.88.73'] }
    static get PlannedImagingAgentAdministrationSRStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.88.74'] }
    static get PerformedImagingAgentAdministrationSRStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.88.75'] }
    static get EnhancedXRayRadiationDoseSRStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.88.76'] }
    static get ContentAssessmentResultsStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.90.1'] }
    static get MicroscopyBulkSimpleAnnotationsStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.91.1'] }
    static get EncapsulatedPDFStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.104.1'] }
    static get EncapsulatedCDAStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.104.2'] }
    static get EncapsulatedSTLStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.104.3'] }
    static get EncapsulatedOBJStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.104.4'] }
    static get EncapsulatedMTLStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.104.5'] }
    static get PositronEmissionTomographyImageStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.128'] }
    static get LegacyConvertedEnhancedPETImageStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.128.1'] }
    static get StandalonePETCurveStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.129'] }
    static get EnhancedPETImageStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.130'] }
    static get BasicStructuredDisplayStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.131'] }
    static get CTDefinedProcedureProtocolStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.200.1'] }
    static get CTPerformedProcedureProtocolStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.200.2'] }
    static get ProtocolApprovalStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.200.3'] }
    static get ProtocolApprovalInformationModelFind() { return SOPClasses['1.2.840.10008.5.1.4.1.1.200.4'] }
    static get ProtocolApprovalInformationModelMove() { return SOPClasses['1.2.840.10008.5.1.4.1.1.200.5'] }
    static get ProtocolApprovalInformationModelGet() { return SOPClasses['1.2.840.10008.5.1.4.1.1.200.6'] }
    static get XADefinedProcedureProtocolStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.200.7'] }
    static get XAPerformedProcedureProtocolStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.200.8'] }
    static get InventoryStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.201.1'] }
    static get InventoryFind() { return SOPClasses['1.2.840.10008.5.1.4.1.1.201.2'] }
    static get InventoryMove() { return SOPClasses['1.2.840.10008.5.1.4.1.1.201.3'] }
    static get InventoryGet() { return SOPClasses['1.2.840.10008.5.1.4.1.1.201.4'] }
    static get InventoryCreation() { return SOPClasses['1.2.840.10008.5.1.4.1.1.201.5'] }
    static get RepositoryQuery() { return SOPClasses['1.2.840.10008.5.1.4.1.1.201.6'] }
    static get RTImageStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.481.1'] }
    static get RTDoseStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.481.2'] }
    static get RTStructureSetStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.481.3'] }
    static get RTBeamsTreatmentRecordStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.481.4'] }
    static get RTPlanStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.481.5'] }
    static get RTBrachyTreatmentRecordStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.481.6'] }
    static get RTTreatmentSummaryRecordStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.481.7'] }
    static get RTIonPlanStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.481.8'] }
    static get RTIonBeamsTreatmentRecordStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.481.9'] }
    static get RTPhysicianIntentStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.481.10'] }
    static get RTSegmentAnnotationStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.481.11'] }
    static get RTRadiationSetStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.481.12'] }
    static get CArmPhotonElectronRadiationStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.481.13'] }
    static get TomotherapeuticRadiationStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.481.14'] }
    static get RoboticArmRadiationStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.481.15'] }
    static get RTRadiationRecordSetStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.481.16'] }
    static get RTRadiationSalvageRecordStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.481.17'] }
    static get TomotherapeuticRadiationRecordStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.481.18'] }
    static get CArmPhotonElectronRadiationRecordStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.481.19'] }
    static get RoboticRadiationRecordStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.481.20'] }
    static get RTRadiationSetDeliveryInstructionStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.481.21'] }
    static get RTTreatmentPreparationStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.481.22'] }
    static get EnhancedRTImageStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.481.23'] }
    static get EnhancedContinuousRTImageStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.481.24'] }
    static get RTPatientPositionAcquisitionInstructionStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.481.25'] }
    static get DICOSCTImageStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.501.1'] }
    static get DICOSDigitalXRayImageStorageForPresentation() { return SOPClasses['1.2.840.10008.5.1.4.1.1.501.2.1'] }
    static get DICOSDigitalXRayImageStorageForProcessing() { return SOPClasses['1.2.840.10008.5.1.4.1.1.501.2.2'] }
    static get DICOSThreatDetectionReportStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.501.3'] }
    static get DICOS2DAITStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.501.4'] }
    static get DICOS3DAITStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.501.5'] }
    static get DICOSQuadrupoleResonanceStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.501.6'] }
    static get EddyCurrentImageStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.601.1'] }
    static get EddyCurrentMultiFrameImageStorage() { return SOPClasses['1.2.840.10008.5.1.4.1.1.601.2'] }
    static get PatientRootQueryRetrieveInformationModelFind() { return SOPClasses['1.2.840.10008.5.1.4.1.2.1.1'] }
    static get PatientRootQueryRetrieveInformationModelMove() { return SOPClasses['1.2.840.10008.5.1.4.1.2.1.2'] }
    static get PatientRootQueryRetrieveInformationModelGet() { return SOPClasses['1.2.840.10008.5.1.4.1.2.1.3'] }
    static get StudyRootQueryRetrieveInformationModelFind() { return SOPClasses['1.2.840.10008.5.1.4.1.2.2.1'] }
    static get StudyRootQueryRetrieveInformationModelMove() { return SOPClasses['1.2.840.10008.5.1.4.1.2.2.2'] }
    static get StudyRootQueryRetrieveInformationModelGet() { return SOPClasses['1.2.840.10008.5.1.4.1.2.2.3'] }
    static get PatientStudyOnlyQueryRetrieveInformationModelFind() { return SOPClasses['1.2.840.10008.5.1.4.1.2.3.1'] }
    static get PatientStudyOnlyQueryRetrieveInformationModelMove() { return SOPClasses['1.2.840.10008.5.1.4.1.2.3.2'] }
    static get PatientStudyOnlyQueryRetrieveInformationModelGet() { return SOPClasses['1.2.840.10008.5.1.4.1.2.3.3'] }
    static get CompositeInstanceRootRetrieveMove() { return SOPClasses['1.2.840.10008.5.1.4.1.2.4.2'] }
    static get CompositeInstanceRootRetrieveGet() { return SOPClasses['1.2.840.10008.5.1.4.1.2.4.3'] }
    static get CompositeInstanceRetrieveWithoutBulkDataGet() { return SOPClasses['1.2.840.10008.5.1.4.1.2.5.3'] }
    static get DefinedProcedureProtocolInformationModelFind() { return SOPClasses['1.2.840.10008.5.1.4.20.1'] }
    static get DefinedProcedureProtocolInformationModelMove() { return SOPClasses['1.2.840.10008.5.1.4.20.2'] }
    static get DefinedProcedureProtocolInformationModelGet() { return SOPClasses['1.2.840.10008.5.1.4.20.3'] }
    static get ModalityWorklistInformationModelFind() { return SOPClasses['1.2.840.10008.5.1.4.31'] }
    static get GeneralPurposeWorklistInformationModelFind() { return SOPClasses['1.2.840.10008.5.1.4.32.1'] }
    static get GeneralPurposeScheduledProcedureStep() { return SOPClasses['1.2.840.10008.5.1.4.32.2'] }
    static get GeneralPurposePerformedProcedureStep() { return SOPClasses['1.2.840.10008.5.1.4.32.3'] }
    static get InstanceAvailabilityNotification() { return SOPClasses['1.2.840.10008.5.1.4.33'] }
    static get RTBeamsDeliveryInstructionStorageTrial() { return SOPClasses['1.2.840.10008.5.1.4.34.1'] }
    static get RTConventionalMachineVerificationTrial() { return SOPClasses['1.2.840.10008.5.1.4.34.2'] }
    static get RTIonMachineVerificationTrial() { return SOPClasses['1.2.840.10008.5.1.4.34.3'] }
    static get UnifiedProcedureStepPushTrial() { return SOPClasses['1.2.840.10008.5.1.4.34.4.1'] }
    static get UnifiedProcedureStepWatchTrial() { return SOPClasses['1.2.840.10008.5.1.4.34.4.2'] }
    static get UnifiedProcedureStepPullTrial() { return SOPClasses['1.2.840.10008.5.1.4.34.4.3'] }
    static get UnifiedProcedureStepEventTrial() { return SOPClasses['1.2.840.10008.5.1.4.34.4.4'] }
    static get UnifiedProcedureStepPush() { return SOPClasses['1.2.840.10008.5.1.4.34.6.1'] }
    static get UnifiedProcedureStepWatch() { return SOPClasses['1.2.840.10008.5.1.4.34.6.2'] }
    static get UnifiedProcedureStepPull() { return SOPClasses['1.2.840.10008.5.1.4.34.6.3'] }
    static get UnifiedProcedureStepEvent() { return SOPClasses['1.2.840.10008.5.1.4.34.6.4'] }
    static get UnifiedProcedureStepQuery() { return SOPClasses['1.2.840.10008.5.1.4.34.6.5'] }
    static get RTBeamsDeliveryInstructionStorage() { return SOPClasses['1.2.840.10008.5.1.4.34.7'] }
    static get RTConventionalMachineVerification() { return SOPClasses['1.2.840.10008.5.1.4.34.8'] }
    static get RTIonMachineVerification() { return SOPClasses['1.2.840.10008.5.1.4.34.9'] }
    static get RTBrachyApplicationSetupDeliveryInstructionStorage() { return SOPClasses['1.2.840.10008.5.1.4.34.10'] }
    static get GeneralRelevantPatientInformationQuery() { return SOPClasses['1.2.840.10008.5.1.4.37.1'] }
    static get BreastImagingRelevantPatientInformationQuery() { return SOPClasses['1.2.840.10008.5.1.4.37.2'] }
    static get CardiacRelevantPatientInformationQuery() { return SOPClasses['1.2.840.10008.5.1.4.37.3'] }
    static get HangingProtocolStorage() { return SOPClasses['1.2.840.10008.5.1.4.38.1'] }
    static get HangingProtocolInformationModelFind() { return SOPClasses['1.2.840.10008.5.1.4.38.2'] }
    static get HangingProtocolInformationModelMove() { return SOPClasses['1.2.840.10008.5.1.4.38.3'] }
    static get HangingProtocolInformationModelGet() { return SOPClasses['1.2.840.10008.5.1.4.38.4'] }
    static get ColorPaletteStorage() { return SOPClasses['1.2.840.10008.5.1.4.39.1'] }
    static get ColorPaletteQueryRetrieveInformationModelFind() { return SOPClasses['1.2.840.10008.5.1.4.39.2'] }
    static get ColorPaletteQueryRetrieveInformationModelMove() { return SOPClasses['1.2.840.10008.5.1.4.39.3'] }
    static get ColorPaletteQueryRetrieveInformationModelGet() { return SOPClasses['1.2.840.10008.5.1.4.39.4'] }
    static get ProductCharacteristicsQuery() { return SOPClasses['1.2.840.10008.5.1.4.41'] }
    static get SubstanceApprovalQuery() { return SOPClasses['1.2.840.10008.5.1.4.42'] }
    static get GenericImplantTemplateStorage() { return SOPClasses['1.2.840.10008.5.1.4.43.1'] }
    static get GenericImplantTemplateInformationModelFind() { return SOPClasses['1.2.840.10008.5.1.4.43.2'] }
    static get GenericImplantTemplateInformationModelMove() { return SOPClasses['1.2.840.10008.5.1.4.43.3'] }
    static get GenericImplantTemplateInformationModelGet() { return SOPClasses['1.2.840.10008.5.1.4.43.4'] }
    static get ImplantAssemblyTemplateStorage() { return SOPClasses['1.2.840.10008.5.1.4.44.1'] }
    static get ImplantAssemblyTemplateInformationModelFind() { return SOPClasses['1.2.840.10008.5.1.4.44.2'] }
    static get ImplantAssemblyTemplateInformationModelMove() { return SOPClasses['1.2.840.10008.5.1.4.44.3'] }
    static get ImplantAssemblyTemplateInformationModelGet() { return SOPClasses['1.2.840.10008.5.1.4.44.4'] }
    static get ImplantTemplateGroupStorage() { return SOPClasses['1.2.840.10008.5.1.4.45.1'] }
    static get ImplantTemplateGroupInformationModelFind() { return SOPClasses['1.2.840.10008.5.1.4.45.2'] }
    static get ImplantTemplateGroupInformationModelMove() { return SOPClasses['1.2.840.10008.5.1.4.45.3'] }
    static get ImplantTemplateGroupInformationModelGet() { return SOPClasses['1.2.840.10008.5.1.4.45.4'] }
    static get VideoEndoscopicImageRealTimeCommunication() { return SOPClasses['1.2.840.10008.10.1'] }
    static get VideoPhotographicImageRealTimeCommunication() { return SOPClasses['1.2.840.10008.10.2'] }
    static get AudioWaveformRealTimeCommunication() { return SOPClasses['1.2.840.10008.10.3'] }
    static get RenditionSelectionDocumentRealTimeCommunication() { return SOPClasses['1.2.840.10008.10.4'] }
    static get NONE() { return SOPClasses['0'] }
    // INSERT ACCESSORS

};

// BELOW CODE GENERATED ON: 3/23/2023 11:09:45 AM

export var SOPClasses = {
	'1.2.840.10008.1.1': new SOPClass({ ID: '1.2.840.10008.1.1', Name: 'Verification SOP Class', IsRetired: false }),
	'1.2.840.10008.1.3.10': new SOPClass({ ID: '1.2.840.10008.1.3.10', Name: 'Media Storage Directory Storage', IsRetired: false }),
	'1.2.840.10008.1.9': new SOPClass({ ID: '1.2.840.10008.1.9', Name: 'Basic Study Content Notification SOP Class (Retired)', IsRetired: true }),
	'1.2.840.10008.1.20.1': new SOPClass({ ID: '1.2.840.10008.1.20.1', Name: 'Storage Commitment Push Model SOP Class', IsRetired: false }),
	'1.2.840.10008.1.20.2': new SOPClass({ ID: '1.2.840.10008.1.20.2', Name: 'Storage Commitment Pull Model SOP Class (Retired)', IsRetired: true }),
	'1.2.840.10008.1.40': new SOPClass({ ID: '1.2.840.10008.1.40', Name: 'Procedural Event Logging SOP Class', IsRetired: false }),
	'1.2.840.10008.1.42': new SOPClass({ ID: '1.2.840.10008.1.42', Name: 'Substance Administration Logging SOP Class', IsRetired: false }),
	'1.2.840.10008.3.1.2.1.1': new SOPClass({ ID: '1.2.840.10008.3.1.2.1.1', Name: 'Detached Patient Management SOP Class (Retired)', IsRetired: true }),
	'1.2.840.10008.3.1.2.2.1': new SOPClass({ ID: '1.2.840.10008.3.1.2.2.1', Name: 'Detached Visit Management SOP Class (Retired)', IsRetired: true }),
	'1.2.840.10008.3.1.2.3.1': new SOPClass({ ID: '1.2.840.10008.3.1.2.3.1', Name: 'Detached Study Management SOP Class (Retired)', IsRetired: true }),
	'1.2.840.10008.3.1.2.3.2': new SOPClass({ ID: '1.2.840.10008.3.1.2.3.2', Name: 'Study Component Management SOP Class (Retired)', IsRetired: true }),
	'1.2.840.10008.3.1.2.3.3': new SOPClass({ ID: '1.2.840.10008.3.1.2.3.3', Name: 'Modality Performed Procedure Step SOP Class', IsRetired: false }),
	'1.2.840.10008.3.1.2.3.4': new SOPClass({ ID: '1.2.840.10008.3.1.2.3.4', Name: 'Modality Performed Procedure Step Retrieve SOP Class', IsRetired: false }),
	'1.2.840.10008.3.1.2.3.5': new SOPClass({ ID: '1.2.840.10008.3.1.2.3.5', Name: 'Modality Performed Procedure Step Notification SOP Class', IsRetired: false }),
	'1.2.840.10008.3.1.2.5.1': new SOPClass({ ID: '1.2.840.10008.3.1.2.5.1', Name: 'Detached Results Management SOP Class (Retired)', IsRetired: true }),
	'1.2.840.10008.3.1.2.6.1': new SOPClass({ ID: '1.2.840.10008.3.1.2.6.1', Name: 'Detached Interpretation Management SOP Class (Retired)', IsRetired: true }),
	'1.2.840.10008.5.1.1.1': new SOPClass({ ID: '1.2.840.10008.5.1.1.1', Name: 'Basic Film Session SOP Class', IsRetired: false }),
	'1.2.840.10008.5.1.1.2': new SOPClass({ ID: '1.2.840.10008.5.1.1.2', Name: 'Basic Film Box SOP Class', IsRetired: false }),
	'1.2.840.10008.5.1.1.4': new SOPClass({ ID: '1.2.840.10008.5.1.1.4', Name: 'Basic Grayscale Image Box SOP Class', IsRetired: false }),
	'1.2.840.10008.5.1.1.4.1': new SOPClass({ ID: '1.2.840.10008.5.1.1.4.1', Name: 'Basic Color Image Box SOP Class', IsRetired: false }),
	'1.2.840.10008.5.1.1.4.2': new SOPClass({ ID: '1.2.840.10008.5.1.1.4.2', Name: 'Referenced Image Box SOP Class (Retired)', IsRetired: true }),
	'1.2.840.10008.5.1.1.14': new SOPClass({ ID: '1.2.840.10008.5.1.1.14', Name: 'Print Job SOP Class', IsRetired: false }),
	'1.2.840.10008.5.1.1.15': new SOPClass({ ID: '1.2.840.10008.5.1.1.15', Name: 'Basic Annotation Box SOP Class', IsRetired: false }),
	'1.2.840.10008.5.1.1.16': new SOPClass({ ID: '1.2.840.10008.5.1.1.16', Name: 'Printer SOP Class', IsRetired: false }),
	'1.2.840.10008.5.1.1.16.376': new SOPClass({ ID: '1.2.840.10008.5.1.1.16.376', Name: 'Printer Configuration Retrieval SOP Class', IsRetired: false }),
	'1.2.840.10008.5.1.1.22': new SOPClass({ ID: '1.2.840.10008.5.1.1.22', Name: 'VOI LUT Box SOP Class', IsRetired: false }),
	'1.2.840.10008.5.1.1.23': new SOPClass({ ID: '1.2.840.10008.5.1.1.23', Name: 'Presentation LUT SOP Class', IsRetired: false }),
	'1.2.840.10008.5.1.1.24': new SOPClass({ ID: '1.2.840.10008.5.1.1.24', Name: 'Image Overlay Box SOP Class (Retired)', IsRetired: true }),
	'1.2.840.10008.5.1.1.24.1': new SOPClass({ ID: '1.2.840.10008.5.1.1.24.1', Name: 'Basic Print Image Overlay Box SOP Class (Retired)', IsRetired: true }),
	'1.2.840.10008.5.1.1.26': new SOPClass({ ID: '1.2.840.10008.5.1.1.26', Name: 'Print Queue Management SOP Class (Retired)', IsRetired: true }),
	'1.2.840.10008.5.1.1.27': new SOPClass({ ID: '1.2.840.10008.5.1.1.27', Name: 'Stored Print Storage SOP Class (Retired)', IsRetired: true }),
	'1.2.840.10008.5.1.1.29': new SOPClass({ ID: '1.2.840.10008.5.1.1.29', Name: 'Hardcopy Grayscale Image Storage SOP Class (Retired)', IsRetired: true }),
	'1.2.840.10008.5.1.1.30': new SOPClass({ ID: '1.2.840.10008.5.1.1.30', Name: 'Hardcopy Color Image Storage SOP Class (Retired)', IsRetired: true }),
	'1.2.840.10008.5.1.1.31': new SOPClass({ ID: '1.2.840.10008.5.1.1.31', Name: 'Pull Print Request SOP Class (Retired)', IsRetired: true }),
	'1.2.840.10008.5.1.1.33': new SOPClass({ ID: '1.2.840.10008.5.1.1.33', Name: 'Media Creation Management SOP Class UID', IsRetired: false }),
	'1.2.840.10008.5.1.1.40': new SOPClass({ ID: '1.2.840.10008.5.1.1.40', Name: 'Display System SOP Class', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.1': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.1', Name: 'Computed Radiography Image Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.1.1': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.1.1', Name: 'Digital X-Ray Image Storage - For Presentation', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.1.1.1': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.1.1.1', Name: 'Digital X-Ray Image Storage - For Processing', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.1.2': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.1.2', Name: 'Digital Mammography X-Ray Image Storage - For Presentation', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.1.2.1': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.1.2.1', Name: 'Digital Mammography X-Ray Image Storage - For Processing', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.1.3': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.1.3', Name: 'Digital Intra-Oral X-Ray Image Storage - For Presentation', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.1.3.1': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.1.3.1', Name: 'Digital Intra-Oral X-Ray Image Storage - For Processing', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.2': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.2', Name: 'CT Image Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.2.1': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.2.1', Name: 'Enhanced CT Image Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.2.2': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.2.2', Name: 'Legacy Converted Enhanced CT Image Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.3': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.3', Name: 'Ultrasound Multi-frame Image Storage (Retired)', IsRetired: true }),
	'1.2.840.10008.5.1.4.1.1.3.1': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.3.1', Name: 'Ultrasound Multi-frame Image Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.4': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.4', Name: 'MR Image Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.4.1': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.4.1', Name: 'Enhanced MR Image Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.4.2': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.4.2', Name: 'MR Spectroscopy Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.4.3': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.4.3', Name: 'Enhanced MR Color Image Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.4.4': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.4.4', Name: 'Legacy Converted Enhanced MR Image Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.5': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.5', Name: 'Nuclear Medicine Image Storage (Retired)', IsRetired: true }),
	'1.2.840.10008.5.1.4.1.1.6': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.6', Name: 'Ultrasound Image Storage (Retired)', IsRetired: true }),
	'1.2.840.10008.5.1.4.1.1.6.1': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.6.1', Name: 'Ultrasound Image Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.6.2': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.6.2', Name: 'Enhanced US Volume Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.7': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.7', Name: 'Secondary Capture Image Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.7.1': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.7.1', Name: 'Multi-frame Single Bit Secondary Capture Image Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.7.2': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.7.2', Name: 'Multi-frame Grayscale Byte Secondary Capture Image Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.7.3': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.7.3', Name: 'Multi-frame Grayscale Word Secondary Capture Image Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.7.4': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.7.4', Name: 'Multi-frame True Color Secondary Capture Image Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.8': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.8', Name: 'Standalone Overlay Storage (Retired)', IsRetired: true }),
	'1.2.840.10008.5.1.4.1.1.9': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.9', Name: 'Standalone Curve Storage (Retired)', IsRetired: true }),
	'1.2.840.10008.5.1.4.1.1.9.1': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.9.1', Name: 'Waveform Storage - Trial (Retired)', IsRetired: true }),
	'1.2.840.10008.5.1.4.1.1.9.1.1': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.9.1.1', Name: '12-lead ECG Waveform Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.9.1.2': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.9.1.2', Name: 'General ECG Waveform Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.9.1.3': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.9.1.3', Name: 'Ambulatory ECG Waveform Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.9.2.1': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.9.2.1', Name: 'Hemodynamic Waveform Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.9.3.1': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.9.3.1', Name: 'Cardiac Electrophysiology Waveform Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.9.4.1': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.9.4.1', Name: 'Basic Voice Audio Waveform Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.9.4.2': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.9.4.2', Name: 'General Audio Waveform Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.9.5.1': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.9.5.1', Name: 'Arterial Pulse Waveform Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.9.6.1': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.9.6.1', Name: 'Respiratory Waveform Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.9.6.2': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.9.6.2', Name: 'Multi-channel Respiratory Waveform Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.9.7.1': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.9.7.1', Name: 'Routine Scalp Electroencephalogram Waveform Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.9.7.2': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.9.7.2', Name: 'Electromyogram Waveform Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.9.7.3': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.9.7.3', Name: 'Electrooculogram Waveform Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.9.7.4': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.9.7.4', Name: 'Sleep Electroencephalogram Waveform Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.9.8.1': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.9.8.1', Name: 'Body Position Waveform Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.10': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.10', Name: 'Standalone Modality LUT Storage (Retired)', IsRetired: true }),
	'1.2.840.10008.5.1.4.1.1.11': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.11', Name: 'Standalone VOI LUT Storage (Retired)', IsRetired: true }),
	'1.2.840.10008.5.1.4.1.1.11.1': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.11.1', Name: 'Grayscale Softcopy Presentation State Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.11.2': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.11.2', Name: 'Color Softcopy Presentation State Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.11.3': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.11.3', Name: 'Pseudo-Color Softcopy Presentation State Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.11.4': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.11.4', Name: 'Blending Softcopy Presentation State Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.11.5': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.11.5', Name: 'XA/XRF Grayscale Softcopy Presentation State Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.11.6': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.11.6', Name: 'Grayscale Planar MPR Volumetric Presentation State Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.11.7': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.11.7', Name: 'Compositing Planar MPR Volumetric Presentation State Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.11.8': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.11.8', Name: 'Advanced Blending Presentation State Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.11.9': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.11.9', Name: 'Volume Rendering Volumetric Presentation State Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.11.10': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.11.10', Name: 'Segmented Volume Rendering Volumetric Presentation State Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.11.11': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.11.11', Name: 'Multiple Volume Rendering Volumetric Presentation State Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.12.1': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.12.1', Name: 'X-Ray Angiographic Image Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.12.1.1': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.12.1.1', Name: 'Enhanced XA Image Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.12.2': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.12.2', Name: 'X-Ray Radiofluoroscopic Image Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.12.2.1': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.12.2.1', Name: 'Enhanced XRF Image Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.12.3': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.12.3', Name: 'X-Ray Angiographic Bi-Plane Image Storage (Retired)', IsRetired: true }),
	'1.2.840.10008.5.1.4.1.1.13.1.1': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.13.1.1', Name: 'X-Ray 3D Angiographic Image Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.13.1.2': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.13.1.2', Name: 'X-Ray 3D Craniofacial Image Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.13.1.3': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.13.1.3', Name: 'Breast Tomosynthesis Image Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.13.1.4': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.13.1.4', Name: 'Breast Projection X-Ray Image Storage - For Presentation', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.13.1.5': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.13.1.5', Name: 'Breast Projection X-Ray Image Storage - For Processing', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.14.1': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.14.1', Name: 'Intravascular Optical Coherence Tomography Image Storage - For Presentation', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.14.2': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.14.2', Name: 'Intravascular Optical Coherence Tomography Image Storage - For Processing', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.20': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.20', Name: 'Nuclear Medicine Image Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.30': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.30', Name: 'Parametric Map Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.66': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.66', Name: 'Raw Data Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.66.1': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.66.1', Name: 'Spatial Registration Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.66.2': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.66.2', Name: 'Spatial Fiducials Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.66.3': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.66.3', Name: 'Deformable Spatial Registration Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.66.4': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.66.4', Name: 'Segmentation Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.66.5': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.66.5', Name: 'Surface Segmentation Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.66.6': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.66.6', Name: 'Tractography Results Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.67': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.67', Name: 'Real World Value Mapping Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.68.1': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.68.1', Name: 'Surface Scan Mesh Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.68.2': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.68.2', Name: 'Surface Scan Point Cloud Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.77.1': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.77.1', Name: 'VL Image Storage - Trial (Retired)', IsRetired: true }),
	'1.2.840.10008.5.1.4.1.1.77.2': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.77.2', Name: 'VL Multi-frame Image Storage - Trial (Retired)', IsRetired: true }),
	'1.2.840.10008.5.1.4.1.1.77.1.1': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.77.1.1', Name: 'VL Endoscopic Image Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.77.1.1.1': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.77.1.1.1', Name: 'Video Endoscopic Image Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.77.1.2': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.77.1.2', Name: 'VL Microscopic Image Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.77.1.2.1': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.77.1.2.1', Name: 'Video Microscopic Image Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.77.1.3': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.77.1.3', Name: 'VL Slide-Coordinates Microscopic Image Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.77.1.4': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.77.1.4', Name: 'VL Photographic Image Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.77.1.4.1': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.77.1.4.1', Name: 'Video Photographic Image Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.77.1.5.1': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.77.1.5.1', Name: 'Ophthalmic Photography 8 Bit Image Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.77.1.5.2': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.77.1.5.2', Name: 'Ophthalmic Photography 16 Bit Image Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.77.1.5.3': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.77.1.5.3', Name: 'Stereometric Relationship Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.77.1.5.4': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.77.1.5.4', Name: 'Ophthalmic Tomography Image Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.77.1.5.5': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.77.1.5.5', Name: 'Wide Field Ophthalmic Photography Stereographic Projection Image Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.77.1.5.6': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.77.1.5.6', Name: 'Wide Field Ophthalmic Photography 3D Coordinates Image Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.77.1.5.7': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.77.1.5.7', Name: 'Ophthalmic Optical Coherence Tomography En Face Image Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.77.1.5.8': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.77.1.5.8', Name: 'Ophthalmic Optical Coherence Tomography B-scan Volume Analysis Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.77.1.6': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.77.1.6', Name: 'VL Whole Slide Microscopy Image Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.77.1.7': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.77.1.7', Name: 'Dermoscopic Photography Image Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.78.1': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.78.1', Name: 'Lensometry Measurements Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.78.2': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.78.2', Name: 'Autorefraction Measurements Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.78.3': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.78.3', Name: 'Keratometry Measurements Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.78.4': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.78.4', Name: 'Subjective Refraction Measurements Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.78.5': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.78.5', Name: 'Visual Acuity Measurements Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.78.6': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.78.6', Name: 'Spectacle Prescription Report Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.78.7': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.78.7', Name: 'Ophthalmic Axial Measurements Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.78.8': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.78.8', Name: 'Intraocular Lens Calculations Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.79.1': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.79.1', Name: 'Macular Grid Thickness and Volume Report Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.80.1': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.80.1', Name: 'Ophthalmic Visual Field Static Perimetry Measurements Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.81.1': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.81.1', Name: 'Ophthalmic Thickness Map Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.82.1': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.82.1', Name: 'Corneal Topography Map Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.88.1': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.88.1', Name: 'Text SR Storage - Trial (Retired)', IsRetired: true }),
	'1.2.840.10008.5.1.4.1.1.88.2': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.88.2', Name: 'Audio SR Storage - Trial (Retired)', IsRetired: true }),
	'1.2.840.10008.5.1.4.1.1.88.3': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.88.3', Name: 'Detail SR Storage - Trial (Retired)', IsRetired: true }),
	'1.2.840.10008.5.1.4.1.1.88.4': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.88.4', Name: 'Comprehensive SR Storage - Trial (Retired)', IsRetired: true }),
	'1.2.840.10008.5.1.4.1.1.88.11': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.88.11', Name: 'Basic Text SR Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.88.22': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.88.22', Name: 'Enhanced SR Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.88.33': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.88.33', Name: 'Comprehensive SR Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.88.34': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.88.34', Name: 'Comprehensive 3D SR Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.88.35': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.88.35', Name: 'Extensible SR Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.88.40': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.88.40', Name: 'Procedure Log Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.88.50': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.88.50', Name: 'Mammography CAD SR Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.88.59': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.88.59', Name: 'Key Object Selection Document Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.88.65': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.88.65', Name: 'Chest CAD SR Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.88.67': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.88.67', Name: 'X-Ray Radiation Dose SR Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.88.68': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.88.68', Name: 'Radiopharmaceutical Radiation Dose SR Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.88.69': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.88.69', Name: 'Colon CAD SR Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.88.70': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.88.70', Name: 'Implantation Plan SR Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.88.71': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.88.71', Name: 'Acquisition Context SR Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.88.72': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.88.72', Name: 'Simplified Adult Echo SR Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.88.73': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.88.73', Name: 'Patient Radiation Dose SR Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.88.74': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.88.74', Name: 'Planned Imaging Agent Administration SR Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.88.75': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.88.75', Name: 'Performed Imaging Agent Administration SR Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.88.76': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.88.76', Name: 'Enhanced X-Ray Radiation Dose SR Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.90.1': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.90.1', Name: 'Content Assessment Results Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.91.1': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.91.1', Name: 'Microscopy Bulk Simple Annotations Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.104.1': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.104.1', Name: 'Encapsulated PDF Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.104.2': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.104.2', Name: 'Encapsulated CDA Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.104.3': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.104.3', Name: 'Encapsulated STL Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.104.4': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.104.4', Name: 'Encapsulated OBJ Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.104.5': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.104.5', Name: 'Encapsulated MTL Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.128': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.128', Name: 'Positron Emission Tomography Image Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.128.1': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.128.1', Name: 'Legacy Converted Enhanced PET Image Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.129': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.129', Name: 'Standalone PET Curve Storage (Retired)', IsRetired: true }),
	'1.2.840.10008.5.1.4.1.1.130': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.130', Name: 'Enhanced PET Image Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.131': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.131', Name: 'Basic Structured Display Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.200.1': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.200.1', Name: 'CT Defined Procedure Protocol Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.200.2': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.200.2', Name: 'CT Performed Procedure Protocol Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.200.3': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.200.3', Name: 'Protocol Approval Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.200.4': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.200.4', Name: 'Protocol Approval Information Model - FIND', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.200.5': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.200.5', Name: 'Protocol Approval Information Model - MOVE', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.200.6': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.200.6', Name: 'Protocol Approval Information Model - GET', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.200.7': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.200.7', Name: 'XA Defined Procedure Protocol Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.200.8': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.200.8', Name: 'XA Performed Procedure Protocol Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.201.1': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.201.1', Name: 'Inventory Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.201.2': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.201.2', Name: 'Inventory - FIND', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.201.3': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.201.3', Name: 'Inventory - MOVE', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.201.4': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.201.4', Name: 'Inventory - GET', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.201.5': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.201.5', Name: 'Inventory Creation', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.201.6': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.201.6', Name: 'Repository Query', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.481.1': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.481.1', Name: 'RT Image Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.481.2': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.481.2', Name: 'RT Dose Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.481.3': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.481.3', Name: 'RT Structure Set Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.481.4': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.481.4', Name: 'RT Beams Treatment Record Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.481.5': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.481.5', Name: 'RT Plan Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.481.6': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.481.6', Name: 'RT Brachy Treatment Record Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.481.7': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.481.7', Name: 'RT Treatment Summary Record Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.481.8': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.481.8', Name: 'RT Ion Plan Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.481.9': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.481.9', Name: 'RT Ion Beams Treatment Record Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.481.10': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.481.10', Name: 'RT Physician Intent Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.481.11': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.481.11', Name: 'RT Segment Annotation Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.481.12': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.481.12', Name: 'RT Radiation Set Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.481.13': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.481.13', Name: 'C-Arm Photon-Electron Radiation Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.481.14': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.481.14', Name: 'Tomotherapeutic Radiation Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.481.15': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.481.15', Name: 'Robotic-Arm Radiation Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.481.16': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.481.16', Name: 'RT Radiation Record Set Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.481.17': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.481.17', Name: 'RT Radiation Salvage Record Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.481.18': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.481.18', Name: 'Tomotherapeutic Radiation Record Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.481.19': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.481.19', Name: 'C-Arm Photon-Electron Radiation Record Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.481.20': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.481.20', Name: 'Robotic Radiation Record Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.481.21': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.481.21', Name: 'RT Radiation Set Delivery Instruction Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.481.22': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.481.22', Name: 'RT Treatment Preparation Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.481.23': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.481.23', Name: 'Enhanced RT Image Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.481.24': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.481.24', Name: 'Enhanced Continuous RT Image Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.481.25': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.481.25', Name: 'RT Patient Position Acquisition Instruction Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.501.1': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.501.1', Name: 'DICOS CT Image Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.501.2.1': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.501.2.1', Name: 'DICOS Digital X-Ray Image Storage - For Presentation', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.501.2.2': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.501.2.2', Name: 'DICOS Digital X-Ray Image Storage - For Processing', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.501.3': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.501.3', Name: 'DICOS Threat Detection Report Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.501.4': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.501.4', Name: 'DICOS 2D AIT Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.501.5': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.501.5', Name: 'DICOS 3D AIT Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.501.6': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.501.6', Name: 'DICOS Quadrupole Resonance (QR) Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.601.1': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.601.1', Name: 'Eddy Current Image Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.1.601.2': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.1.601.2', Name: 'Eddy Current Multi-frame Image Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.2.1.1': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.2.1.1', Name: 'Patient Root Query/Retrieve Information Model - FIND', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.2.1.2': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.2.1.2', Name: 'Patient Root Query/Retrieve Information Model - MOVE', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.2.1.3': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.2.1.3', Name: 'Patient Root Query/Retrieve Information Model - GET', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.2.2.1': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.2.2.1', Name: 'Study Root Query/Retrieve Information Model - FIND', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.2.2.2': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.2.2.2', Name: 'Study Root Query/Retrieve Information Model - MOVE', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.2.2.3': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.2.2.3', Name: 'Study Root Query/Retrieve Information Model - GET', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.2.3.1': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.2.3.1', Name: 'Patient/Study Only Query/Retrieve Information Model - FIND (Retired)', IsRetired: true }),
	'1.2.840.10008.5.1.4.1.2.3.2': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.2.3.2', Name: 'Patient/Study Only Query/Retrieve Information Model - MOVE (Retired)', IsRetired: true }),
	'1.2.840.10008.5.1.4.1.2.3.3': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.2.3.3', Name: 'Patient/Study Only Query/Retrieve Information Model - GET (Retired)', IsRetired: true }),
	'1.2.840.10008.5.1.4.1.2.4.2': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.2.4.2', Name: 'Composite Instance Root Retrieve - MOVE', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.2.4.3': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.2.4.3', Name: 'Composite Instance Root Retrieve - GET', IsRetired: false }),
	'1.2.840.10008.5.1.4.1.2.5.3': new SOPClass({ ID: '1.2.840.10008.5.1.4.1.2.5.3', Name: 'Composite Instance Retrieve Without Bulk Data - GET', IsRetired: false }),
	'1.2.840.10008.5.1.4.20.1': new SOPClass({ ID: '1.2.840.10008.5.1.4.20.1', Name: 'Defined Procedure Protocol Information Model - FIND', IsRetired: false }),
	'1.2.840.10008.5.1.4.20.2': new SOPClass({ ID: '1.2.840.10008.5.1.4.20.2', Name: 'Defined Procedure Protocol Information Model - MOVE', IsRetired: false }),
	'1.2.840.10008.5.1.4.20.3': new SOPClass({ ID: '1.2.840.10008.5.1.4.20.3', Name: 'Defined Procedure Protocol Information Model - GET', IsRetired: false }),
	'1.2.840.10008.5.1.4.31': new SOPClass({ ID: '1.2.840.10008.5.1.4.31', Name: 'Modality Worklist Information Model - FIND', IsRetired: false }),
	'1.2.840.10008.5.1.4.32.1': new SOPClass({ ID: '1.2.840.10008.5.1.4.32.1', Name: 'General Purpose Worklist Information Model - FIND (Retired)', IsRetired: true }),
	'1.2.840.10008.5.1.4.32.2': new SOPClass({ ID: '1.2.840.10008.5.1.4.32.2', Name: 'General Purpose Scheduled Procedure Step SOP Class (Retired)', IsRetired: true }),
	'1.2.840.10008.5.1.4.32.3': new SOPClass({ ID: '1.2.840.10008.5.1.4.32.3', Name: 'General Purpose Performed Procedure Step SOP Class (Retired)', IsRetired: true }),
	'1.2.840.10008.5.1.4.33': new SOPClass({ ID: '1.2.840.10008.5.1.4.33', Name: 'Instance Availability Notification SOP Class', IsRetired: false }),
	'1.2.840.10008.5.1.4.34.1': new SOPClass({ ID: '1.2.840.10008.5.1.4.34.1', Name: 'RT Beams Delivery Instruction Storage - Trial (Retired)', IsRetired: true }),
	'1.2.840.10008.5.1.4.34.2': new SOPClass({ ID: '1.2.840.10008.5.1.4.34.2', Name: 'RT Conventional Machine Verification - Trial (Retired)', IsRetired: true }),
	'1.2.840.10008.5.1.4.34.3': new SOPClass({ ID: '1.2.840.10008.5.1.4.34.3', Name: 'RT Ion Machine Verification - Trial (Retired)', IsRetired: true }),
	'1.2.840.10008.5.1.4.34.4.1': new SOPClass({ ID: '1.2.840.10008.5.1.4.34.4.1', Name: 'Unified Procedure Step - Push SOP Class - Trial (Retired)', IsRetired: true }),
	'1.2.840.10008.5.1.4.34.4.2': new SOPClass({ ID: '1.2.840.10008.5.1.4.34.4.2', Name: 'Unified Procedure Step - Watch SOP Class - Trial (Retired)', IsRetired: true }),
	'1.2.840.10008.5.1.4.34.4.3': new SOPClass({ ID: '1.2.840.10008.5.1.4.34.4.3', Name: 'Unified Procedure Step - Pull SOP Class - Trial (Retired)', IsRetired: true }),
	'1.2.840.10008.5.1.4.34.4.4': new SOPClass({ ID: '1.2.840.10008.5.1.4.34.4.4', Name: 'Unified Procedure Step - Event SOP Class - Trial (Retired)', IsRetired: true }),
	'1.2.840.10008.5.1.4.34.6.1': new SOPClass({ ID: '1.2.840.10008.5.1.4.34.6.1', Name: 'Unified Procedure Step - Push SOP Class', IsRetired: false }),
	'1.2.840.10008.5.1.4.34.6.2': new SOPClass({ ID: '1.2.840.10008.5.1.4.34.6.2', Name: 'Unified Procedure Step - Watch SOP Class', IsRetired: false }),
	'1.2.840.10008.5.1.4.34.6.3': new SOPClass({ ID: '1.2.840.10008.5.1.4.34.6.3', Name: 'Unified Procedure Step - Pull SOP Class', IsRetired: false }),
	'1.2.840.10008.5.1.4.34.6.4': new SOPClass({ ID: '1.2.840.10008.5.1.4.34.6.4', Name: 'Unified Procedure Step - Event SOP Class', IsRetired: false }),
	'1.2.840.10008.5.1.4.34.6.5': new SOPClass({ ID: '1.2.840.10008.5.1.4.34.6.5', Name: 'Unified Procedure Step - Query SOP Class', IsRetired: false }),
	'1.2.840.10008.5.1.4.34.7': new SOPClass({ ID: '1.2.840.10008.5.1.4.34.7', Name: 'RT Beams Delivery Instruction Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.34.8': new SOPClass({ ID: '1.2.840.10008.5.1.4.34.8', Name: 'RT Conventional Machine Verification', IsRetired: false }),
	'1.2.840.10008.5.1.4.34.9': new SOPClass({ ID: '1.2.840.10008.5.1.4.34.9', Name: 'RT Ion Machine Verification', IsRetired: false }),
	'1.2.840.10008.5.1.4.34.10': new SOPClass({ ID: '1.2.840.10008.5.1.4.34.10', Name: 'RT Brachy Application Setup Delivery Instruction Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.37.1': new SOPClass({ ID: '1.2.840.10008.5.1.4.37.1', Name: 'General Relevant Patient Information Query', IsRetired: false }),
	'1.2.840.10008.5.1.4.37.2': new SOPClass({ ID: '1.2.840.10008.5.1.4.37.2', Name: 'Breast Imaging Relevant Patient Information Query', IsRetired: false }),
	'1.2.840.10008.5.1.4.37.3': new SOPClass({ ID: '1.2.840.10008.5.1.4.37.3', Name: 'Cardiac Relevant Patient Information Query', IsRetired: false }),
	'1.2.840.10008.5.1.4.38.1': new SOPClass({ ID: '1.2.840.10008.5.1.4.38.1', Name: 'Hanging Protocol Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.38.2': new SOPClass({ ID: '1.2.840.10008.5.1.4.38.2', Name: 'Hanging Protocol Information Model - FIND', IsRetired: false }),
	'1.2.840.10008.5.1.4.38.3': new SOPClass({ ID: '1.2.840.10008.5.1.4.38.3', Name: 'Hanging Protocol Information Model - MOVE', IsRetired: false }),
	'1.2.840.10008.5.1.4.38.4': new SOPClass({ ID: '1.2.840.10008.5.1.4.38.4', Name: 'Hanging Protocol Information Model - GET', IsRetired: false }),
	'1.2.840.10008.5.1.4.39.1': new SOPClass({ ID: '1.2.840.10008.5.1.4.39.1', Name: 'Color Palette Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.39.2': new SOPClass({ ID: '1.2.840.10008.5.1.4.39.2', Name: 'Color Palette Query/Retrieve Information Model - FIND', IsRetired: false }),
	'1.2.840.10008.5.1.4.39.3': new SOPClass({ ID: '1.2.840.10008.5.1.4.39.3', Name: 'Color Palette Query/Retrieve Information Model - MOVE', IsRetired: false }),
	'1.2.840.10008.5.1.4.39.4': new SOPClass({ ID: '1.2.840.10008.5.1.4.39.4', Name: 'Color Palette Query/Retrieve Information Model - GET', IsRetired: false }),
	'1.2.840.10008.5.1.4.41': new SOPClass({ ID: '1.2.840.10008.5.1.4.41', Name: 'Product Characteristics Query SOP Class', IsRetired: false }),
	'1.2.840.10008.5.1.4.42': new SOPClass({ ID: '1.2.840.10008.5.1.4.42', Name: 'Substance Approval Query SOP Class', IsRetired: false }),
	'1.2.840.10008.5.1.4.43.1': new SOPClass({ ID: '1.2.840.10008.5.1.4.43.1', Name: 'Generic Implant Template Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.43.2': new SOPClass({ ID: '1.2.840.10008.5.1.4.43.2', Name: 'Generic Implant Template Information Model - FIND', IsRetired: false }),
	'1.2.840.10008.5.1.4.43.3': new SOPClass({ ID: '1.2.840.10008.5.1.4.43.3', Name: 'Generic Implant Template Information Model - MOVE', IsRetired: false }),
	'1.2.840.10008.5.1.4.43.4': new SOPClass({ ID: '1.2.840.10008.5.1.4.43.4', Name: 'Generic Implant Template Information Model - GET', IsRetired: false }),
	'1.2.840.10008.5.1.4.44.1': new SOPClass({ ID: '1.2.840.10008.5.1.4.44.1', Name: 'Implant Assembly Template Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.44.2': new SOPClass({ ID: '1.2.840.10008.5.1.4.44.2', Name: 'Implant Assembly Template Information Model - FIND', IsRetired: false }),
	'1.2.840.10008.5.1.4.44.3': new SOPClass({ ID: '1.2.840.10008.5.1.4.44.3', Name: 'Implant Assembly Template Information Model - MOVE', IsRetired: false }),
	'1.2.840.10008.5.1.4.44.4': new SOPClass({ ID: '1.2.840.10008.5.1.4.44.4', Name: 'Implant Assembly Template Information Model - GET', IsRetired: false }),
	'1.2.840.10008.5.1.4.45.1': new SOPClass({ ID: '1.2.840.10008.5.1.4.45.1', Name: 'Implant Template Group Storage', IsRetired: false }),
	'1.2.840.10008.5.1.4.45.2': new SOPClass({ ID: '1.2.840.10008.5.1.4.45.2', Name: 'Implant Template Group Information Model - FIND', IsRetired: false }),
	'1.2.840.10008.5.1.4.45.3': new SOPClass({ ID: '1.2.840.10008.5.1.4.45.3', Name: 'Implant Template Group Information Model - MOVE', IsRetired: false }),
	'1.2.840.10008.5.1.4.45.4': new SOPClass({ ID: '1.2.840.10008.5.1.4.45.4', Name: 'Implant Template Group Information Model - GET', IsRetired: false }),
	'1.2.840.10008.10.1': new SOPClass({ ID: '1.2.840.10008.10.1', Name: 'Video Endoscopic Image Real-Time Communication', IsRetired: false }),
	'1.2.840.10008.10.2': new SOPClass({ ID: '1.2.840.10008.10.2', Name: 'Video Photographic Image Real-Time Communication', IsRetired: false }),
	'1.2.840.10008.10.3': new SOPClass({ ID: '1.2.840.10008.10.3', Name: 'Audio Waveform Real-Time Communication', IsRetired: false }),
	'1.2.840.10008.10.4': new SOPClass({ ID: '1.2.840.10008.10.4', Name: 'Rendition Selection Document Real-Time Communication', IsRetired: false }),
	'0': new SOPClass({ ID: '0', Name: 'None', IsRetired: false })
};