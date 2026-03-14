# EASI DICOM
## Efficient API for Streaming in Healthcare Imaging
### OVERVIEW
Over four decades of continuous development, Digital Imaging and Communication in Medicine (DICOM) has evolved to become one of the most ubiquitous technologies in healthcare IT. The DICOM Standard is comprehensive and adaptable, having proven its resilience and relevance over time. However, for those new to this standard, it can seem immense and complex, with a significant learning curve. Furthermore, as new use-cases emerge outside of direct radiological workflows, such as applications in artificial intelligence and data science and even new emerging clinical uses like digital pathology, the challenge of fully understanding the DICOM Standard increases.

A modern approach to medical imaging is needed - one that fully leverages the DICOM Standard but also introduces powerful and flexible functions to shoulder the burden of its expansive nature. Such an approach would not only offer a more gradual entry point for newcomers but also ensure that traditional access to the standard is not compromised.

### Solution
To tame the complexity of this substantial standard, EASI DICOM offers a novel programming interface. This interface is not only suitable for traditioinal radiological implementations, but also adaptable to accommodate many medical imaging information processing use-cases and accomodate wide range of developer skill levels.

Additionally, the architecture is designed to leverage a novel streaming scheme, providing remarkable levels of performance, efficiency and flexibility when reading, extracting, transforming and composing medical image information.

### Key Features

- Efficient streaming pipeline architecture for stream-reading, parsing, transforming and writing DICOM data.
- A coder-friendly programming interface that allows for productive implementations without requiring expert knowledge of the DICOM Standard.
- An extensible architecture that simplifies authoring custom mappings, transformations and asset extractions of DICOM data to any data model.
- Clean multi-language implemntation sutiable for use either on the server and then traditional client via multiple implementation languages (Java, C#, Python, JavaScript) or within the browser via pure-JavaScript.

# Stream Processing DICOM Data from a Remote Source
Retrieving DICOM data from a remote data source is a common operation in most medical imaging applications. The source and the transmission encoding can vary widely based on the specific environment.

Some common DICOM retrieval scenarios:

- A traditional native DICOM data file or DICOM JSON/XML metadata file is retrieved either from a local file-system or via a standard HTTP GET request.
- A DICOMweb service source offering access to native DICOM data and/or DICOM JSON/XML metadata via WADO-RS or WADO-URI via standard HTTP GET requests.
- An IHE XDS-I Imaging Document Source delivering native DICOM data and/or DICOM JSON/XML metadata through RAD-55 transcation via HTTP GET requests.
- A traditional PACS offering access to native DICOM data via the traditional TCP/IP-based DIMSE (DICOM Message Service Element) C-GET transaction.

Regardless of the scenario, EASI DICOM simplifies the process of efficiently retrieving DICOM data and then stream reading, parsing and processing these requests using a novel declarative pipeline methedology.

## Example: Stream Processing native DICOM Data and Emitting "Instances"
The following code snippet "builds" a streaming pipeline, which is configured to stream-read and parse native DICOM data into one or more DICOM instances objects:

### JavaScript:
```js
const pipeline = EASI
    .pipelineBuilder()
    .fromHttpStream()
    .ofDicomData()
    .toInstances()
    .build();
```
### Python:
```python
pipeline = (
    EASI.pipeline_builder()
        .from_http_stream()
        .of_dicom_data()
        .to_instances()
        .build()
)
```
### C#:
```csharp
var pipeline = EASI
    .PipelineBuilder()
    .FromHttpStream()
    .OfDicomData()
    .ToInstances()
    .Build();
```
### Java:
```java
var pipeline = EASI
    .pipelineBuilder()
    .fromHttpStream()
    .ofDicomData()
    .toInstances()
    .build();
```
Using the above configured pipeline, the following code snippet then stream-reads and parses DICOM data from a specified URI (using HTTP GET by default) and results in one (or more) DICOM instances that can be used to directly access typical DICOM data elements. 

NOTE: Whether the remote service delivers a single 'application/dicom' response payload or an HTTP Multipart response consisting of multiple 'application/dicom' data parts, the stream reading will automatically detect and correctly process each response part as appropriate.

### JavaScript
```js
pipeline
    .process(uri)
    .then(instance => {

		// Access primitive DICOM data directly from the data-set
        const patientId = instance.dataSet.value(Tag.PatientID);
        const patientName = instance.dataSet.value(Tag.PatientName);
        const patientDOB = instance.dataSet.value(Tag.PatientBirthDate);

        const rows = instance.dataSet.value(Tag.Rows);
        const cols = instance.dataSet.value(Tag.Columns);
        const pixelData = instance.dataSet.find(Tag.PixelData);

		// Do something useful with the patient demographic 
        // and image pixel data

    })
    .catch(err => console.log(err));
```
Notice that the above code snippet assumes that the developer is fairly familiar with the typical DICOM Standard concepts like a DICOM instance that contains a DICOM Dataset comprised of DICOM Attriutes that can be retrieved via standard DICOM Tags. But this is only one approach. For more generic access to the DICOM data, an "entity" pipeline can be utilized.

## Example: Stream Processing native DICOM Data and Emitting "Entities"
Implementations seeking to avoid direct DICOM data element processing could use the following code snippets to make the same request but with a simplified DICOM "entity" application programming interface as the stream-parsed result:
```js:
const pipeline = EASI
    .pipelineBuilder()
    .fromHttpStream()
    .ofDicomData()
    .toEntities()
    .build();
```
Then processed as one or more DICOM entities as follows:
```js:
pipeline
    .process(uri)
    .then(entity => {

		// Access the primary patient details
		const patientId = entity.patient.id;
		const patientName = entity.patient.name;
		const patientDOB = entity.patient.birthDate;

		// Access the modality details
		const modality = entity.series.modality; 

		// Access the pixel-data
		const pixels = entity.image.pixelData; 

		// Do something useful with the patient demographic 
        // and image pixel data

    })
    .catch(err => console.log(err));    
```
Notice that the above code snippet still assumes a basic level of knowledge of a DICOM, for example, that a DICOM data entity has associated patient, series and image components. 

## Example: Stream Processing DICOM Data and Emitting "FHIR Imaging Study"
But what if the preferred data representation is not DICOM at all but the Fast Healthcare Interoperability Resources (FHIR) ImagingStudy resource?

The following code snippet makes the same request as the two transactions above except this time, the pipeline processing results in an extended FHIR ImagingStudy resource:
```js:
const pipeline = EASI
    .pipelineBuilder()
    .fromHttpStream()
    .ofDicomData()
    .toFHIRImagingStudy()
    .build();
```
Then processed as FHIR data as follows:
```js:
pipeline
    .process(uri)
    .then(study => {

		// Access the primary patient details
		const patientId = study.subject.identifier;
		const patientName = study.subject.name.text;
		const patientDOB = study.subject.birthDate;

		// Access the modality details
		const modality = study.series[0].modality; 

		// Access the instance UID
		const uid = study.series[0].instances[0].uid; 

        // Build a WADO-RS URI used to request the pixelData

		// Do something useful with the patient demographic 
        // and image pixel data

    })
    .catch(err => console.log(err));  
```
Notice that in the above code snippet, a streaming-mapping handler is used to stream-map the DICOM data given a FHIR Imaging Study mapping (an additional feature of EASI DICOM) to map traditional DICOM data to a FHIR ImagingStudy resource instance.
