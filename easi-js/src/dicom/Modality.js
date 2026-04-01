//
// Modality.js
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

export default class Modality {

    // Find a modality by modality code value (e.g. MR or CT)
    static find(id) {

        // Lookup the sop class
        return Modalities[id];

    };

    constructor(data) {
        Object.assign(this, data);
    }

    // INSERT ACCESSORS
    static get AR() { return Modalities['AR'] }
    static get ASMT() { return Modalities['ASMT'] }
    static get AU() { return Modalities['AU'] }
	static get BI() { return Modalities['BI'] }
	static get BMD() { return Modalities['BMD'] }
    static get CFM() { return Modalities['CFM'] }
    static get EPS() { return Modalities['EPS'] }
	static get CR() { return Modalities['CR'] }
	static get CT() { return Modalities['CT'] }
    static get CTPROTOCOL() { return Modalities['CTPROTOCOL'] }
	static get DMS() { return Modalities['DMS'] }
	static get DG() { return Modalities['DG'] }
    static get DOC() { return Modalities['DOC'] }
	static get DX() { return Modalities['DX'] }
	static get ECG() { return Modalities['ECG'] }
	static get EEG() { return Modalities['EEG'] }
	static get EMG() { return Modalities['EMG'] }
	static get EOG() { return Modalities['EOG'] }
	static get ES() { return Modalities['ES'] }
    static get FID() { return Modalities['FID'] }
	static get XC() { return Modalities['XC'] }
	static get GM() { return Modalities['GM'] }
    static get HC() { return Modalities['HC'] }
	static get HD() { return Modalities['HD'] }
	static get IO() { return Modalities['IO'] }
    static get IOL() { return Modalities['IOL'] }
	static get IVOCT() { return Modalities['IVOCT'] }
	static get IVUS() { return Modalities['IVUS'] }
	static get KER() { return Modalities['KER'] }
    static get KO() { return Modalities['KO'] }
	static get LS() { return Modalities['LS'] }
	static get LEN() { return Modalities['LEN'] }
    static get M3D() { return Modalities['M3D'] }
	static get MR() { return Modalities['MR'] }
	static get MG() { return Modalities['MG'] }
	static get NM() { return Modalities['NM'] }
	static get OAM() { return Modalities['OAM'] }
	static get OPM() { return Modalities['OPM'] }
	static get OP() { return Modalities['OP'] }
	static get OPT() { return Modalities['OPT'] }
	static get OPTBSV() { return Modalities['OPTBSV'] }
	static get OPTENF() { return Modalities['OPTENF'] }
	static get OPV() { return Modalities['OPV'] }
    static get OCT() { return Modalities['OCT'] }
    static get OSS() { return Modalities['OSS'] }
    static get OT() { return Modalities['OT'] }
    static get PA() { return Modalities['PA'] }
    static get PX() { return Modalities['PX'] }
    static get PLAN() { return Modalities['PLAN'] }
    static get POS() { return Modalities['POS'] }
    static get PR() { return Modalities['PR'] }
    static get PT() { return Modalities['PT'] }
    static get RF() { return Modalities['RF'] }
    static get RG() { return Modalities['RG'] }
    static get REG() { return Modalities['REG'] }
    static get RESP() { return Modalities['RESP'] }
    static get RTDOSE() { return Modalities['RTDOSE'] }
    static get RTIMAGE() { return Modalities['RTIMAGE'] }
    static get RTINTENT() { return Modalities['RTINTENT'] }
    static get RTPLAN() { return Modalities['RTPLAN'] }
    static get RTRAD() { return Modalities['RTRAD'] }
    static get RTRECORD() { return Modalities['RTRECORD'] }
    static get RTSEGANN() { return Modalities['RTSEGANN'] }
    static get RTSTRUCT() { return Modalities['RTSTRUCT'] }
    static get RWV() { return Modalities['RWV'] }
    static get SEG() { return Modalities['SEG'] }
    static get SM() { return Modalities['SM'] }
    static get SMR() { return Modalities['SMR'] }
    static get SR() { return Modalities['SR'] }
    static get SRF() { return Modalities['SRF'] }
    static get STAIN() { return Modalities['STAIN'] }
    static get TEXTUREMAP() { return Modalities['TEXTUREMAP'] }
    static get TG() { return Modalities['TG'] }
    static get US() { return Modalities['US'] }
    static get BDUS() { return Modalities['BDUS'] }
    static get VA() { return Modalities['VA'] }
    static get XA() { return Modalities['XA'] }
    static get XAPROTOCOL() { return Modalities['XAPROTOCOL'] }
	static get NONE() { return Modalities['NONE'] }
    // INSERT ACCESSORS
        
};

export var Modalities = {
	'AR': new Modality({ ID: 'AR', Name: 'Autorefraction', IsMultiFrame: false, IsRetired: false }),
    'ASMT': new Modality({ ID: 'ASMT', Name: 'Content Assessment Results', IsMultiFrame: false, IsRetired: false }),
    'AU': new Modality({ ID: 'AU', Name: 'Audio', IsMultiFrame: false, IsRetired: false }),
	'BI': new Modality({ ID: 'BI', Name: 'Biomagnetic Imaging', IsMultiFrame: false, IsRetired: false }),
	'BMD': new Modality({ ID: 'BMD', Name: 'Bone Mineral Densitometry', IsMultiFrame: false, IsRetired: false }),
    'CFM': new Modality({ ID: 'CFM', Name: 'Confocal Microscopy', IsMultiFrame: false, IsRetired: false }),
    'EPS': new Modality({ ID: 'EPS', Name: 'Cardiac Electrophysiology', IsMultiFrame: false, IsRetired: false }),
    'CR': new Modality({ ID: 'CR', Name: 'Computed Radiography', IsMultiFrame: false, IsRetired: false }),    
    'CT': new Modality({ ID: 'CT', Name: 'Computed Tomography', IsMultiFrame: true, IsRetired: false }),
    'CTPROTOCOL': new Modality({ ID: 'CTPROTOCOL', Name: 'CT Protocol (Performed)', IsMultiFrame: false, IsRetired: false }),
    'DMS': new Modality({ ID: 'DMS', Name: 'Dermoscopy', IsMultiFrame: false, IsRetired: false }),
    'DG': new Modality({ ID: 'DG', Name: 'Diaphanography', IsMultiFrame: false, IsRetired: false }),
    'DOC': new Modality({ ID: 'DOC', Name: 'Document', IsMultiFrame: false, IsRetired: false }),
    'DX': new Modality({ ID: 'DX', Name: 'Digital Radiography', IsMultiFrame: false, IsRetired: false }),
    'ECG': new Modality({ ID: 'ECG', Name: 'Electrocardiography', IsMultiFrame: false, IsRetired: false }),    
    'EEG': new Modality({ ID: 'EEG', Name: 'Electroencephalography', IsMultiFrame: false, IsRetired: false }),
    'EMG': new Modality({ ID: 'EMG', Name: 'Electromyography', IsMultiFrame: false, IsRetired: false }),
    'EOG': new Modality({ ID: 'EOG', Name: 'Electrooculography', IsMultiFrame: false, IsRetired: false }),
    'ES': new Modality({ ID: 'ES', Name: 'Endoscopy', IsMultiFrame: false, IsRetired: false }),
    'FID': new Modality({ ID: 'FID', Name: 'Fiducials', IsMultiFrame: false, IsRetired: false }),
    'XC': new Modality({ ID: 'XC', Name: 'External-camera Photography', IsMultiFrame: false, IsRetired: false }),
    'GM': new Modality({ ID: 'GM', Name: 'General Microscopy', IsMultiFrame: false, IsRetired: false }),
    'HC': new Modality({ ID: 'HC', Name: 'Hard Copy', IsMultiFrame: false, IsRetired: false }),
    'HD': new Modality({ ID: 'HD', Name: 'Hemodynamic Waveform', IsMultiFrame: false, IsRetired: false }),
    'IO': new Modality({ ID: 'IO', Name: 'Intra-oral Radiography', IsMultiFrame: false, IsRetired: false }),
    'IOL': new Modality({ ID: 'IOL', Name: 'Intraocular Lens Data', IsMultiFrame: false, IsRetired: false }),
    'IVOCT': new Modality({ ID: 'IVOCT', Name: 'Intravascular Optical Coherence Tomography', IsMultiFrame: false, IsRetired: false }),
    'IVUS': new Modality({ ID: 'IVUS', Name: 'Intravascular Ultrasound', IsMultiFrame: false, IsRetired: false }),
    'KER': new Modality({ ID: 'KER', Name: 'Keratometry', IsMultiFrame: false, IsRetired: false }),
    'KO': new Modality({ ID: 'KO', Name: 'Key Object Selection', IsMultiFrame: false, IsRetired: false }),
    'LS': new Modality({ ID: 'LS', Name: 'Laser Scan', IsMultiFrame: false, IsRetired: false }),
    'LEN': new Modality({ ID: 'LEN', Name: 'Lensometry', IsMultiFrame: false, IsRetired: false }),
    'M3D': new Modality({ ID: 'M3D', Name: 'Model for 3D Manufacturing', IsMultiFrame: false, IsRetired: false }),
    'MR': new Modality({ ID: 'MR', Name: 'Magnetic Resonance', IsMultiFrame: true, IsRetired: false }),
    'MG': new Modality({ ID: 'MG', Name: 'Mammography', IsMultiFrame: false, IsRetired: false }),
    'NM': new Modality({ ID: 'NM', Name: 'Nuclear Medicine', IsMultiFrame: true, IsRetired: false }),
    'OAM': new Modality({ ID: 'OAM', Name: 'Ophthalmic Axial Measurements', IsMultiFrame: false, IsRetired: false }),
    'OPM': new Modality({ ID: 'OPM', Name: 'Ophthalmic Mapping', IsMultiFrame: false, IsRetired: false }),
    'OP': new Modality({ ID: 'OP', Name: 'Ophthalmic Photography', IsMultiFrame: false, IsRetired: false }),
    'OPT': new Modality({ ID: 'OPT', Name: 'Ophthalmic Tomography', IsMultiFrame: false, IsRetired: false }),
    'OPTBSV': new Modality({ ID: 'OPTBSV', Name: 'Ophthalmic Tomography B-scan Volume Analysis', IsMultiFrame: false, IsRetired: false }),
    'OPTENF': new Modality({ ID: 'OPTENF', Name: 'Ophthalmic Tomography En Face', IsMultiFrame: false, IsRetired: false }),
    'OPV': new Modality({ ID: 'OPV', Name: 'Ophthalmic Visual Field', IsMultiFrame: false, IsRetired: false }),
    'OCT': new Modality({ ID: 'OCT', Name: 'Optical Coherence Tomography', IsMultiFrame: false, IsRetired: false }),    
    'OSS': new Modality({ ID: 'OSS', Name: 'Optical Surface Scanner', IsMultiFrame: false, IsRetired: false }),    
    'OT': new Modality({ ID: 'OT', Name: 'Other', IsMultiFrame: false, IsRetired: true }),
    'PA': new Modality({ ID: 'PA', Name: 'Photoacoustic', IsMultiFrame: false, IsRetired: false }),
    'PX': new Modality({ ID: 'PX', Name: 'Panoramic X-Ray', IsMultiFrame: false, IsRetired: false }),    
    'PLAN': new Modality({ ID: 'PLAN', Name: 'Plan', IsMultiFrame: false, IsRetired: false }),    
    'POS': new Modality({ ID: 'POS', Name: 'Position Sensor', IsMultiFrame: false, IsRetired: false }),    
    'PR': new Modality({ ID: 'PR', Name: 'Presentation State', IsMultiFrame: false, IsRetired: false }),    
    'PT': new Modality({ ID: 'PT', Name: 'Positron emission tomography', IsMultiFrame: true, IsRetired: false }),    
    'RF': new Modality({ ID: 'RF', Name: 'Radiofluoroscopy', IsMultiFrame: false, IsRetired: false }),    
    'RG': new Modality({ ID: 'RG', Name: 'Radiographic imaging', IsMultiFrame: false, IsRetired: true }),
    'REG': new Modality({ ID: 'REG', Name: 'Registration', IsMultiFrame: false, IsRetired: false }),
    'RESP': new Modality({ ID: 'RESP', Name: 'Respiratory Waveform', IsMultiFrame: false, IsRetired: false }),    
    'RTDOSE': new Modality({ ID: 'RTDOSE', Name: 'Radiotherapy Dose', IsMultiFrame: false, IsRetired: false }),
    'RTIMAGE': new Modality({ ID: 'RTIMAGE', Name: 'RT Image', IsMultiFrame: false, IsRetired: false }),    
    'RTINTENT': new Modality({ ID: 'RTINTENT', Name: 'Radiotherapy Intent', IsMultiFrame: false, IsRetired: false }),
    'RTPLAN': new Modality({ ID: 'RTPLAN', Name: 'Radiotherapy Plan', IsMultiFrame: false, IsRetired: false }),
    'RTRAD': new Modality({ ID: 'RTRAD', Name: 'Radiotherapy Radiation', IsMultiFrame: false, IsRetired: false }),
    'RTRECORD': new Modality({ ID: 'RTRECORD', Name: 'RT Radiation Record', IsMultiFrame: false, IsRetired: false }),
    'RTSEGANN': new Modality({ ID: 'RTSEGANN', Name: 'Radiotherapy Segment Annotation', IsMultiFrame: false, IsRetired: false }),
    'RTSTRUCT': new Modality({ ID: 'RTSTRUCT', Name: 'Radiotherapy Structure Set', IsMultiFrame: false, IsRetired: false }),
    'RWV': new Modality({ ID: 'RWV', Name: 'Real World Value Map', IsMultiFrame: false, IsRetired: false }),
    'SEG': new Modality({ ID: 'SEG', Name: 'Segmentation', IsMultiFrame: false, IsRetired: false }),
    'SM': new Modality({ ID: 'SM', Name: 'Slide Microscopy', IsMultiFrame: false, IsRetired: false }),    
    'SMR': new Modality({ ID: 'SMR', Name: 'Stereometric Relationship', IsMultiFrame: false, IsRetired: false }),
    'SR': new Modality({ ID: 'SR', Name: 'SR Document', IsMultiFrame: false, IsRetired: false }),
    'SRF': new Modality({ ID: 'SRF', Name: 'Subjective Refraction', IsMultiFrame: false, IsRetired: false }),
    'STAIN': new Modality({ ID: 'STAIN', Name: 'Automated Slide Stainer', IsMultiFrame: false, IsRetired: false }),
    'TEXTUREMAP': new Modality({ ID: 'TEXTUREMAP', Name: 'Texture Map', IsMultiFrame: false, IsRetired: false }),
    'TG': new Modality({ ID: 'TG', Name: 'Thermography', IsMultiFrame: false, IsRetired: false }),
    'US': new Modality({ ID: 'US', Name: 'Ultrasound', IsMultiFrame: true, IsRetired: false }),
    'BDUS': new Modality({ ID: 'BDUS', Name: 'Ultrasound Bone Densitometry', IsMultiFrame: false, IsRetired: false }),
    'VA': new Modality({ ID: 'VA', Name: 'Visual Acuity', IsMultiFrame: false, IsRetired: false }),
    'XA': new Modality({ ID: 'XA', Name: 'X-Ray Angiography', IsMultiFrame: true, IsRetired: false }),
    'XAPROTOCOL': new Modality({ ID: 'XAPROTOCOL', Name: 'XA Protocol (Performed)', IsMultiFrame: false, IsRetired: false })
};
