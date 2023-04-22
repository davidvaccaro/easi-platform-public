//
// DicomToFHIRImagingStudyMapping.js - 1.0.0
//
// DicomToFHIRImagingStudyMapping Class 
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

import DicomMapping from "./DicomMapping.js";
import DicomTag from "../dicomTag.js"
import { Tag } from "../dicomTag.js"

import Reference from "../fhir/Reference.js";
import ImagingStudy from "../fhir/ImagingStudy.js";
import ImagingSeries from "../fhir/ImagingSeries.js";
import ImagingInstance from "../fhir/ImagingInstance.js";
import Patient from "../fhir/Patient.js";

export default class DicomToFHIRImagingStudyMapping extends DicomMapping {

    start(context) {

        // Call the super
        super.start(context);

        // Handle setting up a new context
        context.study = new ImagingStudy();
        context.series = new ImagingSeries();
        context.instance = new ImagingInstance();
        context.patient = new Patient();

        // Return the modified context
        return context;

    }

    end(context) {        

        // Call the super
        super.end(context);

        // Establish the current study
        var study = context.final;

        // Perform merge of prior data - TODO - Beef this up by performing a real "merge" with various conflict resolution strategies
        if (study == null) {

            // Establish the current study
            study = context.study;
            
            // Set the final study
            context.final = study;

        }
        else {

            // TODO - Merge the two studies

        }

        // Find the series within the study series
        var series = study.series.find(element => element.uid == context.series.uid);

        // If the series was NOT found,
        if (series == null) {

            // Establish the current series
            series = context.series;

            // Add the series to the study
            study.series.push(series);

            // Set the number of series
            study.numberOfSeries = study.series.length;

        }
        else {

            // TODO - Merge the two series

        }

        // Find the instance
        var instance = series.instances.find(element => element.uid == context.instance.uid);

        // If the instance was NOT found,
        if (instance == null) {

            // Establish the current instance
            instance = context.instance;

            // Add the instance to the series
            series.instances.push(instance);

            // Set the number of instances
            series.numberOfInstances = series.instances.length; 
            study.numberOfInstances = series.instances.length;

        }
        else {

            // TODO - Merge the two instances

        }

        // Find the patient
        var patient = study.contained.find(element => element.resourceType == "Patient");

        if (patient == null) {

            // Establish the current patient
            patient = context.patient;

            // Set the patient's id
            patient.id = ("#" + patient.resourceType);

            // Set the reference
            study.subject = new Reference(patient.id);

            // Add the instance to the contained resources
            study.contained.push(patient);

        }
        else {

            // TODO - Merge the two patients

        }

        // Return the current final value
        return context.final;

    }
    
    constructor() {

        // Call the base
        super();

        // Setup the Study-level Mappings
        this.addTag(Tag.StudyInstanceUID, "study.identifier");

        // Setup the Series-level Mappings
        this.addTag(Tag.SeriesInstanceUID, "series.uid");
        this.addTag(Tag.SeriesNumber, "series.number");

        // Setup the Instance-level Mappings
        this.addTag(Tag.SOPInstanceUID, "instance.uid");
        this.addTag(Tag.InstanceNumber, "instance.number");
       
        // Setup the Patient-level Mappings
        this.addTag(Tag.PatientID, "patient.identifier");

    }

};