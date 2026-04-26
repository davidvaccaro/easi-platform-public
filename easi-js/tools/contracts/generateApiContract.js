#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, '..', '..');
const sourceRoot = path.join(projectRoot, 'src');
const outputDirectory = path.resolve(projectRoot, '..', 'easi-contracts', 'schemas', 'implementation', 'javascript');
const outputFilePath = path.join(outputDirectory, 'easi-api.contract.json');
const schemaFileName = 'easi-api.contract.schema.json';
const schemaFilePath = path.join(outputDirectory, schemaFileName);

const args = new Set(process.argv.slice(2));
const checkMode = args.has('--check');
const writeMode = args.has('--stdout') === false;

function listFiles(rootDirectory) {
    const files = [];

    function walk(directory) {
        const entries = fs.readdirSync(directory, { withFileTypes: true });
        for (const entry of entries) {
            const absolutePath = path.join(directory, entry.name);
            if (entry.isDirectory()) {
                walk(absolutePath);
                continue;
            }
            if (entry.isFile() && entry.name.endsWith('.js')) {
                files.push(absolutePath);
            }
        }
    }

    walk(rootDirectory);
    files.sort();
    return files;
}

function normalizeLineEndings(text) {
    return String(text ?? '').replace(/\r\n/g, '\n');
}

function maskSource(source) {
    const chars = Array.from(source);
    const masked = Array.from(source);

    let index = 0;
    let state = 'code';

    while (index < chars.length) {
        const current = chars[index];
        const next = index + 1 < chars.length ? chars[index + 1] : '';

        if (state === 'code') {
            if (current === '/' && next === '/') {
                masked[index] = ' ';
                masked[index + 1] = ' ';
                index += 2;
                state = 'line-comment';
                continue;
            }

            if (current === '/' && next === '*') {
                masked[index] = ' ';
                masked[index + 1] = ' ';
                index += 2;
                state = 'block-comment';
                continue;
            }

            if (current === '\'' || current === '"' || current === '`') {
                state = current;
                masked[index] = ' ';
                index += 1;
                continue;
            }

            index += 1;
            continue;
        }

        if (state === 'line-comment') {
            if (current === '\n') {
                state = 'code';
            }
            else {
                masked[index] = ' ';
            }
            index += 1;
            continue;
        }

        if (state === 'block-comment') {
            if (current === '*' && next === '/') {
                masked[index] = ' ';
                masked[index + 1] = ' ';
                index += 2;
                state = 'code';
                continue;
            }

            if (current !== '\n') {
                masked[index] = ' ';
            }
            index += 1;
            continue;
        }

        if (state === '\'' || state === '"' || state === '`') {
            if (current === '\\') {
                masked[index] = ' ';
                if (index + 1 < chars.length && chars[index + 1] !== '\n') {
                    masked[index + 1] = ' ';
                }
                index += 2;
                continue;
            }

            if (current === state) {
                masked[index] = ' ';
                index += 1;
                state = 'code';
                continue;
            }

            if (current !== '\n') {
                masked[index] = ' ';
            }

            index += 1;
            continue;
        }

        index += 1;
    }

    return masked.join('');
}

function buildLineStarts(source) {
    const starts = [0];
    for (let index = 0; index < source.length; index++) {
        if (source[index] === '\n') {
            starts.push(index + 1);
        }
    }
    return starts;
}

function findLineNumber(lineStarts, index) {
    let low = 0;
    let high = lineStarts.length - 1;

    while (low <= high) {
        const middle = Math.floor((low + high) / 2);
        const start = lineStarts[middle];
        const nextStart = middle + 1 < lineStarts.length ? lineStarts[middle + 1] : Number.POSITIVE_INFINITY;

        if (index >= start && index < nextStart) {
            return middle + 1;
        }

        if (index < start) {
            high = middle - 1;
        }
        else {
            low = middle + 1;
        }
    }

    return lineStarts.length;
}

function collectJsDocBlocks(source) {
    const blocks = [];
    const expression = /\/\*\*[\s\S]*?\*\//g;

    let match;
    while ((match = expression.exec(source)) !== null) {
        blocks.push({
            start: match.index,
            end: match.index + match[0].length,
            text: match[0],
            parsed: parseJsDoc(match[0])
        });
    }

    return blocks;
}

function extractLeadingTypeAnnotation(value) {
    let text = String(value || '').trimStart();

    if (text.startsWith('{') === false) {
        return {
            type: null,
            rest: text
        };
    }

    let depth = 0;
    let quote = null;

    for (let index = 0; index < text.length; index++) {
        const char = text[index];

        if (quote != null) {
            if (char === '\\') {
                index += 1;
                continue;
            }

            if (char === quote) {
                quote = null;
            }

            continue;
        }

        if (char === '\'' || char === '"' || char === '`') {
            quote = char;
            continue;
        }

        if (char === '{') {
            depth += 1;
            continue;
        }

        if (char === '}') {
            depth -= 1;
            if (depth === 0) {
                return {
                    type: text.slice(1, index),
                    rest: text.slice(index + 1).trimStart()
                };
            }
            continue;
        }
    }

    return {
        type: null,
        rest: text
    };
}

function extractLeadingToken(value) {
    const text = String(value || '').trimStart();
    if (text.length === 0) {
        return null;
    }

    if (text.startsWith('[')) {
        let depth = 0;
        for (let index = 0; index < text.length; index++) {
            const char = text[index];
            if (char === '[') {
                depth += 1;
            }
            else if (char === ']') {
                depth -= 1;
                if (depth === 0) {
                    return {
                        token: text.slice(0, index + 1),
                        rest: text.slice(index + 1).trimStart()
                    };
                }
            }
        }
    }

    const match = text.match(/^(\S+)\s*(.*)$/);
    if (match == null) {
        return null;
    }

    return {
        token: match[1],
        rest: match[2] || ''
    };
}

function parseTypedNamedTag(trimmed, tagName) {
    const expression = new RegExp(`^@${tagName}\\s+`);
    if (expression.test(trimmed) === false) {
        return null;
    }

    const tagBody = trimmed.replace(expression, '');
    const typed = extractLeadingTypeAnnotation(tagBody);
    const token = extractLeadingToken(typed.rest);

    if (token == null) {
        return null;
    }

    return {
        type: normalizeType(typed.type),
        rawName: token.token,
        name: cleanParamName(token.token),
        description: normalizeSentence(token.rest)
    };
}

function parseReturnsTag(trimmed) {
    if (/^@returns?\s+/.test(trimmed) === false) {
        return null;
    }

    const tagBody = trimmed.replace(/^@returns?\s+/, '');
    const typed = extractLeadingTypeAnnotation(tagBody);

    return {
        type: normalizeType(typed.type),
        description: normalizeSentence(typed.rest)
    };
}

function parseJsDoc(block) {
    const text = String(block || '')
        .replace(/^\s*\/\*\*/, '')
        .replace(/\*\/\s*$/, '');

    const lines = text
        .split('\n')
        .map((line) => line.replace(/^\s*\*\s?/, ''));

    const descriptionLines = [];
    const params = [];
    const properties = [];
    const examples = [];
    const tags = [];

    let returns = null;
    let deprecated = null;
    let currentExample = null;

    for (let line of lines) {
        line = line.trimEnd();

        if (line.trim().length === 0) {
            if (currentExample != null) {
                currentExample.push('');
            }
            else if (descriptionLines.length > 0) {
                descriptionLines.push('');
            }
            continue;
        }

        if (line.trimStart().startsWith('@')) {
            const trimmed = line.trim();
            currentExample = null;

            const paramTag = parseTypedNamedTag(trimmed, 'param');
            if (paramTag != null) {
                const rawName = paramTag.rawName || '';
                const cleanedName = cleanParamName(rawName);
                const isOptional = rawName.startsWith('[') || /=$/.test(rawName);
                params.push({
                    name: cleanedName,
                    rawName,
                    type: paramTag.type,
                    description: paramTag.description,
                    optional: isOptional
                });
                continue;
            }

            const propertyTag = parseTypedNamedTag(trimmed, 'property');
            if (propertyTag != null) {
                const rawName = propertyTag.rawName || '';
                properties.push({
                    name: cleanParamName(rawName),
                    rawName,
                    type: propertyTag.type,
                    description: propertyTag.description,
                    optional: rawName.startsWith('[') || /=$/.test(rawName)
                });
                continue;
            }

            const returnsTag = parseReturnsTag(trimmed);
            if (returnsTag != null) {
                returns = returnsTag;
                continue;
            }

            const deprecatedMatch = trimmed.match(/^@deprecated\s*(.*)$/);
            if (deprecatedMatch) {
                deprecated = normalizeSentence(deprecatedMatch[1]);
                continue;
            }

            const exampleMatch = trimmed.match(/^@example\s*(.*)$/);
            if (exampleMatch) {
                currentExample = [];
                if (exampleMatch[1] && exampleMatch[1].trim().length > 0) {
                    currentExample.push(exampleMatch[1]);
                }
                examples.push(currentExample);
                continue;
            }

            tags.push(trimmed);
            continue;
        }

        if (currentExample != null) {
            currentExample.push(line);
            continue;
        }

        descriptionLines.push(line);
    }

    const description = normalizeDescription(descriptionLines);

    return {
        description,
        params,
        properties,
        returns,
        deprecated,
        examples: examples.map((exampleLines) => trimExample(exampleLines)),
        tags
    };
}

function normalizeType(value) {
    if (value == null) return null;
    const text = String(value).trim();
    return text.length > 0 ? text : null;
}

function normalizeSentence(value) {
    const text = String(value || '').trim();
    return text.length > 0 ? text : null;
}

function normalizeDescription(lines) {
    const cleaned = [];

    for (const line of lines) {
        const trimmed = String(line ?? '').trim();
        if (trimmed.length === 0) {
            if (cleaned.length > 0 && cleaned[cleaned.length - 1] !== '') {
                cleaned.push('');
            }
        }
        else {
            cleaned.push(trimmed);
        }
    }

    while (cleaned.length > 0 && cleaned[cleaned.length - 1] === '') {
        cleaned.pop();
    }

    if (cleaned.length === 0) {
        return null;
    }

    return cleaned.join('\n');
}

function trimExample(lines) {
    const value = lines.join('\n').replace(/\s+$/g, '');
    return value.length > 0 ? value : null;
}

function cleanParamName(rawName) {
    let name = String(rawName || '').trim();

    if (name.startsWith('[') && name.endsWith(']')) {
        name = name.slice(1, -1).trim();
    }

    const equalsIndex = name.indexOf('=');
    if (equalsIndex >= 0) {
        name = name.slice(0, equalsIndex).trim();
    }

    if (name.startsWith('...')) {
        name = name.slice(3).trim();
    }

    return name;
}

function findNearestJsDoc(blocks, targetStart, source) {
    let chosen = null;

    for (const block of blocks) {
        if (block.end > targetStart) {
            break;
        }

        const between = source.slice(block.end, targetStart);
        if (/^[\s;]*$/.test(between)) {
            chosen = block;
        }
    }

    return chosen != null ? chosen.parsed : null;
}

function buildBraceDepth(maskedSource) {
    const depths = new Array(maskedSource.length);
    let depth = 0;

    for (let index = 0; index < maskedSource.length; index++) {
        depths[index] = depth;
        const char = maskedSource[index];
        if (char === '{') {
            depth += 1;
        }
        else if (char === '}') {
            depth = Math.max(0, depth - 1);
        }
    }

    return depths;
}

function findMatchingBrace(maskedSource, openBraceIndex) {
    let depth = 0;

    for (let index = openBraceIndex; index < maskedSource.length; index++) {
        const char = maskedSource[index];
        if (char === '{') {
            depth += 1;
        }
        else if (char === '}') {
            depth -= 1;
            if (depth === 0) {
                return index;
            }
        }
    }

    return -1;
}

function skipWhitespace(maskedSource, fromIndex, toIndex) {
    let index = fromIndex;
    while (index < toIndex && /\s/.test(maskedSource[index])) {
        index += 1;
    }
    return index;
}

function splitParameterList(value) {
    const text = String(value || '').trim();
    if (text.length === 0) {
        return [];
    }

    const parts = [];
    let current = '';

    let parenDepth = 0;
    let bracketDepth = 0;
    let braceDepth = 0;

    for (let index = 0; index < text.length; index++) {
        const char = text[index];

        if (char === '(') parenDepth += 1;
        if (char === ')') parenDepth = Math.max(0, parenDepth - 1);

        if (char === '[') bracketDepth += 1;
        if (char === ']') bracketDepth = Math.max(0, bracketDepth - 1);

        if (char === '{') braceDepth += 1;
        if (char === '}') braceDepth = Math.max(0, braceDepth - 1);

        if (char === ',' && parenDepth === 0 && bracketDepth === 0 && braceDepth === 0) {
            const token = current.trim();
            if (token.length > 0) {
                parts.push(token);
            }
            current = '';
            continue;
        }

        current += char;
    }

    const tail = current.trim();
    if (tail.length > 0) {
        parts.push(tail);
    }

    return parts;
}

function splitTopLevel(value, token) {
    const text = String(value || '');

    let parenDepth = 0;
    let bracketDepth = 0;
    let braceDepth = 0;

    for (let index = 0; index < text.length; index++) {
        const char = text[index];

        if (char === '(') parenDepth += 1;
        if (char === ')') parenDepth = Math.max(0, parenDepth - 1);

        if (char === '[') bracketDepth += 1;
        if (char === ']') bracketDepth = Math.max(0, bracketDepth - 1);

        if (char === '{') braceDepth += 1;
        if (char === '}') braceDepth = Math.max(0, braceDepth - 1);

        if (
            char === token
            && parenDepth === 0
            && bracketDepth === 0
            && braceDepth === 0
        ) {
            return {
                left: text.slice(0, index),
                right: text.slice(index + 1)
            };
        }
    }

    return null;
}

function parseParameterToken(token, index) {
    let text = String(token || '').trim();
    if (text.length === 0) {
        return null;
    }

    let isRest = false;
    if (text.startsWith('...')) {
        isRest = true;
        text = text.slice(3).trim();
    }

    const assignment = splitTopLevel(text, '=');
    const namePart = assignment != null ? assignment.left.trim() : text;
    const defaultValue = assignment != null ? assignment.right.trim() : null;

    const identifierMatch = namePart.match(/^[A-Za-z_$][A-Za-z0-9_$]*$/);
    const name = identifierMatch != null ? identifierMatch[0] : `param${index + 1}`;

    return {
        name,
        raw: token.trim(),
        signature: namePart,
        defaultValue,
        optional: assignment != null,
        rest: isRest,
        destructured: identifierMatch == null,
        type: null,
        description: null
    };
}

function mergeParameters(signatureParameters, docParameters) {
    const docsByName = new Map();
    for (const param of docParameters || []) {
        docsByName.set(cleanParamName(param.name), param);
    }

    const merged = [];

    for (let index = 0; index < signatureParameters.length; index++) {
        const parameter = { ...signatureParameters[index] };
        const byName = docsByName.get(parameter.name);
        const byIndex = (docParameters || [])[index] || null;
        const doc = byName || byIndex;

        if (doc != null) {
            parameter.type = doc.type || null;
            parameter.description = doc.description || null;
            parameter.optional = parameter.optional || doc.optional === true;
        }

        merged.push(parameter);
    }

    if ((docParameters || []).length > signatureParameters.length) {
        for (let index = signatureParameters.length; index < (docParameters || []).length; index++) {
            const extra = docParameters[index];
            merged.push({
                name: cleanParamName(extra.name) || `param${index + 1}`,
                raw: extra.rawName || extra.name,
                signature: cleanParamName(extra.name),
                defaultValue: null,
                optional: extra.optional === true,
                rest: false,
                destructured: false,
                type: extra.type || null,
                description: extra.description || null,
                documentedOnly: true
            });
        }
    }

    return merged;
}

function inferReturnType(returnsDoc) {
    if (returnsDoc == null) {
        return null;
    }

    return {
        type: returnsDoc.type || null,
        description: returnsDoc.description || null
    };
}

function parseClassMembers(source, maskedSource, classBodyStart, classBodyEnd, jsDocBlocks, lineStarts) {
    const members = [];
    const constructorProperties = [];

    let cursor = classBodyStart + 1;

    while (cursor < classBodyEnd) {
        cursor = skipWhitespace(maskedSource, cursor, classBodyEnd);
        if (cursor >= classBodyEnd) break;

        const char = maskedSource[cursor];
        if (char === ';') {
            cursor += 1;
            continue;
        }

        const memberStart = cursor;

        let parenDepth = 0;
        let bracketDepth = 0;
        let braceDepth = 0;

        let headerEnd = cursor;
        let terminator = null;

        while (headerEnd < classBodyEnd) {
            const current = maskedSource[headerEnd];

            if (current === '(') parenDepth += 1;
            if (current === ')') parenDepth = Math.max(0, parenDepth - 1);

            if (current === '[') bracketDepth += 1;
            if (current === ']') bracketDepth = Math.max(0, bracketDepth - 1);

            if (current === '{') {
                if (parenDepth === 0 && bracketDepth === 0 && braceDepth === 0) {
                    terminator = '{';
                    break;
                }
                braceDepth += 1;
            }
            else if (current === '}') {
                braceDepth = Math.max(0, braceDepth - 1);
            }
            else if (current === ';' && parenDepth === 0 && bracketDepth === 0 && braceDepth === 0) {
                terminator = ';';
                break;
            }

            headerEnd += 1;
        }

        if (terminator == null) {
            break;
        }

        const headerText = source.slice(memberStart, headerEnd).trim();

        let memberBodyStart = null;
        let memberBodyEnd = null;

        if (terminator === '{') {
            memberBodyStart = headerEnd;
            memberBodyEnd = findMatchingBrace(maskedSource, memberBodyStart);
            if (memberBodyEnd < 0) {
                break;
            }
            cursor = memberBodyEnd + 1;
        }
        else {
            cursor = headerEnd + 1;
        }

        if (headerText.length === 0) {
            continue;
        }

        if (/^static\s*\{/.test(headerText)) {
            continue;
        }

        const headerMatch = headerText.match(/^(?:(static)\s+)?(?:(async)\s+)?(?:(get|set)\s+)?([A-Za-z_$][A-Za-z0-9_$]*)\s*\(([^)]*)\)$/);
        if (headerMatch == null) {
            continue;
        }

        const isStatic = headerMatch[1] != null;
        const isAsync = headerMatch[2] != null;
        const accessorType = headerMatch[3] || null;
        const memberName = headerMatch[4];
        const signatureParameters = splitParameterList(headerMatch[5]).map(parseParameterToken).filter(Boolean);

        const jsDoc = findNearestJsDoc(jsDocBlocks, memberStart, source);
        const mergedParameters = mergeParameters(signatureParameters, jsDoc?.params || []);

        let kind = 'method';
        if (memberName === 'constructor') {
            kind = 'constructor';
        }
        else if (accessorType === 'get') {
            kind = 'getter';
        }
        else if (accessorType === 'set') {
            kind = 'setter';
        }

        const memberLine = findLineNumber(lineStarts, memberStart);

        members.push({
            name: memberName,
            kind,
            static: isStatic,
            async: isAsync,
            accessor: accessorType,
            line: memberLine,
            description: jsDoc?.description || null,
            deprecated: jsDoc?.deprecated || null,
            parameters: mergedParameters,
            returns: inferReturnType(jsDoc?.returns),
            examples: jsDoc?.examples?.filter(Boolean) || []
        });

        if (memberName === 'constructor' && memberBodyStart != null && memberBodyEnd != null) {
            const constructorSource = source.slice(memberBodyStart + 1, memberBodyEnd);
            const propertyExpression = /this\.([A-Za-z_$][A-Za-z0-9_$]*)\s*=/g;
            let propertyMatch;
            while ((propertyMatch = propertyExpression.exec(constructorSource)) != null) {
                constructorProperties.push(propertyMatch[1]);
            }
        }
    }

    const uniqueProperties = Array.from(new Set(constructorProperties)).sort();

    return {
        members,
        constructorProperties: uniqueProperties
    };
}

function inferModuleCategory(relativePath) {
    const parts = relativePath.split('/');
    if (parts.length >= 2) {
        return parts[1];
    }
    return 'root';
}

function findExpressionEnd(maskedSource, fromIndex) {
    let parenDepth = 0;
    let bracketDepth = 0;
    let braceDepth = 0;

    for (let index = fromIndex; index < maskedSource.length; index++) {
        const char = maskedSource[index];

        if (char === '(') parenDepth += 1;
        if (char === ')') parenDepth = Math.max(0, parenDepth - 1);

        if (char === '[') bracketDepth += 1;
        if (char === ']') bracketDepth = Math.max(0, bracketDepth - 1);

        if (char === '{') braceDepth += 1;
        if (char === '}') braceDepth = Math.max(0, braceDepth - 1);

        if (char === ';' && parenDepth === 0 && bracketDepth === 0 && braceDepth === 0) {
            return index;
        }
    }

    return maskedSource.length;
}

function splitTopLevelComma(value) {
    const text = String(value || '').trim();
    if (text.length === 0) {
        return [];
    }

    const tokens = [];
    let current = '';

    let parenDepth = 0;
    let bracketDepth = 0;
    let braceDepth = 0;

    for (let index = 0; index < text.length; index++) {
        const char = text[index];

        if (char === '(') parenDepth += 1;
        if (char === ')') parenDepth = Math.max(0, parenDepth - 1);

        if (char === '[') bracketDepth += 1;
        if (char === ']') bracketDepth = Math.max(0, bracketDepth - 1);

        if (char === '{') braceDepth += 1;
        if (char === '}') braceDepth = Math.max(0, braceDepth - 1);

        if (
            char === ','
            && parenDepth === 0
            && bracketDepth === 0
            && braceDepth === 0
        ) {
            const token = current.trim();
            if (token.length > 0) {
                tokens.push(token);
            }
            current = '';
            continue;
        }

        current += char;
    }

    const tail = current.trim();
    if (tail.length > 0) {
        tokens.push(tail);
    }

    return tokens;
}

function parseObjectKeys(initializer) {
    const trimmed = String(initializer || '').trim();
    if (trimmed.startsWith('{') === false || trimmed.endsWith('}') === false) {
        return [];
    }

    const body = trimmed.slice(1, -1);
    const entries = splitTopLevelComma(body);

    const keys = [];

    for (const entry of entries) {
        if (entry.startsWith('...')) {
            continue;
        }

        const keyValue = splitTopLevel(entry, ':');
        const keySegment = keyValue != null ? keyValue.left.trim() : entry.trim();

        let key = null;

        let match = keySegment.match(/^['"]([^'"]+)['"]$/);
        if (match != null) {
            key = match[1];
        }

        if (key == null) {
            match = keySegment.match(/^([A-Za-z_$][A-Za-z0-9_$]*)$/);
            if (match != null) {
                key = match[1];
            }
        }

        if (key == null) {
            match = keySegment.match(/^([0-9]+)$/);
            if (match != null) {
                key = match[1];
            }
        }

        if (key == null) {
            match = keySegment.match(/^\[(.+)\]$/);
            if (match != null) {
                key = `[${match[1].trim()}]`;
            }
        }

        if (key == null) {
            key = keySegment;
        }

        if (key.length > 0) {
            keys.push(key);
        }
    }

    return keys;
}

function classifyInitializer(initializer) {
    const text = String(initializer || '').trim();

    if (text.length === 0) {
        return { kind: 'unknown', summary: null };
    }

    if (text.startsWith('{') && text.endsWith('}')) {
        const keys = parseObjectKeys(text);
        return {
            kind: 'object',
            summary: {
                keyCount: keys.length,
                keys
            }
        };
    }

    if (text.startsWith('[') && text.endsWith(']')) {
        const elements = splitTopLevelComma(text.slice(1, -1));
        return {
            kind: 'array',
            summary: {
                length: elements.length
            }
        };
    }

    if (text.startsWith('new Map(')) {
        return {
            kind: 'map',
            summary: null
        };
    }

    if (text.startsWith('new Set(')) {
        return {
            kind: 'set',
            summary: null
        };
    }

    if (/^['"`]/.test(text)) {
        return {
            kind: 'string',
            summary: {
                valuePreview: text.slice(0, 128)
            }
        };
    }

    if (/^(true|false)$/.test(text)) {
        return { kind: 'boolean', summary: { value: text === 'true' } };
    }

    if (/^(null|undefined)$/.test(text)) {
        return { kind: text, summary: null };
    }

    if (/^-?\d+(?:\.\d+)?$/.test(text)) {
        return { kind: 'number', summary: { value: Number(text) } };
    }

    return {
        kind: 'expression',
        summary: {
            expressionPreview: text.slice(0, 256)
        }
    };
}

function extractModuleContract(filePath) {
    const relativePath = path.relative(projectRoot, filePath).replaceAll(path.sep, '/');
    const source = normalizeLineEndings(fs.readFileSync(filePath, 'utf8'));
    const masked = maskSource(source);
    const lineStarts = buildLineStarts(source);
    const jsDocBlocks = collectJsDocBlocks(source);
    const braceDepth = buildBraceDepth(masked);

    const classes = [];
    const functions = [];
    const constants = [];
    const exports = [];
    const diagnostics = [];

    const classExpression = /\b(export\s+)?(default\s+)?class\s+([A-Za-z_$][A-Za-z0-9_$]*)(?:\s+extends\s+([^\{]+))?\s*\{/g;
    let classMatch;

    while ((classMatch = classExpression.exec(masked)) != null) {
        const full = classMatch[0];
        const classKeywordOffset = full.indexOf('class');
        const classStart = classMatch.index + classKeywordOffset;

        if (braceDepth[classStart] !== 0) {
            continue;
        }

        const className = classMatch[3];
        const extendsName = classMatch[4] != null ? classMatch[4].trim() : null;

        const openBraceIndex = classMatch.index + full.lastIndexOf('{');
        const closeBraceIndex = findMatchingBrace(masked, openBraceIndex);
        if (closeBraceIndex < 0) {
            diagnostics.push({
                severity: 'warning',
                code: 'unmatched-class-brace',
                message: `Unable to parse class body for '${className}'.`
            });
            continue;
        }

        const jsDoc = findNearestJsDoc(jsDocBlocks, classMatch.index, source);
        const parsedMembers = parseClassMembers(source, masked, openBraceIndex, closeBraceIndex, jsDocBlocks, lineStarts);

        const propertyDocs = (jsDoc?.properties || []).map((property) => ({
            name: property.name,
            optional: property.optional === true,
            type: property.type || null,
            description: property.description || null
        }));

        for (const propertyName of parsedMembers.constructorProperties) {
            const existing = propertyDocs.find((property) => property.name === propertyName);
            if (existing == null) {
                propertyDocs.push({
                    name: propertyName,
                    optional: false,
                    type: null,
                    description: null
                });
            }
        }

        propertyDocs.sort((left, right) => left.name.localeCompare(right.name));

        const classLine = findLineNumber(lineStarts, classStart);

        const classContract = {
            id: `${relativePath}:${className}`,
            name: className,
            line: classLine,
            exported: classMatch[1] != null,
            defaultExport: classMatch[2] != null,
            extends: extendsName,
            description: jsDoc?.description || null,
            deprecated: jsDoc?.deprecated || null,
            examples: jsDoc?.examples?.filter(Boolean) || [],
            properties: propertyDocs,
            members: parsedMembers.members,
            constants: parsedMembers.members
                .filter((member) => member.static === true && (member.kind === 'getter' || member.kind === 'method'))
                .map((member) => ({
                    name: member.name,
                    fromMemberKind: member.kind,
                    line: member.line,
                    description: member.description || null,
                    returnType: member.returns?.type || null
                }))
        };

        classes.push(classContract);

        if (classContract.exported) {
            exports.push({
                exportName: classContract.defaultExport ? 'default' : classContract.name,
                symbolKind: 'class',
                symbolName: classContract.name,
                default: classContract.defaultExport
            });
        }
    }

    const functionExpression = /\bexport\s+(default\s+)?(async\s+)?function\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*\(([^)]*)\)\s*\{/g;
    let functionMatch;

    while ((functionMatch = functionExpression.exec(masked)) != null) {
        const functionStart = functionMatch.index;
        if (braceDepth[functionStart] !== 0) {
            continue;
        }

        const functionName = functionMatch[3];
        const parameters = splitParameterList(functionMatch[4]).map(parseParameterToken).filter(Boolean);

        const jsDoc = findNearestJsDoc(jsDocBlocks, functionStart, source);
        const mergedParameters = mergeParameters(parameters, jsDoc?.params || []);

        const functionContract = {
            id: `${relativePath}:${functionName}`,
            name: functionName,
            line: findLineNumber(lineStarts, functionStart),
            exported: true,
            defaultExport: functionMatch[1] != null,
            async: functionMatch[2] != null,
            description: jsDoc?.description || null,
            deprecated: jsDoc?.deprecated || null,
            examples: jsDoc?.examples?.filter(Boolean) || [],
            parameters: mergedParameters,
            returns: inferReturnType(jsDoc?.returns)
        };

        functions.push(functionContract);
        exports.push({
            exportName: functionContract.defaultExport ? 'default' : functionContract.name,
            symbolKind: 'function',
            symbolName: functionContract.name,
            default: functionContract.defaultExport
        });
    }

    const variableExpression = /\bexport\s+(const|let|var)\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*=/g;
    let variableMatch;

    while ((variableMatch = variableExpression.exec(masked)) != null) {
        const variableStart = variableMatch.index;
        if (braceDepth[variableStart] !== 0) {
            continue;
        }

        const declarationKind = variableMatch[1];
        const variableName = variableMatch[2];
        const equalsIndex = masked.indexOf('=', variableMatch.index);

        if (equalsIndex < 0) {
            continue;
        }

        const valueStart = equalsIndex + 1;
        const valueEnd = findExpressionEnd(masked, valueStart);

        const initializer = source.slice(valueStart, valueEnd).trim();
        const jsDoc = findNearestJsDoc(jsDocBlocks, variableStart, source);

        const initializerClassification = classifyInitializer(initializer);

        constants.push({
            id: `${relativePath}:${variableName}`,
            name: variableName,
            line: findLineNumber(lineStarts, variableStart),
            declarationKind,
            exported: true,
            description: jsDoc?.description || null,
            deprecated: jsDoc?.deprecated || null,
            examples: jsDoc?.examples?.filter(Boolean) || [],
            initializerKind: initializerClassification.kind,
            initializerSummary: initializerClassification.summary
        });

        exports.push({
            exportName: variableName,
            symbolKind: 'constant',
            symbolName: variableName,
            default: false
        });
    }

    classes.sort((left, right) => left.line - right.line || left.name.localeCompare(right.name));
    functions.sort((left, right) => left.line - right.line || left.name.localeCompare(right.name));
    constants.sort((left, right) => left.line - right.line || left.name.localeCompare(right.name));
    exports.sort((left, right) => left.exportName.localeCompare(right.exportName));

    return {
        path: relativePath,
        category: inferModuleCategory(relativePath),
        summary: findNearestJsDoc(jsDocBlocks, 0, source)?.description || null,
        exports,
        classes,
        functions,
        constants,
        diagnostics
    };
}

function computeHash(value) {
    return crypto.createHash('sha256').update(value).digest('hex');
}

function createContractDocument(modules) {
    const packageJsonPath = path.join(projectRoot, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

    let classCount = 0;
    let methodCount = 0;
    let functionCount = 0;
    let constantCount = 0;
    let exportCount = 0;

    for (const module of modules) {
        classCount += module.classes.length;
        functionCount += module.functions.length;
        constantCount += module.constants.length;
        exportCount += module.exports.length;
        for (const classContract of module.classes) {
            methodCount += classContract.members.length;
        }
    }

    const document = {
        $schema: `./${schemaFileName}`,
        schemaVersion: '1.0.0',
        generatedAt: new Date().toISOString(),
        generator: {
            name: 'easi-js/tools/contracts/generateApiContract.js',
            mode: 'write'
        },
        package: {
            name: packageJson.name,
            version: packageJson.version,
            description: packageJson.description
        },
        source: {
            root: 'src',
            moduleCount: modules.length
        },
        metrics: {
            exportCount,
            classCount,
            methodCount,
            functionCount,
            constantCount
        },
        modules
    };

    const serialized = `${JSON.stringify(document, null, 2)}\n`;

    return {
        document,
        serialized,
        hash: computeHash(serialized)
    };
}

function cloneForComparison(value) {
    return JSON.parse(JSON.stringify(value));
}

function normalizeForComparison(document) {
    const copy = cloneForComparison(document);
    if (copy != null && typeof copy === 'object') {
        copy.generatedAt = null;
        if (copy.generator != null && typeof copy.generator === 'object') {
            copy.generator.mode = 'write';
        }
    }
    return copy;
}

function ensureOutputDirectory() {
    if (fs.existsSync(outputDirectory) === false) {
        fs.mkdirSync(outputDirectory, { recursive: true });
    }
}

function main() {
    const sourceFiles = listFiles(sourceRoot);
    const modules = sourceFiles.map(extractModuleContract);

    const normalizedModules = modules
        .filter((module) => module.exports.length > 0)
        .sort((left, right) => left.path.localeCompare(right.path));

    const contract = createContractDocument(normalizedModules);

    if (args.has('--stdout')) {
        process.stdout.write(contract.serialized);
    }

    ensureOutputDirectory();

    if (checkMode) {
        if (fs.existsSync(outputFilePath) === false) {
            console.error(`API contract is missing: ${outputFilePath}`);
            process.exit(1);
        }

        const existing = JSON.parse(normalizeLineEndings(fs.readFileSync(outputFilePath, 'utf8')));
        const next = contract.document;

        const normalizedExisting = normalizeForComparison(existing);
        const normalizedNext = normalizeForComparison(next);

        const existingHash = computeHash(`${JSON.stringify(normalizedExisting, null, 2)}\n`);
        const nextHash = computeHash(`${JSON.stringify(normalizedNext, null, 2)}\n`);

        if (existingHash !== nextHash) {
            console.error('API contract is out of sync.');
            console.error('Run: npm run docs:api-contract');
            process.exit(1);
        }

        console.log('API contract is in sync.');
        process.exit(0);
    }

    if (writeMode) {
        fs.writeFileSync(outputFilePath, contract.serialized, 'utf8');
        console.log(`Wrote API contract to ${outputFilePath}`);
    }
}

main();
