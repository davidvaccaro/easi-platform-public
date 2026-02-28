# EASI DICOM
## Efficient API for Streaming in Healthcare Imaging
### OVERVIEW
Over four decades of continuous development, Digital Imaging and Communication in Medicine (DICOM) has evolved to become one of the most ubiquitous technologies in healthcare IT. The DICOM Standard is comprehensive and adaptable, having proven its resilience and relevance over time. However, for those new to this standard, it can seem immense and complex, with a significant learning curve. Furthermore, as new use-cases emerge outside of direct radiological workflows, such as applications in artificial intelligence and data science and even new emerging clinical uses like digital pathology, the challenge of fully understanding the DICOM Standard increases.

A modern approach to medical imaging is needed - one that fully leverages the DICOM Standard but also introduces powerful and flexible functions to shoulder the burden of its expansive nature. Such an approach would not only offer a more gradual entry point for newcomers but also ensure that traditional access to the standard is not compromised.

### Solution
To tame the complexity of this substantial standard, EASI DICOM offers a novel programming interface. This interface is not only suitable for productive implementations, but also adaptable to accommodate a wide range of skill levels.

Additionally, the architecture is designed to leverage a novel streaming scheme, providing remarkable levels of performance and flexibility when reading and extracting data from existing medical images, as well as composing new ones.

EASI DICOM is efficient, adaptable, extendable, and offers a coder-friendly programming interface suitable for all experience levels.

### Key Features

- Efficient streaming scheme for reading and writing DICOM data.
- A coder-friendly programming interface that allows for productive implementations without requiring expert knowledge of the DICOM Standard.
- An extensible architecture that simplifies authoring custom mappings of DICOM data to any data model.
- Clean pure-Javascript implementation sutiable for use on either the server through Node.js or the client within the browser.
- TBD

# Stream Reading DICOM Data from a Remote Source
Retrieving DICOM data from a remote data source is a prevalent operation in most medical imaging applications. The source and the transmission encoding can vary widely based on the specific environment.

Here are some common source transaction scenarios:

- A straightforward file source providing raw DICOM data or DICOM JSON/XML metadata in response to standard HTTP GET requests.
- A DICOMweb service source offering raw DICOM data or DICOM JSON/XML metadata via WADO-RS or WADO-URI HTTP requests.
- An IHE XDS-I Imaging Document Source delivering raw DICOM data or DICOM JSON/XML metadata through RAD-55 HTTP requests.

Regardless of the source scheme, EASI DICOM simplifies the process of building, issuing, and processing these requests.

## Example: Stream Reading DICOM Data and Parsing to "Instances"
The following code snippet "builds" a streaming reader, which is set to stream-parse DICOM data into one or more DICOM instances:
```js:
const reader = EASI
    .pipelineBuilder()
    .withParser(new DicomDataParser())
    .withHandler(new DicomInstanceHandler())
    .build();

/* Which could hve been simplified to the following:
const reader = EASI
    .pipelineBuilder()
    .fromPartStream().ofDicomData()
    .toInstances()
    .build();
*/
```
Using the above configured streaming reader, the following code snippet then stream-reads and stream-parses DICOM data from a specified URI (using HTTP GET by default) and results in one (or more) DICOM instances that can be used to directly access typical DICOM data elements. 

NOTE: Whether the remote service delivers a single 'application/dicom' response payload or an HTTP Multipart response consisting of multiple 'application/dicom' data parts, the stream reader will automatically detect and correctly process each response as appropriate.
```javascript:
reader
    .read(uri)
    .then(instance => {

		// Access the primary patient details
		const patientId = instance.dataSet.find(Tag.PatientID).value; 
		const patientName = instance.dataSet.find(Tag.PatientName).value; 
		const patientDOB = instance.dataSet.find(Tag.PatientBirthDate).value; 

		// Access the modality details
		const modality = instance.dataSet.find(Tag.Modality).value; 

		// Access the pixel-data
		const pixels = instance.dataSet.find(Tag.PixelData).value; 

		// Do something useful with the patient demographic 
        // and image pixel data

    })
    .catch(err => console.log(err));
```
Notice that the above code snippet assumes that the implementor is fairly familiar with the typical DICOM Standard concepts of a DICOM instance that contains a DICOM Dataset comprised of DICOM Tags. 

## Example: Stream Reading DICOM Data and Parsing to "Entities"
Alternatively, implementations seeking to avoid direct DICOM data element processing could use the following code snippets to make the same request but with a simplified DICOM "entity" application programming interface as the stream-parsed result:
```js:
const reader = EASI
    .pipelineBuilder()
    .withParser(new DicomDataParser())
    .withHandler(new DicomEntityHandler())
    .build();

/* Which could hve been simplified to the following:
const reader = EASI
    .pipelineBuilder()
    .fromPartStream().ofDicomData()
    .toEntities()
    .build();
*/
```
Then processed as one or more DICOM entities as follows:
```js:
reader
    .read(uri)
    .then(entity => {

		// Access the primary patient details
		const patientId = entity.patient.Id;
		const patientName = entity.patient.Name;
		const patientDOB = entity.patient.BirthDate;

		// Access the modality details
		const modality = entity.series.modality; 

		// Access the pixel-data
		const pixels = entity.image.pixelData; 

		// Do something useful with the patient demographic 
        // and image pixel data

    })
    .catch(err => console.log(err));    
```
Notice that the above code snippet still assumes a basic level of knowledge of a DICOM as a data entity that has an associated patient and series. 

But what if the preferred representation is the Fast Healthcare Interoperability Resources (FHIR) ImagingStudy resource?

The following code snippet makes the same request as the two above transactions except this time the stream-parsing results in an extended FHIR ImagingStudy resource:
```js:
const reader = EASI
    .pipelineBuilder()
    .withParser(new DicomDataParser())
    .withHandler(new DicomMappingHandler(
        new DicomToFHIRImagingStudyMapping())
    )
    .build();

/* Which could hve been simplified to the following:
const reader = EASI
    .pipelineBuilder()
    .fromPartStream().ofDicomData()
    .toFHIRImagingStudies()
    .build();
*/   
```
Then processed as FHIR data as follows:
```js:
reader
    .read(uri)
    .then(study => {

		// Access the primary patient details
		const patientId = study.subject.identifier;
		const patientName = study.subject.name.text;
		const patientDOB = study.subject.birthDate;

		// Access the modality details
		const modality = study.series[0].modality; 

		// Access the pixel-data
		const pixels = study.series[0].instances[0].pixelData; 

		// Do something useful with the patient demographic 
        // and image pixel data

    })
    .catch(err => console.log(err));  
```
Notice that in the above code snippet, a streaming-mapping handler is used to stream-map the DICOM data given a FHIR Imaging Study mapping (an additional feature of EASI DICOM) to map traditional DICOM data to a FHIR ImagingStudy resource instance.
