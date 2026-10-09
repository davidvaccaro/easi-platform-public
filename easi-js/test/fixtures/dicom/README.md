# Synthetic DICOM test fixtures

Every identifier, text value and pixel in this directory is invented. Nothing was
copied from the optional local image corpus. The public test suite generates its
DICOM inputs in memory; it needs no bundled medical image or encoder executable.

`SyntheticDicom.js` imports no production EASI implementation. It constructs
explicit and implicit VR byte headers, native samples, item/sequence delimiters,
the Part-10 preamble and file meta information independently. This preserves
reader regressions that would be hidden by using EASI's own writer as input.

```js
import { createDicomFixture, getFixtureBytes } from './SyntheticDicom.js';

const { bytes, expected } = createDicomFixture('signed-16');
const large = getFixtureBytes('multiframe', {
    rows: 256, columns: 256, frames: 32
});
```

Both helpers return fresh `Uint8Array` bytes. Expectations include the invented
identifiers, dimensions, native sample values/bytes, transfer syntax, top-level
tag IDs/counts, compressed frame bytes and known first-frame RGBA where applicable.
Use `Buffer.from(bytes)` only when a Node test specifically needs Buffer methods.

Profiles cover native 8-bit/16-bit signed and unsigned monochrome, MONOCHROME1,
interleaved/planar RGB, palette color, multiple frames, explicit little endian,
implicit little endian, explicit big endian, raw datasets, defined and undefined
nested sequences, encapsulated frames and deliberately malformed odd fragments.
Dimension/frame/display/identifier overrides are available for native and RLE
fixtures. The fixed JPEG/JPEG 2000 vectors retain their declared dimensions.

The compressed inputs are independent of EASI's encoders:

- RLE uses literal PackBits planes ordered most-significant byte first, with even
  segment lengths and no-op padding. Profiles include monochrome, 16-bit samples,
  palette color and planar RGB.
- Baseline JPEG is a hand-written T.81 DC-only 8x16 grayscale scan. Its two blocks
  decode to 64 and 192, with simple independently constructed Huffman tables.
- Lossless JPEG is a hand-written T.81 process-14, selection-1 scan. The original
  unsigned 12-bit samples are exactly `[0, 1024, 2048, 4095]`.
- JPEG 2000 is a pinned 137-byte reversible 5/3 codestream generated independently
  by macOS ImageIO from a hand-written 2x2 grayscale TIFF containing
  `[0, 64, 128, 255]`. OpenJPEG checks the original sample values in the portable
  fixture tests. Optional regeneration on macOS prints the vector without changing
  tracked files: `node test/fixtures/dicom/regenerateJpeg2000Vector.js`.

These small objects test parsing, transport, mapping and pixel handling. They are
not claims of conformance to every required module of a clinical DICOM IOD. In
particular, the Secondary Capture class on the default multiframe format fixture
is chosen to exercise transport and metadata behavior; clinical image creation
requires the appropriate SOP class and complete IOD modules.

Run the fixture checks from `easi-js`:

```bash
npm test -- --runInBand test/fixtures/dicom/SyntheticDicom.test.js
```
