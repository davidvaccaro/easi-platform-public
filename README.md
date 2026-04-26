# EASI
## Expressive API Standard for Imaging
### A fluent, language-neutral interface for efficient streaming, transformation, and composition of DICOM&reg; data.

### Repository Scope

This repository is the **EASI platform implementation monorepo** (runtime/tooling/source packages).

Language-neutral standard artifacts are now hosted in the separate `easi` repository:

- Specification site and reference content: `easi/easi-spec`
- Neutral and implementation contracts: `easi/easi-contracts`

### OVERVIEW
After over four decades of continuous standardization, Digital Imaging and Communication in Medicine (DICOM&reg;) has evolved to become one of the most ubiquitous technologies in healthcare IT. The [DICOM&reg; Standard](https://www.dicomstandard.org/) is comprehensive and adaptable, having proven its resilience and relevance over time. However, for those new to this standard, it can appear immense and complex, with a significant learning curve. Furthermore, as new use-cases emerge outside of direct radiological workflows, such as applications in artificial intelligence and data science and even new emerging clinical uses like digital pathology, the challenge of efficiently utilizing the DICOM&reg; Standard increases.

A modern approach to medical imaging is needed - one that fully embraces the DICOM&reg; Standard but also introduces a powerful and flexible new expressive paradigm to shoulder the burden of its expansive and detailed nature. Such an approach would not only offer a more coherent entry point for newcomers but also ensures a more comprehensible interface for AI Agentic development while ensuring that traditional access to the entier standard is not compromised.

### Solution
To tame the complexity of this substantial medical imaging standard, EASI&reg; offers a highly expressive and fluent, yet comprehensive and comprehensible application programming interface for the DICOM&reg; standard. This interface is not only suitable for traditioinal radiological implementations, but also adaptable to accommodate many medical imaging information processing use-cases and a wide range of developers, human or agentic.

Additionally, the architecture is designed to fully leverage a novel streaming processing scheme, providing remarkable levels of performance, efficiency and flexibility when reading, extracting, transforming, de-identifying and composing medical image information.

### Key Features

- Expressive, fluent, stanged builder composition paradigm ideal for Agentic AI powered development.
- Efficient streaming pipeline architecture for high performance stream-reading, parsing, transforming, de-identifying and stream-writing DICOM&reg; data.
- A coherent application programming interface that allows for productive implementations whether powered by AI coding agents or human developers of any skill level.
- Clean multi-language implemntation sutiable for use either on the server and/or the traditional client via multiple implementation languages (Java, C#, Python, JavaScript) or within the browser via pure-JavaScript.

# Stream Processing DICOM&reg; Data from a Remote Source
Retrieving DICOM&reg; data from a remote data source is a common operation in most medical imaging applications. The source and the transmission encoding can vary widely based on the specific environment.

Some common DICOM&reg; retrieval scenarios:

- A traditional native DICOM&reg; data file or DICOM&reg; JSON/XML metadata file is retrieved either from a local file-system or via a standard HTTP GET request.
- A DICOMweb&trade; service source offering access to native DICOM&reg; data and/or DICOM&reg; JSON/XML metadata via WADO-RS or WADO-URI via standard HTTP GET requests.
- An IHE XDS-I Imaging Document Source delivering native DICOM&reg; data and/or DICOM&reg; JSON/XML metadata through RAD-55 transcation via HTTP GET requests.
- A traditional PACS offering access to native DICOM&reg; data via the traditional TCP/IP-based DIMSE (DICOM&reg; Message Service Element) C-GET transaction.

Regardless of the scenario, EASI&reg; simplifies the process of efficiently retrieving DICOM&reg; data and then stream reading, parsing and processing these requests using a novel declarative pipeline methedology.

## Example: Stream Processing native DICOM&reg; Data and Emitting "Instances"
The following code snippet "builds" a streaming pipeline, which is configured to stream-read and parse native DICOM&reg; data into one or more DICOM&reg; instances objects:

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
Using the above configured pipeline, the following code snippet then stream-reads and parses DICOM&reg; data from a specified URI (using HTTP GET by default) and results in one (or more) DICOM&reg; instances that can be used to directly access typical DICOM&reg; data elements. 

NOTE: Whether the remote service delivers a single 'application/dicom' response payload or an HTTP Multipart response consisting of multiple 'application/dicom' data parts, the stream reading will automatically detect and correctly process each response part as appropriate.

### JavaScript
```js
pipeline
    .process(uri)
    .then(instance => {

		// Access primitive DICOM&reg; data directly from the data-set
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
Notice that the above code snippet assumes that the developer is fairly familiar with the typical DICOM&reg; Standard concepts like a DICOM&reg; instance that contains a DICOM&reg; Dataset comprised of DICOM&reg; Attriutes that can be retrieved via standard DICOM&reg; Tags. But this is only one approach. For more generic access to the DICOM&reg; data, an "entity" pipeline can be utilized.

## Example: Stream Processing native DICOM&reg; Data and Emitting "Entities"
Implementations seeking to avoid direct DICOM&reg; data element processing could use the following code snippets to make the same request but with a simplified DICOM&reg; "entity" application programming interface as the stream-parsed result:
```js:
const pipeline = EASI
    .pipelineBuilder()
    .fromHttpStream()
    .ofDicomData()
    .toEntities()
    .build();
```
Then processed as one or more DICOM&reg; entities as follows:
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
Notice that the above code snippet still assumes a basic level of knowledge of a DICOM&reg;, for example, that a DICOM&reg; data entity has associated patient, series and image components. 

## Example: Stream Processing DICOM&reg; Data and Emitting "FHIR&reg; Imaging Study"
But what if the preferred data representation is not DICOM&reg; at all but the Fast Healthcare Interoperability Resources (FHIR&reg;) ImagingStudy resource?

The following code snippet makes the same request as the two transactions above except this time, the pipeline processing results in an extended FHIR&reg; ImagingStudy resource:
```js:
const pipeline = EASI
    .pipelineBuilder()
    .fromHttpStream()
    .ofDicomData()
    .toFHIRImagingStudy()
    .build();
```
Then processed as FHIR&reg; data as follows:
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
Notice that in the above code snippet, a streaming-mapping handler is used to stream-map the DICOM&reg; data given a FHIR&reg; Imaging Study mapping (an additional feature of EASI DICOM&reg;) to map traditional DICOM&reg; data to a FHIR&reg; ImagingStudy resource instance.
