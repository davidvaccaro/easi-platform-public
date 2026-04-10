# Asset Archive Format (EASI-AZ1)

## Status

Normative for the EASI asset archive package shape and required behavior when an implementation claims support for `toAssetArchive(...)`.

## Purpose

Define a portable, non-DICOM&reg; package for workflows that need:

- mapped metadata in JSON
- image frames in standard image formats (`png`, `jpeg`, `tiff`)
- optional bulk content payload files

This archive is intended as a derived interchange package. It is not a replacement for canonical DICOM&reg; for long-term clinical archive obligations.

## Package Container

- Container format: ZIP (stored entries, no compression requirement)
- MIME type: `application/zip`

## Required File Layout

A conforming archive MUST contain:

- `manifest.json`
- `metadata.json` (unless metadata inclusion is explicitly disabled)

When frame extraction is configured, the archive MUST contain frame files under:

- `frames/frame-000001.<ext>`
- `frames/frame-000002.<ext>`
- ...

Where `<ext>` is derived from emitted frame encoding (`png`, `jpg`, `tiff`, etc.).

When non-frame content extraction is configured and content is emitted, the archive SHOULD contain files under:

- `content/content-000001.<ext>`
- `content/content-000002.<ext>`
- ...

## Metadata File

`metadata.json` MUST be valid UTF-8 JSON.

- Single instance/package metadata MAY be an object.
- Multi-instance/package metadata MAY be an array of objects.

The semantic model of metadata is determined by the configured mapping.

## Manifest File

`manifest.json` MUST be valid UTF-8 JSON and MUST include:

- `version`: archive format identifier (current value: `easi-assets-zip-1.0`)
- `createdAt`: archive creation timestamp (ISO-8601 string)
- `frameCount`: total frame files included
- `contentCount`: total content files included
- `files`: array describing package files

Each `files` entry SHOULD include:

- `path`
- `kind` (`metadata`, `manifest`, `frame`, `content`)
- `size`
- format-specific fields where applicable (`mimeType`, `index`, `width`, `height`, etc.)

## Streaming Behavior

Implementations that expose `onChunk` output for asset archive writing:

- MUST emit ZIP bytes in valid order (local entries, central directory, end record)
- MAY stream file entries incrementally as frames/content are produced
- MUST finalize central directory records at end of package

If `collectOutput` is disabled, implementations MAY return bytes-written count instead of a collected `Uint8Array`.

## Builder Contract

An implementation that claims EASI asset archive support SHOULD expose:

- `toAssetArchive(options)`

and SHOULD allow options that align with `toAssets(...)` extraction controls, plus archive controls:

- metadata extraction configuration
- payload extraction configuration
- output callbacks (`onChunk`)
- output collection toggle (`collectOutput`)
- path customization (`metadataFilePath`, `manifestFilePath`, `framePath`, `contentPath`)

## Conformance Notes

A conforming implementation MUST produce archives that are readable by standard ZIP tooling.

A conforming implementation SHOULD preserve ordering deterministically:

1. frame/content files as emitted
2. metadata/manifest files before finalization
