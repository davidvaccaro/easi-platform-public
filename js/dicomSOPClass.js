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

class DicomSOPClass {

    // Find a sop class by sop class id (e.g. 1.2.3.4..)
    static find(id) {

        // Lookup the sop class
        return sop_class_lookup[id];

    };

    constructor(data) {
        Object.assign(this, data);
    }

};

var SOPClasses = {

    // NONE DICOM SOP Class
    NONE: new DicomSOPClass({
        ID: '0',
        Name: 'None'
    }),

    // Standard SOP Classes
    // The SOP Classes in the Storage Service Class identify the Composite IODs to be stored. Table B.5-1 identifies Standard SOP Classes.
    // https://dicom.nema.org/medical/dicom/current/output/html/part04.html#table_B.5-1
    ComputedRadiographyImageStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.1', 
        Name: 'Computed Radiography Image Storage' 
    }),
    DigitalXRayImageStorageForPresentation: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.1.1', 
        Name: 'Digital X-Ray Image Storage - For Presentation' 
    }),
    DigitalXRayImageStorageForProcessing: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.1.1.1', 
        Name: 'Digital X-Ray Image Storage - For Processing' 
    }),
    DigitalMammographyXRayImageStorageForPresentation: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.1.2', 
        Name: 'Digital Mammography X-Ray Image Storage - For Presentation' 
    }),
    DigitalMammographyXRayImageStorageForProcessing: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.1.2.1', 
        Name: 'Digital Mammography X-Ray Image Storage - For Processing' 
    }),
    DigitalIntraOralXRayImageStorageForPresentation: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.1.3', 
        Name: 'Digital Intra-Oral X-Ray Image Storage - For Presentation' 
    }),
    DigitalIntraOralXRayImageStorageForProcessing: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.1.3.1', 
        Name: 'Digital Intra-Oral X-Ray Image Storage - For Processing' 
    }),
    CTImageStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.2', 
        Name: 'CT Image Storage' 
    }),
    EnhancedCTImageStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.2.1', 
        Name: 'Enhanced CT Image Storage' 
    }),
    LegacyConvertedEnhancedCTImageStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.2.2', 
        Name: 'Legacy Converted Enhanced CT Image Storage' 
    }),
    UltrasoundMultiframeImageStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.3.1', 
        Name: 'Ultrasound Multi-frame Image Storage' 
    }),
    MRImageStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.4', 
        Name: 'MR Image Storage' 
    }),
    EnhancedMRImageStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.4.1', 
        Name: 'Enhanced MR Image Storage' 
    }),
    MRSpectroscopyStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.4.2', 
        Name: 'MR Spectroscopy Storage' 
    }),
    EnhancedMRColorImageStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.4.3', 
        Name: 'Enhanced MR Color Image Storage' 
    }),
    LegacyConvertedEnhancedMRImageStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.4.4', 
        Name: 'Legacy Converted Enhanced MR Image Storage' 
    }),
    UltrasoundImageStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.6.1', 
        Name: 'Ultrasound Image Storage' 
    }),
    EnhancedUSVolumeStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.6.2', 
        Name: 'Enhanced US Volume Storage' 
    }),
    SecondaryCaptureImageStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.7', 
        Name: 'Secondary Capture Image Storage' 
    }),
    MultiframeSingleBitSecondaryCaptureImageStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.7.1', 
        Name: 'Multi-frame Single Bit Secondary Capture Image Storage' 
    }),
    MultiframeGrayscaleByteSecondaryCaptureImageStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.7.2', 
        Name: 'Multi-frame Grayscale Byte Secondary Capture Image Storage' 
    }),
    MultiframeGrayscaleWordSecondaryCaptureImageStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.7.3', 
        Name: 'Multi-frame Grayscale Word Secondary Capture Image Storage' 
    }),
    MultiframeTrueColorSecondaryCaptureImageStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.7.4', 
        Name: 'Multi-frame True Color Secondary Capture Image Storage' 
    }),
    TwelveleadECGWaveformStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.9.1.1', 
        Name: '12-lead ECG Waveform Storage' 
    }),
    GeneralECGWaveformStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.9.1.2', 
        Name: 'General ECG Waveform Storage' 
    }),
    AmbulatoryECGWaveformStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.9.1.3', 
        Name: 'Ambulatory ECG Waveform Storage' 
    }),
    HemodynamicWaveformStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.9.2.1', 
        Name: 'Hemodynamic Waveform Storage' 
    }),
    CardiacElectrophysiologyWaveformStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.9.3.1', 
        Name: 'Cardiac Electrophysiology Waveform Storage' 
    }),
    BasicVoiceAudioWaveformStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.9.4.1', 
        Name: 'Basic Voice Audio Waveform Storage' 
    }),
    GeneralAudioWaveformStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.9.4.2', 
        Name: 'General Audio Waveform Storage' 
    }),
    ArterialPulseWaveformStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.9.5.1', 
        Name: 'Arterial Pulse Waveform Storage' 
    }),
    RespiratoryWaveformStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.9.6.1', 
        Name: 'Respiratory Waveform Storage' 
    }),
    MultichannelRespiratoryWaveformStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.9.6.2', 
        Name: 'Multi-channel Respiratory Waveform Storage' 
    }),
    RoutineScalpElectroencephalogramWaveformStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.9.7.1', 
        Name: 'Routine Scalp Electroencephalogram Waveform Storage' 
    }),
    ElectromyogramWaveformStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.9.7.2', 
        Name: 'Electromyogram Waveform Storage' 
    }),
    ElectrooculogramWaveformStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.9.7.3', 
        Name: 'Electrooculogram Waveform Storage' 
    }),
    SleepElectroencephalogramWaveformStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.9.7.4', 
        Name: 'Sleep Electroencephalogram Waveform Storage' 
    }),
    BodyPositionWaveformStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.9.8.1', 
        Name: 'Body Position Waveform Storage' 
    }),
    GrayscaleSoftcopyPresentationStateStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.11.1', 
        Name: 'Grayscale Softcopy Presentation State Storage' 
    }),
    ColorSoftcopyPresentationStateStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.11.2', 
        Name: 'Color Softcopy Presentation State Storage' 
    }),
    PseudoColorSoftcopyPresentationStateStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.11.3', 
        Name: 'Pseudo-Color Softcopy Presentation State Storage' 
    }),
    BlendingSoftcopyPresentationStateStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.11.4', 
        Name: 'Blending Softcopy Presentation State Storage' 
    }),
    XAXRFGrayscaleSoftcopyPresentationStateStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.11.5', 
        Name: 'XA/XRF Grayscale Softcopy Presentation State Storage' 
    }),
    GrayscalePlanarMPRVolumetricPresentationStateStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.11.6', 
        Name: 'Grayscale Planar MPR Volumetric Presentation State Storage' 
    }),
    CompositingPlanarMPRVolumetricPresentationStateStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.11.7', 
        Name: 'Compositing Planar MPR Volumetric Presentation State Storage' 
    }),
    AdvancedBlendingPresentationStateStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.11.8', 
        Name: 'Advanced Blending Presentation State Storage' 
    }),
    VolumeRenderingVolumetricPresentationStateStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.11.9', 
        Name: 'Volume Rendering Volumetric Presentation State Storage' 
    }),
    SegmentedVolumeRenderingVolumetricPresentationStateStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.11.10', 
        Name: 'Segmented Volume Rendering Volumetric Presentation State Storage' 
    }),
    MultipleVolumeRenderingVolumetricPresentationStateStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.11.11', 
        Name: 'Multiple Volume Rendering Volumetric Presentation State Storage' 
    }),
    XRayAngiographicImageStorage: new DicomSOPClass({
        ID: '1.2.840.10008.5.1.4.1.1.12.1', 
        Name: 'X-Ray Angiographic Image Storage' 
    }),
    EnhancedXAImageStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.12.1.1', 
        Name: 'Enhanced XA Image Storage' 
    }),
    XRayRadiofluoroscopicImageStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.12.2', 
        Name: 'X-Ray Radiofluoroscopic Image Storage' 
    }),
    EnhancedXRFImageStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.12.2.1', 
        Name: 'Enhanced XRF Image Storage' 
    }),
    XRay3DAngiographicImageStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.13.1.1', 
        Name: 'X-Ray 3D Angiographic Image Storage' 
    }),
    XRay3DCraniofacialImageStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.13.1.2', 
        Name: 'X-Ray 3D Craniofacial Image Storage' 
    }),
    BreastTomosynthesisImageStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.13.1.3', 
        Name: 'Breast Tomosynthesis Image Storage' 
    }),
    BreastProjectionXRayImageStorageForPresentation: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.13.1.4', 
        Name: 'Breast Projection X-Ray Image Storage - For Presentation' 
    }),
    BreastProjectionXRayImageStorageForProcessing: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.13.1.5', 
        Name: 'Breast Projection X-Ray Image Storage - For Processing' 
    }),
    IntravascularOpticalCoherenceTomographyImageStorageForPresentation: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.14.1', 
        Name: 'Intravascular Optical Coherence Tomography Image Storage - For Presentation' 
    }),
    IntravascularOpticalCoherenceTomographyImageStorageForProcessing: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.14.2', 
        Name: 'Intravascular Optical Coherence Tomography Image Storage - For Processing' 
    }),
    NuclearMedicineImageStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.20', 
        Name: 'Nuclear Medicine Image Storage' 
    }),
    ParametricMapStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.30', 
        Name: 'Parametric Map Storage' 
    }),
    RawDataStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.66', 
        Name: 'Raw Data Storage' 
    }),
    SpatialRegistrationStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.66.1', 
        Name: 'Spatial Registration Storage' 
    }),
    SpatialFiducialsStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.66.2', 
        Name: 'Spatial Fiducials Storage' 
    }),
    DeformableSpatialRegistrationStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.66.3', 
        Name: 'Deformable Spatial Registration Storage' 
    }),
    SegmentationStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.66.4', 
        Name: 'Segmentation Storage' 
    }),
    SurfaceSegmentationStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.66.5', 
        Name: 'Surface Segmentation Storage' 
    }),
    TractographyResultsStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.66.6', 
        Name: 'Tractography Results Storage' 
    }),
    RealWorldValueMappingStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.67', 
        Name: 'Real World Value Mapping Storage' 
    }),
    SurfaceScanMeshStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.68.1', 
        Name: 'Surface Scan Mesh Storage' 
    }),
    SurfaceScanPointCloudStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.68.2', 
        Name: 'Surface Scan Point Cloud Storage' 
    }),
    VLEndoscopicImageStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.77.1.1', 
        Name: 'VL Endoscopic Image Storage' 
    }),
    VideoEndoscopicImageStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.77.1.1.1', 
        Name: 'Video Endoscopic Image Storage' 
    }),
    VLMicroscopicImageStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.77.1.2', 
        Name: 'VL Microscopic Image Storage' 
    }),
    VideoMicroscopicImageStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.77.1.2.1', 
        Name: 'Video Microscopic Image Storage' 
    }),
    VLSlideCoordinatesMicroscopicImageStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.77.1.3', 
        Name: 'VL Slide-Coordinates Microscopic Image Storage' 
    }),
    VLPhotographicImageStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.77.1.4', 
        Name: 'VL Photographic Image Storage' 
    }),
    VideoPhotographicImageStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.77.1.4.1', 
        Name: 'Video Photographic Image Storage' 
    }),
    OphthalmicPhotography8BitImageStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.77.1.5.1', 
        Name: 'Ophthalmic Photography 8 Bit Image Storage' 
    }),
    OphthalmicPhotography16BitImageStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.77.1.5.2', 
        Name: 'Ophthalmic Photography 16 Bit Image Storage' 
    }),
    StereometricRelationshipStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.77.1.5.3', 
        Name: 'Stereometric Relationship Storage' 
    }),
    OphthalmicTomographyImageStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.77.1.5.4', 
        Name: 'Ophthalmic Tomography Image Storage' 
    }),
    WideFieldOphthalmicPhotographyStereographicProjectionImageStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.77.1.5.5', 
        Name: 'Wide Field Ophthalmic Photography Stereographic Projection Image Storage' 
    }),
    WideFieldOphthalmicPhotography3DCoordinatesImageStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.77.1.5.6', 
        Name: 'Wide Field Ophthalmic Photography 3D Coordinates Image Storage' 
    }),
    OphthalmicOpticalCoherenceTomographyEnFaceImageStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.77.1.5.7', 
        Name: 'Ophthalmic Optical Coherence Tomography En Face Image Storage' 
    }),
    OphthalmicOpticalCoherenceTomographyBscanVolumeAnalysisStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.77.1.5.8', 
        Name: 'Ophthalmic Optical Coherence Tomography B-scan Volume Analysis Storage' 
    }),
    VLWholeSlideMicroscopyImageStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.77.1.6', 
        Name: 'VL Whole Slide Microscopy Image Storage' 
    }),
    DermoscopicPhotographyImageStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.77.1.7', 
        Name: 'Dermoscopic Photography Image Storage' 
    }),
    LensometryMeasurementsStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.78.1', 
        Name: 'Lensometry Measurements Storage' 
    }),
    AutorefractionMeasurementsStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.78.2', 
        Name: 'Autorefraction Measurements Storage' 
    }),
    KeratometryMeasurementsStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.78.3', 
        Name: 'Keratometry Measurements Storage' 
    }),
    SubjectiveRefractionMeasurementsStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.78.4', 
        Name: 'Subjective Refraction Measurements Storage' 
    }),
    VisualAcuityMeasurementsStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.78.5', 
        Name: 'Visual Acuity Measurements Storage' 
    }),
    SpectaclePrescriptionReportStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.78.6', 
        Name: 'Spectacle Prescription Report Storage' 
    }),
    OphthalmicAxialMeasurementsStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.78.7', 
        Name: 'Ophthalmic Axial Measurements Storage' 
    }),
    IntraocularLensCalculationsStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.78.8', 
        Name: 'Intraocular Lens Calculations Storage' 
    }),
    MacularGridThicknessandVolumeReport: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.79.1', 
        Name: 'Macular Grid Thickness and Volume Report' 
    }),
    OphthalmicVisualFieldStaticPerimetryMeasurementsStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.80.1', 
        Name: 'Ophthalmic Visual Field Static Perimetry Measurements Storage' 
    }),
    OphthalmicThicknessMapStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.81.1', 
        Name: 'Ophthalmic Thickness Map Storage' 
    }),
    CornealTopographyMapStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.82.1', 
        Name: 'Corneal Topography Map Storage' 
    }),
    BasicTextSRStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.88.11', 
        Name: 'Basic Text SR Storage' 
    }),
    EnhancedSRStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.88.22', 
        Name: 'Enhanced SR Storage' 
    }),
    ComprehensiveSRStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.88.33', 
        Name: 'Comprehensive SR Storage' 
    }),
    Comprehensive3DSRStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.88.34', 
        Name: 'Comprehensive 3D SR Storage' 
    }),
    ExtensibleSRStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.88.35', 
        Name: 'Extensible SR Storage' 
    }),
    ProcedureLogStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.88.40', 
        Name: 'Procedure Log Storage' 
    }),
    MammographyCADSRStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.88.50', 
        Name: 'Mammography CAD SR Storage' 
    }),
    KeyObjectSelectionDocumentStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.88.59', 
        Name: 'Key Object Selection Document Storage' 
    }),
    ChestCADSRStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.88.65', 
        Name: 'Chest CAD SR Storage' 
    }),
    XRayRadiationDoseSRStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.88.67', 
        Name: 'X-Ray Radiation Dose SR Storage' 
    }),
    RadiopharmaceuticalRadiationDoseSRStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.88.68', 
        Name: 'Radiopharmaceutical Radiation Dose SR Storage' 
    }),
    ColonCADSRStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.88.69', 
        Name: 'Colon CAD SR Storage' 
    }),
    ImplantationPlanSRStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.88.70', 
        Name: 'Implantation Plan SR Storage' 
    }),
    AcquisitionContextSRStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.88.71', 
        Name: 'Acquisition Context SR Storage' 
    }),
    SimplifiedAdultEchoSRStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.88.72', 
        Name: 'Simplified Adult Echo SR Storage' 
    }),
    PatientRadiationDoseSRStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.88.73', 
        Name: 'Patient Radiation Dose SR Storage' 
    }),
    PlannedImagingAgentAdministrationSRStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.88.74', 
        Name: 'Planned Imaging Agent Administration SR Storage' 
    }),
    PerformedImagingAgentAdministrationSRStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.88.75', 
        Name: 'Performed Imaging Agent Administration SR Storage' 
    }),
    EnhancedXRayRadiationDoseSRStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.88.76', 
        Name: 'Enhanced X-Ray Radiation Dose SR Storage' 
    }),
    ContentAssessmentResultsStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.90.1', 
        Name: 'Content Assessment Results Storage' 
    }),
    MicroscopyBulkSimpleAnnotationsStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.91.1', 
        Name: 'Microscopy Bulk Simple Annotations Storage' 
    }),
    EncapsulatedPDFStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.104.1', 
        Name: 'Encapsulated PDF Storage' 
    }),
    EncapsulatedCDAStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.104.2', 
        Name: 'Encapsulated CDA Storage' 
    }),
    EncapsulatedSTLStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.104.3', 
        Name: 'Encapsulated STL Storage' 
    }),
    EncapsulatedOBJStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.104.4', 
        Name: 'Encapsulated OBJ Storage' 
    }),
    EncapsulatedMTLStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.104.5', 
        Name: 'Encapsulated MTL Storage' 
    }),
    PositronEmissionTomographyImageStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.128', 
        Name: 'Positron Emission Tomography Image Storage' 
    }),
    EnhancedPETImageStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.130', 
        Name: 'Enhanced PET Image Storage' 
    }),
    LegacyConvertedEnhancedPETImageStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.128.1', 
        Name: 'Legacy Converted Enhanced PET Image Storage' 
    }),
    BasicStructuredDisplayStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.131', 
        Name: 'Basic Structured Display Storage' 
    }),
    CTPerformedProcedureProtocolStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.200.2', 
        Name: 'CT Performed Procedure Protocol Storage' 
    }),
    XAPerformedProcedureProtocolStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.200.8', 
        Name: 'XA Performed Procedure Protocol Storage' 
    }),
    RTImageStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.481.1', 
        Name: 'RT Image Storage' 
    }),
    RTDoseStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.481.2', 
        Name: 'RT Dose Storage' 
    }),
    RTStructureSetStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.481.3', 
        Name: 'RT Structure Set Storage' 
    }),
    RTBeamsTreatmentRecordStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.481.4', 
        Name: 'RT Beams Treatment Record Storage' 
    }),
    RTPlanStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.481.5', 
        Name: 'RT Plan Storage' 
    }),
    RTBrachyTreatmentRecordStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.481.6', 
        Name: 'RT Brachy Treatment Record Storage' 
    }),
    RTTreatmentSummaryRecordStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.481.7', 
        Name: 'RT Treatment Summary Record Storage' 
    }),
    RTIonPlanStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.481.8', 
        Name: 'RT Ion Plan Storage' 
    }),
    RTIonBeamsTreatmentRecordStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.481.9', 
        Name: 'RT Ion Beams Treatment Record Storage' 
    }),
    RTPhysicianIntentStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.481.10', 
        Name: 'RT Physician Intent Storage' 
    }),
    RTSegmentAnnotationStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.481.11', 
        Name: 'RT Segment Annotation Storage' 
    }),
    RTRadiationSetStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.481.12', 
        Name: 'RT Radiation Set Storage' 
    }),
    CArmPhotonElectronRadiationStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.481.13', 
        Name: 'C-Arm Photon-Electron Radiation Storage' 
    }),
    TomotherapeuticRadiationStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.481.14', 
        Name: 'Tomotherapeutic Radiation Storage' 
    }),
    RoboticArmRadiationStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.481.15', 
        Name: 'Robotic-Arm Radiation Storage' 
    }),
    RTRadiationRecordSetStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.481.16', 
        Name: 'RT Radiation Record Set Storage' 
    }),
    RTRadiationSalvageRecordStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.481.17', 
        Name: 'RT Radiation Salvage Record Storage' 
    }),
    TomotherapeuticRadiationRecordStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.481.18', 
        Name: 'Tomotherapeutic Radiation Record Storage' 
    }),
    CArmPhotonElectronRadiationRecordStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.481.19', 
        Name: 'C-Arm Photon-Electron Radiation Record Storage' 
    }),
    RoboticRadiationRecordStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.481.20', 
        Name: 'Robotic Radiation Record Storage' 
    }),
    RTRadiationSetDeliveryInstructionStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.481.21', 
        Name: 'RT Radiation Set Delivery Instruction Storage' 
    }),
    RTTreatmentPreparationStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.481.22', 
        Name: 'RT Treatment Preparation Storage' 
    }),
    EnhancedRTImageStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.481.23', 
        Name: 'Enhanced RT Image Storage' 
    }),
    EnhancedContinuousRTImageStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.481.24', 
        Name: 'Enhanced Continuous RT Image Storage' 
    }),
    RTPatientPositionAcquisitionInstructionStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.481.25', 
        Name: 'RT Patient Position Acquisition Instruction Storage' 
    }),
    RTBeamsDeliveryInstructionStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.34.7', 
        Name: 'RT Beams Delivery Instruction Storage' 
    }),
    RTBrachyApplicationSetupDeliveryInstructionStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.34.10', 
        Name: 'RT Brachy Application Setup Delivery Instruction Storage' 
    }),
    
    // Non-Patient Object Storage SOP Classes
    // The application-level services addressed by the Non-Patient Object Storage Service Class definition are specified in the SOP Classes specified in Table GG.3-1.
    // https://dicom.nema.org/medical/dicom/current/output/html/part04.html#table_GG.3-1    
    HangingProtocolStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.38.1', 
        Name: 'Hanging Protocol Storage' 
    }),
    ColorPaletteStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.39.1', 
        Name: 'Color Palette Storage' 
    }),
    GenericImplantTemplateStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.43.1', 
        Name: 'Generic Implant Template Storage' 
    }),
    ImplantAssemblyTemplateStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.44.1', 
        Name: 'Implant Assembly Template Storage' 
    }),
    ImplantTemplateGroupStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.45.1', 
        Name: 'Implant Template Group Storage' 
    }),
    CTDefinedProcedureProtocolStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.200.1', 
        Name: 'CT Defined Procedure Protocol Storage' 
    }),
    ProtocolApprovalStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.200.3', 
        Name: 'Protocol Approval Storage' 
    }),
    XADefinedProcedureProtocolStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.200.7', 
        Name: 'XA Defined Procedure Protocol Storage' 
    }),
    InventoryStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.5.1.4.1.1.201.1', 
        Name: 'Inventory Storage' 
    }), 
   
    // Media Storage SOP Classes
    // The SOP Classes in the Media Storage Service Class identify the Composite IODs to be stored. The IODs of the following SOP Classes can be stored.
    // https://dicom.nema.org/medical/dicom/current/output/html/part04.html#table_I.4-1    
    MediaStorageDirectoryStorage: new DicomSOPClass({ 
        ID: '1.2.840.10008.1.3.10', 
        Name: 'Media Storage Directory Storage' 
    })

};

var sop_class_lookup = {

    // Special Transfer Syntaxes
    '0': SOPClasses.NONE,

    // Standard SOP Classes
    '1.2.840.10008.5.1.4.1.1.1': SOPClasses.ComputedRadiographyImageStorage,
    '1.2.840.10008.5.1.4.1.1.1.1': SOPClasses.DigitalXRayImageStorageForPresentation,
    '1.2.840.10008.5.1.4.1.1.1.1.1': SOPClasses.DigitalXRayImageStorageForProcessing,
    '1.2.840.10008.5.1.4.1.1.1.2': SOPClasses.DigitalMammographyXRayImageStorageForPresentation,
    '1.2.840.10008.5.1.4.1.1.1.2.1': SOPClasses.DigitalMammographyXRayImageStorageForProcessing,
    '1.2.840.10008.5.1.4.1.1.1.3': SOPClasses.DigitalIntraOralXRayImageStorageForPresentation,
    '1.2.840.10008.5.1.4.1.1.1.3.1': SOPClasses.DigitalIntraOralXRayImageStorageForProcessing,
    '1.2.840.10008.5.1.4.1.1.2': SOPClasses.CTImageStorage,
    '1.2.840.10008.5.1.4.1.1.2.1': SOPClasses.EnhancedCTImageStorage,
    '1.2.840.10008.5.1.4.1.1.2.2': SOPClasses.LegacyConvertedEnhancedCTImageStorage,
    '1.2.840.10008.5.1.4.1.1.3.1': SOPClasses.UltrasoundMultiframeImageStorage,
    '1.2.840.10008.5.1.4.1.1.4': SOPClasses.MRImageStorage,
    '1.2.840.10008.5.1.4.1.1.4.1': SOPClasses.EnhancedMRImageStorage,
    '1.2.840.10008.5.1.4.1.1.4.2': SOPClasses.MRSpectroscopyStorage,
    '1.2.840.10008.5.1.4.1.1.4.3': SOPClasses.EnhancedMRColorImageStorage,
    '1.2.840.10008.5.1.4.1.1.4.4': SOPClasses.LegacyConvertedEnhancedMRImageStorage,
    '1.2.840.10008.5.1.4.1.1.6.1': SOPClasses.UltrasoundImageStorage,
    '1.2.840.10008.5.1.4.1.1.6.2': SOPClasses.EnhancedUSVolumeStorage,
    '1.2.840.10008.5.1.4.1.1.7': SOPClasses.SecondaryCaptureImageStorage,
    '1.2.840.10008.5.1.4.1.1.7.1': SOPClasses.MultiframeSingleBitSecondaryCaptureImageStorage,
    '1.2.840.10008.5.1.4.1.1.7.2': SOPClasses.MultiframeGrayscaleByteSecondaryCaptureImageStorage,
    '1.2.840.10008.5.1.4.1.1.7.3': SOPClasses.MultiframeGrayscaleWordSecondaryCaptureImageStorage,
    '1.2.840.10008.5.1.4.1.1.7.4': SOPClasses.MultiframeTrueColorSecondaryCaptureImageStorage,
    '1.2.840.10008.5.1.4.1.1.9.1.1': SOPClasses.TwelveleadECGWaveformStorage,
    '1.2.840.10008.5.1.4.1.1.9.1.2': SOPClasses.GeneralECGWaveformStorage,
    '1.2.840.10008.5.1.4.1.1.9.1.3': SOPClasses.AmbulatoryECGWaveformStorage,
    '1.2.840.10008.5.1.4.1.1.9.2.1': SOPClasses.HemodynamicWaveformStorage,
    '1.2.840.10008.5.1.4.1.1.9.3.1': SOPClasses.CardiacElectrophysiologyWaveformStorage,
    '1.2.840.10008.5.1.4.1.1.9.4.1': SOPClasses.BasicVoiceAudioWaveformStorage,
    '1.2.840.10008.5.1.4.1.1.9.4.2': SOPClasses.GeneralAudioWaveformStorage,
    '1.2.840.10008.5.1.4.1.1.9.5.1': SOPClasses.ArterialPulseWaveformStorage,
    '1.2.840.10008.5.1.4.1.1.9.6.1': SOPClasses.RespiratoryWaveformStorage,
    '1.2.840.10008.5.1.4.1.1.9.6.2': SOPClasses.MultichannelRespiratoryWaveformStorage,
    '1.2.840.10008.5.1.4.1.1.9.7.1': SOPClasses.RoutineScalpElectroencephalogramWaveformStorage,
    '1.2.840.10008.5.1.4.1.1.9.7.2': SOPClasses.ElectromyogramWaveformStorage,
    '1.2.840.10008.5.1.4.1.1.9.7.3': SOPClasses.ElectrooculogramWaveformStorage,
    '1.2.840.10008.5.1.4.1.1.9.7.4': SOPClasses.SleepElectroencephalogramWaveformStorage,
    '1.2.840.10008.5.1.4.1.1.9.8.1': SOPClasses.BodyPositionWaveformStorage,
    '1.2.840.10008.5.1.4.1.1.11.1': SOPClasses.GrayscaleSoftcopyPresentationStateStorage,
    '1.2.840.10008.5.1.4.1.1.11.2': SOPClasses.ColorSoftcopyPresentationStateStorage,
    '1.2.840.10008.5.1.4.1.1.11.3': SOPClasses.PseudoColorSoftcopyPresentationStateStorage,
    '1.2.840.10008.5.1.4.1.1.11.4': SOPClasses.BlendingSoftcopyPresentationStateStorage,
    '1.2.840.10008.5.1.4.1.1.11.5': SOPClasses.XAXRFGrayscaleSoftcopyPresentationStateStorage,
    '1.2.840.10008.5.1.4.1.1.11.6': SOPClasses.GrayscalePlanarMPRVolumetricPresentationStateStorage,
    '1.2.840.10008.5.1.4.1.1.11.7': SOPClasses.CompositingPlanarMPRVolumetricPresentationStateStorage,
    '1.2.840.10008.5.1.4.1.1.11.8': SOPClasses.AdvancedBlendingPresentationStateStorage,
    '1.2.840.10008.5.1.4.1.1.11.9': SOPClasses.VolumeRenderingVolumetricPresentationStateStorage,
    '1.2.840.10008.5.1.4.1.1.11.10': SOPClasses.SegmentedVolumeRenderingVolumetricPresentationStateStorage,
    '1.2.840.10008.5.1.4.1.1.11.11': SOPClasses.MultipleVolumeRenderingVolumetricPresentationStateStorage,
    '1.2.840.10008.5.1.4.1.1.12.1': SOPClasses.XRayAngiographicImageStorage,
    '1.2.840.10008.5.1.4.1.1.12.1.1': SOPClasses.EnhancedXAImageStorage,
    '1.2.840.10008.5.1.4.1.1.12.2': SOPClasses.XRayRadiofluoroscopicImageStorage,
    '1.2.840.10008.5.1.4.1.1.12.2.1': SOPClasses.EnhancedXRFImageStorage,
    '1.2.840.10008.5.1.4.1.1.13.1.1': SOPClasses.XRay3DAngiographicImageStorage,
    '1.2.840.10008.5.1.4.1.1.13.1.2': SOPClasses.XRay3DCraniofacialImageStorage,
    '1.2.840.10008.5.1.4.1.1.13.1.3': SOPClasses.BreastTomosynthesisImageStorage,
    '1.2.840.10008.5.1.4.1.1.13.1.4': SOPClasses.BreastProjectionXRayImageStorageForPresentation,
    '1.2.840.10008.5.1.4.1.1.13.1.5': SOPClasses.BreastProjectionXRayImageStorageForProcessing,
    '1.2.840.10008.5.1.4.1.1.14.1': SOPClasses.IntravascularOpticalCoherenceTomographyImageStorageForPresentation,
    '1.2.840.10008.5.1.4.1.1.14.2': SOPClasses.IntravascularOpticalCoherenceTomographyImageStorageForProcessing,
    '1.2.840.10008.5.1.4.1.1.20': SOPClasses.NuclearMedicineImageStorage,
    '1.2.840.10008.5.1.4.1.1.30': SOPClasses.ParametricMapStorage,
    '1.2.840.10008.5.1.4.1.1.66': SOPClasses.RawDataStorage,
    '1.2.840.10008.5.1.4.1.1.66.1': SOPClasses.SpatialRegistrationStorage,
    '1.2.840.10008.5.1.4.1.1.66.2': SOPClasses.SpatialFiducialsStorage,
    '1.2.840.10008.5.1.4.1.1.66.3': SOPClasses.DeformableSpatialRegistrationStorage,
    '1.2.840.10008.5.1.4.1.1.66.4': SOPClasses.SegmentationStorage,
    '1.2.840.10008.5.1.4.1.1.66.5': SOPClasses.SurfaceSegmentationStorage,
    '1.2.840.10008.5.1.4.1.1.66.6': SOPClasses.TractographyResultsStorage,
    '1.2.840.10008.5.1.4.1.1.67': SOPClasses.RealWorldValueMappingStorage,
    '1.2.840.10008.5.1.4.1.1.68.1': SOPClasses.SurfaceScanMeshStorage,
    '1.2.840.10008.5.1.4.1.1.68.2': SOPClasses.SurfaceScanPointCloudStorage,
    '1.2.840.10008.5.1.4.1.1.77.1.1': SOPClasses.VLEndoscopicImageStorage,
    '1.2.840.10008.5.1.4.1.1.77.1.1.1': SOPClasses.VideoEndoscopicImageStorage,
    '1.2.840.10008.5.1.4.1.1.77.1.2': SOPClasses.VLMicroscopicImageStorage,
    '1.2.840.10008.5.1.4.1.1.77.1.2.1': SOPClasses.VideoMicroscopicImageStorage,
    '1.2.840.10008.5.1.4.1.1.77.1.3': SOPClasses.VLSlideCoordinatesMicroscopicImageStorage,
    '1.2.840.10008.5.1.4.1.1.77.1.4': SOPClasses.VLPhotographicImageStorage,
    '1.2.840.10008.5.1.4.1.1.77.1.4.1': SOPClasses.VideoPhotographicImageStorage,
    '1.2.840.10008.5.1.4.1.1.77.1.5.1': SOPClasses.OphthalmicPhotography8BitImageStorage,
    '1.2.840.10008.5.1.4.1.1.77.1.5.2': SOPClasses.OphthalmicPhotography16BitImageStorage,
    '1.2.840.10008.5.1.4.1.1.77.1.5.3': SOPClasses.StereometricRelationshipStorage,
    '1.2.840.10008.5.1.4.1.1.77.1.5.4': SOPClasses.OphthalmicTomographyImageStorage,
    '1.2.840.10008.5.1.4.1.1.77.1.5.5': SOPClasses.WideFieldOphthalmicPhotographyStereographicProjectionImageStorage,
    '1.2.840.10008.5.1.4.1.1.77.1.5.6': SOPClasses.WideFieldOphthalmicPhotography3DCoordinatesImageStorage,
    '1.2.840.10008.5.1.4.1.1.77.1.5.7': SOPClasses.OphthalmicOpticalCoherenceTomographyEnFaceImageStorage,
    '1.2.840.10008.5.1.4.1.1.77.1.5.8': SOPClasses.OphthalmicOpticalCoherenceTomographyBscanVolumeAnalysisStorage,
    '1.2.840.10008.5.1.4.1.1.77.1.6': SOPClasses.VLWholeSlideMicroscopyImageStorage,
    '1.2.840.10008.5.1.4.1.1.77.1.7': SOPClasses.DermoscopicPhotographyImageStorage,
    '1.2.840.10008.5.1.4.1.1.78.1': SOPClasses.LensometryMeasurementsStorage,
    '1.2.840.10008.5.1.4.1.1.78.2': SOPClasses.AutorefractionMeasurementsStorage,
    '1.2.840.10008.5.1.4.1.1.78.3': SOPClasses.KeratometryMeasurementsStorage,
    '1.2.840.10008.5.1.4.1.1.78.4': SOPClasses.SubjectiveRefractionMeasurementsStorage,
    '1.2.840.10008.5.1.4.1.1.78.5': SOPClasses.VisualAcuityMeasurementsStorage,
    '1.2.840.10008.5.1.4.1.1.78.6': SOPClasses.SpectaclePrescriptionReportStorage,
    '1.2.840.10008.5.1.4.1.1.78.7': SOPClasses.OphthalmicAxialMeasurementsStorage,
    '1.2.840.10008.5.1.4.1.1.78.8': SOPClasses.IntraocularLensCalculationsStorage,
    '1.2.840.10008.5.1.4.1.1.79.1': SOPClasses.MacularGridThicknessandVolumeReport,
    '1.2.840.10008.5.1.4.1.1.80.1': SOPClasses.OphthalmicVisualFieldStaticPerimetryMeasurementsStorage,
    '1.2.840.10008.5.1.4.1.1.81.1': SOPClasses.OphthalmicThicknessMapStorage,
    '1.2.840.10008.5.1.4.1.1.82.1': SOPClasses.CornealTopographyMapStorage,
    '1.2.840.10008.5.1.4.1.1.88.11': SOPClasses.BasicTextSRStorage,
    '1.2.840.10008.5.1.4.1.1.88.22': SOPClasses.EnhancedSRStorage,
    '1.2.840.10008.5.1.4.1.1.88.33': SOPClasses.ComprehensiveSRStorage,
    '1.2.840.10008.5.1.4.1.1.88.34': SOPClasses.Comprehensive3DSRStorage,
    '1.2.840.10008.5.1.4.1.1.88.35': SOPClasses.ExtensibleSRStorage,
    '1.2.840.10008.5.1.4.1.1.88.40': SOPClasses.ProcedureLogStorage,
    '1.2.840.10008.5.1.4.1.1.88.50': SOPClasses.MammographyCADSRStorage,
    '1.2.840.10008.5.1.4.1.1.88.59': SOPClasses.KeyObjectSelectionDocumentStorage,
    '1.2.840.10008.5.1.4.1.1.88.65': SOPClasses.ChestCADSRStorage,
    '1.2.840.10008.5.1.4.1.1.88.67': SOPClasses.XRayRadiationDoseSRStorage,
    '1.2.840.10008.5.1.4.1.1.88.68': SOPClasses.RadiopharmaceuticalRadiationDoseSRStorage,
    '1.2.840.10008.5.1.4.1.1.88.69': SOPClasses.ColonCADSRStorage,
    '1.2.840.10008.5.1.4.1.1.88.70': SOPClasses.ImplantationPlanSRStorage,
    '1.2.840.10008.5.1.4.1.1.88.71': SOPClasses.AcquisitionContextSRStorage,
    '1.2.840.10008.5.1.4.1.1.88.72': SOPClasses.SimplifiedAdultEchoSRStorage,
    '1.2.840.10008.5.1.4.1.1.88.73': SOPClasses.PatientRadiationDoseSRStorage,
    '1.2.840.10008.5.1.4.1.1.88.74': SOPClasses.PlannedImagingAgentAdministrationSRStorage,
    '1.2.840.10008.5.1.4.1.1.88.75': SOPClasses.PerformedImagingAgentAdministrationSRStorage,
    '1.2.840.10008.5.1.4.1.1.88.76': SOPClasses.EnhancedXRayRadiationDoseSRStorage,
    '1.2.840.10008.5.1.4.1.1.90.1': SOPClasses.ContentAssessmentResultsStorage,
    '1.2.840.10008.5.1.4.1.1.91.1': SOPClasses.MicroscopyBulkSimpleAnnotationsStorage,
    '1.2.840.10008.5.1.4.1.1.104.1': SOPClasses.EncapsulatedPDFStorage,
    '1.2.840.10008.5.1.4.1.1.104.2': SOPClasses.EncapsulatedCDAStorage,
    '1.2.840.10008.5.1.4.1.1.104.3': SOPClasses.EncapsulatedSTLStorage,
    '1.2.840.10008.5.1.4.1.1.104.4': SOPClasses.EncapsulatedOBJStorage,
    '1.2.840.10008.5.1.4.1.1.104.5': SOPClasses.EncapsulatedMTLStorage,
    '1.2.840.10008.5.1.4.1.1.128': SOPClasses.PositronEmissionTomographyImageStorage,
    '1.2.840.10008.5.1.4.1.1.130': SOPClasses.EnhancedPETImageStorage,
    '1.2.840.10008.5.1.4.1.1.128.1': SOPClasses.LegacyConvertedEnhancedPETImageStorage,
    '1.2.840.10008.5.1.4.1.1.131': SOPClasses.BasicStructuredDisplayStorage,
    '1.2.840.10008.5.1.4.1.1.200.2': SOPClasses.CTPerformedProcedureProtocolStorage,
    '1.2.840.10008.5.1.4.1.1.200.8': SOPClasses.XAPerformedProcedureProtocolStorage,
    '1.2.840.10008.5.1.4.1.1.481.1': SOPClasses.RTImageStorage,
    '1.2.840.10008.5.1.4.1.1.481.2': SOPClasses.RTDoseStorage,
    '1.2.840.10008.5.1.4.1.1.481.3': SOPClasses.RTStructureSetStorage,
    '1.2.840.10008.5.1.4.1.1.481.4': SOPClasses.RTBeamsTreatmentRecordStorage,
    '1.2.840.10008.5.1.4.1.1.481.5': SOPClasses.RTPlanStorage,
    '1.2.840.10008.5.1.4.1.1.481.6': SOPClasses.RTBrachyTreatmentRecordStorage,
    '1.2.840.10008.5.1.4.1.1.481.7': SOPClasses.RTTreatmentSummaryRecordStorage,
    '1.2.840.10008.5.1.4.1.1.481.8': SOPClasses.RTIonPlanStorage,
    '1.2.840.10008.5.1.4.1.1.481.9': SOPClasses.RTIonBeamsTreatmentRecordStorage,
    '1.2.840.10008.5.1.4.1.1.481.10': SOPClasses.RTPhysicianIntentStorage,
    '1.2.840.10008.5.1.4.1.1.481.11': SOPClasses.RTSegmentAnnotationStorage,
    '1.2.840.10008.5.1.4.1.1.481.12': SOPClasses.RTRadiationSetStorage,
    '1.2.840.10008.5.1.4.1.1.481.13': SOPClasses.CArmPhotonElectronRadiationStorage,
    '1.2.840.10008.5.1.4.1.1.481.14': SOPClasses.TomotherapeuticRadiationStorage,
    '1.2.840.10008.5.1.4.1.1.481.15': SOPClasses.RoboticArmRadiationStorage,
    '1.2.840.10008.5.1.4.1.1.481.16': SOPClasses.RTRadiationRecordSetStorage,
    '1.2.840.10008.5.1.4.1.1.481.17': SOPClasses.RTRadiationSalvageRecordStorage,
    '1.2.840.10008.5.1.4.1.1.481.18': SOPClasses.TomotherapeuticRadiationRecordStorage,
    '1.2.840.10008.5.1.4.1.1.481.19': SOPClasses.CArmPhotonElectronRadiationRecordStorage,
    '1.2.840.10008.5.1.4.1.1.481.20': SOPClasses.RoboticRadiationRecordStorage,
    '1.2.840.10008.5.1.4.1.1.481.21': SOPClasses.RTRadiationSetDeliveryInstructionStorage,
    '1.2.840.10008.5.1.4.1.1.481.22': SOPClasses.RTTreatmentPreparationStorage,
    '1.2.840.10008.5.1.4.1.1.481.23': SOPClasses.EnhancedRTImageStorage,
    '1.2.840.10008.5.1.4.1.1.481.24': SOPClasses.EnhancedContinuousRTImageStorage,
    '1.2.840.10008.5.1.4.1.1.481.25': SOPClasses.RTPatientPositionAcquisitionInstructionStorage,
    '1.2.840.10008.5.1.4.34.7': SOPClasses.RTBeamsDeliveryInstructionStorage,
    '1.2.840.10008.5.1.4.34.10': SOPClasses.RTBrachyApplicationSetupDeliveryInstructionStorage,
    
    // Non-Patient Object Storage SOP Classes
    '1.2.840.10008.5.1.4.38.1': SOPClasses.HangingProtocolStorage,
    '1.2.840.10008.5.1.4.39.1': SOPClasses.ColorPaletteStorage,
    '1.2.840.10008.5.1.4.43.1': SOPClasses.GenericImplantTemplateStorage,
    '1.2.840.10008.5.1.4.44.1': SOPClasses.ImplantAssemblyTemplateStorage,
    '1.2.840.10008.5.1.4.45.1': SOPClasses.ImplantTemplateGroupStorage,
    '1.2.840.10008.5.1.4.1.1.200.1': SOPClasses.CTDefinedProcedureProtocolStorage,
    '1.2.840.10008.5.1.4.1.1.200.3': SOPClasses.ProtocolApprovalStorage,
    '1.2.840.10008.5.1.4.1.1.200.7': SOPClasses.XADefinedProcedureProtocolStorage,
    '1.2.840.10008.5.1.4.1.1.201.1': SOPClasses.InventoryStorage,
    
    // Media Storage SOP Classes
    '1.2.840.10008.1.3.10': SOPClasses.MediaStorageDirectoryStorage
    
};
