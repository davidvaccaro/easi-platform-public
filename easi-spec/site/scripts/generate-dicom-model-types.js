#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const repoRoot = process.cwd();
const siteRoot = path.join(repoRoot, 'easi-spec', 'site');
const dicomModelDir = path.join(siteRoot, 'dicom-model');
const sourceRoot = path.join(repoRoot, 'easi-js', 'src', 'dicom');
let TYPE_SLUG_BY_NAME = new Map();

const DOMAIN_ORDER = { Core: 0, Entities: 1, Modules: 2 };
const EXCLUDED_TYPE_NAMES = new Set([
  'DocumentWrapper',
  'DocumentUnwrapper'
]);

const NAV_HTML = `
            <div class="nav-section">
                <a class="nav-link" data-nav-link href="../index.html">Overview</a>
                <a class="nav-link" data-nav-link href="../what-is-an-easi-pipeline.html">What Is an EASI Pipeline?</a>
                <a class="nav-link" data-nav-link href="../core-pipeline.html">Core Pipeline Model</a>
                <a class="nav-link" data-nav-link href="../dimse-pipeline.html">DIMSE Pipeline Model</a>
                <a class="nav-link" data-nav-link href="../advanced-pipeline.html">Advanced Pipeline Use Cases</a>
                <a class="nav-link" data-nav-link href="../stream-processing-model.html">Stream Processing Model</a>
                <a class="nav-link" data-nav-link href="../lifecycle-status.html">Stream Lifecycle</a>
                <a class="nav-link" data-nav-link href="../materialization-model.html">Materialization Model</a>
                <a class="nav-link" data-nav-link href="../conformance.html">Conformance</a>
                <a class="nav-link" data-nav-link href="../dicom-profile-index.html">Profile Index</a>
                <a class="nav-link" data-nav-link href="index.html">Model Types</a>
                <a class="nav-link" data-nav-link href="diagram.html">Type Diagram</a>
                <a class="nav-link" data-nav-link href="../error-catalog.html">Error Catalog</a>
                <a class="nav-link" data-nav-link href="../implementation-boundary.html">Standard Boundary</a>
            </div>`;

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function decodeHtml(value) {
  return String(value)
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&reg;/g, '®')
    .replace(/&trade;/g, '™');
}

function encodeTrademark(text) {
  return String(text)
    .replace(/DICOMweb™/g, 'DICOMweb&trade;')
    .replace(/FHIR®/g, 'FHIR&reg;')
    .replace(/HL7®/g, 'HL7&reg;')
    .replace(/DICOM®/g, 'DICOM&reg;');
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function splitCamel(name) {
  return String(name)
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .trim();
}

function slugFromName(name) {
  return String(name)
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .toLowerCase();
}

function kindToTypeKind(kind) {
  const map = new Map([
    ['Instance', 'Instance Type'],
    ['Static', 'Static Type'],
    ['Static Registry + Instance', 'Static Registry + Instance Type'],
    ['Utility', 'Utility Type'],
    ['Entity Accessor', 'Entity Accessor Type'],
    ['Module Accessor', 'Module Accessor Type']
  ]);
  return map.get(kind) || `${kind} Type`;
}

function categoryForType(typeName, domain) {
  if (domain === 'Entities') return 'Entity Accessor';
  if (domain === 'Modules') {
    if (typeName === 'Module') return 'Module Base';
    return 'Module Accessor';
  }

  const coreCategoryMap = {
    Attribute: 'Core Element',
    AttributeSequence: 'Container',
    AttributeSet: 'Container',
    DataElement: 'Encoding',
    DataSet: 'Container',
    EncodedData: 'Encoding',
    Instance: 'Top-Level Object',
    Item: 'Container',
    MetaSet: 'Container',
    Modality: 'Vocabulary',
    PixelData: 'Pixel Payload',
    Preamble: 'Part-10 Envelope',
    Prefix: 'Part-10 Envelope',
    SOPClass: 'Vocabulary',
    Tag: 'Vocabulary',
    TagSet: 'Container',
    TransferSyntax: 'Vocabulary',
    ValueRepresentation: 'Vocabulary'
  };

  return coreCategoryMap[typeName] || 'Core Model';
}

function defaultKindForType(typeName, domain) {
  if (domain === 'Entities') return 'Entity Accessor Type';
  if (domain === 'Modules') return 'Module Accessor Type';

  const staticSet = new Set(['Modality', 'SOPClass', 'TransferSyntax', 'ValueRepresentation']);
  if (typeName === 'Tag') return 'Static Registry + Instance Type';
  if (staticSet.has(typeName)) return 'Static Type';
  return 'Instance Type';
}

function deriveDomain(filePath) {
  const parts = filePath.split(path.sep);
  if (parts.includes('entities')) return 'Entities';
  if (parts.includes('modules')) return 'Modules';
  return 'Core';
}

function readSourceFiles() {
  const files = [];

  function walk(dir) {
    const names = fs.readdirSync(dir);
    for (const name of names) {
      const full = path.join(dir, name);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) {
        walk(full);
      } else if (stat.isFile() && name.endsWith('.js')) {
        files.push(full);
      }
    }
  }

  walk(sourceRoot);

  return files
    .filter((file) => !file.endsWith(`${path.sep}Constants.js`))
    .filter((file) => !file.endsWith(`${path.sep}Utilities.js`))
    .filter((file) => !EXCLUDED_TYPE_NAMES.has(path.basename(file, '.js')))
    .sort();
}

function extractBetween(text, startPattern, endPattern) {
  const start = text.search(startPattern);
  if (start < 0) return null;
  const from = text.slice(start);
  const end = from.search(endPattern);
  if (end < 0) return null;
  return from.slice(0, end);
}

function cleanupText(value) {
  return decodeHtml(String(value || ''))
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeSentence(text, fallback) {
  const value = String(text || '').trim();
  if (value.length === 0) return fallback;
  return value.endsWith('.') ? value : `${value}.`;
}

function parseOldPage(slug) {
  const filePath = path.join(dicomModelDir, `${slug}.html`);
  if (!fs.existsSync(filePath)) {
    return null;
  }

  const html = fs.readFileSync(filePath, 'utf8');

  const summaryMatch = html.match(/<section class="page-hero[^"]*">[\s\S]*?<h2>[^<]+<\/h2>\s*<p>([\s\S]*?)<\/p>/);
  const summary = summaryMatch ? cleanupText(summaryMatch[1]) : '';

  const metaMatch = html.match(/<p class="page-meta"><strong>[^<]+<\/strong><br>([^<]+) \/ ([^<]+)<\/p>/);
  const domain = metaMatch ? cleanupText(metaMatch[1]) : '';
  const category = metaMatch ? cleanupText(metaMatch[2]) : '';

  const classTypeMatch = html.match(/<td>Class Type<\/td>\s*<td>([^<]+)<\/td>/);
  const classType = classTypeMatch ? cleanupText(classTypeMatch[1]) : '';

  const canonicalRoleMatch = html.match(/<h3>Canonical Role<\/h3>\s*<p>([\s\S]*?)<\/p>/);
  const canonicalRole = canonicalRoleMatch ? cleanupText(canonicalRoleMatch[1]) : '';

  const pipelineExposureMatch = html.match(/<h4>Pipeline Exposure<\/h4>\s*<p>([\s\S]*?)<\/p>/);
  const pipelineExposure = pipelineExposureMatch ? cleanupText(pipelineExposureMatch[1]) : '';

  const relationBlockMatch = html.match(/<h3>Common Relationships<\/h3>\s*<p>([\s\S]*?)<\/p>/);
  const relationships = relationBlockMatch
    ? Array.from(relationBlockMatch[1].matchAll(/<code>([^<]+)<\/code>/g)).map((m) => cleanupText(m[1]))
    : [];

  const panelCodes = {};
  const panelNames = ['neutral', 'javascript', 'csharp', 'java', 'python'];
  for (const panelName of panelNames) {
    const panelRegex = new RegExp(`<div class="doc-tab-panel(?: active)?" data-tab-panel="${panelName}">([\\s\\S]*?)<\\/div>`);
    const panelMatch = html.match(panelRegex);
    if (!panelMatch) {
      panelCodes[panelName] = [];
      continue;
    }

    panelCodes[panelName] = Array.from(
      panelMatch[1].matchAll(/<pre><code[^>]*>([\s\S]*?)<\/code><\/pre>/g)
    ).map((m) => decodeHtml(m[1]).trim());
  }

  return {
    summary,
    domain,
    category,
    classType,
    canonicalRole,
    pipelineExposure,
    relationships,
    panelCodes
  };
}

function cleanParamName(rawName) {
  let name = String(rawName || '').trim();
  if (name.startsWith('[') && name.endsWith(']')) {
    name = name.slice(1, -1).trim();
  }
  if (name.includes('=')) {
    name = name.split('=')[0].trim();
  }
  name = name.replace(/^\.\.\./, '').trim();
  return name;
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
  let quote = null;
  let escaped = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (quote != null) {
      current += ch;
      if (escaped === true) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === quote) {
        quote = null;
      }
      continue;
    }

    if (ch === '\'' || ch === '"' || ch === '`') {
      quote = ch;
      current += ch;
      continue;
    }

    if (ch === '(') parenDepth += 1;
    if (ch === ')') parenDepth = Math.max(0, parenDepth - 1);
    if (ch === '[') bracketDepth += 1;
    if (ch === ']') bracketDepth = Math.max(0, bracketDepth - 1);
    if (ch === '{') braceDepth += 1;
    if (ch === '}') braceDepth = Math.max(0, braceDepth - 1);

    if (ch === ',' && parenDepth === 0 && bracketDepth === 0 && braceDepth === 0) {
      const token = current.trim();
      if (token.length > 0) {
        parts.push(token);
      }
      current = '';
      continue;
    }

    current += ch;
  }

  const tail = current.trim();
  if (tail.length > 0) {
    parts.push(tail);
  }

  return parts;
}

function splitUnionTypes(value) {
  const text = String(value || '').trim();
  if (text.length === 0) {
    return [];
  }

  const parts = [];
  let current = '';
  let parenDepth = 0;
  let bracketDepth = 0;
  let braceDepth = 0;
  let angleDepth = 0;
  let quote = null;
  let escaped = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (quote != null) {
      current += ch;
      if (escaped === true) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === quote) {
        quote = null;
      }
      continue;
    }

    if (ch === '\'' || ch === '"' || ch === '`') {
      quote = ch;
      current += ch;
      continue;
    }

    if (ch === '(') parenDepth += 1;
    if (ch === ')') parenDepth = Math.max(0, parenDepth - 1);
    if (ch === '[') bracketDepth += 1;
    if (ch === ']') bracketDepth = Math.max(0, bracketDepth - 1);
    if (ch === '{') braceDepth += 1;
    if (ch === '}') braceDepth = Math.max(0, braceDepth - 1);
    if (ch === '<') angleDepth += 1;
    if (ch === '>') angleDepth = Math.max(0, angleDepth - 1);

    if (
      ch === '|'
      && parenDepth === 0
      && bracketDepth === 0
      && braceDepth === 0
      && angleDepth === 0
    ) {
      const token = current.trim();
      if (token.length > 0) {
        parts.push(token);
      }
      current = '';
      continue;
    }

    current += ch;
  }

  const tail = current.trim();
  if (tail.length > 0) {
    parts.push(tail);
  }

  return parts;
}

function parseJSDoc(comment) {
  const lines = String(comment || '')
    .replace(/^\s*\/\*\*/, '')
    .replace(/\*\/\s*$/, '')
    .split('\n')
    .map((line) => line.replace(/^\s*\*\s?/, '').trim())
    .filter((line) => line.length > 0);

  const summaryLines = [];
  const params = [];
  let returns = null;
  const errors = [];
  let activeTag = null;

  for (const line of lines) {
    if (line.startsWith('@param')) {
      activeTag = 'param';

      const typed = line.match(/^@param\s+\{([^}]+)\}\s+(\[[^\]]+\]|[^\s]+)\s*(.*)$/);
      if (typed) {
        params.push({
          name: cleanParamName(typed[2]),
          type: typed[1].trim(),
          description: normalizeSentence(typed[3], '')
        });
        continue;
      }

      const untyped = line.match(/^@param\s+(\[[^\]]+\]|[^\s]+)\s*(.*)$/);
      if (untyped) {
        params.push({
          name: cleanParamName(untyped[1]),
          type: 'any',
          description: normalizeSentence(untyped[2], '')
        });
        continue;
      }

      continue;
    }

    if (line.startsWith('@returns') || line.startsWith('@return')) {
      activeTag = 'returns';

      const typed = line.match(/^@returns?\s+\{([^}]+)\}\s*(.*)$/);
      if (typed) {
        returns = {
          type: typed[1].trim(),
          description: normalizeSentence(typed[2], '')
        };
      } else {
        const untyped = line.match(/^@returns?\s*(.*)$/);
        returns = {
          type: 'any',
          description: normalizeSentence(untyped ? untyped[1] : '', '')
        };
      }
      continue;
    }

    if (line.startsWith('@throws') || line.startsWith('@throw')) {
      activeTag = 'throws';

      const typed = line.match(/^@throws?\s+\{([^}]+)\}\s*(.*)$/);
      if (typed) {
        errors.push({
          type: typed[1].trim(),
          description: normalizeSentence(typed[2], '')
        });
        continue;
      }

      const untyped = line.match(/^@throws?\s+([^\s]+)\s*(.*)$/);
      if (untyped) {
        errors.push({
          type: untyped[1].trim(),
          description: normalizeSentence(untyped[2], '')
        });
        continue;
      }

      errors.push({
        type: 'Error',
        description: ''
      });
      continue;
    }

    if (line.startsWith('@description')) {
      const text = line.replace(/^@description\s*/, '');
      summaryLines.push(text);
      activeTag = null;
      continue;
    }

    if (line.startsWith('@')) {
      activeTag = 'other';
      continue;
    }

    if (activeTag === 'param' && params.length > 0) {
      const last = params[params.length - 1];
      last.description = normalizeSentence(`${last.description} ${line}`.trim(), line);
      continue;
    }

    if (activeTag === 'returns' && returns != null) {
      returns.description = normalizeSentence(`${returns.description} ${line}`.trim(), line);
      continue;
    }

    if (activeTag === 'throws' && errors.length > 0) {
      const last = errors[errors.length - 1];
      last.description = normalizeSentence(`${last.description} ${line}`.trim(), line);
      continue;
    }

    summaryLines.push(line);
    activeTag = null;
  }

  const summary = normalizeSentence(summaryLines.join(' ').trim(), '');
  return {
    summary,
    params,
    returns,
    errors
  };
}

function normalizeParamLookupName(value) {
  return cleanParamName(String(value || '')).toLowerCase();
}

function mergeSignatureAndDocParams(signatureText, docParams) {
  const signatureParts = splitParameterList(signatureText);
  const normalizedDoc = Array.isArray(docParams) ? docParams : [];
  const params = [];

  for (const part of signatureParts) {
    const name = cleanParamName(part);
    const doc = normalizedDoc.find((entry) => normalizeParamLookupName(entry.name) === normalizeParamLookupName(name));
    const optionalBySignature = /^\[.*\]$/.test(part.trim()) || part.includes('=');
    const optionalByDoc = /\boptional\b/i.test(String(doc?.description || ''));

    params.push({
      name,
      type: doc?.type || 'any',
      description: normalizeSentence(doc?.description || '', 'Parameter used by this member.'),
      optional: optionalBySignature || optionalByDoc
    });
  }

  for (const entry of normalizedDoc) {
    const exists = params.some((param) => normalizeParamLookupName(param.name) === normalizeParamLookupName(entry.name));
    if (exists === false) {
      params.push({
        name: cleanParamName(entry.name),
        type: entry.type || 'any',
        description: normalizeSentence(entry.description || '', 'Parameter used by this member.'),
        optional: /\boptional\b/i.test(String(entry.description || ''))
      });
    }
  }

  return params;
}

function normalizeErrorEntries(errorEntries) {
  if (!Array.isArray(errorEntries) || errorEntries.length === 0) {
    return [];
  }

  return errorEntries.map((entry) => ({
    type: String(entry?.type || 'Error').trim() || 'Error',
    description: normalizeSentence(entry?.description || '', 'Raised when this operation cannot complete successfully.')
  }));
}

function descriptionFromName(name, kind) {
  const readable = splitCamel(name).toLowerCase();
  if (kind.includes('Accessor')) {
    return normalizeSentence(`Provides access to ${readable}`, '');
  }
  if (kind === 'Mutator') {
    return normalizeSentence(`Sets ${readable}`, '');
  }
  if (kind === 'Constructor') {
    return 'Constructs a new instance of this type.';
  }
  if (kind.includes('Method')) {
    return normalizeSentence(`Executes ${readable} behavior for this type`, '');
  }
  return normalizeSentence(`Represents ${readable}`, '');
}

function parseSourceType(filePath, typeNamesSet) {
  const text = fs.readFileSync(filePath, 'utf8');
  const lines = text.split('\n');

  const classMatch = text.match(/export\s+default\s+class\s+([A-Za-z0-9_]+)(?:\s+extends\s+([A-Za-z0-9_]+))?/);
  if (!classMatch) {
    return null;
  }

  const typeName = classMatch[1];
  const parentType = classMatch[2] || null;

  const imports = [];
  const importRegex = /^\s*import\s+([^;]+?)\s+from\s+['"]([^'"]+)['"];?\s*$/gm;
  let importMatch = null;
  while ((importMatch = importRegex.exec(text)) != null) {
    const importHead = importMatch[1].trim();
    const source = importMatch[2].trim();

    let defaultImport = null;
    if (importHead.startsWith('{')) {
      defaultImport = null;
    } else if (importHead.includes(',')) {
      defaultImport = importHead.split(',')[0].trim();
    } else {
      defaultImport = importHead;
    }

    if (!defaultImport || defaultImport === '*') {
      continue;
    }

    imports.push({
      importedName: defaultImport,
      source
    });
  }

  const members = [];
  let pendingDoc = { summary: '', params: [], returns: null, errors: [] };

  function pushMember(member) {
    members.push(member);
  }

  function clearPendingDoc() {
    pendingDoc = { summary: '', params: [], returns: null, errors: [] };
  }

  function takePendingDoc() {
    const doc = pendingDoc;
    clearPendingDoc();
    return doc;
  }

  function buildMember(name, kind, signature, signatureParams = '') {
    const doc = takePendingDoc();
    const described = (doc.summary.length > 0)
      || (doc.params.length > 0)
      || (doc.returns != null)
      || (Array.isArray(doc.errors) && doc.errors.length > 0);

    let returns = doc.returns;
    if ((returns == null) && (kind === 'Constructor')) {
      returns = {
        type: typeName,
        description: `Constructs and returns a new ${typeName} instance.`
      };
    } else if ((returns == null) && (kind === 'Mutator')) {
      returns = {
        type: 'void',
        description: 'No return value.'
      };
    } else if ((returns == null) && (kind === 'Method' || kind === 'Static Method')) {
      returns = {
        type: 'any',
        description: 'Method return value (implementation-dependent).'
      };
    } else if ((returns == null) && (kind === 'Accessor' || kind === 'Static Accessor')) {
      returns = {
        type: 'any',
        description: 'Accessor return value.'
      };
    }

    return {
      name,
      kind,
      signature,
      description: doc.summary || descriptionFromName(name, kind),
      described,
      params: mergeSignatureAndDocParams(signatureParams, doc.params),
      returns,
      errors: normalizeErrorEntries(doc.errors)
    };
  }

  const reservedNames = new Set([
    'if', 'for', 'while', 'switch', 'catch', 'function', 'return',
    'else', 'do', 'try'
  ]);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed.startsWith('/**')) {
      const block = [line];
      while (i + 1 < lines.length && lines[i].includes('*/') === false) {
        i += 1;
        block.push(lines[i]);
      }
      pendingDoc = parseJSDoc(block.join('\n'));
      continue;
    }

    let match = null;

    match = line.match(/^\s*static\s+get\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(\)\s*\{/);
    if (match) {
      pushMember(buildMember(match[1], 'Static Accessor', `static get ${match[1]}()`, ''));
      continue;
    }

    match = line.match(/^\s*get\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(\)\s*\{/);
    if (match) {
      pushMember(buildMember(match[1], 'Accessor', `get ${match[1]}()`, ''));
      continue;
    }

    match = line.match(/^\s*set\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(([^)]*)\)\s*\{/);
    if (match) {
      const params = match[2].trim();
      pushMember(buildMember(match[1], 'Mutator', `set ${match[1]}(${params})`, params));
      continue;
    }

    match = line.match(/^\s*static\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(([^)]*)\)\s*\{/);
    if (match) {
      const methodName = match[1];
      if (!reservedNames.has(methodName)) {
        const params = match[2].trim();
        pushMember(buildMember(methodName, 'Static Method', `static ${methodName}(${params})`, params));
      }
      clearPendingDoc();
      continue;
    }

    match = line.match(/^\s*constructor\s*\(([^)]*)\)\s*\{/);
    if (match) {
      const params = match[1].trim();
      pushMember(buildMember('constructor', 'Constructor', `constructor(${params})`, params));

      const constructorAssigned = new Set();
      let depth = (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
      let j = i;
      while (j + 1 < lines.length && depth > 0) {
        j += 1;
        const constructorLine = lines[j];
        depth += (constructorLine.match(/\{/g) || []).length;
        depth -= (constructorLine.match(/\}/g) || []).length;

        const assignmentMatch = constructorLine.match(/this\.([A-Za-z_][A-Za-z0-9_]*)\s*=\s*/);
        if (assignmentMatch) {
          constructorAssigned.add(assignmentMatch[1]);
        }
      }

      for (const propertyName of constructorAssigned) {
        const already = members.some((member) => member.name === propertyName && (member.kind === 'Accessor' || member.kind === 'Mutator'));
        if (!already) {
          pushMember({
            name: propertyName,
            kind: 'Property',
            signature: `${propertyName}`,
            description: descriptionFromName(propertyName, 'Property'),
            described: false,
            params: [],
            returns: {
              type: 'any',
              description: 'Property value.'
            },
            errors: []
          });
        }
      }

      i = j;
      clearPendingDoc();
      continue;
    }

    match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*\(([^)]*)\)\s*\{/);
    if (match) {
      const methodName = match[1];
      if (!reservedNames.has(methodName)) {
        const params = match[2].trim();
        pushMember(buildMember(methodName, 'Method', `${methodName}(${params})`, params));
      }
      clearPendingDoc();
      continue;
    }

    if (trimmed.length > 0 && trimmed.startsWith('//') === false) {
      clearPendingDoc();
    }
  }

  const staticAccessors = members.filter((member) => member.kind === 'Static Accessor');
  let structureMembers = members.slice();

  if (staticAccessors.length > 120) {
    const nonGenerated = members.filter((member) => member.kind !== 'Static Accessor');
    const documentedStatic = staticAccessors.filter((member) => member.described || member.name === 'DefaultDeIdentificationMask');
    const explicitStatic = staticAccessors.filter((member) => ['DefaultDeIdentificationMask'].includes(member.name));
    const kept = [];

    for (const member of documentedStatic) {
      if (kept.some((x) => x.name === member.name && x.kind === member.kind) === false) {
        kept.push(member);
      }
    }

    for (const member of explicitStatic) {
      if (kept.some((x) => x.name === member.name && x.kind === member.kind) === false) {
        kept.push(member);
      }
    }

    kept.sort((a, b) => a.name.localeCompare(b.name));

    const omitted = staticAccessors.length - kept.length;
    structureMembers = nonGenerated.concat(kept);

    structureMembers.push({
      name: '<DICOMDictionaryEntry>',
      kind: 'Static Accessor (Generated)',
      signature: 'static get <DICOMDictionaryEntry>()',
      description: `Provides dictionary-backed constant accessors. ${omitted} generated static accessors are available for direct tag/vocabulary lookup.`,
      described: true,
      params: [],
      returns: {
        type: 'any',
        description: 'Dictionary-backed type entry.'
      },
      errors: []
    });
  }

  const relationships = [];

  if (parentType && typeNamesSet.has(parentType)) {
    relationships.push({
      from: typeName,
      relation: '--|>',
      to: parentType,
      intent: 'inherits'
    });
  }

  const importedTypeSet = new Set();
  for (const imported of imports) {
    if (imported.importedName === typeName) continue;
    if (!typeNamesSet.has(imported.importedName)) continue;
    if (importedTypeSet.has(imported.importedName)) continue;
    importedTypeSet.add(imported.importedName);

    relationships.push({
      from: typeName,
      relation: '..>',
      to: imported.importedName,
      intent: 'uses'
    });
  }

  return {
    typeName,
    parentType,
    members: structureMembers,
    imports,
    relationships
  };
}

function inferVariableName(code, language) {
  const text = String(code || '');
  let matches = [];

  if (language === 'javascript') {
    matches = Array.from(text.matchAll(/\b(?:const|let|var)\s+([A-Za-z_][A-Za-z0-9_]*)\s*=/g)).map((m) => m[1]);
  } else if (language === 'csharp' || language === 'java') {
    matches = Array.from(text.matchAll(/\bvar\s+([A-Za-z_][A-Za-z0-9_]*)\s*=/g)).map((m) => m[1]);
  } else if (language === 'python' || language === 'neutral') {
    matches = Array.from(text.matchAll(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*[:]?=\s*/gm)).map((m) => m[1]);
  }

  if (matches.length > 0) {
    return matches[matches.length - 1];
  }

  return 'value';
}

function sampleTerminalForType(typeInfo) {
  if (!typeInfo) {
    return 'instances';
  }
  const domain = String(typeInfo.domain || '').trim().toLowerCase();
  if (domain === 'entities') {
    return 'entities';
  }
  return 'instances';
}

function terminalMethodForLanguage(language, terminalMode) {
  const mode = (terminalMode === 'entities') ? 'entities' : 'instances';

  if (language === 'csharp') {
    return (mode === 'entities') ? '.ToEntities()' : '.ToInstances()';
  }
  if (language === 'python') {
    return (mode === 'entities') ? '.to_entities()' : '.to_instances()';
  }
  return (mode === 'entities') ? '.toEntities()' : '.toInstances()';
}

function collectionVariableName(language, valueVariable) {
  if (language === 'python') {
    return `${valueVariable}_collection`;
  }
  return `${valueVariable}Collection`;
}

function firstResultExpression(language, collectionVariable) {
  if (language === 'csharp') {
    return `${collectionVariable}.First()`;
  }
  return `${collectionVariable}.first()`;
}

function dataSetRefForTerminal(language, terminalMode, resultRef = 'result') {
  if (terminalMode === 'entities') {
    return (language === 'python') ? `${resultRef}.attribute_set` : `${resultRef}.attributeSet`;
  }
  return (language === 'python') ? `${resultRef}.data_set` : `${resultRef}.dataSet`;
}

function metaSetRefForTerminal(language, terminalMode, resultRef = 'result') {
  if (terminalMode === 'entities') {
    return (language === 'python') ? `${resultRef}.instance.meta_set` : `${resultRef}.instance.metaSet`;
  }
  return (language === 'python') ? `${resultRef}.meta_set` : `${resultRef}.metaSet`;
}

function preambleRefForTerminal(language, terminalMode, resultRef = 'result') {
  if (terminalMode === 'entities') {
    return (language === 'python') ? `${resultRef}.instance.preamble` : `${resultRef}.instance.preamble`;
  }
  return (language === 'python') ? `${resultRef}.preamble` : `${resultRef}.preamble`;
}

function prefixRefForTerminal(language, terminalMode, resultRef = 'result') {
  if (terminalMode === 'entities') {
    return (language === 'python') ? `${resultRef}.instance.prefix` : `${resultRef}.instance.prefix`;
  }
  return (language === 'python') ? `${resultRef}.prefix` : `${resultRef}.prefix`;
}

function defaultPipelineCode(language, terminalMode = 'instances') {
  const terminalMethod = terminalMethodForLanguage(language, terminalMode);
  const resultVar = 'result';
  const resultCollectionVar = collectionVariableName(language, resultVar);
  const firstResultExpr = firstResultExpression(language, resultCollectionVar);

  if (language === 'neutral') {
    return [
      'pipeline := EASI.pipelineBuilder()',
      '  .fromPartStream()',
      '  .ofDicomData()',
      `  ${terminalMethod}`,
      '  .build()',
      '',
      `${resultCollectionVar} := pipeline.process(source)`,
      `${resultVar} := ${firstResultExpr}`
    ].join('\n');
  }

  if (language === 'javascript') {
    return [
      'const pipeline = EASI.pipelineBuilder()',
      '  .fromPartStream()',
      '  .ofDicomData()',
      `  ${terminalMethod}`,
      '  .build();',
      '',
      `const ${resultCollectionVar} = await pipeline.process(source);`,
      `const ${resultVar} = ${firstResultExpr};`
    ].join('\n');
  }

  if (language === 'csharp') {
    return [
      'var pipeline = EASI.PipelineBuilder()',
      '    .FromPartStream()',
      '    .OfDicomData()',
      `    ${terminalMethod}`,
      '    .Build();',
      '',
      `var ${resultCollectionVar} = await pipeline.Process(source);`,
      `var ${resultVar} = ${firstResultExpr};`
    ].join('\n');
  }

  if (language === 'java') {
    return [
      'var pipeline = EASI.pipelineBuilder()',
      '    .fromPartStream()',
      '    .ofDicomData()',
      `    ${terminalMethod}`,
      '    .build();',
      '',
      `var ${resultCollectionVar} = pipeline.process(source);`,
      `var ${resultVar} = ${firstResultExpr};`
    ].join('\n');
  }

  return [
    'pipeline = (',
    '    EASI.pipeline_builder()',
    '    .from_part_stream()',
    '    .of_dicom_data()',
    `    ${terminalMethod}`,
    '    .build()',
    ')',
    '',
    `${resultCollectionVar} = pipeline.process(source)`,
    `${resultVar} = ${firstResultExpr}`
  ].join('\n');
}

function defaultUsageCode(typeName, language) {
  if (language === 'neutral') return `${typeName.toLowerCase()} := result`;
  if (language === 'javascript') return `const ${typeName.charAt(0).toLowerCase()}${typeName.slice(1)} = result;`;
  if (language === 'csharp') return `var ${typeName.charAt(0).toLowerCase()}${typeName.slice(1)} = result;`;
  if (language === 'java') return `var ${typeName.charAt(0).toLowerCase()}${typeName.slice(1)} = result;`;
  return `${typeName.charAt(0).toLowerCase()}${typeName.slice(1)} = result`;
}

function toSnakeCase(value) {
  return String(value)
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
    .toLowerCase();
}

function assignLine(language, variableName, expression) {
  if (language === 'neutral') return `${variableName} := ${expression}`;
  if (language === 'python') return `${variableName} = ${expression}`;
  if (language === 'javascript') return `const ${variableName} = ${expression};`;
  return `var ${variableName} = ${expression};`;
}

function instantiateExpression(language, typeName, args = '') {
  if (language === 'neutral') return `${typeName}(${args})`;
  if (language === 'python') return `${typeName}(${args})`;
  return `new ${typeName}(${args})`;
}

function typeVariableName(typeName, language) {
  const base = `${typeName.charAt(0).toLowerCase()}${typeName.slice(1)}`;
  if (language === 'python') return toSnakeCase(base);
  return base;
}

function tagToken(language, tagName) {
  if (language === 'python') return `Tag.${toSnakeCase(tagName)}`;
  return `Tag.${tagName}`;
}

function usageSnippetForType(typeInfo, language, terminalMode = 'instances') {
  const typeName = typeInfo.name;
  const variableName = typeVariableName(typeName, language);
  const dataSetRef = dataSetRefForTerminal(language, terminalMode, 'result');
  const metaSetRef = metaSetRefForTerminal(language, terminalMode, 'result');
  const preambleRef = preambleRefForTerminal(language, terminalMode, 'result');
  const prefixRef = prefixRefForTerminal(language, terminalMode, 'result');

  switch (typeName) {
    case 'Instance':
      return assignLine(language, 'instance', 'result');
    case 'DataSet':
      return assignLine(language, (language === 'python') ? 'data_set' : 'dataSet', dataSetRef);
    case 'MetaSet':
      return assignLine(language, (language === 'python') ? 'meta_set' : 'metaSet', metaSetRef);
    case 'Preamble':
      return assignLine(language, 'preamble', preambleRef);
    case 'Prefix':
      return assignLine(language, 'prefix', prefixRef);
    case 'AttributeSet':
      return assignLine(language, (language === 'python') ? 'attribute_set' : 'attributeSet', dataSetRef);
    case 'Attribute':
      return assignLine(language, 'attribute', `${dataSetRef}.find(${tagToken(language, 'PatientName')})`);
    case 'AttributeSequence':
      return assignLine(language, 'sequence', `${dataSetRef}.find(${tagToken(language, 'ReferencedSeriesSequence')})`);
    case 'Item':
      return [
        assignLine(language, 'sequence', `${dataSetRef}.find(${tagToken(language, 'ReferencedSeriesSequence')})`),
        assignLine(language, 'item', (language === 'python') ? 'sequence.items[0]' : 'sequence.items[0]')
      ].join('\n');
    case 'Tag':
      return assignLine(language, 'tag', tagToken(language, 'PatientID'));
    case 'TagSet':
      return [
        assignLine(language, (language === 'python') ? 'tag_set' : 'tagSet', instantiateExpression(language, 'TagSet', '')),
        statementLine(language, `${(language === 'python') ? 'tag_set' : 'tagSet'}.add(${tagToken(language, 'PatientID')})`),
        statementLine(language, `${(language === 'python') ? 'tag_set' : 'tagSet'}.add(${tagToken(language, 'StudyInstanceUID')})`)
      ].join('\n');
    case 'PixelData':
      return assignLine(language, (language === 'python') ? 'pixel_data' : 'pixelData', instantiateExpression(language, 'PixelData', `${dataSetRef}.find(${tagToken(language, 'PixelData')})`));
    case 'EncodedData':
      return assignLine(language, (language === 'python') ? 'encoded_data' : 'encodedData', instantiateExpression(language, 'EncodedData', `${dataSetRef}.find(${tagToken(language, 'PixelData')}).access(), ${metaSetRef}.transferSyntax`));
    case 'DataElement':
      return assignLine(language, (language === 'python') ? 'data_element' : 'dataElement', instantiateExpression(language, 'DataElement', `${dataSetRef}.find(${tagToken(language, 'PatientName')}).access(), ${metaSetRef}.transferSyntax, 0`));
    case 'TransferSyntax':
      return assignLine(language, (language === 'python') ? 'transfer_syntax' : 'transferSyntax', 'TransferSyntax.find("1.2.840.10008.1.2.1")');
    case 'SOPClass':
      return assignLine(language, (language === 'python') ? 'sop_class' : 'sopClass', 'SOPClass.find("1.2.840.10008.5.1.4.1.1.2")');
    case 'Modality':
      return assignLine(language, 'modality', 'Modality.find("CT")');
    case 'ValueRepresentation':
      return assignLine(language, 'vr', 'ValueRepresentation.find("PN")');
    case 'DocumentWrapper':
      {
        let descriptor = '{ mimeType: "application/pdf", bytes: payloadBytes }';
        if (language === 'python') {
          descriptor = '{"mimeType": "application/pdf", "bytes": payload_bytes}';
        } else if (language === 'csharp') {
          descriptor = 'new { mimeType = "application/pdf", bytes = payloadBytes }';
        } else if (language === 'java') {
          descriptor = 'Map.of("mimeType", "application/pdf", "bytes", payloadBytes)';
        }

      return [
        assignLine(language, 'wrapper', instantiateExpression(language, 'DocumentWrapper', '')),
        assignLine(language, 'wrapped', `wrapper.wrap(${descriptor})`)
      ].join('\n');
      }
    case 'DocumentUnwrapper':
      return [
        assignLine(language, 'unwrapper', instantiateExpression(language, 'DocumentUnwrapper', '')),
        assignLine(language, 'unwrapped', 'unwrapper.unwrap(result)')
      ].join('\n');
    case 'EncapsulatedDocument':
      {
        let descriptor = '{ mimeType: "application/pdf", bytes: payloadBytes }';
        if (language === 'python') {
          descriptor = '{"mimeType": "application/pdf", "bytes": payload_bytes}';
        } else if (language === 'csharp') {
          descriptor = 'new { mimeType = "application/pdf", bytes = payloadBytes }';
        } else if (language === 'java') {
          descriptor = 'Map.of("mimeType", "application/pdf", "bytes", payloadBytes)';
        }

        const wrappedVar = (language === 'python') ? 'wrapped_entity' : 'wrappedEntity';

        return [
          assignLine(language, wrappedVar, `EncapsulatedDocument.wrap(${descriptor})`),
          statementLine(language, `${wrappedVar}.unwrap()`),
          statementLine(language, `EncapsulatedDocument.unwrap(${wrappedVar})`)
        ].join('\n');
      }
    default:
      if (typeInfo.domain === 'Entities') {
        return assignLine(language, variableName, 'result');
      }
      if (typeInfo.domain === 'Modules') {
        return assignLine(language, variableName, instantiateExpression(language, typeName, dataSetRef));
      }
      return defaultUsageCode(typeName, language);
  }
}

function languageLabel(language) {
  if (language === 'neutral') return 'Language-Neutral';
  if (language === 'javascript') return 'JavaScript';
  if (language === 'csharp') return 'C#';
  if (language === 'java') return 'Java';
  return 'Python';
}

function languageCodeClass(language) {
  if (language === 'neutral') return 'language-text';
  if (language === 'javascript') return 'language-javascript';
  if (language === 'csharp') return 'language-csharp';
  if (language === 'java') return 'language-java';
  return 'language-python';
}

function commentLine(language, text) {
  if (language === 'python' || language === 'neutral') return `# ${text}`;
  return `// ${text}`;
}

function statementLine(language, expression) {
  if (language === 'neutral' || language === 'python') {
    return expression;
  }
  return `${expression};`;
}

function localVar(language, name) {
  if (language === 'python') {
    return toSnakeCase(name);
  }
  return name;
}

function replaceResultReference(code, replacement) {
  return String(code || '').replace(/\bresult\b/g, replacement);
}

function resultVariableName(language) {
  return (language === 'python') ? 'ingest_result' : 'ingestResult';
}

function realWorldTitleForType(typeInfo) {
  const custom = {
    DocumentWrapper: 'Real-world usage: wrap a non-DICOM payload for native archive delivery.',
    DocumentUnwrapper: 'Real-world usage: extract payload bytes from encapsulated document storage.',
    Image: 'Real-world usage: pull frame geometry for rendering/decode planning.',
    PixelData: 'Real-world usage: determine frame boundaries before decode.',
    Tag: 'Real-world usage: drive stable metadata extraction by dictionary tags.',
    TransferSyntax: 'Real-world usage: choose decode/transcode policy.',
    SOPClass: 'Real-world usage: dispatch processing by SOP Class UID.',
    Modality: 'Real-world usage: route workflows by modality capabilities.'
  };

  if (custom[typeInfo.name] != null) {
    return custom[typeInfo.name];
  }

  if (typeInfo.domain === 'Modules') {
    return 'Real-world usage: access module-level metadata for routing and transformation.';
  }

  if (typeInfo.domain === 'Entities') {
    return 'Real-world usage: project instance content into higher-level entity semantics.';
  }

  return 'Real-world usage: extract operational metadata for downstream workflow decisions.';
}

function realWorldActionLines(typeInfo, language, primaryVar, resultVar, terminalMode = 'instances') {
  const dataSetRef = dataSetRefForTerminal(language, terminalMode, resultVar);
  const metaSetRef = metaSetRefForTerminal(language, terminalMode, resultVar);

  switch (typeInfo.name) {
    case 'Instance':
      return [
        assignLine(language, localVar(language, 'studyInstanceUid'), `${primaryVar}.dataSet.value(${tagToken(language, 'StudyInstanceUID')})`),
        assignLine(language, localVar(language, 'sopInstanceUid'), `${primaryVar}.dataSet.value(${tagToken(language, 'SOPInstanceUID')})`)
      ];
    case 'DataSet':
    case 'AttributeSet':
      return [
        assignLine(language, localVar(language, 'studyInstanceUid'), `${primaryVar}.value(${tagToken(language, 'StudyInstanceUID')})`),
        assignLine(language, localVar(language, 'modalityCode'), `${primaryVar}.value(${tagToken(language, 'Modality')})`)
      ];
    case 'Attribute':
      return [
        assignLine(language, localVar(language, 'patientName'), `${primaryVar}.value`)
      ];
    case 'AttributeSequence':
      return [
        assignLine(language, localVar(language, 'referencedSeriesCount'), `${primaryVar}.items.length`)
      ];
    case 'Item':
      return [
        assignLine(language, localVar(language, 'referencedSopInstanceUid'), `${primaryVar}.value(${tagToken(language, 'ReferencedSOPInstanceUID')})`)
      ];
    case 'MetaSet':
      return [
        assignLine(language, localVar(language, 'transferSyntaxUid'), `${primaryVar}.transferSyntaxUID.ID`),
        assignLine(language, localVar(language, 'mediaStorageSopClassUid'), `${primaryVar}.mediaStorageSOPClassUID.ID`)
      ];
    case 'DataElement':
      return [
        assignLine(language, localVar(language, 'bytesRemaining'), `${primaryVar}.bytesRemaining`),
        assignLine(language, localVar(language, 'isComplete'), `${primaryVar}.isComplete`)
      ];
    case 'EncodedData':
      return [
        statementLine(language, `${primaryVar}.convert(TransferSyntax.ExplicitVRLittleEndian)`),
        assignLine(language, localVar(language, 'encodedLength'), `${primaryVar}.length()`)
      ];
    case 'PixelData':
      return [
        assignLine(language, localVar(language, 'frameCount'), `${primaryVar}.offsets.length`)
      ];
    case 'Preamble':
    case 'Prefix':
      return [
        assignLine(language, localVar(language, 'byteLength'), `${primaryVar}.length()`)
      ];
    case 'Tag':
      return [
        assignLine(language, localVar(language, 'patientId'), `${dataSetRef}.value(${tagToken(language, 'PatientID')})`)
      ];
    case 'TagSet':
      return [
        assignLine(language, localVar(language, 'containsStudyUid'), `${primaryVar}.has(${tagToken(language, 'StudyInstanceUID')})`)
      ];
    case 'TransferSyntax':
      return [
        assignLine(language, localVar(language, 'isCompressed'), `${primaryVar}.IsCompressed`),
        assignLine(language, localVar(language, 'isLittleEndian'), `${primaryVar}.IsLittleEndian`)
      ];
    case 'SOPClass':
      return [
        assignLine(language, localVar(language, 'sopClassUid'), `${primaryVar}.ID`),
        assignLine(language, localVar(language, 'sopClassName'), `${primaryVar}.Name`)
      ];
    case 'Modality':
      return [
        assignLine(language, localVar(language, 'modalityCode'), `${primaryVar}.ID`),
        assignLine(language, localVar(language, 'isMultiFrame'), `${primaryVar}.IsMultiFrame`)
      ];
    case 'ValueRepresentation':
      return [
        assignLine(language, localVar(language, 'vrCode'), `${primaryVar}.ID`),
        assignLine(language, localVar(language, 'isFixedLength'), `${primaryVar}.IsFixed`)
      ];
    case 'DocumentWrapper':
      {
        let firstWrappedExpr = '(Array.isArray(wrapped) ? wrapped[0] : wrapped)';
        if (language === 'neutral') {
          firstWrappedExpr = '(isArray(wrapped) ? wrapped[0] : wrapped)';
        } else if (language === 'python') {
          firstWrappedExpr = `${primaryVar}[0] if isinstance(${primaryVar}, list) else ${primaryVar}`;
        } else if (language === 'csharp') {
          firstWrappedExpr = '(wrapped is System.Collections.IList ? wrapped[0] : wrapped)';
        } else if (language === 'java') {
          firstWrappedExpr = '(wrapped instanceof java.util.List ? ((java.util.List) wrapped).get(0) : wrapped)';
        }

      return [
        assignLine(language, localVar(language, 'firstWrapped'), firstWrappedExpr),
        assignLine(language, localVar(language, 'wrappedSopClassUid'), `${localVar(language, 'firstWrapped')}.metaSet.mediaStorageSOPClassUID.ID`)
      ];
      }
    case 'DocumentUnwrapper':
      return [
        assignLine(language, localVar(language, 'mimeType'), `${primaryVar}.mimeType`),
        assignLine(language, localVar(language, 'payloadLength'), `${primaryVar}.payload.length`)
      ];
    case 'Entity':
      return [
        assignLine(language, localVar(language, 'sopClassUid'), `${primaryVar}.sopClassUid`),
        assignLine(language, localVar(language, 'seriesUid'), `${primaryVar}.generalSeriesModule.seriesInstanceUid`)
      ];
    case 'Image':
      return [
        assignLine(language, localVar(language, 'rows'), `${primaryVar}.imagePixelModule.rows`),
        assignLine(language, localVar(language, 'columns'), `${primaryVar}.imagePixelModule.columns`)
      ];
    case 'EncapsulatedDocument':
      {
        const unwrappedViaInstance = localVar(language, 'unwrappedViaInstance');
        const unwrappedViaStatic = localVar(language, 'unwrappedViaStatic');
        const wrappedFromDescriptor = localVar(language, 'wrappedFromDescriptor');

        let descriptor = '{ mimeType: "application/pdf", bytes: payloadBytes }';
        if (language === 'python') {
          descriptor = '{"mimeType": "application/pdf", "bytes": payload_bytes}';
        } else if (language === 'csharp') {
          descriptor = 'new { mimeType = "application/pdf", bytes = payloadBytes }';
        } else if (language === 'java') {
          descriptor = 'Map.of("mimeType", "application/pdf", "bytes", payloadBytes)';
        }

        return [
          assignLine(language, unwrappedViaInstance, `${primaryVar}.unwrap()`),
          assignLine(language, unwrappedViaStatic, `EncapsulatedDocument.unwrap(${primaryVar})`),
          assignLine(language, wrappedFromDescriptor, `EncapsulatedDocument.wrap(${descriptor})`),
          assignLine(language, localVar(language, 'mimeType'), `${unwrappedViaStatic}.mimeType`),
          assignLine(language, localVar(language, 'documentLength'), `${unwrappedViaStatic}.byteLength`)
        ];
      }
    case 'KeyObjectSelection':
      return [
        assignLine(language, localVar(language, 'referencedSopUids'), `${primaryVar}.referencedSopInstanceUids`)
      ];
    case 'PresentationState':
      return [
        assignLine(language, localVar(language, 'contentLabel'), `${primaryVar}.presentationStateModule.contentLabel`)
      ];
    case 'Segmentation':
      return [
        assignLine(language, localVar(language, 'segmentCount'), `${primaryVar}.segmentationModule.segmentCount`)
      ];
    case 'StructuredReport':
      return [
        assignLine(language, localVar(language, 'contentItemCount'), `${primaryVar}.structuredReportModule.contentItemCount`)
      ];
    case 'Waveform':
      return [
        assignLine(language, localVar(language, 'multiplexGroupCount'), `${primaryVar}.waveformModule.multiplexGroupCount`)
      ];
    case 'WorklistItem':
      return [
        assignLine(language, localVar(language, 'accessionNumber'), `${primaryVar}.requestedProcedureModule.accessionNumber`),
        assignLine(language, localVar(language, 'scheduledAETitle'), `${primaryVar}.scheduledProcedureStepModule.scheduledStationAETitle`)
      ];
    case 'Module':
      return [
        assignLine(language, localVar(language, 'seriesItems'), `${primaryVar}.accessSequenceItems(${tagToken(language, 'ReferencedSeriesSequence')})`)
      ];
    case 'CurrentRequestedProcedureEvidenceModule':
      return [
        assignLine(language, localVar(language, 'referencedSopUids'), `${primaryVar}.referencedSopInstanceUids`)
      ];
    case 'EncapsulatedDocumentModule':
      return [
        assignLine(language, localVar(language, 'mimeType'), `${primaryVar}.mimeType`),
        assignLine(language, localVar(language, 'documentLength'), `${primaryVar}.documentLength`)
      ];
    case 'GeneralSeriesModule':
      return [
        assignLine(language, localVar(language, 'seriesInstanceUid'), `${primaryVar}.seriesInstanceUid`),
        assignLine(language, localVar(language, 'modalityCode'), `${primaryVar}.modality.ID`)
      ];
    case 'ImagePixelModule':
      return [
        assignLine(language, localVar(language, 'rows'), `${primaryVar}.rows`),
        assignLine(language, localVar(language, 'columns'), `${primaryVar}.columns`)
      ];
    case 'ImagePlaneModule':
      return [
        assignLine(language, localVar(language, 'imagePositionPatient'), `${primaryVar}.imagePositionPatient`),
        assignLine(language, localVar(language, 'pixelSpacing'), `${primaryVar}.pixelSpacing`)
      ];
    case 'ModalityLookUpTableModule':
      return [
        assignLine(language, localVar(language, 'rescaleSlope'), `${primaryVar}.rescaleSlope`),
        assignLine(language, localVar(language, 'rescaleIntercept'), `${primaryVar}.rescaleIntercept`)
      ];
    case 'MultiFrameModule':
      return [
        assignLine(language, localVar(language, 'numberOfFrames'), `${primaryVar}.numberOfFrames`)
      ];
    case 'PatientModule':
      return [
        assignLine(language, localVar(language, 'patientId'), `${primaryVar}.patientId`),
        assignLine(language, localVar(language, 'patientName'), `${primaryVar}.patientName`)
      ];
    case 'PresentationStateModule':
      return [
        assignLine(language, localVar(language, 'contentLabel'), `${primaryVar}.contentLabel`),
        assignLine(language, localVar(language, 'referencedSeriesSequence'), `${primaryVar}.referencedSeriesSequence`)
      ];
    case 'RequestedProcedureModule':
      return [
        assignLine(language, localVar(language, 'accessionNumber'), `${primaryVar}.accessionNumber`),
        assignLine(language, localVar(language, 'requestedProcedureId'), `${primaryVar}.requestedProcedureId`)
      ];
    case 'ScheduledProcedureStepModule':
      return [
        assignLine(language, localVar(language, 'scheduledAETitle'), `${primaryVar}.scheduledStationAETitle`),
        assignLine(language, localVar(language, 'scheduledStepId'), `${primaryVar}.scheduledProcedureStepId`)
      ];
    case 'SegmentationModule':
      return [
        assignLine(language, localVar(language, 'segmentCount'), `${primaryVar}.segmentCount`)
      ];
    case 'StructuredReportModule':
      return [
        assignLine(language, localVar(language, 'contentItemCount'), `${primaryVar}.contentItemCount`),
        assignLine(language, localVar(language, 'hasContent'), `${primaryVar}.hasContent`)
      ];
    case 'VisualizationFunctionModule':
      return [
        assignLine(language, localVar(language, 'windowCenter'), `${primaryVar}.windowCenter`),
        assignLine(language, localVar(language, 'windowWidth'), `${primaryVar}.windowWidth`)
      ];
    case 'WaveformModule':
      return [
        assignLine(language, localVar(language, 'multiplexGroupCount'), `${primaryVar}.multiplexGroupCount`)
      ];
    default:
      {
        const firstAccessor = typeInfo.source.members.find((member) =>
          member.kind === 'Accessor' || member.kind === 'Static Accessor');
        if (firstAccessor) {
          return [
            assignLine(language, localVar(language, 'sampleValue'), `${primaryVar}.${firstAccessor.name}`)
          ];
        }

        const firstMethod = typeInfo.source.members.find((member) =>
          member.kind === 'Method' || member.kind === 'Static Method');
        if (firstMethod) {
          return [
            assignLine(language, localVar(language, 'sampleValue'), `${primaryVar}.${firstMethod.name}()`)
          ];
        }

        return [
          assignLine(language, localVar(language, 'sampleValue'), primaryVar)
        ];
      }
  }
}

function buildRealWorldExample(typeInfo, language, usageCode, terminalMode = 'instances') {
  const ingestVar = resultVariableName(language);
  const ingestCollectionVar = collectionVariableName(language, ingestVar);
  const firstIngestExpr = firstResultExpression(language, ingestCollectionVar);
  const usage = replaceResultReference(usageCode, ingestVar);
  const primaryVar = inferVariableName(usage, language);
  const usageUsesResult = /\bresult\b/.test(usageCode);

  const ingestLines = (language === 'neutral')
    ? [
      `${ingestCollectionVar} := ingestPipeline.process(source)`,
      `${ingestVar} := ${firstIngestExpr}`
    ]
    : (language === 'python')
      ? [
        `${ingestCollectionVar} = ingest_pipeline.process(source)`,
        `${ingestVar} = ${firstIngestExpr}`
      ]
      : (language === 'javascript')
        ? [
          `const ${ingestCollectionVar} = await ingestPipeline.process(source);`,
          `const ${ingestVar} = ${firstIngestExpr};`
        ]
        : (language === 'csharp')
          ? [
            `var ${ingestCollectionVar} = await ingestPipeline.Process(source);`,
            `var ${ingestVar} = ${firstIngestExpr};`
          ]
          : [
            `var ${ingestCollectionVar} = ingestPipeline.process(source);`,
            `var ${ingestVar} = ${firstIngestExpr};`
          ];

  const actionLines = realWorldActionLines(typeInfo, language, primaryVar, ingestVar, terminalMode);
  const leadLines = usageUsesResult ? ingestLines : [];

  return {
    title: realWorldTitleForType(typeInfo),
    code: [...leadLines, usage, ...actionLines].join('\n')
  };
}

function buildTypeDefinitionTabs(typeInfo) {
  const languages = ['neutral', 'javascript', 'csharp', 'java', 'python'];
  const terminalMode = sampleTerminalForType(typeInfo);
  const knownTypeNames = Array.from(TYPE_SLUG_BY_NAME.keys()).sort((a, b) => b.length - a.length);

  function normalizeNeutralType(rawType) {
    let typeText = String(rawType || '').trim();
    if (typeText.length === 0) {
      typeText = 'Any';
    }

    if (typeText === '*') {
      typeText = 'Any';
    }

    typeText = typeText
      .replace(/\bUint8Array\b/g, 'ByteArray')
      .replace(/\bUint8ClampedArray\b/g, 'ByteArray')
      .replace(/\bInt8Array\b/g, 'ByteArray')
      .replace(/\bArrayBuffer\b/g, 'ByteArray')
      .replace(/\bBuffer\b/g, 'ByteArray')
      .replace(/\bArray\s*</g, 'List<')
      .replace(/\bstring\b/g, 'String')
      .replace(/\bnumber\b/g, 'Number')
      .replace(/\bboolean\b/g, 'Boolean')
      .replace(/\bobject\b/g, 'Object')
      .replace(/\bany\b/g, 'Any')
      .replace(/\bvoid\b/g, 'Void')
      .replace(/\bnull\b/g, 'Null')
      .replace(/\bundefined\b/g, 'Undefined');

    return typeText;
  }

  function normalizeNeutralNarrative(rawText) {
    return String(rawText || '')
      .replace(/\bUint8Array\b/g, 'ByteArray')
      .replace(/\bUint8ClampedArray\b/g, 'ByteArray')
      .replace(/\bInt8Array\b/g, 'ByteArray')
      .replace(/\bArrayBuffer\b/g, 'ByteArray')
      .replace(/\bBuffer\b/g, 'ByteArray');
  }

  function inferEasiTypeByContext(member, param) {
    const lookupText = [
      param?.name || '',
      param?.description || ''
    ].join(' ');

    for (const typeName of knownTypeNames) {
      const pattern = new RegExp(`\\b${escapeRegExp(typeName)}\\b`);
      if (pattern.test(lookupText)) {
        return typeName;
      }
    }

    const normalizedName = String(param?.name || '').toLowerCase();
    const normalizedDescription = String(param?.description || '').toLowerCase();
    const hints = [
      ['transfersyntax', 'TransferSyntax'],
      ['tag', 'Tag'],
      ['dataset', 'DataSet'],
      ['metaset', 'MetaSet'],
      ['attributeset', 'AttributeSet'],
      ['attribute', 'Attribute'],
      ['sequence', 'AttributeSequence'],
      ['item', 'Item'],
      ['inst', 'Instance']
    ];

    for (const [needle, inferredType] of hints) {
      if (
        normalizedName.includes(needle)
        || normalizedDescription.includes(needle)
      ) {
        if (TYPE_SLUG_BY_NAME.has(inferredType)) {
          return inferredType;
        }
      }
    }

    return null;
  }

  function resolveParameterType(member, param) {
    const neutralized = normalizeNeutralType(param?.type || 'Any');
    if (neutralized === 'Object' || neutralized === 'Any') {
      const inferred = inferEasiTypeByContext(member, param);
      if (inferred != null) {
        return inferred;
      }
    }
    return neutralized;
  }

  function renderTypeRef(typeName) {
    const normalized = normalizeNeutralType(typeName);
    const slug = TYPE_SLUG_BY_NAME.get(normalized);
    if (!slug) {
      return `<code>${escapeHtml(normalized)}</code>`;
    }
    return `<a href="${escapeHtml(slug)}.html"><code>${escapeHtml(normalized)}</code></a>`;
  }

  function renderParameterRows(member, params) {
    if (!Array.isArray(params) || params.length === 0) {
      return `
                            <tr>
                                <td colspan="3">None.</td>
                            </tr>`;
    }

    return params.map((param) => {
      const normalizedType = resolveParameterType(member, param);
      const rawDescription = normalizeNeutralNarrative(param.description || 'Parameter used by this member.');
      const optionalPrefix = (param.optional && /^\(optional\)/i.test(rawDescription) === false)
        ? '(Optional) '
        : '';

      return `
                            <tr>
                                <td><code>${escapeHtml(param.name || 'param')}</code></td>
                                <td>${renderTypeRef(normalizedType)}</td>
                                <td>${escapeHtml(`${optionalPrefix}${rawDescription}`)}</td>
                            </tr>`;
    }).join('');
  }

  function returnEntriesFromMember(member) {
    const returns = member?.returns;
    if (returns == null) {
      return [];
    }

    const description = normalizeSentence(returns.description || '', 'Return value.');
    const typeText = String(returns.type || 'any').trim() || 'any';
    const unionTypes = splitUnionTypes(typeText);
    const resolvedTypes = (unionTypes.length > 0) ? unionTypes : [typeText];
    return resolvedTypes.map((type) => ({
      type,
      description
    }));
  }

  function renderReturnRows(member) {
    const entries = returnEntriesFromMember(member);
    if (entries.length === 0) {
      return `
                            <tr>
                                <td colspan="2">Not specified.</td>
                            </tr>`;
    }

    return entries.map((entry) => `
                            <tr>
                                <td>${renderTypeRef(entry.type || 'Any')}</td>
                                <td>${escapeHtml(normalizeNeutralNarrative(entry.description || 'Return value.'))}</td>
                            </tr>`).join('');
  }

  function renderMemberBlock(member, includeReturns) {
    const parametersRows = renderParameterRows(member, member.params);

    const returnsBlock = includeReturns
      ? `
                        <p class="member-doc-label">Possible Return Types</p>
                        <div class="table-scroll">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Type</th>
                                        <th>Description</th>
                                    </tr>
                                </thead>
                                <tbody>${renderReturnRows(member)}
                                </tbody>
                            </table>
                        </div>`
      : '';

    return `
                    <article class="member-doc">
                        <h6><code>${escapeHtml(member.signature)}</code></h6>
                        <p>${escapeHtml(member.description)}</p>
                        <p class="member-doc-label">Parameters</p>
                        <div class="table-scroll">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Type</th>
                                        <th>Description</th>
                                    </tr>
                                </thead>
                                <tbody>${parametersRows}
                                </tbody>
                            </table>
                        </div>${returnsBlock}
                    </article>`;
  }

  const accessorKinds = new Set(['Accessor', 'Static Accessor', 'Property', 'Mutator', 'Static Accessor (Generated)']);
  const methodKinds = new Set(['Method', 'Static Method']);
  const constructorKinds = new Set(['Constructor']);

  const accessorMembers = typeInfo.source.members
    .filter((member) => accessorKinds.has(member.kind))
    .filter((member) => !(member.kind === 'Property' && String(member.name || '').startsWith('_')));
  const methodMembers = typeInfo.source.members.filter((member) => methodKinds.has(member.kind));
  const constructorMembers = typeInfo.source.members.filter((member) => constructorKinds.has(member.kind));

  const accessorRows = (accessorMembers.length > 0)
    ? accessorMembers.map((member) => `
                        <tr>
                            <td><code>${escapeHtml(member.name)}</code></td>
                            <td><code>${escapeHtml(member.signature)}</code></td>
                            <td>${escapeHtml(member.kind)}</td>
                            <td>${escapeHtml(member.description)}</td>
                        </tr>`).join('')
    : `
                        <tr>
                            <td colspan="4">No accessors or properties declared for this type.</td>
                        </tr>`;

  const methodBlocks = (methodMembers.length > 0)
    ? methodMembers.map((member) => renderMemberBlock(member, true)).join('')
    : `
                    <p>No methods declared for this type.</p>`;

  const constructorBlocks = (constructorMembers.length > 0)
    ? constructorMembers.map((member) => renderMemberBlock(member, false)).join('')
    : `
                    <p>No constructor overloads documented for this type.</p>`;

  const tabButtons = [
    '<button class="doc-tab-button active" type="button" data-tab-button="structure">Structure</button>',
    '<button class="doc-tab-button" type="button" data-tab-button="neutral">Language-Neutral</button>',
    '<button class="doc-tab-button" type="button" data-tab-button="javascript">JavaScript</button>',
    '<button class="doc-tab-button" type="button" data-tab-button="csharp">C#</button>',
    '<button class="doc-tab-button" type="button" data-tab-button="java">Java</button>',
    '<button class="doc-tab-button" type="button" data-tab-button="python">Python</button>',
    '<button class="doc-tab-button" type="button" data-tab-button="uml">UML</button>'
  ].join('\n                        ');

  const languagePanels = languages.map((language) => {
    const basePipeline = defaultPipelineCode(language, terminalMode);
    const baseUsage = usageSnippetForType(typeInfo, language, terminalMode);
    const includeRealWorld = true;
    const realWorld = buildRealWorldExample(typeInfo, language, baseUsage, terminalMode);

    const basicCode = [
      basePipeline,
      '',
      commentLine(language, 'Type usage'),
      baseUsage
    ].join('\n');

    const realWorldBlock = includeRealWorld
      ? `
                    <br />
                    <p>${escapeHtml(realWorld.title)}</p>
                    <pre><code class="${languageCodeClass(language)}">${escapeHtml(realWorld.code)}</code></pre>`
      : '';

    return `
                <div class="doc-tab-panel" data-tab-panel="${language}">
                    <h4>${languageLabel(language)} Examples</h4>
                    <p>Basic usage:</p>
                    <pre><code class="${languageCodeClass(language)}">${escapeHtml(basicCode)}</code></pre>
                    ${realWorldBlock}
                </div>`;
  }).join('');

  const relationshipRows = [];
  const detailedRelationships = Array.isArray(typeInfo.relationshipObjects)
    ? typeInfo.relationshipObjects
    : [];

  const relationStrength = {
    '--|>': 4,
    '*--': 3,
    'o--': 2,
    '..>': 1,
    '--': 0
  };

  const strongestByTarget = new Map();
  for (const relation of detailedRelationships) {
    const current = strongestByTarget.get(relation.to);
    if (!current) {
      strongestByTarget.set(relation.to, relation);
      continue;
    }

    const currentScore = relationStrength[current.relation] ?? -1;
    const nextScore = relationStrength[relation.relation] ?? -1;
    if (nextScore > currentScore) {
      strongestByTarget.set(relation.to, relation);
    }
  }

  const sortedRelationships = Array.from(strongestByTarget.values()).sort((a, b) => {
    if (a.to === b.to) return a.relation.localeCompare(b.relation);
    return a.to.localeCompare(b.to);
  });

  function shortenLabel(value, max = 28) {
    const text = String(value || '');
    if (text.length <= max) return text;
    return `${text.slice(0, Math.max(1, max - 3))}...`;
  }

  function edgeDecorators(relation) {
    const result = {
      markerStart: '',
      markerEnd: '',
      dashed: false
    };

    if (relation === '--|>') {
      result.markerEnd = 'url(#uml-triangle)';
      return result;
    }

    if (relation === '..>') {
      result.markerEnd = 'url(#uml-arrow)';
      result.dashed = true;
      return result;
    }

    if (relation === '*--') {
      result.markerStart = 'url(#uml-diamond)';
      return result;
    }

    if (relation === 'o--') {
      result.markerStart = 'url(#uml-open-diamond)';
      return result;
    }

    return result;
  }

  function renderUmlSvg(sourceType, relationships) {
    const sourceWidth = 250;
    const sourceHeight = 64;
    const targetWidth = 280;
    const targetHeight = 56;
    const targetGap = 28;
    const margin = 28;
    const sourceX = margin;
    const targetX = 430;

    const count = relationships.length;
    const targetsBlockHeight = (count > 0)
      ? (count * targetHeight) + ((count - 1) * targetGap)
      : 0;

    const contentHeight = Math.max(sourceHeight, targetsBlockHeight);
    const height = Math.max(220, contentHeight + (margin * 2));
    const width = (count > 0)
      ? targetX + targetWidth + margin
      : sourceX + sourceWidth + 260;

    const sourceY = Math.round((height - sourceHeight) / 2);
    const sourceCenterX = sourceX + sourceWidth;
    const sourceCenterY = sourceY + (sourceHeight / 2);
    const targetsStartY = (count > 0)
      ? Math.round((height - targetsBlockHeight) / 2)
      : Math.round((height - targetHeight) / 2);

    const edgeParts = [];
    const nodeParts = [];
    const labelParts = [];

    nodeParts.push(`
        <g class="uml-node primary">
            <title>${escapeHtml(sourceType)}</title>
            <rect x="${sourceX}" y="${sourceY}" width="${sourceWidth}" height="${sourceHeight}" rx="8" ry="8"></rect>
            <text x="${sourceX + (sourceWidth / 2)}" y="${sourceY + (sourceHeight / 2)}" text-anchor="middle" dominant-baseline="middle">${escapeHtml(shortenLabel(sourceType, 30))}</text>
        </g>`);

    for (let i = 0; i < relationships.length; i += 1) {
      const relation = relationships[i];
      const y = targetsStartY + (i * (targetHeight + targetGap));
      const centerY = y + (targetHeight / 2);

      const targetLabel = shortenLabel(relation.to, 30);
      nodeParts.push(`
        <g class="uml-node">
            <title>${escapeHtml(relation.to)}</title>
            <rect x="${targetX}" y="${y}" width="${targetWidth}" height="${targetHeight}" rx="8" ry="8"></rect>
            <text x="${targetX + (targetWidth / 2)}" y="${y + (targetHeight / 2)}" text-anchor="middle" dominant-baseline="middle">${escapeHtml(targetLabel)}</text>
        </g>`);

      const c1x = sourceCenterX + 90;
      const c2x = targetX - 90;
      const decorators = edgeDecorators(relation.relation);
      const markerStart = decorators.markerStart.length > 0 ? ` marker-start="${decorators.markerStart}"` : '';
      const markerEnd = decorators.markerEnd.length > 0 ? ` marker-end="${decorators.markerEnd}"` : '';
      const dashClass = decorators.dashed ? ' dashed' : '';
      const edgeLabel = `${relation.relation} ${relation.intent}`;
      const labelX = Math.round((sourceCenterX + targetX) / 2);
      const labelY = Math.round((sourceCenterY + centerY) / 2) - 8;

      edgeParts.push(`
        <path class="uml-edge${dashClass}" d="M ${sourceCenterX} ${sourceCenterY} C ${c1x} ${sourceCenterY}, ${c2x} ${centerY}, ${targetX} ${centerY}"${markerStart}${markerEnd}></path>`);
      labelParts.push(`
        <text class="uml-edge-label" x="${labelX}" y="${labelY}" text-anchor="middle">${escapeHtml(edgeLabel)}</text>`);
    }

    const emptyNote = (count === 0)
      ? `<text class="uml-note" x="${sourceX + sourceWidth + 40}" y="${Math.round(height / 2)}">No direct type relationships declared.</text>`
      : '';

    return `
                    <div class="uml-diagram">
                        <svg class="uml-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(sourceType)} UML diagram">
                            <defs>
                                <marker id="uml-arrow" markerWidth="10" markerHeight="10" refX="9" refY="5" orient="auto">
                                    <path d="M 0 0 L 10 5 L 0 10 z"></path>
                                </marker>
                                <marker id="uml-triangle" markerWidth="12" markerHeight="12" refX="11" refY="6" orient="auto">
                                    <path d="M 0 0 L 12 6 L 0 12 z"></path>
                                </marker>
                                <marker id="uml-diamond" markerWidth="14" markerHeight="10" refX="7" refY="5" orient="auto-start-reverse">
                                    <path d="M 0 5 L 4 0 L 8 5 L 4 10 z"></path>
                                </marker>
                                <marker id="uml-open-diamond" markerWidth="14" markerHeight="10" refX="7" refY="5" orient="auto-start-reverse">
                                    <path d="M 0 5 L 4 0 L 8 5 L 4 10 z"></path>
                                </marker>
                            </defs>${edgeParts.join('')}${nodeParts.join('')}${labelParts.join('')}
                            ${emptyNote}
                        </svg>
                    </div>`;
  }

  for (const relation of sortedRelationships) {
    relationshipRows.push(`
                        <tr>
                            <td><code>${escapeHtml(relation.from)}</code></td>
                            <td><code>${escapeHtml(relation.relation)}</code></td>
                            <td><code>${escapeHtml(relation.to)}</code></td>
                            <td>${escapeHtml(relation.intent)}</td>
                        </tr>`);
  }

  if (relationshipRows.length === 0) {
    relationshipRows.push(`
                        <tr>
                            <td><code>${escapeHtml(typeInfo.name)}</code></td>
                            <td><code>--</code></td>
                            <td><code>(none)</code></td>
                            <td>No direct type-level relationship declared in source imports or inheritance.</td>
                        </tr>`);
  }

  const umlSvg = renderUmlSvg(typeInfo.name, sortedRelationships);

  return `
                <div class="doc-tabset" data-tabset>
                    <div class="doc-tablist" role="tablist" aria-label="Type definition tabs">
                        ${tabButtons}
                    </div>

                    <div class="doc-tab-panel active" data-tab-panel="structure">
                        <h4>Type Structure</h4>
                        <p>Directly available members for <code>${escapeHtml(typeInfo.name)}</code>, separated by accessors/properties, methods, and constructors.</p>
                        <h5>Accessors and Properties</h5>
                        <div class="table-scroll">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Member</th>
                                        <th>Signature</th>
                                        <th>Kind</th>
                                        <th>Description</th>
                                    </tr>
                                </thead>
                                <tbody>${accessorRows}
                                </tbody>
                            </table>
                        </div>
                        <h5>Methods</h5>
${methodBlocks}
                        <h5>Constructors</h5>
${constructorBlocks}
                    </div>${languagePanels}

                <div class="doc-tab-panel" data-tab-panel="uml">
                    <h4>UML Class Diagram</h4>
                    <p>Direct type relationships rendered as an inline UML SVG diagram.</p>
${umlSvg}
                    <div class="table-scroll">
                        <table>
                            <thead>
                                <tr>
                                    <th>Source</th>
                                    <th>Relationship</th>
                                    <th>Target</th>
                                    <th>Intent</th>
                                </tr>
                            </thead>
                            <tbody>${relationshipRows.join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
                </div>`;
}

function renderTypePage(typeInfo) {
  const summary = encodeTrademark(escapeHtml(typeInfo.summary));
  const canonicalRole = encodeTrademark(escapeHtml(typeInfo.canonicalRole));
  const pipelineExposure = encodeTrademark(escapeHtml(typeInfo.pipelineExposure));
  const primaryTerminal = (sampleTerminalForType(typeInfo) === 'entities') ? 'toEntities()' : 'toInstances()';
  const primaryTerminalContext = (sampleTerminalForType(typeInfo) === 'entities')
    ? 'Directly emitted, nested, or referenced as part of entity terminal output.'
    : 'Directly emitted, nested, or referenced as part of instance materialization output.';

  const relationshipCodes = typeInfo.relationships
    .map((name) => {
      const slug = TYPE_SLUG_BY_NAME.get(name);
      if (!slug) {
        return `<code>${escapeHtml(name)}</code>`;
      }
      return `<a href="${escapeHtml(slug)}.html"><code>${escapeHtml(name)}</code></a>`;
    })
    .join(', ');

  const typeDefinitionTabs = buildTypeDefinitionTabs(typeInfo);

  return `<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="description" content="EASI DICOM&reg; type reference for ${escapeHtml(typeInfo.name)}.">
    <title>EASI | DICOM&reg; Type | ${escapeHtml(typeInfo.name)}</title>
    <link rel="stylesheet" href="../assets/styles.css">
    <script defer src="../assets/app.js"></script>
</head>
<body>
    <div class="layout">
        <aside class="sidebar">
            <div class="brand">
                <div class="brand-mark">E</div>
                <div>
                    <h1>EASI Standard</h1>
                    <p>Technical Reference</p>
                </div>
            </div>

            <span class="badge normative">Normative</span>
            <span class="badge informative">Informative</span>${NAV_HTML}

            <div class="nav-section">
                <span class="nav-label">Edition</span>
                <p class="page-meta">Draft v1.0 Candidate<br>April 3, 2026</p>
            </div>
        </aside>

        <main class="page">
            <section class="page-hero reveal">
                <h2>${escapeHtml(typeInfo.name)}</h2>
                <p>${summary}</p>
            </section>

            <section class="section reveal">
                <h3>Type Snapshot</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Field</th>
                            <th>Value</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Type</td>
                            <td><code>${escapeHtml(typeInfo.name)}</code></td>
                        </tr>
                        <tr>
                            <td>Domain</td>
                            <td>${escapeHtml(typeInfo.domain)}</td>
                        </tr>
                        <tr>
                            <td>Category</td>
                            <td>${escapeHtml(typeInfo.category)}</td>
                        </tr>
                        <tr>
                            <td>Kind</td>
                            <td>${escapeHtml(typeInfo.kind)}</td>
                        </tr>
                    </tbody>
                </table>
            </section>

            <section class="section reveal">
                <h3>Canonical Role</h3>
                <p>${canonicalRole}</p>
                <div class="callout normative">
                    <h4>Pipeline Exposure</h4>
                    <p>${pipelineExposure}</p>
                </div>
            </section>

            <section class="section reveal">
                <h3>Type Definition</h3>
                <p>
                    Structure is presented first, followed by language-neutral and language-specific examples,
                    and an explicit UML relationship view.
                </p>
${typeDefinitionTabs}
            </section>

            <section class="section reveal">
                <h3>Common Relationships</h3>
                <p>${relationshipCodes || '<code>(none)</code>'}</p>
            </section>

            <section class="section reveal">
                <h3>Typical Output Context</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Pipeline Surface</th>
                            <th>How ${escapeHtml(typeInfo.name)} Commonly Appears</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td><code>${escapeHtml(primaryTerminal)}</code></td>
                            <td>${escapeHtml(primaryTerminalContext)}</td>
                        </tr>
                        <tr>
                            <td><code>toSelection(...)</code></td>
                            <td>Referenced for targeted extraction and structural traversal.</td>
                        </tr>
                        <tr>
                            <td><code>toMapping(...)</code></td>
                            <td>Used as source semantics for projection into derived target models.</td>
                        </tr>
                    </tbody>
                </table>
            </section>

            <section class="section reveal">
                <div class="callout warning">
                    <h4>Specification Boundary</h4>
                    <p>
                        This reference describes interoperable semantics and usage intent.
                        Language-specific implementation internals remain outside normative standard requirements.
                    </p>
                </div>
            </section>

            <p class="footer-note">
                <a href="index.html">Back to DICOM&reg; Type Index</a>
            </p>
        </main>
    </div>
</body>
</html>
`;
}

function buildFullModelDiagramSvg(typeInfos) {
  const domainOrder = ['Core', 'Entities', 'Modules'];
  const grouped = domainOrder
    .map((domain) => ({
      domain,
      types: typeInfos
        .filter((typeInfo) => typeInfo.domain === domain)
        .sort((a, b) => a.name.localeCompare(b.name))
    }))
    .filter((group) => group.types.length > 0);

  const nodeWidth = 240;
  const nodeHeight = 42;
  const rowGap = 14;
  const colGap = 120;
  const padLeft = 40;
  const padRight = 40;
  const padTop = 100;
  const padBottom = 40;
  const maxRows = Math.max(1, ...grouped.map((group) => group.types.length));
  const width = padLeft + padRight + (grouped.length * nodeWidth) + ((grouped.length - 1) * colGap);
  const height = padTop + padBottom + (maxRows * nodeHeight) + ((maxRows - 1) * rowGap);

  const nodeByName = new Map();
  const domainBlocks = [];
  const nodeElements = [];

  function short(text, max = 28) {
    const value = String(text || '');
    if (value.length <= max) return value;
    return `${value.slice(0, Math.max(1, max - 3))}...`;
  }

  grouped.forEach((group, col) => {
    const x = padLeft + col * (nodeWidth + colGap);
    const colBgX = x - 12;
    const colBgWidth = nodeWidth + 24;

    domainBlocks.push(`
                <rect class="model-domain-bg" x="${colBgX}" y="20" width="${colBgWidth}" height="${height - 40}" rx="12" ry="12"></rect>
                <text class="model-domain-label" x="${x + (nodeWidth / 2)}" y="48" text-anchor="middle">${escapeHtml(group.domain)}</text>`);

    group.types.forEach((typeInfo, row) => {
      const y = padTop + row * (nodeHeight + rowGap);
      nodeByName.set(typeInfo.name, { x, y });

      const slug = TYPE_SLUG_BY_NAME.get(typeInfo.name);
      const nodeBody = `
                    <title>${escapeHtml(typeInfo.name)}</title>
                    <rect x="${x}" y="${y}" width="${nodeWidth}" height="${nodeHeight}" rx="8" ry="8"></rect>
                    <text x="${x + (nodeWidth / 2)}" y="${y + (nodeHeight / 2)}" text-anchor="middle" dominant-baseline="middle">${escapeHtml(short(typeInfo.name, 32))}</text>`;

      if (slug) {
        nodeElements.push(`
                <a class="model-node-link" href="${escapeHtml(slug)}.html">
                    <g class="model-node">${nodeBody}
                    </g>
                </a>`);
      } else {
        nodeElements.push(`
                <g class="model-node">${nodeBody}
                </g>`);
      }
    });
  });

  const relationStrength = {
    '--|>': 4,
    '*--': 3,
    'o--': 2,
    '..>': 1,
    '--': 0
  };

  const relationMap = new Map();
  for (const typeInfo of typeInfos) {
    const sourceRels = Array.isArray(typeInfo?.source?.relationships) ? typeInfo.source.relationships : [];
    for (const relation of sourceRels) {
      if (!nodeByName.has(relation.from) || !nodeByName.has(relation.to)) continue;
      if (relation.from === relation.to) continue;

      const key = `${relation.from}->${relation.to}`;
      const current = relationMap.get(key);
      if (!current) {
        relationMap.set(key, relation);
        continue;
      }

      const currentScore = relationStrength[current.relation] ?? -1;
      const nextScore = relationStrength[relation.relation] ?? -1;
      if (nextScore > currentScore) {
        relationMap.set(key, relation);
      }
    }
  }

  const relations = Array.from(relationMap.values()).sort((a, b) => {
    if (a.from === b.from) return a.to.localeCompare(b.to);
    return a.from.localeCompare(b.from);
  });

  function edgeStyle(relation) {
    if (relation === '--|>') {
      return { klass: 'model-edge inheritance', markerEnd: 'url(#model-triangle)', markerStart: '' };
    }
    if (relation === '..>') {
      return { klass: 'model-edge uses', markerEnd: 'url(#model-arrow)', markerStart: '' };
    }
    if (relation === '*--') {
      return { klass: 'model-edge composition', markerEnd: '', markerStart: 'url(#model-diamond)' };
    }
    if (relation === 'o--') {
      return { klass: 'model-edge aggregation', markerEnd: '', markerStart: 'url(#model-open-diamond)' };
    }
    return { klass: 'model-edge association', markerEnd: '', markerStart: '' };
  }

  const edgeElements = [];
  for (const relation of relations) {
    const from = nodeByName.get(relation.from);
    const to = nodeByName.get(relation.to);
    if (!from || !to) continue;

    const fromCenterY = from.y + (nodeHeight / 2);
    const toCenterY = to.y + (nodeHeight / 2);
    const leftToRight = to.x >= from.x;
    const startX = leftToRight ? (from.x + nodeWidth) : from.x;
    const endX = leftToRight ? to.x : (to.x + nodeWidth);
    const span = Math.abs(endX - startX);
    const control = Math.max(48, Math.round(span * 0.45));
    const c1x = leftToRight ? (startX + control) : (startX - control);
    const c2x = leftToRight ? (endX - control) : (endX + control);

    const style = edgeStyle(relation.relation);
    const markerStartAttr = style.markerStart ? ` marker-start="${style.markerStart}"` : '';
    const markerEndAttr = style.markerEnd ? ` marker-end="${style.markerEnd}"` : '';

    edgeElements.push(`
                <path class="${style.klass}" d="M ${startX} ${fromCenterY} C ${c1x} ${fromCenterY}, ${c2x} ${toCenterY}, ${endX} ${toCenterY}"${markerStartAttr}${markerEndAttr}>
                    <title>${escapeHtml(`${relation.from} ${relation.relation} ${relation.to}`)}</title>
                </path>`);
  }

  const svg = `
            <svg class="model-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Full DICOM model type relationship diagram">
                <defs>
                    <marker id="model-arrow" markerWidth="10" markerHeight="10" refX="9" refY="5" orient="auto">
                        <path d="M 0 0 L 10 5 L 0 10 z"></path>
                    </marker>
                    <marker id="model-triangle" markerWidth="12" markerHeight="12" refX="11" refY="6" orient="auto">
                        <path d="M 0 0 L 12 6 L 0 12 z"></path>
                    </marker>
                    <marker id="model-diamond" markerWidth="14" markerHeight="10" refX="7" refY="5" orient="auto-start-reverse">
                        <path d="M 0 5 L 4 0 L 8 5 L 4 10 z"></path>
                    </marker>
                    <marker id="model-open-diamond" markerWidth="14" markerHeight="10" refX="7" refY="5" orient="auto-start-reverse">
                        <path d="M 0 5 L 4 0 L 8 5 L 4 10 z"></path>
                    </marker>
                </defs>
                <g class="model-domains">${domainBlocks.join('')}
                </g>
                <g class="model-edges">${edgeElements.join('')}
                </g>
                <g class="model-nodes">${nodeElements.join('')}
                </g>
            </svg>`;

  return {
    svg,
    nodeCount: typeInfos.length,
    edgeCount: relations.length
  };
}

function renderDiagramPage(typeInfos) {
  const diagram = buildFullModelDiagramSvg(typeInfos);

  return `<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="description" content="EASI DICOM&reg; full type model diagram in SVG.">
    <title>EASI | DICOM&reg; Type Diagram</title>
    <link rel="stylesheet" href="../assets/styles.css">
    <script defer src="../assets/app.js"></script>
</head>
<body>
    <div class="layout">
        <aside class="sidebar">
            <div class="brand">
                <div class="brand-mark">E</div>
                <div>
                    <h1>EASI Standard</h1>
                    <p>Technical Reference</p>
                </div>
            </div>

            <span class="badge normative">Normative</span>
            <span class="badge informative">Informative</span>${NAV_HTML}

            <div class="nav-section">
                <span class="nav-label">Edition</span>
                <p class="page-meta">Draft v1.0 Candidate<br>April 3, 2026</p>
            </div>
        </aside>

        <main class="page">
            <section class="page-hero reveal">
                <h2>DICOM&reg; Full Type Diagram</h2>
                <p>
                    Complete high-level model view across core, entity, and module type domains,
                    rendered as SVG for scalable, printable reference.
                </p>
                <p class="page-meta">
                    Types: ${diagram.nodeCount} &nbsp;|&nbsp; Basic relationships: ${diagram.edgeCount}
                </p>
            </section>

            <section class="section reveal">
                <h3>Diagram</h3>
                <p>Node links navigate directly to each type definition page.</p>
                <div class="model-diagram">
${diagram.svg}
                </div>
                <div class="callout informative">
                    <h4>Relationship Legend</h4>
                    <p><code>--|&gt;</code> inheritance, <code>..&gt;</code> usage/dependency, <code>*--</code> composition, <code>o--</code> aggregation.</p>
                </div>
            </section>

            <p class="footer-note">
                <a href="index.html">Back to DICOM&reg; Type Index</a>
            </p>
        </main>
    </div>
</body>
</html>
`;
}

function renderIndexPage(typeInfos) {
  const domainGroups = Array.from(typeInfos.reduce((map, typeInfo) => {
    const domain = typeInfo.domain || 'Other';
    if (!map.has(domain)) {
      map.set(domain, []);
    }
    map.get(domain).push(typeInfo);
    return map;
  }, new Map()).entries()).sort((a, b) => {
    const left = DOMAIN_ORDER[a[0]] ?? 99;
    const right = DOMAIN_ORDER[b[0]] ?? 99;
    if (left !== right) return left - right;
    return a[0].localeCompare(b[0]);
  });

  const groupedTables = domainGroups.map(([domain, entries]) => {
    const rows = entries.map((typeInfo) => {
      const filterText = [
        typeInfo.name,
        typeInfo.domain,
        typeInfo.category,
        typeInfo.kind,
        typeInfo.summary,
        ...typeInfo.relationships
      ].join(' ').toLowerCase();

      return `
                                <tr data-filter-item="${escapeHtml(filterText)}">
                                    <td><a href="${escapeHtml(typeInfo.slug)}.html">${escapeHtml(typeInfo.name)}</a></td>
                                    <td>${escapeHtml(typeInfo.category)}</td>
                                    <td>${escapeHtml(typeInfo.kind)}</td>
                                    <td>${encodeTrademark(escapeHtml(typeInfo.summary))}</td>
                                </tr>`;
    }).join('');

    return `
                <section class="section reveal domain-catalog">
                    <h3>${escapeHtml(domain)}</h3>
                    <table class="type-catalog-table">
                        <thead>
                            <tr>
                                <th>Type</th>
                                <th>Category</th>
                                <th>Kind</th>
                                <th>Summary</th>
                            </tr>
                        </thead>
                        <tbody>${rows}
                        </tbody>
                    </table>
                </section>`;
  }).join('');

  return `<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="description" content="EASI DICOM&reg; type index covering core, entity, and module types used by composition flows.">
    <title>EASI | DICOM&reg; Model Types</title>
    <link rel="stylesheet" href="../assets/styles.css">
    <script defer src="../assets/app.js"></script>
</head>
<body>
    <div class="layout">
        <aside class="sidebar">
            <div class="brand">
                <div class="brand-mark">E</div>
                <div>
                    <h1>EASI Standard</h1>
                    <p>Technical Reference</p>
                </div>
            </div>

            <span class="badge normative">Normative</span>
            <span class="badge informative">Informative</span>

            <div class="nav-section">
                <a class="nav-link" data-nav-link href="../index.html">Overview</a>
                <a class="nav-link" data-nav-link href="../what-is-an-easi-pipeline.html">What Is an EASI Pipeline?</a>
                <a class="nav-link" data-nav-link href="../core-pipeline.html">Core Pipeline Model</a>
                <a class="nav-link" data-nav-link href="../dimse-pipeline.html">DIMSE Pipeline Model</a>
                <a class="nav-link" data-nav-link href="../advanced-pipeline.html">Advanced Pipeline Use Cases</a>
                <a class="nav-link" data-nav-link href="../stream-processing-model.html">Stream Processing Model</a>
                <a class="nav-link" data-nav-link href="../lifecycle-status.html">Stream Lifecycle</a>
                <a class="nav-link" data-nav-link href="../materialization-model.html">Materialization Model</a>
                <a class="nav-link" data-nav-link href="../conformance.html">Conformance</a>
                <a class="nav-link" data-nav-link href="../dicom-profile-index.html">Profile Index</a>
                <a class="nav-link" data-nav-link href="index.html">Model Types</a>
                <a class="nav-link" data-nav-link href="diagram.html">Type Diagram</a>
                <a class="nav-link" data-nav-link href="../error-catalog.html">Error Catalog</a>
                <a class="nav-link" data-nav-link href="../implementation-boundary.html">Standard Boundary</a>
            </div>

            <div class="nav-section">
                <span class="nav-label">Edition</span>
                <p class="page-meta">Draft v1.0 Candidate<br>April 3, 2026</p>
            </div>
        </aside>

        <main class="page">
            <section class="page-hero reveal">
                <h2>DICOM&reg; Type Index</h2>
                <p>
                    Primary type reference for EASI DICOM&reg; composition, organized across core model types,
                    entity accessors, and module accessors.
                </p>
                <p class="page-meta">
                    Each type page follows the same format: structure, language-neutral and language-specific examples,
                    then UML relationships. For a complete system view, open the
                    <a href="diagram.html">DICOM&reg; type diagram</a>.
                </p>
            </section>

            <section class="section reveal">
                <div class="callout informative">
                    <h4>Type Diagram</h4>
                    <p>
                        Explore the complete DICOM&reg; type relationship map:
                        <a href="diagram.html">Open DICOM&reg; Type Diagram</a>.
                    </p>
                </div>
            </section>

            <section class="section reveal">
                <div class="search">
                    <label for="type-search">Filter types</label>
                    <input id="type-search" type="search" placeholder="Search by type, domain, category, module, entity, pixel, mapping..."
                           data-filter-input data-filter-target="#type-catalog">
                </div>
            </section>

            <div id="type-catalog">
${groupedTables}
            </div>

            <p class="footer-note">
                Informative catalog with language-neutral and language-specific documentation tabs.
            </p>
        </main>
    </div>
</body>
</html>
`;
}

function patchTopLevelTerminology() {
  const topPages = [
    path.join(siteRoot, 'index.html'),
    path.join(siteRoot, 'what-is-an-easi-pipeline.html'),
    path.join(siteRoot, 'core-pipeline.html'),
    path.join(siteRoot, 'dimse-pipeline.html'),
    path.join(siteRoot, 'advanced-pipeline.html'),
    path.join(siteRoot, 'stream-processing-model.html'),
    path.join(siteRoot, 'lifecycle-status.html'),
    path.join(siteRoot, 'materialization-model.html'),
    path.join(siteRoot, 'conformance.html'),
    path.join(siteRoot, 'dicom-profile-index.html'),
    path.join(siteRoot, 'error-catalog.html'),
    path.join(siteRoot, 'implementation-boundary.html')
  ];

  for (const pagePath of topPages) {
    if (!fs.existsSync(pagePath)) continue;
    let html = fs.readFileSync(pagePath, 'utf8');

    html = html.replace(/DICOM&reg; Model Classes/g, 'DICOM&reg; Model Types');
    html = html.replace(/DICOM&reg; Model Class Index/g, 'DICOM&reg; Model Type Index');
    html = html.replace(/Language-Neutral Technical Reference/g, 'Technical Reference');
    html = html.replace(/\s*<span class="nav-label">Specification Index<\/span>\r?\n/g, '\n');
    html = html.replace(
      /<p class="page-meta">Draft v1\.0 Candidate<br>April \d{1,2}, 2026<\/p>/g,
      '<p class="page-meta">Draft v1.0 Candidate<br>April 3, 2026</p>'
    );
    html = html.replace(/class-level references/g, 'type-level references');
    html = html.replace(/Data Model Class Catalog/g, 'Data Model Type Catalog');
    html = html.replace(/class references/g, 'type references');
    html = html.replace(/class pages/g, 'type pages');
    html = html.replace(/>DICOM&reg; Profile Index</g, '>Profile Index<');
    html = html.replace(/>DICOM&reg; Model Types</g, '>Model Types<');
    html = html.replace(/>DICOM&reg; Type Diagram</g, '>Type Diagram<');
    html = html.replace(/>DICOM&reg; Model Diagram</g, '>Type Diagram<');
    html = html.replace(/>Lifecycle and Status</g, '>Stream Lifecycle<');

    if (/<a class="nav-link" data-nav-link href="what-is-an-easi-pipeline\.html">What Is an EASI Pipeline\?<\/a>/.test(html) === false) {
      html = html.replace(
        /([ \t]*<a class="nav-link" data-nav-link href="index\.html">Overview<\/a>\r?\n)/,
        '$1                <a class="nav-link" data-nav-link href="what-is-an-easi-pipeline.html">What Is an EASI Pipeline?</a>\n'
      );
    }

    if (/<a class="nav-link" data-nav-link href="dimse-pipeline\.html">DIMSE Pipeline Model<\/a>/.test(html) === false) {
      html = html.replace(
        /([ \t]*<a class="nav-link" data-nav-link href="core-pipeline\.html">Core Pipeline Model<\/a>\r?\n)/,
        '$1                <a class="nav-link" data-nav-link href="dimse-pipeline.html">DIMSE Pipeline Model</a>\n'
      );
    }

    if (/<a class="nav-link" data-nav-link href="advanced-pipeline\.html">Advanced Pipeline Use Cases<\/a>/.test(html) === false) {
      html = html.replace(
        /([ \t]*<a class="nav-link" data-nav-link href="dimse-pipeline\.html">DIMSE Pipeline Model<\/a>\r?\n)/,
        '$1                <a class="nav-link" data-nav-link href="advanced-pipeline.html">Advanced Pipeline Use Cases</a>\n'
      );
    }

    if (/<a class="nav-link" data-nav-link href="stream-processing-model\.html">Stream Processing Model<\/a>/.test(html) === false) {
      html = html.replace(
        /([ \t]*<a class="nav-link" data-nav-link href="advanced-pipeline\.html">Advanced Pipeline Use Cases<\/a>\r?\n)/,
        '$1                <a class="nav-link" data-nav-link href="stream-processing-model.html">Stream Processing Model</a>\n'
      );
    }

    if (/<a class="nav-link" data-nav-link href="materialization-model\.html">Materialization Model<\/a>/.test(html) === false) {
      html = html.replace(
        /([ \t]*<a class="nav-link" data-nav-link href="lifecycle-status\.html">Stream Lifecycle<\/a>\r?\n)/,
        '$1                <a class="nav-link" data-nav-link href="materialization-model.html">Materialization Model</a>\n'
      );
    }

    if (/href="dicom-model\/diagram\.html"/.test(html) === false) {
      html = html.replace(
        /([ \t]*<a class="nav-link" data-nav-link href="dicom-model\/index\.html">(?:DICOM&reg;\s*)?Model Types<\/a>\r?\n)/,
        '$1                <a class="nav-link" data-nav-link href="dicom-model/diagram.html">Type Diagram</a>\n'
      );
    }

    html = html.replace(
      /\n\s*<a class="nav-link" data-nav-link href="dicom-model\/diagram\.html">Type Diagram<\/a>\r?\n\s*<a class="nav-link" data-nav-link href="error-catalog\.html">Error Catalog<\/a>/g,
      '\n                <a class="nav-link" data-nav-link href="dicom-model/diagram.html">Type Diagram</a>\n                <a class="nav-link" data-nav-link href="error-catalog.html">Error Catalog</a>'
    );

    fs.writeFileSync(pagePath, html, 'utf8');
  }
}

function main() {
  if (!fs.existsSync(dicomModelDir)) {
    throw new Error(`Missing directory: ${dicomModelDir}`);
  }

  const sourceFiles = readSourceFiles();
  const typeNames = sourceFiles.map((filePath) => path.basename(filePath, '.js'));
  const typeNamesSet = new Set(typeNames);

  const sourceDetailsByName = new Map();
  for (const filePath of sourceFiles) {
    const sourceType = parseSourceType(filePath, typeNamesSet);
    if (!sourceType) continue;
    sourceDetailsByName.set(sourceType.typeName, sourceType);
  }

  const typeInfos = sourceFiles.map((filePath) => {
    const name = path.basename(filePath, '.js');
    const slug = slugFromName(name);
    const domain = deriveDomain(filePath);
    const oldPage = parseOldPage(slug);

    const category = (oldPage?.category && oldPage.category.length > 0)
      ? oldPage.category
      : categoryForType(name, domain);

    const oldKind = oldPage?.classType || '';
    const kind = oldKind.length > 0 ? kindToTypeKind(oldKind) : defaultKindForType(name, domain);

    const summaryFallback = `${splitCamel(name)} type reference for EASI DICOM® processing.`;
    const summary = normalizeSentence(oldPage?.summary || '', summaryFallback);

    const canonicalRoleFallback = `Provides ${splitCamel(name).toLowerCase()} semantics for interoperable EASI composition flows.`;
    const canonicalRole = normalizeSentence(oldPage?.canonicalRole || '', canonicalRoleFallback);

    const pipelineExposureFallback = 'Materialized or traversed as part of streaming parse outputs and terminal products.';
    const pipelineExposure = normalizeSentence(oldPage?.pipelineExposure || '', pipelineExposureFallback);

    const oldRelationships = Array.isArray(oldPage?.relationships) ? oldPage.relationships : [];
    const sourceDetail = sourceDetailsByName.get(name);

    const relationshipNames = new Set();
    if (sourceDetail && sourceDetail.parentType && typeNamesSet.has(sourceDetail.parentType)) {
      relationshipNames.add(sourceDetail.parentType);
    }

    for (const relation of oldRelationships) {
      if (typeNamesSet.has(relation)) {
        relationshipNames.add(relation);
      }
    }

    if (sourceDetail) {
      for (const relation of sourceDetail.relationships) {
        relationshipNames.add(relation.to);
      }
    }

    const relationshipList = Array.from(relationshipNames).sort((a, b) => a.localeCompare(b));

    const relationshipObjects = sourceDetail ? sourceDetail.relationships.slice() : [];
    for (const relationName of relationshipList) {
      if (relationshipObjects.some((relation) => relation.to === relationName)) continue;
      relationshipObjects.push({
        from: name,
        relation: '--',
        to: relationName,
        intent: 'associated with'
      });
    }

    return {
      name,
      slug,
      filePath,
      domain: oldPage?.domain || domain,
      category,
      kind,
      summary,
      canonicalRole,
      pipelineExposure,
      oldPage,
      source: sourceDetail || { members: [], relationships: [] },
      relationships: relationshipList,
      relationshipObjects
    };
  });

  typeInfos.sort((a, b) => {
    const domainDiff = (DOMAIN_ORDER[a.domain] ?? 99) - (DOMAIN_ORDER[b.domain] ?? 99);
    if (domainDiff !== 0) return domainDiff;
    return a.name.localeCompare(b.name);
  });

  TYPE_SLUG_BY_NAME = new Map(typeInfos.map((typeInfo) => [typeInfo.name, typeInfo.slug]));

  for (const typeInfo of typeInfos) {
    typeInfo.relationships = typeInfo.relationships.filter((value) => value !== typeInfo.name);
    typeInfo.relationshipObjects = typeInfo.relationshipObjects
      .filter((value) => value.to !== typeInfo.name)
      .filter((value, index, array) => array.findIndex((item) => item.to === value.to && item.relation === value.relation && item.intent === value.intent) === index);

    const html = renderTypePage({
      ...typeInfo,
      relationships: typeInfo.relationships,
      source: typeInfo.source,
      oldPage: typeInfo.oldPage,
      relationshipsDetailed: typeInfo.relationshipObjects,
      relationshipObjects: typeInfo.relationshipObjects
    });

    fs.writeFileSync(path.join(dicomModelDir, `${typeInfo.slug}.html`), html, 'utf8');
  }

  // Regenerate index page.
  fs.writeFileSync(
    path.join(dicomModelDir, 'index.html'),
    renderIndexPage(typeInfos),
    'utf8'
  );

  // Regenerate full model diagram page.
  fs.writeFileSync(
    path.join(dicomModelDir, 'diagram.html'),
    renderDiagramPage(typeInfos),
    'utf8'
  );

  // Remove obsolete model pages for implementation helpers, if present.
  const obsoletePages = [
    path.join(dicomModelDir, 'constants.html'),
    path.join(dicomModelDir, 'utilities.html'),
    path.join(dicomModelDir, 'document-wrapper.html'),
    path.join(dicomModelDir, 'document-unwrapper.html')
  ];
  for (const obsolete of obsoletePages) {
    if (fs.existsSync(obsolete)) {
      fs.unlinkSync(obsolete);
    }
  }

  patchTopLevelTerminology();

  console.log(`Generated ${typeInfos.length} DICOM model type pages.`);
}

main();
