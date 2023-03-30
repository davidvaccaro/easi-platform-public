//
// SOPClass.js - 1.0.0
//
// DICOM Modality Class 
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

export default class DicomModality {

    // Find a modality by modality code value (e.g. MR or CT)
    static find(id) {

        // Lookup the sop class
        return Modalities[id];

    };

    constructor(data) {
        Object.assign(this, data);
    }

};

export var Modalities = {
	'AR': new DicomModality({ ID: 'AR', Name: 'Autorefraction', IsMultiFrame: false, IsRetired: false }),
	'BI': new DicomModality({ ID: 'BI', Name: 'Biomagnetic Imaging', IsMultiFrame: false, IsRetired: false }),
	'BMD': new DicomModality({ ID: 'BMD', Name: 'Bone Mineral Densitometry', IsMultiFrame: false, IsRetired: false }),
    'EPS': new DicomModality({ ID: 'EPS', Name: 'Cardiac Electrophysiology', IsMultiFrame: false, IsRetired: false }),
    'CR': new DicomModality({ ID: 'CR', Name: 'Computed Radiography', IsMultiFrame: false, IsRetired: false }),    
    'CT': new DicomModality({ ID: 'CT', Name: 'Computed Tomography', IsMultiFrame: true, IsRetired: false }),
    'DMS': new DicomModality({ ID: 'DMS', Name: 'Dermoscopy', IsMultiFrame: false, IsRetired: false }),
    'DG': new DicomModality({ ID: 'DG', Name: 'Diaphanography', IsMultiFrame: false, IsRetired: false }),
    'DX': new DicomModality({ ID: 'DX', Name: 'Digital Radiography', IsMultiFrame: false, IsRetired: false }),
    'ECG': new DicomModality({ ID: 'ECG', Name: 'Electrocardiography', IsMultiFrame: false, IsRetired: false }),    
    'EEG': new DicomModality({ ID: 'EEG', Name: 'Electroencephalography', IsMultiFrame: false, IsRetired: false }),
    'EMG': new DicomModality({ ID: 'EMG', Name: 'Electromyography', IsMultiFrame: false, IsRetired: false }),
    'EOG': new DicomModality({ ID: 'EOG', Name: 'Electrooculography', IsMultiFrame: false, IsRetired: false }),
    'ES': new DicomModality({ ID: 'ES', Name: 'Endoscopy', IsMultiFrame: false, IsRetired: false }),
    'XC': new DicomModality({ ID: 'XC', Name: 'External-camera Photography', IsMultiFrame: false, IsRetired: false }),
    'GM': new DicomModality({ ID: 'GM', Name: 'General Microscopy', IsMultiFrame: false, IsRetired: false }),
    'HD': new DicomModality({ ID: 'HD', Name: 'Hemodynamic Waveform', IsMultiFrame: false, IsRetired: false }),
    'IO': new DicomModality({ ID: 'IO', Name: 'Intra-oral Radiography', IsMultiFrame: false, IsRetired: false }),
    'IVOCT': new DicomModality({ ID: 'IVOCT', Name: 'Intravascular Optical Coherence Tomography', IsMultiFrame: false, IsRetired: false }),
    'IVUS': new DicomModality({ ID: 'IVUS', Name: 'Intravascular Ultrasound', IsMultiFrame: false, IsRetired: false }),
    'KER': new DicomModality({ ID: 'KER', Name: 'Keratometry', IsMultiFrame: false, IsRetired: false }),
    'LS': new DicomModality({ ID: 'LS', Name: 'Laser Scan', IsMultiFrame: false, IsRetired: false }),
    'LEN': new DicomModality({ ID: 'LEN', Name: 'Lensometry', IsMultiFrame: false, IsRetired: false }),
    'MR': new DicomModality({ ID: 'MR', Name: 'Magnetic Resonance', IsMultiFrame: true, IsRetired: false }),
    'MG': new DicomModality({ ID: 'MG', Name: 'Mammography', IsMultiFrame: false, IsRetired: false }),
    'NM': new DicomModality({ ID: 'NM', Name: 'Nuclear Medicine', IsMultiFrame: true, IsRetired: false }),
    'OAM': new DicomModality({ ID: 'OAM', Name: 'Ophthalmic Axial Measurements', IsMultiFrame: false, IsRetired: false }),
    'OPM': new DicomModality({ ID: 'OPM', Name: 'Ophthalmic Mapping', IsMultiFrame: false, IsRetired: false }),
    'OP': new DicomModality({ ID: 'OP', Name: 'Ophthalmic Photography', IsMultiFrame: false, IsRetired: false }),
    'OPT': new DicomModality({ ID: 'OPT', Name: 'Ophthalmic Tomography', IsMultiFrame: false, IsRetired: false }),
    'OPTBSV': new DicomModality({ ID: 'OPTBSV', Name: 'Ophthalmic Tomography B-scan Volume Analysis', IsMultiFrame: false, IsRetired: false }),
    'OPTENF': new DicomModality({ ID: 'OPTENF', Name: 'Ophthalmic Tomography En Face', IsMultiFrame: false, IsRetired: false }),
    'OPV': new DicomModality({ ID: 'OPV', Name: 'Ophthalmic Visual Field', IsMultiFrame: false, IsRetired: false }),
    'OCT': new DicomModality({ ID: 'OCT', Name: 'Optical Coherence Tomography', IsMultiFrame: false, IsRetired: false }),    
    'OSS': new DicomModality({ ID: 'OSS', Name: 'Optical Surface Scanner', IsMultiFrame: false, IsRetired: false }),    
    'PX': new DicomModality({ ID: 'PX', Name: 'Panoramic X-Ray', IsMultiFrame: false, IsRetired: false }),    
    'POS': new DicomModality({ ID: 'POS', Name: 'Position Sensor', IsMultiFrame: false, IsRetired: false }),    
    'PT': new DicomModality({ ID: 'PT', Name: 'Positron emission tomography', IsMultiFrame: true, IsRetired: false }),    
    'RF': new DicomModality({ ID: 'RF', Name: 'Radiofluoroscopy', IsMultiFrame: false, IsRetired: false }),    
    'RG': new DicomModality({ ID: 'RG', Name: 'Radiographic imaging', IsMultiFrame: false, IsRetired: false }),    
    'RESP': new DicomModality({ ID: 'RESP', Name: 'Respiratory Waveform', IsMultiFrame: false, IsRetired: false }),    
    'RTIMAGE': new DicomModality({ ID: 'RTIMAGE', Name: 'RT Image', IsMultiFrame: false, IsRetired: false }),    
    'SM': new DicomModality({ ID: 'SM', Name: 'Slide Microscopy', IsMultiFrame: false, IsRetired: false }),    
    'SRF': new DicomModality({ ID: 'SRF', Name: 'Subjective Refraction', IsMultiFrame: false, IsRetired: false }),
    'TG': new DicomModality({ ID: 'TG', Name: 'Thermography', IsMultiFrame: false, IsRetired: false }),
    'US': new DicomModality({ ID: 'US', Name: 'Ultrasound', IsMultiFrame: true, IsRetired: false }),
    'BDUS': new DicomModality({ ID: 'BDUS', Name: 'Ultrasound Bone Densitometry', IsMultiFrame: false, IsRetired: false }),
    'VA': new DicomModality({ ID: 'VA', Name: 'Visual Acuity', IsMultiFrame: false, IsRetired: false }),
    'XA': new DicomModality({ ID: 'XA', Name: 'X-Ray Angiography', IsMultiFrame: true, IsRetired: false })
};

export var Modality = {
	AR: Modalities['AR'],
	BI: Modalities['BI'],
	BMD: Modalities['BMD'],
	EPS: Modalities['EPS'],
	CR: Modalities['CR'],
	CT: Modalities['CT'],
	DMS: Modalities['DMS'],
	DG: Modalities['DG'],
	DX: Modalities['DX'],
	ECG: Modalities['ECG'],
	EEG: Modalities['EEG'],
	EMG: Modalities['EMG'],
	EOG: Modalities['EOG'],
	ES: Modalities['ES'],
	XC: Modalities['XC'],
	GM: Modalities['GM'],
	HD: Modalities['HD'],
	IO: Modalities['IO'],
	IVOCT: Modalities['IVOCT'],
	IVUS: Modalities['IVUS'],
	KER: Modalities['KER'],
	LS: Modalities['LS'],
	LEN: Modalities['LEN'],
	MR: Modalities['MR'],
	MG: Modalities['MG'],
	NM: Modalities['NM'],
	OAM: Modalities['OAM'],
	OPM: Modalities['OPM'],
	OP: Modalities['OP'],
	OPT: Modalities['OPT'],
	OPTBSV: Modalities['OPTBSV'],
	OPTENF: Modalities['OPTENF'],
	OPV: Modalities['OPV'],
    OCT: Modalities['OCT'],
    OSS: Modalities['OSS'],
    PX: Modalities['PX'],
    POS: Modalities['POS'],
    PT: Modalities['PT'],
    RF: Modalities['RF'],
    RG: Modalities['RG'],
    RESP: Modalities['RESP'],
    RTIMAGE: Modalities['RTIMAGE'],
    SM: Modalities['SM'],
    SRF: Modalities['SRF'],
    TG: Modalities['TG'],        
    US: Modalities['US'],
    BDUS: Modalities['BDUS'],
    VA: Modalities['VA'],
    XA: Modalities['XA'],
	NONE: Modalities['NONE']
};