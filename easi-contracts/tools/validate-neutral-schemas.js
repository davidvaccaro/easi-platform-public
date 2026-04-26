#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const contractsRoot = path.resolve(scriptDirectory, "..");
const schemasRoot = path.join(contractsRoot, "schemas", "neutral");
const fixturesRoot = path.join(contractsRoot, "fixtures", "neutral");
const validFixturesRoot = path.join(fixturesRoot, "valid");
const invalidFixturesRoot = path.join(fixturesRoot, "invalid");

function listSchemaFiles(rootDirectory) {
    if (fs.existsSync(rootDirectory) === false) {
        throw new Error(`Missing neutral schema directory: ${rootDirectory}`);
    }

    return fs
        .readdirSync(rootDirectory)
        .filter((name) => name.endsWith(".schema.json"))
        .sort()
        .map((name) => path.join(rootDirectory, name));
}

function readJson(filePath) {
    const text = fs.readFileSync(filePath, "utf8");
    return JSON.parse(text);
}

function listFixtureFiles(rootDirectory, schemaName) {
    const directory = path.join(rootDirectory, schemaName);
    if (fs.existsSync(directory) === false) {
        return [];
    }

    return fs
        .readdirSync(directory)
        .filter((name) => name.endsWith(".json"))
        .sort()
        .map((name) => path.join(directory, name));
}

function toSchemaName(schemaFilePath) {
    return path.basename(schemaFilePath).replace(".schema.json", "");
}

function formatErrors(errors = []) {
    if (Array.isArray(errors) === false || errors.length === 0) {
        return "unknown validation failure";
    }

    return errors
        .map((entry) => {
            const location = entry.instancePath || "/";
            const message = entry.message || "validation error";
            return `${location} ${message}`;
        })
        .join("; ");
}

function main() {
    const schemaFiles = listSchemaFiles(schemasRoot);
    const ajv = new Ajv2020({
        allErrors: true,
        strict: false,
        validateFormats: false
    });

    const validatorsByName = new Map();
    const failures = [];
    const checks = [];

    for (const schemaFilePath of schemaFiles) {
        const schema = readJson(schemaFilePath);
        const schemaName = toSchemaName(schemaFilePath);

        ajv.addSchema(schema, schema.$id || schemaName);
    }

    for (const schemaFilePath of schemaFiles) {
        const schema = readJson(schemaFilePath);
        const schemaName = toSchemaName(schemaFilePath);

        let validate = null;
        if (typeof schema.$id === "string" && schema.$id.length > 0) {
            validate = ajv.getSchema(schema.$id) || null;
        }
        if (validate == null) {
            validate = ajv.compile(schema);
        }

        validatorsByName.set(schemaName, validate);
    }

    for (const [schemaName, validate] of validatorsByName.entries()) {
        const validFixtures = listFixtureFiles(validFixturesRoot, schemaName);
        const invalidFixtures = listFixtureFiles(invalidFixturesRoot, schemaName);

        if (validFixtures.length === 0) {
            failures.push(`Missing valid fixtures for schema "${schemaName}".`);
            continue;
        }

        if (invalidFixtures.length === 0) {
            failures.push(`Missing invalid fixtures for schema "${schemaName}".`);
            continue;
        }

        for (const fixturePath of validFixtures) {
            const value = readJson(fixturePath);
            const isValid = validate(value);
            checks.push({ schemaName, fixturePath, expected: "valid", actual: isValid === true ? "valid" : "invalid" });

            if (isValid !== true) {
                failures.push(
                    `[valid] ${path.relative(contractsRoot, fixturePath)} -> ${formatErrors(validate.errors)}`
                );
            }
        }

        for (const fixturePath of invalidFixtures) {
            const value = readJson(fixturePath);
            const isValid = validate(value);
            checks.push({ schemaName, fixturePath, expected: "invalid", actual: isValid === true ? "valid" : "invalid" });

            if (isValid !== false) {
                failures.push(
                    `[invalid] ${path.relative(contractsRoot, fixturePath)} unexpectedly passed validation`
                );
            }
        }
    }

    if (failures.length > 0) {
        console.error("Neutral schema validation failed.");
        for (const failure of failures) {
            console.error(` - ${failure}`);
        }
        process.exitCode = 1;
        return;
    }

    const total = checks.length;
    const schemas = validatorsByName.size;
    console.log(`Neutral schema validation passed (${schemas} schemas, ${total} fixture checks).`);
}

try {
    main();
}
catch (error) {
    console.error("Neutral schema validation crashed.");
    console.error(error?.stack || String(error));
    process.exitCode = 1;
}
