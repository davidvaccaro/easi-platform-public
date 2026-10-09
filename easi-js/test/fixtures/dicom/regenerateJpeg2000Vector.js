// Optional macOS-only regeneration; normal tests use the pinned portable vector.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

if (process.platform !== "darwin") throw new Error("Regeneration uses macOS ImageIO through sips. The test vector itself is portable.");

const directory = fs.mkdtempSync(path.join(os.tmpdir(), "easi-invented-j2k-"));
try {
    // Hand-written uncompressed, unsigned grayscale TIFF: no EASI/image library.
    const tiff = Buffer.alloc(138);
    tiff.write("II");
    tiff.writeUInt16LE(42, 2);
    tiff.writeUInt32LE(8, 4);
    tiff.writeUInt16LE(10, 8);
    const entries = [
        [256, 4, 2], [257, 4, 2], [258, 3, 8], [259, 3, 1], [262, 3, 1],
        [273, 4, 134], [277, 3, 1], [278, 4, 2], [279, 4, 4], [284, 3, 1]
    ];
    entries.forEach(([tag, type, value], index) => {
        const offset = 10 + index * 12;
        tiff.writeUInt16LE(tag, offset);
        tiff.writeUInt16LE(type, offset + 2);
        tiff.writeUInt32LE(1, offset + 4);
        if (type === 3) tiff.writeUInt16LE(value, offset + 8);
        else tiff.writeUInt32LE(value, offset + 8);
    });
    tiff.set([0, 64, 128, 255], 134);
    const input = path.join(directory, "invented-gray.tif");
    const output = path.join(directory, "invented-gray.jp2");
    fs.writeFileSync(input, tiff);
    const result = spawnSync("sips", ["-s", "format", "public.jpeg-2000", "-s", "formatOptions", "best", input, "--out", output], { encoding: "utf8" });
    if (result.status !== 0) throw new Error(result.stderr || result.stdout || "ImageIO encoding failed.");
    const jp2 = fs.readFileSync(output);
    let codestream = null;
    for (let cursor = 0; cursor + 8 <= jp2.length;) {
        let length = jp2.readUInt32BE(cursor);
        if (length === 0) length = jp2.length - cursor;
        if (length < 8 || cursor + length > jp2.length) throw new Error("Unexpected JP2 box length.");
        if (jp2.toString("ascii", cursor + 4, cursor + 8) === "jp2c") {
            codestream = jp2.subarray(cursor + 8, cursor + length);
            break;
        }
        cursor += length;
    }
    if (!codestream) throw new Error("The encoded JP2 file contains no codestream.");
    process.stdout.write(codestream.toString("hex") + "\n");
}
finally {
    fs.rmSync(directory, { recursive: true, force: true });
}
