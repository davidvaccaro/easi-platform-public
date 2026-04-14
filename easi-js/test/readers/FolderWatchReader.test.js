import FolderWatchReader from "../../src/readers/FolderWatchReader.js";
import { Status } from "../../src/parsers/Status.js";

const path = require("path");
const os = require("os");
const fs = require("fs");

function createTempFolder() {
    return fs.mkdtempSync(path.join(os.tmpdir(), "easi-folder-watch-reader-"));
}

function removeFolder(folderPath) {
    if (fs.existsSync(folderPath)) {
        fs.rmSync(folderPath, { recursive: true, force: true });
    }
}

test("Test: FolderWatchReader can emit existing files on start when configured", async () => {

    const root = createTempFolder();
    fs.writeFileSync(path.join(root, "existing.dcm"), Buffer.from([1, 2, 3, 4]));

    try {

        const reader = new FolderWatchReader();
        const parser = {
            result: null,
            error: null,
            reset: jest.fn(),
            parse: jest.fn(async (_value, done, _totalRead, _totalLength, contentType) => {
                if (done === true) {
                    parser.result = {
                        sourcePath: contentType?.sourcePath ?? null
                    };
                    return Status.SUCCESS;
                }
                return Status.CONTINUE;
            })
        };

        reader.parser = parser;
        await reader.start(root, {
            extensions: [".dcm"],
            processExistingOnStart: true,
            settleMs: 10,
            stableChecks: 1,
            reconcileIntervalMs: 0
        });

        const result = await reader.read();
        expect(path.basename(result.sourcePath)).toBe("existing.dcm");

        await reader.stop();

    }
    finally {
        removeFolder(root);
    }

});

test("Test: FolderWatchReader detects newly added files after start", async () => {

    const root = createTempFolder();

    try {

        const reader = new FolderWatchReader();
        const parser = {
            result: null,
            error: null,
            reset: jest.fn(),
            parse: jest.fn(async (_value, done, _totalRead, _totalLength, contentType) => {
                if (done === true) {
                    parser.result = {
                        sourcePath: contentType?.sourcePath ?? null
                    };
                    return Status.SUCCESS;
                }
                return Status.CONTINUE;
            })
        };

        reader.parser = parser;
        await reader.start(root, {
            extensions: [".dcm"],
            processExistingOnStart: false,
            settleMs: 15,
            stableChecks: 1,
            reconcileIntervalMs: 25
        });

        const readPromise = reader.read();

        await new Promise((resolve) => setTimeout(resolve, 50));
        fs.writeFileSync(path.join(root, "new.dcm"), Buffer.from([5, 6, 7, 8]));

        const result = await readPromise;
        expect(path.basename(result.sourcePath)).toBe("new.dcm");

        await reader.stop();

    }
    finally {
        removeFolder(root);
    }

});
