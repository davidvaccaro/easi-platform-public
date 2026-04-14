import PipelineBuilder from '../../src/builders/PipelineBuilder.js';

const path = require('path');
const fs = require('fs');
const os = require('os');

function createTempFolder() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'easi-mixed-folder-routing-'));
}

function removeFolder(folderPath) {
  if (fs.existsSync(folderPath)) {
    fs.rmSync(folderPath, { recursive: true, force: true });
  }
}

function resolveRepoRoot() {
  const cwd = process.cwd();
  if (path.basename(cwd) === 'easi-js') {
    return path.resolve(cwd, '..');
  }
  if (fs.existsSync(path.join(cwd, 'easi-js'))) {
    return cwd;
  }
  return path.resolve(cwd, '..');
}

test('Test: mixed folder pipeline routes DICOM and image files using whenDicom/whenImage', async () => {

  const repoRoot = resolveRepoRoot();
  const fixturePath = path.join(repoRoot, 'data', 'dicoms', '0002.DCM');
  const tempFolder = createTempFolder();

  fs.copyFileSync(fixturePath, path.join(tempFolder, 'fixture.dcm'));
  fs.writeFileSync(path.join(tempFolder, 'frame.jpg'), Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46]));

  try {

    const pipeline = new PipelineBuilder().
    fromFolderStream().
    ofMixedImagingData().
    withRouting((route) => route.
    whenDicom((branch) => branch.ofDicomData().toInstances()).
    whenImage((branch) => branch.ofImageData().toImageData())).
    build();

    const result = await pipeline.process(tempFolder, null, {
      sourceOptions: {
        extensions: ['.dcm', '.jpg'],
        recursive: false,
        sort: 'name'
      }
    });

    expect(result.count).toBe(2);

    const routed = result.toArray();

    const dicomRoute = routed.find((item) => item.route === 'dicom');
    expect(dicomRoute).toBeDefined();
    expect(dicomRoute.output).toBeDefined();
    expect(dicomRoute.output.dataSet != null).toBe(true);

    const imageRoute = routed.find((item) => item.route === 'image');
    expect(imageRoute).toBeDefined();
    expect(imageRoute.output).toBeDefined();
    expect(imageRoute.output.kind).toBe('image');
    expect(imageRoute.output.format).toBe('jpeg');

  }
  finally {
    removeFolder(tempFolder);
  }

});
