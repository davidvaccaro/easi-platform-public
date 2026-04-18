#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const siteRoot = path.resolve(__dirname, '..');
const builderTypesDir = path.join(siteRoot, 'builder-types');
const builderSourceRoot = path.resolve(siteRoot, '..', '..', 'easi-js', 'src', 'builders');
const navSourcePage = path.join(siteRoot, 'index.html');
const navTemplateScriptPath = path.join(siteRoot, 'scripts', 'generate-dicom-model-types.js');

const BUILDER_DEFINITIONS = [
  {
    className: 'PipelineBuilder',
    slug: 'pipeline-builder',
    pageTitle: 'PipelineBuilder',
    purpose: 'Defines staged, fluent composition of complete EASI pipelines from source acquisition through parsing, policy/filter application, terminal materialization, optional writer delivery, and final build.',
    buildOutput: 'Pipeline',
    factoryEntryPoints: [
      '`EASI.pipelineBuilder()`'
    ],
    keywords: 'pipeline fluent stages from of with to into build parser handler writer routing normalization dimse',
    methodGroups: [
      {
        title: 'Source Stage',
        sourceFile: path.join(builderSourceRoot, 'stages', 'PipelineSourceStage.js'),
        include: ['withReader', 'fromPartStream', 'fromHttpStream', 'fromByteStream', 'fromFileStream', 'fromFolderStream', 'fromFolderWatchStream', 'fromWebSocketStream', 'fromNodeStreamAdapter', 'fromDimseAssociation']
      },
      {
        title: 'Format Stage',
        sourceFile: path.join(builderSourceRoot, 'stages', 'PipelineFormatStage.js'),
        include: ['withParser', 'ofDicomData', 'ofByteData', 'ofImageData', 'ofMixedImagingData', 'ofJsonData', 'ofXmlData', 'ofDicomMetadata', 'ofDicomXmlMetadata']
      },
      {
        title: 'Target Stage',
        sourceFile: path.join(builderSourceRoot, 'stages', 'PipelineTargetStage.js'),
        include: [
          'withCodecRegistry', 'withOnEmit', 'withIsStrict', 'withDeIdentification', 'withBulkDataPolicy',
          'withValidation', 'withTranscoding', 'withBurnedInRedaction', 'withNormalization', 'withRouting',
          'withHandler', 'toInstances', 'toEntities', 'toUnwrappedDocuments', 'toWrappedDocuments',
          'toMapping', 'toSelection', 'toFHIRImagingStudy', 'toDicomData', 'toStructuredValue',
          'toImageData', 'toImagingData', 'toAssets', 'toAssetArchive'
        ]
      },
      {
        title: 'Output Stage',
        sourceFile: path.join(builderSourceRoot, 'stages', 'PipelineOutputStage.js'),
        include: [
          'withWriter', 'intoByteBuffer', 'intoPartBuffer', 'intoFileStream', 'intoBrowserFileStream',
          'intoNodeStreamAdapter', 'intoWritableStream', 'intoWebSocketStream', 'intoHttpStream',
          'intoDimseAssociation', 'build'
        ]
      }
    ],
    examples: [
      {
        title: 'Read One DICOM Instance',
        scenario: 'Build a minimal pipeline that reads one DICOM source and returns typed instance output.',
        codes: {
          neutral: `sourceUrl := "https://pacs.example.org/dicom-web/studies/{studyUID}/series/{seriesUID}/instances/{instanceUID}"

pipeline := EASI.pipelineBuilder()
  .fromHttpStream()
  .ofDicomData()
  .toInstances()
  .build()

results := pipeline.process(sourceUrl)
instance := results.first()`,
          javascript: `const sourceUrl = "https://pacs.example.org/dicom-web/studies/{studyUID}/series/{seriesUID}/instances/{instanceUID}";

const pipeline = EASI.pipelineBuilder()
  .fromHttpStream()
  .ofDicomData()
  .toInstances()
  .build();

const results = await pipeline.process(sourceUrl);
const instance = results.first();`,
          csharp: `var sourceUrl = "https://pacs.example.org/dicom-web/studies/{studyUID}/series/{seriesUID}/instances/{instanceUID}";

var pipeline = EASI.PipelineBuilder()
    .FromHttpStream()
    .OfDicomData()
    .ToInstances()
    .Build();

var results = await pipeline.Process(sourceUrl);
var instance = results.First();`,
          java: `var sourceUrl = "https://pacs.example.org/dicom-web/studies/{studyUID}/series/{seriesUID}/instances/{instanceUID}";

var pipeline = EASI.pipelineBuilder()
    .fromHttpStream()
    .ofDicomData()
    .toInstances()
    .build();

var results = pipeline.process(sourceUrl);
var instance = results.first();`,
          python: `source_url = "https://pacs.example.org/dicom-web/studies/{studyUID}/series/{seriesUID}/instances/{instanceUID}"

pipeline = (
    EASI.pipeline_builder()
    .from_http_stream()
    .of_dicom_data()
    .to_instances()
    .build()
)

results = pipeline.process(source_url)
instance = results.first()`
        }
      },
      {
        title: 'DIMSE Source, De-ID, and HTTP Relay',
        scenario: 'Compose a multi-stage workflow that listens to DIMSE input, applies in-flight policy, and relays to HTTP output.',
        codes: {
          neutral: `pipeline := EASI.pipelineBuilder()
  .fromDimseAssociation(sourceAssociation)
  .ofDicomData()
  .withDeIdentification(Tag.DefaultDeIdentificationMask)
  .toDicomData()
  .intoHttpStream("https://cloud.example.org/dicom-web/studies", {
    method: "POST",
    stow: true
  })
  .build()

run := pipeline.start()
run.stop()`,
          javascript: `const pipeline = EASI.pipelineBuilder()
  .fromDimseAssociation(sourceAssociation)
  .ofDicomData()
  .withDeIdentification(Tag.DefaultDeIdentificationMask)
  .toDicomData()
  .intoHttpStream("https://cloud.example.org/dicom-web/studies", {
    method: "POST",
    stow: true
  })
  .build();

const run = await pipeline.start();
await run.stop();`,
          csharp: `var pipeline = EASI.PipelineBuilder()
    .FromDimseAssociation(sourceAssociation)
    .OfDicomData()
    .WithDeIdentification(Tag.DefaultDeIdentificationMask)
    .ToDicomData()
    .IntoHttpStream("https://cloud.example.org/dicom-web/studies", new {
        method = "POST",
        stow = true
    })
    .Build();

var run = await pipeline.Start();
await run.Stop();`,
          java: `var pipeline = EASI.pipelineBuilder()
    .fromDimseAssociation(sourceAssociation)
    .ofDicomData()
    .withDeIdentification(Tag.DefaultDeIdentificationMask)
    .toDicomData()
    .intoHttpStream("https://cloud.example.org/dicom-web/studies", Map.of(
        "method", "POST",
        "stow", true
    ))
    .build();

var run = pipeline.start();
run.stop();`,
          python: `pipeline = (
    EASI.pipeline_builder()
    .from_dimse_association(source_association)
    .of_dicom_data()
    .with_de_identification(Tag.default_de_identification_mask)
    .to_dicom_data()
    .into_http_stream("https://cloud.example.org/dicom-web/studies", {
        "method": "POST",
        "stow": True
    })
    .build()
)

run = pipeline.start()
run.stop()`
        }
      }
    ]
  },
  {
    className: 'CodecRegistryBuilder',
    slug: 'codec-registry-builder',
    pageTitle: 'CodecRegistryBuilder',
    purpose: 'Composes and validates codec registry instances used by codec-aware handlers (asset extraction, transcoding, and image workflows).',
    buildOutput: 'CodecRegistry',
    factoryEntryPoints: [
      '`EASI.codecRegistryBuilder()`'
    ],
    keywords: 'codec decoder encoder transfer syntax image format validation registry',
    methodGroups: [
      {
        title: 'Builder API',
        sourceFile: path.join(builderSourceRoot, 'CodecRegistryBuilder.js'),
        include: [
          'withBaseCodecRegistry', 'withDefaultCodecs', 'withDecoderForTransferSyntax',
          'withDecoderForImageFormat', 'withDecoderForMediaType', 'withEncoder',
          'withAssertValid', 'withValidation', 'build'
        ]
      }
    ],
    examples: [
      {
        title: 'Seed with Defaults and Add Custom Decoder',
        scenario: 'Start from default codecs and register one custom transfer-syntax decoder.',
        codes: {
          neutral: `codecRegistry := EASI.codecRegistryBuilder()
  .withDefaultCodecs(true)
  .withDecoderForTransferSyntax("1.2.840.10008.1.2.4.90", Jpeg2000Decoder)
  .build()`,
          javascript: `const codecRegistry = EASI.codecRegistryBuilder()
  .withDefaultCodecs(true)
  .withDecoderForTransferSyntax("1.2.840.10008.1.2.4.90", Jpeg2000Decoder)
  .build();`,
          csharp: `var codecRegistry = EASI.CodecRegistryBuilder()
    .WithDefaultCodecs(true)
    .WithDecoderForTransferSyntax("1.2.840.10008.1.2.4.90", Jpeg2000Decoder)
    .Build();`,
          java: `var codecRegistry = EASI.codecRegistryBuilder()
    .withDefaultCodecs(true)
    .withDecoderForTransferSyntax("1.2.840.10008.1.2.4.90", Jpeg2000Decoder.class)
    .build();`,
          python: `codec_registry = (
    EASI.codec_registry_builder()
    .with_default_codecs(True)
    .with_decoder_for_transfer_syntax("1.2.840.10008.1.2.4.90", Jpeg2000Decoder)
    .build()
)`
        }
      },
      {
        title: 'Clone Existing Registry and Control Validation',
        scenario: 'Clone a base registry, add an encoder, and control assert-valid behavior at build-time.',
        codes: {
          neutral: `codecRegistry := EASI.codecRegistryBuilder()
  .withBaseCodecRegistry(existingRegistry, true)
  .withEncoder("png", pngEncoder)
  .withValidation({ requireDefaultDecoder: true })
  .withAssertValid(true)
  .build()`,
          javascript: `const codecRegistry = EASI.codecRegistryBuilder()
  .withBaseCodecRegistry(existingRegistry, true)
  .withEncoder("png", pngEncoder)
  .withValidation({ requireDefaultDecoder: true })
  .withAssertValid(true)
  .build();`,
          csharp: `var codecRegistry = EASI.CodecRegistryBuilder()
    .WithBaseCodecRegistry(existingRegistry, true)
    .WithEncoder("png", pngEncoder)
    .WithValidation(new { requireDefaultDecoder = true })
    .WithAssertValid(true)
    .Build();`,
          java: `var codecRegistry = EASI.codecRegistryBuilder()
    .withBaseCodecRegistry(existingRegistry, true)
    .withEncoder("png", pngEncoder)
    .withValidation(Map.of("requireDefaultDecoder", true))
    .withAssertValid(true)
    .build();`,
          python: `codec_registry = (
    EASI.codec_registry_builder()
    .with_base_codec_registry(existing_registry, True)
    .with_encoder("png", png_encoder)
    .with_validation({"requireDefaultDecoder": True})
    .with_assert_valid(True)
    .build()
)`
        }
      }
    ]
  },
  {
    className: 'DimseAssociationBuilder',
    slug: 'dimse-association-builder',
    pageTitle: 'DimseAssociationBuilder',
    purpose: 'Builds validated DIMSE association descriptors, including endpoint identity, query options, TLS, move-store behavior, and timeout policy.',
    buildOutput: 'DIMSE association options object',
    factoryEntryPoints: [
      '`EASI.dimseAssociationBuilder()`'
    ],
    keywords: 'dimse association host port ae title tls mtls query cfind cmove timeout policy',
    methodGroups: [
      {
        title: 'Builder API',
        sourceFile: path.join(builderSourceRoot, 'DimseAssociationBuilder.js'),
        include: [
          'withBaseAssociation', 'withHost', 'withPort', 'withCallingAeTitle', 'withCalledAeTitle',
          'withQuery', 'withQueryOption', 'withMoveDestinationAeTitle', 'withMoveStoreCalledAeTitle',
          'withTransportTls', 'withTransportTlsOption', 'withTransportMutualTls',
          'withMoveStoreTls', 'withMoveStoreTlsOption', 'withMoveStoreMutualTls',
          'withAssociationTimeoutMs', 'withMoveStorePolicy', 'withMoveStorePolicyOption',
          'withMoveStoreAssociationTimeoutMs', 'build'
        ]
      }
    ],
    examples: [
      {
        title: 'Create a Basic DIMSE Association',
        scenario: 'Define the minimum host/port/AE-title descriptor for query/retrieve transport.',
        codes: {
          neutral: `association := EASI.dimseAssociationBuilder()
  .withHost("127.0.0.1")
  .withPort(4242)
  .withCallingAeTitle("EASI_JS")
  .withCalledAeTitle("ORTHANC")
  .build()`,
          javascript: `const association = EASI.dimseAssociationBuilder()
  .withHost("127.0.0.1")
  .withPort(4242)
  .withCallingAeTitle("EASI_JS")
  .withCalledAeTitle("ORTHANC")
  .build();`,
          csharp: `var association = EASI.DimseAssociationBuilder()
    .WithHost("127.0.0.1")
    .WithPort(4242)
    .WithCallingAeTitle("EASI_JS")
    .WithCalledAeTitle("ORTHANC")
    .Build();`,
          java: `var association = EASI.dimseAssociationBuilder()
    .withHost("127.0.0.1")
    .withPort(4242)
    .withCallingAeTitle("EASI_JS")
    .withCalledAeTitle("ORTHANC")
    .build();`,
          python: `association = (
    EASI.dimse_association_builder()
    .with_host("127.0.0.1")
    .with_port(4242)
    .with_calling_ae_title("EASI_JS")
    .with_called_ae_title("ORTHANC")
    .build()
)`
        }
      },
      {
        title: 'Configure Query, TLS, and Move-Store Policy',
        scenario: 'Add DIMSE query options, outbound TLS, move-store policy, and timeout controls.',
        codes: {
          neutral: `association := EASI.dimseAssociationBuilder()
  .withBaseAssociation(baseAssociation)
  .withQueryOption("operation", "cmove")
  .withMoveDestinationAeTitle("EASI_DEST")
  .withTransportTls({ rejectUnauthorized: true, servername: "pacs.local" })
  .withMoveStorePolicyOption("associationTimeoutMs", 45000)
  .withAssociationTimeoutMs(30000)
  .build()`,
          javascript: `const association = EASI.dimseAssociationBuilder()
  .withBaseAssociation(baseAssociation)
  .withQueryOption("operation", "cmove")
  .withMoveDestinationAeTitle("EASI_DEST")
  .withTransportTls({ rejectUnauthorized: true, servername: "pacs.local" })
  .withMoveStorePolicyOption("associationTimeoutMs", 45000)
  .withAssociationTimeoutMs(30000)
  .build();`,
          csharp: `var association = EASI.DimseAssociationBuilder()
    .WithBaseAssociation(baseAssociation)
    .WithQueryOption("operation", "cmove")
    .WithMoveDestinationAeTitle("EASI_DEST")
    .WithTransportTls(new { rejectUnauthorized = true, servername = "pacs.local" })
    .WithMoveStorePolicyOption("associationTimeoutMs", 45000)
    .WithAssociationTimeoutMs(30000)
    .Build();`,
          java: `var association = EASI.dimseAssociationBuilder()
    .withBaseAssociation(baseAssociation)
    .withQueryOption("operation", "cmove")
    .withMoveDestinationAeTitle("EASI_DEST")
    .withTransportTls(Map.of("rejectUnauthorized", true, "servername", "pacs.local"))
    .withMoveStorePolicyOption("associationTimeoutMs", 45000)
    .withAssociationTimeoutMs(30000)
    .build();`,
          python: `association = (
    EASI.dimse_association_builder()
    .with_base_association(base_association)
    .with_query_option("operation", "cmove")
    .with_move_destination_ae_title("EASI_DEST")
    .with_transport_tls({"rejectUnauthorized": True, "servername": "pacs.local"})
    .with_move_store_policy_option("associationTimeoutMs", 45000)
    .with_association_timeout_ms(30000)
    .build()
)`
        }
      }
    ]
  },
  {
    className: 'DimseClientBuilder',
    slug: 'dimse-client-builder',
    pageTitle: 'DimseClientBuilder',
    purpose: 'Creates DIMSE client instances for association-level operations (for example C-ECHO) with explicit association and transport configuration.',
    buildOutput: 'DimseClient',
    factoryEntryPoints: [
      '`EASI.dimseClientBuilder()`'
    ],
    keywords: 'dimse client echo association transport query retrieve',
    methodGroups: [
      {
        title: 'Builder API',
        sourceFile: path.join(builderSourceRoot, 'DimseClientBuilder.js'),
        include: ['withAssociation', 'withAssociationBuilder', 'withTransport', 'build']
      }
    ],
    examples: [
      {
        title: 'Build a Client and Run C-ECHO',
        scenario: 'Use a built association object and default transport to create a client and issue an echo.',
        codes: {
          neutral: `client := EASI.dimseClientBuilder()
  .withAssociation(association)
  .build()

echoResult := client.echo()`,
          javascript: `const client = EASI.dimseClientBuilder()
  .withAssociation(association)
  .build();

const echoResult = await client.echo();`,
          csharp: `var client = EASI.DimseClientBuilder()
    .WithAssociation(association)
    .Build();

var echoResult = await client.Echo();`,
          java: `var client = EASI.dimseClientBuilder()
    .withAssociation(association)
    .build();

var echoResult = client.echo();`,
          python: `client = (
    EASI.dimse_client_builder()
    .with_association(association)
    .build()
)

echo_result = client.echo()`
        }
      },
      {
        title: 'Compose Association with Builder + Custom Transport',
        scenario: 'Chain association builder composition into client builder and override the DIMSE transport implementation.',
        codes: {
          neutral: `client := EASI.dimseClientBuilder()
  .withAssociationBuilder(
    EASI.dimseAssociationBuilder()
      .withHost("127.0.0.1")
      .withPort(4242)
      .withCallingAeTitle("EASI_JS")
      .withCalledAeTitle("ORTHANC")
  )
  .withTransport(customDimseTransport)
  .build()`,
          javascript: `const client = EASI.dimseClientBuilder()
  .withAssociationBuilder(
    EASI.dimseAssociationBuilder()
      .withHost("127.0.0.1")
      .withPort(4242)
      .withCallingAeTitle("EASI_JS")
      .withCalledAeTitle("ORTHANC")
  )
  .withTransport(customDimseTransport)
  .build();`,
          csharp: `var client = EASI.DimseClientBuilder()
    .WithAssociationBuilder(
        EASI.DimseAssociationBuilder()
            .WithHost("127.0.0.1")
            .WithPort(4242)
            .WithCallingAeTitle("EASI_JS")
            .WithCalledAeTitle("ORTHANC")
    )
    .WithTransport(customDimseTransport)
    .Build();`,
          java: `var client = EASI.dimseClientBuilder()
    .withAssociationBuilder(
        EASI.dimseAssociationBuilder()
            .withHost("127.0.0.1")
            .withPort(4242)
            .withCallingAeTitle("EASI_JS")
            .withCalledAeTitle("ORTHANC")
    )
    .withTransport(customDimseTransport)
    .build();`,
          python: `client = (
    EASI.dimse_client_builder()
    .with_association_builder(
        EASI.dimse_association_builder()
        .with_host("127.0.0.1")
        .with_port(4242)
        .with_calling_ae_title("EASI_JS")
        .with_called_ae_title("ORTHANC")
    )
    .with_transport(custom_dimse_transport)
    .build()
)`
        }
      }
    ]
  },
  {
    className: 'DicomMappingBuilder',
    slug: 'dicom-mapping-builder',
    pageTitle: 'DicomMappingBuilder',
    purpose: 'Builds DICOM tag-to-domain mapping definitions for `toMapping(...)` terminals, including direct mappings, template properties, and computed expressions.',
    buildOutput: 'DicomMapping',
    factoryEntryPoints: [
      '`EASI.mappingBuilder()`'
    ],
    keywords: 'mapping tags template computed toMapping fhir domain transform',
    methodGroups: [
      {
        title: 'Builder API',
        sourceFile: path.join(builderSourceRoot, 'DicomMappingBuilder.js'),
        include: [
          'withMapping', 'withTemplatePolicy', 'withProperty', 'withProperties',
          'mapTag', 'map', 'withComputed', 'build'
        ]
      }
    ],
    examples: [
      {
        title: 'Direct Tag Mapping with Properties',
        scenario: 'Map key DICOM attributes to an application model and include template properties.',
        codes: {
          neutral: `mapping := EASI.mappingBuilder()
  .withTemplatePolicy("omit")
  .withProperty("sourceSystem", "pacs-a")
  .map("StudyInstanceUID", "study.uid")
  .map("SeriesInstanceUID", "series.uid")
  .build()`,
          javascript: `const mapping = EASI.mappingBuilder()
  .withTemplatePolicy("omit")
  .withProperty("sourceSystem", "pacs-a")
  .map("StudyInstanceUID", "study.uid")
  .map("SeriesInstanceUID", "series.uid")
  .build();`,
          csharp: `var mapping = EASI.MappingBuilder()
    .WithTemplatePolicy("omit")
    .WithProperty("sourceSystem", "pacs-a")
    .Map("StudyInstanceUID", "study.uid")
    .Map("SeriesInstanceUID", "series.uid")
    .Build();`,
          java: `var mapping = EASI.mappingBuilder()
    .withTemplatePolicy("omit")
    .withProperty("sourceSystem", "pacs-a")
    .map("StudyInstanceUID", "study.uid")
    .map("SeriesInstanceUID", "series.uid")
    .build();`,
          python: `mapping = (
    EASI.mapping_builder()
    .with_template_policy("omit")
    .with_property("sourceSystem", "pacs-a")
    .map("StudyInstanceUID", "study.uid")
    .map("SeriesInstanceUID", "series.uid")
    .build()
)`
        }
      },
      {
        title: 'Fluent `map(...).to(...)` + Computed Rule',
        scenario: 'Use two-step mapping syntax and computed values for derived properties.',
        codes: {
          neutral: `mapping := EASI.mappingBuilder()
  .map("PatientID").to("patient.identifier")
  .withComputed("study.isLongitudinal", {
    from: ["StudyDate", "StudyTime"],
    expression: "hasPriorExam == true"
  })
  .build()`,
          javascript: `const mapping = EASI.mappingBuilder()
  .map("PatientID").to("patient.identifier")
  .withComputed("study.isLongitudinal", {
    from: ["StudyDate", "StudyTime"],
    expression: "hasPriorExam == true"
  })
  .build();`,
          csharp: `var mapping = EASI.MappingBuilder()
    .Map("PatientID").To("patient.identifier")
    .WithComputed("study.isLongitudinal", new {
        from = new[] { "StudyDate", "StudyTime" },
        expression = "hasPriorExam == true"
    })
    .Build();`,
          java: `var mapping = EASI.mappingBuilder()
    .map("PatientID").to("patient.identifier")
    .withComputed("study.isLongitudinal", Map.of(
        "from", java.util.List.of("StudyDate", "StudyTime"),
        "expression", "hasPriorExam == true"
    ))
    .build();`,
          python: `mapping = (
    EASI.mapping_builder()
    .map("PatientID").to("patient.identifier")
    .with_computed("study.isLongitudinal", {
        "from": ["StudyDate", "StudyTime"],
        "expression": "hasPriorExam == true"
    })
    .build()
)`
        }
      }
    ]
  },
  {
    className: 'DicomSelectionBuilder',
    slug: 'dicom-selection-builder',
    pageTitle: 'DicomSelectionBuilder',
    purpose: 'Builds selective DICOM attribute extraction definitions for `toSelection(...)` terminals.',
    buildOutput: 'DicomSelection',
    factoryEntryPoints: [
      '`EASI.selectionBuilder()`'
    ],
    keywords: 'selection include tags toSelection subset attributes',
    methodGroups: [
      {
        title: 'Builder API',
        sourceFile: path.join(builderSourceRoot, 'DicomSelectionBuilder.js'),
        include: ['withSelection', 'includeTag', 'include', 'includeTags', 'build']
      }
    ],
    examples: [
      {
        title: 'Build a Targeted Study/Series Selection',
        scenario: 'Select only key attributes needed for indexing and lightweight metadata workflows.',
        codes: {
          neutral: `selection := EASI.selectionBuilder()
  .include(["StudyInstanceUID", "SeriesInstanceUID", "SOPInstanceUID"])
  .build()`,
          javascript: `const selection = EASI.selectionBuilder()
  .include(["StudyInstanceUID", "SeriesInstanceUID", "SOPInstanceUID"])
  .build();`,
          csharp: `var selection = EASI.SelectionBuilder()
    .Include(new[] { "StudyInstanceUID", "SeriesInstanceUID", "SOPInstanceUID" })
    .Build();`,
          java: `var selection = EASI.selectionBuilder()
    .include(java.util.List.of("StudyInstanceUID", "SeriesInstanceUID", "SOPInstanceUID"))
    .build();`,
          python: `selection = (
    EASI.selection_builder()
    .include(["StudyInstanceUID", "SeriesInstanceUID", "SOPInstanceUID"])
    .build()
)`
        }
      },
      {
        title: 'Merge with Base Selection and Extend',
        scenario: 'Start from an existing selection and add workflow-specific tags.',
        codes: {
          neutral: `selection := EASI.selectionBuilder()
  .withSelection(baseSelection)
  .includeTag("PatientID")
  .includeTags(["PatientName", "Modality"])
  .build()`,
          javascript: `const selection = EASI.selectionBuilder()
  .withSelection(baseSelection)
  .includeTag("PatientID")
  .includeTags(["PatientName", "Modality"])
  .build();`,
          csharp: `var selection = EASI.SelectionBuilder()
    .WithSelection(baseSelection)
    .IncludeTag("PatientID")
    .IncludeTags(new[] { "PatientName", "Modality" })
    .Build();`,
          java: `var selection = EASI.selectionBuilder()
    .withSelection(baseSelection)
    .includeTag("PatientID")
    .includeTags(java.util.List.of("PatientName", "Modality"))
    .build();`,
          python: `selection = (
    EASI.selection_builder()
    .with_selection(base_selection)
    .include_tag("PatientID")
    .include_tags(["PatientName", "Modality"])
    .build()
)`
        }
      }
    ]
  },
  {
    className: 'DicomDeIdentificationMaskBuilder',
    slug: 'dicom-de-identification-mask-builder',
    pageTitle: 'DicomDeIdentificationMaskBuilder',
    purpose: 'Builds de-identification mask maps used by `withDeIdentification(...)` filters, including defaults, merges, direct set/remove operations, and tag resolution helpers.',
    buildOutput: 'De-identification mask map (`Map<string, { ID, Action }>`)',
    factoryEntryPoints: [
      '`EASI.deIdentificationMaskBuilder()`'
    ],
    keywords: 'deidentification mask phi tag actions default profile merge',
    methodGroups: [
      {
        title: 'Builder API',
        sourceFile: path.join(builderSourceRoot, 'DicomDeIdentificationMaskBuilder.js'),
        include: [
          'withDeIdentificationMask', 'mergeDeIdentificationMask', 'withDefaultProfile', 'mergeDefaultProfile',
          'set', 'remove', 'clear', 'has', 'get', 'build'
        ]
      }
    ],
    examples: [
      {
        title: 'Default Profile with Explicit Overrides',
        scenario: 'Start from the standard mask profile and override specific tag behaviors.',
        codes: {
          neutral: `mask := EASI.deIdentificationMaskBuilder()
  .withDefaultProfile()
  .set("PatientID", "[REMOVED]")
  .set("AccessionNumber", "[MASKED]")
  .build()`,
          javascript: `const mask = EASI.deIdentificationMaskBuilder()
  .withDefaultProfile()
  .set("PatientID", "[REMOVED]")
  .set("AccessionNumber", "[MASKED]")
  .build();`,
          csharp: `var mask = EASI.DeIdentificationMaskBuilder()
    .WithDefaultProfile()
    .Set("PatientID", "[REMOVED]")
    .Set("AccessionNumber", "[MASKED]")
    .Build();`,
          java: `var mask = EASI.deIdentificationMaskBuilder()
    .withDefaultProfile()
    .set("PatientID", "[REMOVED]")
    .set("AccessionNumber", "[MASKED]")
    .build();`,
          python: `mask = (
    EASI.de_identification_mask_builder()
    .with_default_profile()
    .set("PatientID", "[REMOVED]")
    .set("AccessionNumber", "[MASKED]")
    .build()
)`
        }
      },
      {
        title: 'Compose from External Mask Data',
        scenario: 'Load caller-provided mask entries, merge defaults, and inspect resulting actions.',
        codes: {
          neutral: `maskBuilder := EASI.deIdentificationMaskBuilder()
  .withDeIdentificationMask(externalMask)
  .mergeDefaultProfile()

hasPatientName := maskBuilder.has("PatientName")
patientNameAction := maskBuilder.get("PatientName")
mask := maskBuilder.build()`,
          javascript: `const maskBuilder = EASI.deIdentificationMaskBuilder()
  .withDeIdentificationMask(externalMask)
  .mergeDefaultProfile();

const hasPatientName = maskBuilder.has("PatientName");
const patientNameAction = maskBuilder.get("PatientName");
const mask = maskBuilder.build();`,
          csharp: `var maskBuilder = EASI.DeIdentificationMaskBuilder()
    .WithDeIdentificationMask(externalMask)
    .MergeDefaultProfile();

var hasPatientName = maskBuilder.Has("PatientName");
var patientNameAction = maskBuilder.Get("PatientName");
var mask = maskBuilder.Build();`,
          java: `var maskBuilder = EASI.deIdentificationMaskBuilder()
    .withDeIdentificationMask(externalMask)
    .mergeDefaultProfile();

var hasPatientName = maskBuilder.has("PatientName");
var patientNameAction = maskBuilder.get("PatientName");
var mask = maskBuilder.build();`,
          python: `mask_builder = (
    EASI.de_identification_mask_builder()
    .with_de_identification_mask(external_mask)
    .merge_default_profile()
)

has_patient_name = mask_builder.has("PatientName")
patient_name_action = mask_builder.get("PatientName")
mask = mask_builder.build()`
        }
      }
    ]
  },
  {
    className: 'ImagingNormalizationBuilder',
    slug: 'imaging-normalization-builder',
    pageTitle: 'ImagingNormalizationBuilder',
    purpose: 'Builds immutable normalization definitions for mixed-imaging flows, selecting normalized output mode (`frames` or `dicom`) plus mode-specific options.',
    buildOutput: 'Immutable normalization definition object',
    factoryEntryPoints: [
      '`EASI.pipelineBuilder().withNormalization((builder) => ...)`'
    ],
    keywords: 'normalization frames dicom mixed imaging mode builder resolve',
    methodGroups: [
      {
        title: 'Builder API',
        sourceFile: path.join(builderSourceRoot, 'ImagingNormalizationBuilder.js'),
        include: ['toFrames', 'toDicom', 'build', 'resolve']
      }
    ],
    examples: [
      {
        title: 'Normalize to Frame-Oriented Output',
        scenario: 'Force mixed imaging routes into frame-centric payload output with explicit options.',
        codes: {
          neutral: `normalization := ImagingNormalizationBuilder.builder()
  .toFrames({ decode: "rgba", includeMetadata: true })
  .build()`,
          javascript: `const normalization = ImagingNormalizationBuilder.builder()
  .toFrames({ decode: "rgba", includeMetadata: true })
  .build();`,
          csharp: `var normalization = ImagingNormalizationBuilder.Builder()
    .ToFrames(new { decode = "rgba", includeMetadata = true })
    .Build();`,
          java: `var normalization = ImagingNormalizationBuilder.builder()
    .toFrames(Map.of("decode", "rgba", "includeMetadata", true))
    .build();`,
          python: `normalization = (
    ImagingNormalizationBuilder.builder()
    .to_frames({"decode": "rgba", "includeMetadata": True})
    .build()
)`
        }
      },
      {
        title: 'Resolve from Pipeline Callback',
        scenario: 'Use callback-driven builder configuration with `withNormalization(...)` in a mixed-imaging pipeline.',
        codes: {
          neutral: `pipeline := EASI.pipelineBuilder()
  .fromByteStream()
  .ofMixedImagingData()
  .withNormalization((builder) => builder.toDicom({ includePart10Header: true }))
  .toImagingData()
  .build()`,
          javascript: `const pipeline = EASI.pipelineBuilder()
  .fromByteStream()
  .ofMixedImagingData()
  .withNormalization((builder) => builder.toDicom({ includePart10Header: true }))
  .toImagingData()
  .build();`,
          csharp: `var pipeline = EASI.PipelineBuilder()
    .FromByteStream()
    .OfMixedImagingData()
    .WithNormalization((builder) => builder.ToDicom(new { includePart10Header = true }))
    .ToImagingData()
    .Build();`,
          java: `var pipeline = EASI.pipelineBuilder()
    .fromByteStream()
    .ofMixedImagingData()
    .withNormalization((builder) -> builder.toDicom(Map.of("includePart10Header", true)))
    .toImagingData()
    .build();`,
          python: `pipeline = (
    EASI.pipeline_builder()
    .from_byte_stream()
    .of_mixed_imaging_data()
    .with_normalization(lambda builder: builder.to_dicom({"includePart10Header": True}))
    .to_imaging_data()
    .build()
)`
        }
      }
    ]
  },
  {
    className: 'ImagingRoutingBuilder',
    slug: 'imaging-routing-builder',
    pageTitle: 'ImagingRoutingBuilder',
    purpose: 'Builds route-branch definitions for mixed-imaging workloads, including DICOM branch, image branch, fallback behavior, and unknown-item policy.',
    buildOutput: 'Routing configuration object',
    factoryEntryPoints: [
      '`EASI.pipelineBuilder().withRouting((builder) => ...)`'
    ],
    keywords: 'routing whenDicom whenImage otherwise unknown mode mixed imaging',
    methodGroups: [
      {
        title: 'Builder API',
        sourceFile: path.join(builderSourceRoot, 'ImagingRoutingBuilder.js'),
        include: ['whenDicom', 'whenImage', 'otherwise', 'withUnknownMode', 'build', 'resolve']
      }
    ],
    examples: [
      {
        title: 'Route DICOM and Image Branches',
        scenario: 'Define dedicated branch pipelines for DICOM content and standard image payloads.',
        codes: {
          neutral: `routing := ImagingRoutingBuilder.resolve((builder) =>
  builder
    .whenDicom((pipeline) => pipeline.ofDicomData().toInstances())
    .whenImage((pipeline) => pipeline.ofImageData().toImageData())
    .otherwise((pipeline) => pipeline.ofByteData().toStructuredValue())
)`,
          javascript: `const routing = ImagingRoutingBuilder.resolve((builder) =>
  builder
    .whenDicom((pipeline) => pipeline.ofDicomData().toInstances())
    .whenImage((pipeline) => pipeline.ofImageData().toImageData())
    .otherwise((pipeline) => pipeline.ofByteData().toStructuredValue())
);`,
          csharp: `var routing = ImagingRoutingBuilder.Resolve((builder) =>
    builder
        .WhenDicom((pipeline) => pipeline.OfDicomData().ToInstances())
        .WhenImage((pipeline) => pipeline.OfImageData().ToImageData())
        .Otherwise((pipeline) => pipeline.OfByteData().ToStructuredValue())
);`,
          java: `var routing = ImagingRoutingBuilder.resolve((builder) ->
    builder
        .whenDicom((pipeline) -> pipeline.ofDicomData().toInstances())
        .whenImage((pipeline) -> pipeline.ofImageData().toImageData())
        .otherwise((pipeline) -> pipeline.ofByteData().toStructuredValue())
);`,
          python: `routing = ImagingRoutingBuilder.resolve(
    lambda builder: builder
        .when_dicom(lambda pipeline: pipeline.of_dicom_data().to_instances())
        .when_image(lambda pipeline: pipeline.of_image_data().to_image_data())
        .otherwise(lambda pipeline: pipeline.of_byte_data().to_structured_value())
)`
        }
      },
      {
        title: 'Fail Unknown Modes Explicitly',
        scenario: 'Use strict unknown-mode behavior in workflows where unclassified payloads should fail fast.',
        codes: {
          neutral: `routing := ImagingRoutingBuilder.resolve((builder) =>
  builder
    .whenDicom(dicomPipeline)
    .whenImage(imagePipeline)
    .withUnknownMode("fail")
)`,
          javascript: `const routing = ImagingRoutingBuilder.resolve((builder) =>
  builder
    .whenDicom(dicomPipeline)
    .whenImage(imagePipeline)
    .withUnknownMode("fail")
);`,
          csharp: `var routing = ImagingRoutingBuilder.Resolve((builder) =>
    builder
        .WhenDicom(dicomPipeline)
        .WhenImage(imagePipeline)
        .WithUnknownMode("fail")
);`,
          java: `var routing = ImagingRoutingBuilder.resolve((builder) ->
    builder
        .whenDicom(dicomPipeline)
        .whenImage(imagePipeline)
        .withUnknownMode("fail")
);`,
          python: `routing = ImagingRoutingBuilder.resolve(
    lambda builder: builder
        .when_dicom(dicom_pipeline)
        .when_image(image_pipeline)
        .with_unknown_mode("fail")
)`
        }
      }
    ]
  }
];

const BUILDER_NAV_ITEMS = BUILDER_DEFINITIONS.map((builder) => ({
  label: builder.className,
  slug: builder.slug
}));

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttribute(value) {
  return escapeHtml(value);
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function readFileSafe(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing required file: ${filePath}`);
  }
  return fs.readFileSync(filePath, 'utf8');
}

function parseJsDoc(block) {
  const rawLines = block
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*\*\s?/, '').trimRight());

  const descriptionLines = [];
  const params = [];
  let returns = null;
  let currentTag = null;

  const appendToCurrent = (line) => {
    const text = String(line || '').trim();
    if (text.length === 0) {
      return;
    }

    if ((currentTag != null) && (currentTag.type === 'param')) {
      currentTag.entry.description = `${currentTag.entry.description} ${text}`.trim();
      return;
    }

    if ((currentTag != null) && (currentTag.type === 'returns')) {
      returns.description = `${returns.description} ${text}`.trim();
      return;
    }

    descriptionLines.push(text);
  };

  for (const rawLine of rawLines) {
    const line = rawLine.trim();
    if (line.length === 0) {
      currentTag = null;
      continue;
    }

    if (line.startsWith('@param')) {
      const match = line.match(/^@param\s+\{([^}]+)\}\s+(\[[^\]]+\]|[^\s]+)\s*(.*)$/);
      if (match) {
        const entry = {
          type: match[1].trim(),
          name: match[2].trim(),
          description: (match[3] || '').trim()
        };
        params.push(entry);
        currentTag = { type: 'param', entry };
        continue;
      }
    }

    if (line.startsWith('@returns') || line.startsWith('@return')) {
      const match = line.match(/^@returns?\s+\{([^}]+)\}\s*(.*)$/);
      if (match) {
        returns = {
          type: match[1].trim(),
          description: (match[2] || '').trim()
        };
        currentTag = { type: 'returns' };
        continue;
      }
    }

    if (line.startsWith('@')) {
      currentTag = null;
      continue;
    }

    appendToCurrent(line);
  }

  const description = descriptionLines.join(' ').trim();

  return {
    description,
    params,
    returns
  };
}

function parseMethodsFromSource(sourceFilePath, includeNames = null) {
  const source = readFileSafe(sourceFilePath);
  const methodMatches = source.matchAll(/\/\*\*([\s\S]*?)\*\/\s*(static\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*\(([^)]*)\)\s*\{/g);
  const includeSet = (Array.isArray(includeNames) && includeNames.length > 0)
    ? new Set(includeNames)
    : null;

  const methods = [];

  for (const match of methodMatches) {
    const jsDocBlock = match[1] || '';
    const isStatic = (match[2] || '').trim().length > 0;
    const methodName = match[3];
    const paramSignature = (match[4] || '').trim();

    if (methodName === 'constructor') {
      continue;
    }

    if ((includeSet != null) && (includeSet.has(methodName) === false)) {
      continue;
    }

    const parsedDoc = parseJsDoc(jsDocBlock);
    methods.push({
      name: methodName,
      isStatic,
      signature: `${isStatic ? 'static ' : ''}${methodName}(${paramSignature})`,
      description: parsedDoc.description || 'No description provided.',
      params: parsedDoc.params,
      returns: parsedDoc.returns
    });
  }

  return methods;
}

function renderMethodSummaryTable(methods) {
  const rows = methods.map((method) => {
    const returnsText = (method.returns && method.returns.type)
      ? `<code>${escapeHtml(method.returns.type)}</code>`
      : '<code>void</code>';

    return `
                            <tr>
                                <td><code>${escapeHtml(method.name)}</code></td>
                                <td><code>${escapeHtml(method.signature)}</code></td>
                                <td>${returnsText}</td>
                                <td>${escapeHtml(method.description)}</td>
                            </tr>`;
  }).join('');

  return `
                <div class="table-scroll">
                    <table>
                        <thead>
                            <tr>
                                <th>Method</th>
                                <th>Signature</th>
                                <th>Returns</th>
                                <th>Purpose</th>
                            </tr>
                        </thead>
                        <tbody>${rows}
                        </tbody>
                    </table>
                </div>`;
}

function renderMethodDetails(methods) {
  if (methods.length === 0) {
    return `
                <div class="callout warning">
                    <h4>Method Metadata Unavailable</h4>
                    <p>No public methods were resolved for this builder definition.</p>
                </div>`;
  }

  return methods.map((method) => {
    const paramsBlock = (method.params.length > 0)
      ? `
                <div class="table-scroll">
                    <table>
                        <thead>
                            <tr>
                                <th>Parameter</th>
                                <th>Type</th>
                                <th>Detail</th>
                            </tr>
                        </thead>
                        <tbody>${method.params.map((param) => `
                            <tr>
                                <td><code>${escapeHtml(param.name)}</code></td>
                                <td><code>${escapeHtml(param.type)}</code></td>
                                <td>${escapeHtml(param.description || 'No description provided.')}</td>
                            </tr>`).join('')}
                        </tbody>
                    </table>
                </div>`
      : '\n                <p><em>No parameters.</em></p>';

    const returnBlock = (method.returns != null)
      ? `<p><strong>Returns:</strong> <code>${escapeHtml(method.returns.type)}</code>${method.returns.description ? ` - ${escapeHtml(method.returns.description)}` : ''}</p>`
      : '<p><strong>Returns:</strong> <code>void</code></p>';

    return `
            <article class="member-doc">
                <h6><code>${escapeHtml(method.signature)}</code></h6>
                <p>${escapeHtml(method.description)}</p>
                <p class="member-doc-label">Parameters</p>${paramsBlock}
                ${returnBlock}
            </article>`;
  }).join('\n');
}

function renderExampleTabs(example, index) {
  const tabsetId = `builder-example-${index + 1}`;

  return `
                    <div class="doc-tabset" data-tabset data-tabset-id="${escapeAttribute(tabsetId)}">
                        <div class="doc-tablist" role="tablist" aria-label="${escapeAttribute(example.title)} language tabs">
                            <button class="doc-tab-button active" type="button" data-tab-button="neutral">Language-Neutral</button>
                            <button class="doc-tab-button" type="button" data-tab-button="javascript">JavaScript</button>
                            <button class="doc-tab-button" type="button" data-tab-button="csharp">C#</button>
                            <button class="doc-tab-button" type="button" data-tab-button="java">Java</button>
                            <button class="doc-tab-button" type="button" data-tab-button="python">Python</button>
                        </div>

                        <div class="doc-tab-panel active" data-tab-panel="neutral">
                            <pre><code class="language-text">${escapeHtml(example.codes.neutral)}</code></pre>
                        </div>

                        <div class="doc-tab-panel" data-tab-panel="javascript">
                            <pre><code class="language-javascript">${escapeHtml(example.codes.javascript)}</code></pre>
                        </div>

                        <div class="doc-tab-panel" data-tab-panel="csharp">
                            <pre><code class="language-csharp">${escapeHtml(example.codes.csharp)}</code></pre>
                        </div>

                        <div class="doc-tab-panel" data-tab-panel="java">
                            <pre><code class="language-java">${escapeHtml(example.codes.java)}</code></pre>
                        </div>

                        <div class="doc-tab-panel" data-tab-panel="python">
                            <pre><code class="language-python">${escapeHtml(example.codes.python)}</code></pre>
                        </div>
                    </div>`;
}

function buildBuilderNavGroup(indent, prefix) {
  const rootHref = `${prefix}builder-types/index.html`;
  const itemLines = BUILDER_NAV_ITEMS.map((item) => (
    `${indent}        <a class="nav-link nav-sublink nav-subsublink" data-nav-link href="${prefix}builder-types/${item.slug}.html">${item.label}</a>`
  )).join('\n');

  return `${indent}<div class="nav-group" data-nav-group data-expanded="false">
${indent}    <div class="nav-group-header">
${indent}        <a class="nav-link nav-group-root" data-nav-link data-nav-group-root href="${rootHref}">Builders</a>
${indent}        <button class="nav-group-toggle" type="button" data-nav-group-toggle aria-label="Toggle Builders section" aria-expanded="false">
${indent}            <span class="nav-group-chevron">&#9662;</span>
${indent}        </button>
${indent}    </div>
${indent}    <div class="nav-submenu" data-nav-submenu>
${itemLines}
${indent}    </div>
${indent}</div>\n`;
}

function inferPrefixForFile(relativePath) {
  if (relativePath.includes(path.sep)) {
    return '../';
  }
  return '';
}

function patchNavAcrossHtmlPages() {
  const htmlFiles = [];

  function walk(currentPath) {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'assets' || entry.name === 'scripts') {
          continue;
        }
        walk(fullPath);
        continue;
      }

      if (entry.name.toLowerCase().endsWith('.html')) {
        htmlFiles.push(fullPath);
      }
    }
  }

  walk(siteRoot);

  for (const htmlFilePath of htmlFiles) {
    const rel = path.relative(siteRoot, htmlFilePath);
    const prefix = inferPrefixForFile(rel);
    let html = fs.readFileSync(htmlFilePath, 'utf8');

    if (html.includes(`data-nav-group-root href="${prefix}builder-types/index.html">Builders</a>`)) {
      continue;
    }

    const materializationHref = `${prefix}materialization-model.html`;
    const pattern = new RegExp(`(^[ \\t]*<a class=\"nav-link\" data-nav-link href=\"${materializationHref.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\">Materialization Model<\\/a>\\r?\\n)`, 'm');

    const match = html.match(pattern);
    if (!match) {
      continue;
    }

    const indentMatch = match[1].match(/^[ \t]*/);
    const indent = indentMatch ? indentMatch[0] : '                ';
    const builderGroup = buildBuilderNavGroup(indent, prefix);

    html = html.replace(pattern, `$1${builderGroup}`);
    fs.writeFileSync(htmlFilePath, html, 'utf8');
  }
}

function patchGenerateDicomModelTypesTemplate() {
  if (!fs.existsSync(navTemplateScriptPath)) {
    return;
  }

  let script = fs.readFileSync(navTemplateScriptPath, 'utf8');

  if (script.includes('../builder-types/index.html')) {
    return;
  }

  const marker = '                <a class="nav-link" data-nav-link href="../materialization-model.html">Materialization Model</a>\n';
  if (script.includes(marker) === false) {
    return;
  }

  const insertion = marker
    + '                <div class="nav-group" data-nav-group data-expanded="false">\n'
    + '                    <div class="nav-group-header">\n'
    + '                        <a class="nav-link nav-group-root" data-nav-link data-nav-group-root href="../builder-types/index.html">Builders</a>\n'
    + '                        <button class="nav-group-toggle" type="button" data-nav-group-toggle aria-label="Toggle Builders section" aria-expanded="false">\n'
    + '                            <span class="nav-group-chevron">&#9662;</span>\n'
    + '                        </button>\n'
    + '                    </div>\n'
    + '                    <div class="nav-submenu" data-nav-submenu>\n'
    + BUILDER_NAV_ITEMS.map((item) => (`                        <a class="nav-link nav-sublink nav-subsublink" data-nav-link href="../builder-types/${item.slug}.html">${item.label}</a>\n`)).join('')
    + '                    </div>\n'
    + '                </div>\n';

  script = script.replace(marker, insertion);
  fs.writeFileSync(navTemplateScriptPath, script, 'utf8');
}

function patchOverviewIndexCard() {
  if (!fs.existsSync(navSourcePage)) {
    return;
  }

  let html = fs.readFileSync(navSourcePage, 'utf8');
  if (html.includes('href="builder-types/index.html">Builder Types</a>')) {
    return;
  }

  const materializationCard = `<article class="card reveal" data-filter-item="materialization model non materializing materializing hybrid memory throughput streaming payload chunks">\n                        <h4><a href="materialization-model.html">Materialization Model</a></h4>\n                        <p>Defines when to materialize outputs versus stream them, with practical controls for memory-aware pipeline design.</p>\n                    </article>`;

  if (!html.includes(materializationCard)) {
    return;
  }

  const builderCard = `${materializationCard}\n\n                    <article class="card reveal" data-filter-item="builder types pipeline builder dimse mapping selection codec routing normalization">\n                        <h4><a href="builder-types/index.html">Builder Types</a></h4>\n                        <p>Comprehensive reference for EASI builders, option surfaces, and end-to-end usage patterns.</p>\n                    </article>`;

  html = html.replace(materializationCard, builderCard);
  fs.writeFileSync(navSourcePage, html, 'utf8');
}

function extractReferenceNavFromTopLevelIndex() {
  const html = readFileSafe(navSourcePage);
  const starts = [...html.matchAll(/<div class="nav-section">/g)].map((match) => match.index);
  if (starts.length < 2) {
    throw new Error('Unable to locate nav sections in top-level index page.');
  }

  const referenceBlock = html.slice(starts[0], starts[1]).trimRight();
  return referenceBlock;
}

function prefixNavForNestedPages(referenceNavBlock, prefix = '../') {
  return referenceNavBlock.replace(/href="([^"]+)"/g, (full, href) => {
    if (/^(?:https?:|#|mailto:|javascript:)/i.test(href)) {
      return full;
    }
    if (href.startsWith(prefix)) {
      return full;
    }
    return `href="${prefix}${href}"`;
  });
}

function renderBuilderIndexPage(nestedNavBlock) {
  const cards = BUILDER_DEFINITIONS.map((builder) => {
    return `
                    <article class="card reveal" data-filter-item="${escapeAttribute(builder.keywords)} ${escapeAttribute(builder.className.toLowerCase())}">
                        <h4><a href="${escapeAttribute(builder.slug)}.html">${escapeHtml(builder.className)}</a></h4>
                        <p>${escapeHtml(builder.purpose)}</p>
                    </article>`;
  }).join('');

  const rows = BUILDER_DEFINITIONS.map((builder) => {
    const factories = builder.factoryEntryPoints.join('<br>');
    return `
                            <tr>
                                <td><a href="${escapeAttribute(builder.slug)}.html"><code>${escapeHtml(builder.className)}</code></a></td>
                                <td>${factories}</td>
                                <td><code>${escapeHtml(builder.buildOutput)}</code></td>
                                <td>${escapeHtml(builder.purpose)}</td>
                            </tr>`;
  }).join('');

  return `<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="description" content="Comprehensive catalog of EASI builder types, method surfaces, and composition examples.">
    <title>EASI | Builder Types</title>
    <link rel="stylesheet" href="../assets/styles.css">
    <script defer src="../assets/app.js"></script>
</head>
<body>
    <div class="layout">
        <aside class="sidebar">
            <div class="brand">
                <div class="brand-mark">E</div>
                <div>
                    <h1>EASI</h1>
                    <p>Technical Reference</p>
                </div>
            </div>

${nestedNavBlock}
            <div class="nav-section">
                <span class="nav-label">Edition</span>
                <p class="page-meta">Draft v1.0 Candidate<br>April 3, 2026</p>
            </div>
            <span class="badge normative">Normative</span>
            <span class="badge informative">Informative</span>
        </aside>

        <main class="page">
            <section class="page-hero reveal">
                <h2>Builder Types</h2>
                <p>
                    This catalog documents EASI builder classes as first-class composition tools.
                    Each builder page explains purpose, all exposed options, and language-neutral plus language-specific usage examples.
                </p>
            </section>

            <section class="section reveal">
                <div class="callout normative">
                    <h4>What Builders Do</h4>
                    <p>
                        Builders define immutable composition intent before execution. They centralize option semantics,
                        keep contracts explicit, and provide deterministic build-time validation points.
                    </p>
                </div>
            </section>

            <section class="section reveal">
                <h3>Builder Catalog</h3>
                <div class="search">
                    <input id="builder-search" type="search" placeholder="Search by builder, option, pipeline, DIMSE, mapping..."
                           data-filter-input data-filter-target="#builder-catalog">
                </div>

                <div id="builder-catalog" class="grid three">
${cards}
                </div>
            </section>

            <section class="section reveal">
                <h3>Quick Reference</h3>
                <div class="table-scroll">
                    <table>
                        <thead>
                            <tr>
                                <th>Builder</th>
                                <th>Primary Entry Point(s)</th>
                                <th>Build Output</th>
                                <th>Primary Purpose</th>
                            </tr>
                        </thead>
                        <tbody>${rows}
                        </tbody>
                    </table>
                </div>
            </section>

            <p class="footer-note">
                Informative catalog: builder API reference across language-neutral semantics and language-specific usage styles.
            </p>
        </main>
    </div>
</body>
</html>
`;
}

function renderBuilderDetailPage(builder, nestedNavBlock) {
  const groupSections = builder.methodGroups.map((group) => {
    const methods = parseMethodsFromSource(group.sourceFile, group.include);
    return {
      ...group,
      methods
    };
  });

  const summarySections = groupSections.map((group) => `
            <section class="section reveal">
                <h3>${escapeHtml(group.title)} Method Summary</h3>
                <p>
                    Exposed methods for ${escapeHtml(builder.className)} in this stage/group.
                </p>
${renderMethodSummaryTable(group.methods)}
            </section>`).join('\n');

  const detailSections = groupSections.map((group) => `
            <section class="section reveal">
                <h3>${escapeHtml(group.title)} Method Details</h3>
${renderMethodDetails(group.methods)}
            </section>`).join('\n');

  const examplesMarkup = builder.examples.map((example, index) => `
                <article class="member-doc">
                    <h6>${escapeHtml(example.title)}</h6>
                    <p>${escapeHtml(example.scenario)}</p>
${renderExampleTabs(example, index)}
                </article>`).join('\n');

  const factoryEntryPoint = (Array.isArray(builder.factoryEntryPoints) && builder.factoryEntryPoints.length > 0)
    ? builder.factoryEntryPoints[0]
    : '<em>Not specified</em>';

  return `<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="description" content="Comprehensive API reference for ${escapeAttribute(builder.className)} including options and examples.">
    <title>EASI | ${escapeHtml(builder.className)}</title>
    <link rel="stylesheet" href="../assets/styles.css">
    <script defer src="../assets/app.js"></script>
</head>
<body>
    <div class="layout">
        <aside class="sidebar">
            <div class="brand">
                <div class="brand-mark">E</div>
                <div>
                    <h1>EASI</h1>
                    <p>Technical Reference</p>
                </div>
            </div>

${nestedNavBlock}
            <div class="nav-section">
                <span class="nav-label">Edition</span>
                <p class="page-meta">Draft v1.0 Candidate<br>April 3, 2026</p>
            </div>
            <span class="badge normative">Normative</span>
            <span class="badge informative">Informative</span>
        </aside>

        <main class="page">
            <section class="page-hero reveal">
                <h2>${escapeHtml(builder.className)}</h2>
                <p>${escapeHtml(builder.purpose)}</p>
            </section>

            <section class="section reveal">
                <h3>Builder Identity</h3>
                <div class="table-scroll">
                    <table>
                        <thead>
                            <tr>
                                <th>Field</th>
                                <th>Value</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>Builder Type</td>
                                <td><code>${escapeHtml(builder.className)}</code></td>
                            </tr>
                            <tr>
                                <td>Primary Purpose</td>
                                <td>${escapeHtml(builder.purpose)}</td>
                            </tr>
                            <tr>
                                <td>Build Output</td>
                                <td><code>${escapeHtml(builder.buildOutput)}</code></td>
                            </tr>
                            <tr>
                                <td>Factory Entry Point</td>
                                <td>${factoryEntryPoint}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </section>
${summarySections}
${detailSections}
            <section class="section reveal">
                <h3>Usage Examples</h3>
                <p>
                    The following examples demonstrate language-neutral semantics and language-specific usage forms.
                </p>
${examplesMarkup}
            </section>

            <p class="footer-note">
                Informative page: comprehensive builder reference for ${escapeHtml(builder.className)}.
            </p>
        </main>
    </div>
</body>
</html>
`;
}

function writeBuilderPages() {
  ensureDir(builderTypesDir);

  const topLevelReferenceNav = extractReferenceNavFromTopLevelIndex();
  const nestedReferenceNav = prefixNavForNestedPages(topLevelReferenceNav, '../');

  const indexHtml = renderBuilderIndexPage(nestedReferenceNav);
  fs.writeFileSync(path.join(builderTypesDir, 'index.html'), indexHtml, 'utf8');

  for (const builder of BUILDER_DEFINITIONS) {
    const html = renderBuilderDetailPage(builder, nestedReferenceNav);
    fs.writeFileSync(path.join(builderTypesDir, `${builder.slug}.html`), html, 'utf8');
  }
}

function main() {
  patchNavAcrossHtmlPages();
  patchGenerateDicomModelTypesTemplate();
  patchOverviewIndexCard();
  writeBuilderPages();
}

main();
