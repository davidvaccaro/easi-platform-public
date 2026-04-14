import PipelineBuilder from "../../src/builders/PipelineBuilder.js";

const path = require("path");
const os = require("os");
const fs = require("fs");

function createTempFolder() {
    return fs.mkdtempSync(path.join(os.tmpdir(), "easi-folder-watch-pipeline-"));
}

function removeFolder(folderPath) {
    if (fs.existsSync(folderPath)) {
        fs.rmSync(folderPath, { recursive: true, force: true });
    }
}

test("Test: pipeline.start processes newly added folder-watch image file", async () => {

    const root = createTempFolder();

    try {

        const pipeline = new PipelineBuilder().
        fromFolderWatchStream(root, {
            extensions: [".jpg"],
            processExistingOnStart: false,
            settleMs: 15,
            stableChecks: 1,
            reconcileIntervalMs: 25
        }).
        ofImageData().
        toImageData().
        build();

        var observed = null;

        const run = pipeline.start({
            maxIterations: 1,
            onResult: async (resultCollection) => {
                observed = resultCollection.first();
                return true;
            }
        });

        await new Promise((resolve) => setTimeout(resolve, 60));
        fs.writeFileSync(
            path.join(root, "frame.jpg"),
            Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46])
        );

        await run.done;

        expect(run.iterations).toBe(1);
        expect(observed).toBeDefined();
        expect(observed.kind).toBe("image");
        expect(observed.format).toBe("jpeg");

    }
    finally {
        removeFolder(root);
    }

});
