#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const siteRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(siteRoot, '..', '..');
const apiRoot = path.join(siteRoot, 'api');
const topIndexPath = path.join(siteRoot, 'index.html');
const contractPath = path.join(repoRoot, 'easi-js', 'doc', 'contracts', 'easi-api.contract.json');

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/\n/g, ' ');
}

function ensureDirectory(dirPath) {
  if (fs.existsSync(dirPath) === false) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function slugify(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function hash8(value) {
  return crypto.createHash('sha1').update(String(value)).digest('hex').slice(0, 8);
}

function escapeRegex(value) {
  return String(value ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function readContract() {
  if (fs.existsSync(contractPath) === false) {
    throw new Error(`Missing API contract: ${contractPath}`);
  }

  const text = fs.readFileSync(contractPath, 'utf8');
  const parsed = JSON.parse(text);

  if (Array.isArray(parsed.modules) === false) {
    throw new Error('Invalid API contract: modules array is missing.');
  }

  return parsed;
}

function withLineBreaks(value) {
  return escapeHtml(String(value ?? '')).replace(/\n/g, '<br>');
}

function renderLanguageAwareCode(value, kind = 'literal') {
  const text = String(value ?? '');
  return `<code data-lang-source="${escapeAttribute(text)}" data-lang-kind="${escapeAttribute(kind)}">${escapeHtml(text)}</code>`;
}

function renderApiLanguagePills() {
  return `            <section class="section reveal api-language-switcher" data-api-language-switcher>
                <h3>Language View</h3>
                <div class="api-language-pill-row" role="tablist" aria-label="API language view">
                    <button type="button" class="api-language-pill active" data-api-language="neutral" aria-selected="true">Language-Neutral</button>
                    <button type="button" class="api-language-pill" data-api-language="javascript" aria-selected="false">JavaScript</button>
                    <button type="button" class="api-language-pill" data-api-language="csharp" aria-selected="false">C#</button>
                    <button type="button" class="api-language-pill" data-api-language="java" aria-selected="false">Java</button>
                    <button type="button" class="api-language-pill" data-api-language="python" aria-selected="false">Python</button>
                </div>
            </section>`;
}

function formatBoolean(value) {
  return value === true ? 'Yes' : 'No';
}

function splitTopLevelUnion(value) {
  const text = String(value || '').trim();
  if (text.length === 0) {
    return [];
  }

  const tokens = [];
  let current = '';

  let parenDepth = 0;
  let bracketDepth = 0;
  let braceDepth = 0;
  let angleDepth = 0;
  let quote = null;

  for (let index = 0; index < text.length; index++) {
    const char = text[index];

    if (quote != null) {
      current += char;
      if (char === '\\') {
        if (index + 1 < text.length) {
          current += text[index + 1];
          index += 1;
        }
        continue;
      }

      if (char === quote) {
        quote = null;
      }

      continue;
    }

    if (char === '\'' || char === '"' || char === '`') {
      quote = char;
      current += char;
      continue;
    }

    if (char === '(') parenDepth += 1;
    if (char === ')') parenDepth = Math.max(0, parenDepth - 1);

    if (char === '[') bracketDepth += 1;
    if (char === ']') bracketDepth = Math.max(0, bracketDepth - 1);

    if (char === '{') braceDepth += 1;
    if (char === '}') braceDepth = Math.max(0, braceDepth - 1);

    if (char === '<') angleDepth += 1;
    if (char === '>') angleDepth = Math.max(0, angleDepth - 1);

    if (
      char === '|'
      && parenDepth === 0
      && bracketDepth === 0
      && braceDepth === 0
      && angleDepth === 0
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

function renderTypeAsVerticalCode(typeText) {
  if (typeText == null) {
    return '<span class="page-meta">n/a</span>';
  }

  const text = String(typeText).trim();
  if (text.length === 0) {
    return '<span class="page-meta">n/a</span>';
  }

  const parts = splitTopLevelUnion(text);
  if (parts.length <= 1) {
    return renderLanguageAwareCode(text, 'type-token');
  }

  return parts.map((part) => renderLanguageAwareCode(part, 'type-token')).join('<br />');
}

function renderTypeTokenWithLinks(typeToken, model, preferredModulePath = null) {
  const text = String(typeToken || '').trim();
  if (text.length === 0) {
    return '<span class="page-meta">n/a</span>';
  }

  if (model == null) {
    return renderLanguageAwareCode(text, 'type-token');
  }

  const matches = [...text.matchAll(/\b[A-Za-z_][A-Za-z0-9_]*\b/g)];
  if (matches.length === 0) {
    return renderLanguageAwareCode(text, 'type-token');
  }

  const resolved = matches.map((match) => ({
    identifier: match[0],
    index: match.index,
    classRecord: resolveClassRecordByName(model, match[0], preferredModulePath)
  }));

  if (resolved.some((item) => item.classRecord != null) === false) {
    return renderLanguageAwareCode(text, 'type-token');
  }

  let cursor = 0;
  let html = '';

  for (const item of resolved) {
    if (item.index > cursor) {
      html += renderLanguageAwareCode(text.slice(cursor, item.index), 'type-token');
    }

    if (item.classRecord != null) {
      html += `<a href="${escapeAttribute(item.classRecord.fileName)}">${renderLanguageAwareCode(item.identifier, 'type-token')}</a>`;
    } else {
      html += renderLanguageAwareCode(item.identifier, 'type-token');
    }

    cursor = item.index + item.identifier.length;
  }

  if (cursor < text.length) {
    html += renderLanguageAwareCode(text.slice(cursor), 'type-token');
  }

  return html;
}

function renderTypeAsVerticalCodeLinked(typeText, model, preferredModulePath = null) {
  if (typeText == null) {
    return '<span class="page-meta">n/a</span>';
  }

  const text = String(typeText).trim();
  if (text.length === 0) {
    return '<span class="page-meta">n/a</span>';
  }

  const parts = splitTopLevelUnion(text);
  if (parts.length <= 1) {
    return renderTypeTokenWithLinks(text, model, preferredModulePath);
  }

  return parts
    .map((part) => renderTypeTokenWithLinks(part, model, preferredModulePath))
    .join('<br />');
}

function humanizeIdentifier(value) {
  const text = String(value || '').trim();
  if (text.length === 0) {
    return 'this value';
  }

  const spaced = text
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .toLowerCase();

  return spaced;
}

function describeMemberPurpose(member, className) {
  const name = String(member?.name || 'member');
  const kind = String(member?.kind || 'method').toLowerCase();
  const action = humanizeIdentifier(name);
  const suffix = (prefix) => humanizeIdentifier(name.slice(prefix.length));

  if (kind === 'method') {
    if (name.startsWith('with') && name.length > 4) {
      return `It configures ${suffix('with')} behavior for ${className}.`;
    }

    if (name.startsWith('from') && name.length > 4) {
      return `It selects ingress/source handling via ${suffix('from')}.`;
    }

    if (name.startsWith('of') && name.length > 2) {
      return `It selects parse/materialization behavior as ${suffix('of')}.`;
    }

    if (name.startsWith('to') && name.length > 2) {
      return `It defines terminal output contract as ${suffix('to')}.`;
    }

    if (name.startsWith('into') && name.length > 4) {
      return `It defines output delivery destination via ${suffix('into')}.`;
    }

    if (name.startsWith('on') && name.length > 2) {
      return `It scopes handling to ${suffix('on')} conditions.`;
    }

    if (name.startsWith('when') && name.length > 4) {
      return `It applies conditional branching for ${suffix('when')}.`;
    }

    if (name.startsWith('get') && name.length > 3) {
      return `It retrieves ${suffix('get')} state from ${className}.`;
    }

    if (name.startsWith('set') && name.length > 3) {
      return `It updates ${suffix('set')} state on ${className}.`;
    }

    if (name.startsWith('build')) {
      return `It finalizes and returns the built ${className} artifact.`;
    }

    return `It provides ${action} behavior on ${className}.`;
  }

  if (kind === 'getter') {
    return `This getter exposes ${action} from ${className}.`;
  }

  if (kind === 'setter') {
    return `This setter updates ${action} on ${className}.`;
  }

  return `This ${kind} contributes to ${className} behavior for ${action}.`;
}

function describeParameterPurpose(parameterName, memberName) {
  const lower = String(parameterName || '').toLowerCase();

  if (lower === 'options') {
    return 'It provides optional configuration for this operation.';
  }

  if (lower === 'source') {
    return 'It identifies the input source consumed by this member.';
  }

  if (lower === 'reader') {
    return 'It supplies the reader implementation used to ingest input.';
  }

  if (lower === 'parser') {
    return 'It supplies the parser implementation used to materialize input state.';
  }

  if (lower === 'handler') {
    return 'It supplies the handler that receives parser lifecycle events.';
  }

  if (lower === 'transport') {
    return 'It supplies the transport adapter used for I/O exchange.';
  }

  if (lower === 'mapping') {
    return 'It supplies the mapping strategy used to project output.';
  }

  if (lower === 'selection') {
    return 'It supplies the selection strategy used to extract output.';
  }

  return `It provides the ${humanizeIdentifier(parameterName)} input used by ${memberName}.`;
}

function describeOptionFieldPurpose(field, contract) {
  const name = String(field?.name || '').trim();
  const lower = name.toLowerCase();
  const memberName = contract?.member?.name || 'this member';

  if (lower === 'onemit') {
    return 'Callback invoked for each emitted output item.';
  }

  if (lower === 'contenttype') {
    return 'Declares or overrides source MIME/content type metadata.';
  }

  if (lower === 'contentlength') {
    return 'Supplies declared source byte-length metadata when available.';
  }

  if (lower === 'transport') {
    return 'Provides an explicit transport adapter override for this operation.';
  }

  if (lower === 'recursive') {
    return 'Controls whether directory traversal includes nested folders.';
  }

  if (lower === 'includehidden') {
    return 'Controls whether hidden files or directories are included.';
  }

  if (lower === 'extensions') {
    return 'Filters files by extension set before processing.';
  }

  if (lower === 'maxfiles') {
    return 'Limits how many files are processed in this invocation.';
  }

  if (lower === 'sort') {
    return 'Selects file ordering strategy before emission.';
  }

  if (lower === 'continueonerror') {
    return 'Determines whether processing continues after per-file errors.';
  }

  if (lower === 'processexistingonstart') {
    return 'Controls whether existing files are emitted when watch starts.';
  }

  if (lower === 'settlems') {
    return 'Debounce interval (ms) used before treating file writes as stable.';
  }

  if (lower === 'stablechecks') {
    return 'Number of stability checks before a file is emitted.';
  }

  if (lower === 'dedupewindowms') {
    return 'Window (ms) used to suppress duplicate watch events.';
  }

  if (lower === 'reconcileintervalms') {
    return 'Interval (ms) for periodic filesystem reconciliation scans.';
  }

  if (lower === 'maxqueue') {
    return 'Maximum queued events buffered before overflow handling.';
  }

  if (lower === 'overflow') {
    return 'Defines queue overflow policy when incoming events exceed capacity.';
  }

  if (lower === 'method') {
    return 'Specifies the HTTP method for request-based sources.';
  }

  if (lower === 'headers') {
    return 'Supplies request header values for transport invocation.';
  }

  if (lower === 'body') {
    return 'Supplies request payload/body content.';
  }

  if (lower === 'signal') {
    return 'Provides cancellation signal support for this operation.';
  }

  if (lower === 'timeoutms') {
    return 'Specifies request timeout in milliseconds.';
  }

  return `Controls ${humanizeIdentifier(name)} behavior for ${memberName}.`;
}

function summarizeDescription(description, fallback) {
  const text = String(description || '').trim();
  if (text.length > 0) {
    return text.replace(/\s+/g, ' ').trim();
  }

  return String(fallback || '').trim();
}

function describeClassPurpose(classRecord) {
  const summary = summarizeDescription(classRecord?.description, '');
  if (summary.length > 0) {
    return summary;
  }

  return `This class provides ${humanizeIdentifier(classRecord?.name || 'core')} behavior in the EASI API.`;
}

function formatParameterSignature(parameters) {
  if (!Array.isArray(parameters) || parameters.length === 0) {
    return '<code>()</code>';
  }

  const rendered = parameters.map((param) => {
    let nameToken = String(param.name || 'param');

    if (param.rest === true) {
      nameToken = `...${nameToken}`;
    }

    if (param.destructured === true) {
      nameToken = String(param.signature || param.raw || param.name || 'param');
    }

    if (param.optional === true) {
      nameToken = `${nameToken}?`;
    }

    const isOptionsParameter = (String(param.name || '').toLowerCase() === 'options');
    let renderedParameter = renderLanguageAwareCode(nameToken, 'parameter-name');

    if (param.type) {
      renderedParameter = `${renderLanguageAwareCode(nameToken, 'parameter-name')}${renderLanguageAwareCode(':', 'literal')}<br />${isOptionsParameter ? renderLanguageAwareCode('object', 'type-token') : renderTypeAsVerticalCode(param.type)}`;
    }

    if (param.defaultValue != null && String(param.defaultValue).trim().length > 0) {
      renderedParameter += `<br /><code>${escapeHtml(`= ${param.defaultValue}`)}</code>`;
    }

    return renderedParameter;
  });

  return rendered.join('<br />');
}

function formatReturn(returns, options = null) {
  if (returns == null) {
    return '<span class="page-meta">n/a</span>';
  }

  const linkTypes = options?.linkTypes === true;
  const typeText = returns.type
    ? (linkTypes
      ? renderTypeAsVerticalCodeLinked(returns.type, options?.model || null, options?.preferredModulePath || null)
      : renderTypeAsVerticalCode(returns.type))
    : renderLanguageAwareCode('unknown', 'type-token');
  const descriptionText = returns.description ? `<br><span class="page-meta">${withLineBreaks(returns.description)}</span>` : '';
  return `${typeText}${descriptionText}`;
}

function extractReferenceNavFromTopLevelIndex() {
  const html = fs.readFileSync(topIndexPath, 'utf8');
  const starts = [...html.matchAll(/<div class="nav-section">/g)].map((match) => match.index);

  if (starts.length < 2) {
    throw new Error('Unable to locate reference nav section in top-level index page.');
  }

  return html.slice(starts[0], starts[1]).trimRight();
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

function renderPage({ title, description, navBlock, bodyHtml, footerNote }) {
  return `<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="description" content="${escapeAttribute(description)}">
    <title>${escapeHtml(title)}</title>
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

${navBlock}
            <div class="nav-section">
                <span class="nav-label">Edition</span>
                <p class="page-meta">Draft v1.0 Candidate<br>April 3, 2026</p>
            </div>
            <span class="badge normative">Normative</span>
            <span class="badge informative">Informative</span>
        </aside>

        <main class="page">
${bodyHtml}
            <p class="footer-note">${escapeHtml(footerNote)}</p>
        </main>
    </div>
</body>
</html>
`;
}

function writeFile(filePath, contents) {
  fs.writeFileSync(filePath, contents, 'utf8');
}

function cleanupGeneratedApiPages() {
  if (fs.existsSync(apiRoot) === false) {
    return;
  }

  const entries = fs.readdirSync(apiRoot, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isFile() && entry.name.endsWith('.html')) {
      fs.unlinkSync(path.join(apiRoot, entry.name));
    }
  }
}

function memberKey(member) {
  return `${member.kind || 'method'}::${member.name || ''}`;
}

function resolveExtendsIdentifier(extendsText) {
  if (extendsText == null) {
    return null;
  }

  const trimmed = String(extendsText).trim();
  if (trimmed.length === 0) {
    return null;
  }

  const cleaned = trimmed
    .replace(/\s+/g, ' ')
    .replace(/<[^>]*>/g, '')
    .trim();

  const matches = cleaned.match(/[A-Za-z_$][A-Za-z0-9_$]*/g);
  if (matches == null || matches.length === 0) {
    return null;
  }

  return matches[matches.length - 1];
}

function splitTopLevel(text, token) {
  const value = String(text ?? '');

  let parenDepth = 0;
  let bracketDepth = 0;
  let braceDepth = 0;

  for (let index = 0; index < value.length; index++) {
    const char = value[index];

    if (char === '(') parenDepth += 1;
    if (char === ')') parenDepth = Math.max(0, parenDepth - 1);

    if (char === '[') bracketDepth += 1;
    if (char === ']') bracketDepth = Math.max(0, bracketDepth - 1);

    if (char === '{') braceDepth += 1;
    if (char === '}') braceDepth = Math.max(0, braceDepth - 1);

    if (char === token && parenDepth === 0 && bracketDepth === 0 && braceDepth === 0) {
      return {
        left: value.slice(0, index),
        right: value.slice(index + 1)
      };
    }
  }

  return null;
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

function extractTopLevelObjectBodies(typeText) {
  const text = String(typeText || '');
  const bodies = [];

  let depth = 0;
  let start = -1;
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
      if (depth === 0) {
        start = index + 1;
      }
      depth += 1;
      continue;
    }

    if (char === '}') {
      if (depth > 0) {
        depth -= 1;
        if (depth === 0 && start >= 0) {
          bodies.push(text.slice(start, index));
          start = -1;
        }
      }
    }
  }

  return bodies;
}

function normalizeFieldName(nameToken) {
  let name = String(nameToken || '').trim();
  let optional = false;

  if (name.startsWith('[') && name.endsWith(']')) {
    name = name.slice(1, -1).trim();
    optional = true;
  }

  if (name.endsWith('?')) {
    name = name.slice(0, -1).trim();
    optional = true;
  }

  const quoted = name.match(/^['"](.+)['"]$/);
  if (quoted != null) {
    name = quoted[1];
  }

  return {
    name,
    optional
  };
}

function parseObjectFieldsFromType(typeText) {
  if (typeText == null) {
    return [];
  }

  const bodies = extractTopLevelObjectBodies(typeText);
  const shapes = [];

  for (const body of bodies) {
    const entries = splitTopLevelComma(body);
    const fields = [];

    for (const entry of entries) {
      if (entry.startsWith('...')) {
        continue;
      }

      const split = splitTopLevel(entry, ':');
      if (split == null) {
        continue;
      }

      const normalized = normalizeFieldName(split.left);
      const fieldType = split.right.trim();

      if (normalized.name.length === 0 || fieldType.length === 0) {
        continue;
      }

      fields.push({
        name: normalized.name,
        optional: normalized.optional,
        type: fieldType
      });
    }

    if (fields.length > 0) {
      const key = JSON.stringify(fields);
      if (shapes.some((shape) => JSON.stringify(shape.fields) === key) === false) {
        shapes.push({
          fields
        });
      }
    }
  }

  return shapes;
}

function parameterKeyForMember(member, parameter, index) {
  const parameterName = parameter?.name || `param${index + 1}`;
  return `${memberKey(member)}::${parameterName}`;
}

function buildOptionContractCatalog(classRecord, members) {
  const contracts = [];
  const byParameterKey = new Map();

  for (const member of members || []) {
    const parameters = member.parameters || [];

    for (let index = 0; index < parameters.length; index++) {
      const parameter = parameters[index];
      const parameterName = String(parameter?.name || '').trim();
      const isOptionsParameter = parameterName.toLowerCase() === 'options';
      const parsedShapes = parseObjectFieldsFromType(parameter.type);
      const shapes = parsedShapes.length > 0
        ? parsedShapes
        : (isOptionsParameter ? [{ fields: [], openObject: true }] : []);

      if (shapes.length === 0) {
        continue;
      }

      const parameterKey = parameterKeyForMember(member, parameter, index);
      const baseId = `option-${slugify(member.name || member.kind || 'member')}-${slugify(parameter.name || `param${index + 1}`)}-${hash8(`${classRecord.id}:${parameterKey}`)}`;

      const shapeRecords = shapes.map((shape, shapeIndex) => ({
        ...shape,
        fields: Array.isArray(shape?.fields) ? shape.fields : [],
        openObject: shape?.openObject === true,
        index: shapeIndex + 1,
        anchorId: `${baseId}-shape-${shapeIndex + 1}`
      }));

      const contract = {
        member,
        parameter,
        parameterKey,
        baseId,
        shapeRecords
      };

      contracts.push(contract);
      byParameterKey.set(parameterKey, contract);
    }
  }

  return {
    contracts,
    byParameterKey
  };
}

function renderOptionContractReference(contract, parameterName = null) {
  if (contract == null) {
    return '';
  }

  if (!Array.isArray(contract.shapeRecords) || contract.shapeRecords.length === 0) {
    return '';
  }

  if (String(parameterName || '').toLowerCase() === 'options') {
    return 'See <a href="#option-contracts">Option Contracts</a> below.';
  }

  if (contract.shapeRecords.length === 1) {
    const only = contract.shapeRecords[0];
    return `See <a href="#${escapeAttribute(only.anchorId)}">Option Contract</a>.`;
  }

  const links = contract.shapeRecords.map((shape) => (
    `<a href="#${escapeAttribute(shape.anchorId)}">Shape ${shape.index}</a>`
  ));

  return `See Option Contracts: ${links.join(', ')}.`;
}

function removeOptionalNullFromType(typeText, optional) {
  if (optional !== true || typeText == null) {
    return typeText;
  }

  const text = String(typeText).trim();
  if (text.length === 0) {
    return typeText;
  }

  const normalized = text
    .replace(/\bnull\b\s*\|\s*/gi, '')
    .replace(/\s*\|\s*\bnull\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  if (normalized.length === 0) {
    return '';
  }

  const parts = splitTopLevelUnion(normalized);
  if (parts.length <= 1) {
    return parts[0]?.trim().toLowerCase() === 'null' ? '' : normalized;
  }

  const filtered = parts.filter((part) => String(part).trim().toLowerCase() !== 'null');
  if (filtered.length === 0) {
    return '';
  }

  return filtered.join(' | ');
}

function getScalarTypeAssumption(typeText) {
  if (typeText == null) {
    return '';
  }

  const text = String(typeText).trim();
  if (text.length === 0) {
    return '';
  }

  const parts = splitTopLevelUnion(text).map((part) => String(part).trim()).filter((part) => part.length > 0);
  if (parts.length !== 1) {
    return '';
  }

  const normalized = parts[0].toLowerCase();

  if (normalized === 'string') {
    return 'Type detail: expects a string value.';
  }

  if (normalized === 'object') {
    return 'Type detail: expects an object value (shape depends on context).';
  }

  if (normalized === 'number') {
    return 'Type detail: expects a numeric value.';
  }

  if (normalized === 'boolean') {
    return 'Type detail: expects a boolean flag value.';
  }

  if (normalized === 'function') {
    return 'Type detail: expects a callback/function value.';
  }

  return '';
}

function renderParameterDetails(classRecord, member, parameters, optionContractsByParameterKey, model) {
  if (!Array.isArray(parameters) || parameters.length === 0) {
    return '<p class="page-meta">No parameters.</p>';
  }

  const rows = parameters.map((parameter, index) => {
    const key = parameterKeyForMember(member, parameter, index);
    const contract = optionContractsByParameterKey?.get(key) || null;
    const isOptionsParameter = (String(parameter?.name || '').toLowerCase() === 'options');
    const referenceText = renderOptionContractReference(contract, parameter?.name || null);
    const displayType = (isOptionsParameter && contract != null)
      ? 'object'
      : removeOptionalNullFromType(parameter?.type || null, parameter?.optional === true);
    const renderedType = (isOptionsParameter && contract != null)
      ? '<code>object</code>'
      : (displayType
        ? renderTypeAsVerticalCodeLinked(displayType, model, classRecord?.modulePath || null)
        : '<span class="page-meta">n/a</span>');
    const defaultRaw = parameter.defaultValue == null || String(parameter.defaultValue).trim().length === 0
      ? 'null'
      : String(parameter.defaultValue).trim();
    const requirementText = parameter.optional === true
      ? `(Optional - ${defaultRaw})`
      : '(Required)';
    const baseDescription = summarizeDescription(parameter.description, 'No description provided.');
    const scalarAssumption = (isOptionsParameter && contract != null) ? '' : getScalarTypeAssumption(displayType);
    const parameterPurpose = describeParameterPurpose(parameter?.name || 'param', member?.name || 'member');
    const coherentSentenceParts = [baseDescription, parameterPurpose];
    if (scalarAssumption.length > 0) {
      coherentSentenceParts.push(scalarAssumption);
    }
    const coherentSentence = coherentSentenceParts.join(' ');
    const referenceSuffix = referenceText ? ` <span class="page-meta">${referenceText}</span>` : '';

    return `
                            <tr>
                                <td>${renderLanguageAwareCode(parameter.name || 'param', 'parameter-name')}</td>
                                <td class="member-param-type">${renderedType}</td>
                                <td><span class="page-meta">${escapeHtml(requirementText)}</span> ${escapeHtml(coherentSentence)}${referenceSuffix}</td>
                            </tr>`;
  }).join('');

  return `
                    <div class="table-scroll">
                        <table class="member-parameter-table">
                            <thead>
                                <tr>
                                    <th>Parameter</th>
                                    <th>Type</th>
                                    <th>Description</th>
                                </tr>
                            </thead>
                            <tbody>
${rows}
                            </tbody>
                        </table>
                    </div>`;
}

function toObjectLiteralValueText(rawValue) {
  const trimmed = String(rawValue || '').trim().replace(/,\s*$/g, '');
  if (trimmed.length < 2) {
    return trimmed;
  }

  const first = trimmed[0];
  const last = trimmed[trimmed.length - 1];
  if ((first === '\'' || first === '"' || first === '`') && last === first) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

function extractObjectConstantEntriesFromSource(modulePath, constantName) {
  if (modulePath == null || constantName == null) {
    return [];
  }

  const sourcePath = path.join(repoRoot, 'easi-js', modulePath);
  if (fs.existsSync(sourcePath) === false) {
    return [];
  }

  const sourceText = fs.readFileSync(sourcePath, 'utf8');
  const constantPattern = new RegExp(
    `(?:export\\s+)?(?:const|let|var)\\s+${escapeRegex(constantName)}\\s*=\\s*\\{([\\s\\S]*?)\\};`,
    'm'
  );

  const bodyMatch = sourceText.match(constantPattern);
  if (bodyMatch == null) {
    return [];
  }

  const body = bodyMatch[1];
  const segments = splitTopLevelComma(body);
  const entries = [];

  for (const segment of segments) {
    const withoutBlockComments = String(segment || '').replace(/\/\*[\s\S]*?\*\//g, '');
    const normalized = withoutBlockComments
      .split('\n')
      .map((line) => line.replace(/\/\/.*$/g, '').trim())
      .join(' ')
      .trim();

    if (normalized.length === 0) {
      continue;
    }

    const pairMatch = normalized.match(/^(?:['"`]([^'"`]+)['"`]|([A-Za-z_$][A-Za-z0-9_$]*))\s*:\s*(.+)$/);
    if (pairMatch == null) {
      continue;
    }

    const key = pairMatch[1] || pairMatch[2];
    const valueRaw = String(pairMatch[3] || '').trim();
    if (key == null || key.trim().length === 0) {
      continue;
    }

    const value = toObjectLiteralValueText(valueRaw);
    entries.push({
      name: key.trim(),
      value: value.length > 0 ? value : key.trim()
    });
  }

  return entries;
}

function buildConstantEntries(modulePath, constantDef) {
  const fromSource = extractObjectConstantEntriesFromSource(modulePath, constantDef?.name);
  if (fromSource.length > 0) {
    return fromSource;
  }

  const summaryKeys = Array.isArray(constantDef?.initializerSummary?.keys)
    ? constantDef.initializerSummary.keys
    : [];

  return summaryKeys.map((key) => ({
    name: key,
    value: key
  }));
}

function buildReferenceModel(contract) {
  const modules = [...contract.modules].sort((a, b) => String(a.path).localeCompare(String(b.path)));

  const classRecords = [];
  const constantRecords = [];

  for (const moduleDef of modules) {
    for (const classDef of moduleDef.classes || []) {
      const classKey = `${moduleDef.path}::${classDef.name}`;
      const classSlug = `${slugify(classDef.name)}-${hash8(classKey)}`;

      classRecords.push({
        ...classDef,
        modulePath: moduleDef.path,
        moduleCategory: moduleDef.category,
        moduleSummary: moduleDef.summary,
        moduleConstants: moduleDef.constants || [],
        moduleFunctions: moduleDef.functions || [],
        fileName: `class-${classSlug}.html`
      });
    }

    for (const constantDef of moduleDef.constants || []) {
      const constantKey = `${moduleDef.path}::${constantDef.name}`;
      const constantSlug = `${slugify(constantDef.name)}-${hash8(constantKey)}`;

      constantRecords.push({
        ...constantDef,
        modulePath: moduleDef.path,
        moduleCategory: moduleDef.category,
        moduleSummary: moduleDef.summary,
        entries: buildConstantEntries(moduleDef.path, constantDef),
        fileName: `constant-${constantSlug}.html`
      });
    }
  }

  classRecords.sort((a, b) => {
    const byName = String(a.name).localeCompare(String(b.name));
    if (byName !== 0) {
      return byName;
    }

    return String(a.modulePath).localeCompare(String(b.modulePath));
  });

  constantRecords.sort((a, b) => {
    const byName = String(a.name).localeCompare(String(b.name));
    if (byName !== 0) {
      return byName;
    }

    return String(a.modulePath).localeCompare(String(b.modulePath));
  });

  const classesByName = new Map();
  const classesById = new Map();
  const constantsById = new Map();

  for (const classRecord of classRecords) {
    if (classesByName.has(classRecord.name) === false) {
      classesByName.set(classRecord.name, []);
    }
    classesByName.get(classRecord.name).push(classRecord);
    classesById.set(classRecord.id, classRecord);
  }

  for (const constantRecord of constantRecords) {
    constantsById.set(constantRecord.id, constantRecord);
  }

  for (const classRecord of classRecords) {
    classRecord.moduleConstants = (classRecord.moduleConstants || []).map((constantDef) => {
      const linked = constantsById.get(constantDef.id);
      if (linked == null) {
        return constantDef;
      }

      return {
        ...constantDef,
        fileName: linked.fileName
      };
    });
  }

  const standaloneConstantModules = modules
    .filter((moduleDef) => (moduleDef.classes || []).length === 0 && (moduleDef.constants || []).length > 0)
    .map((moduleDef) => ({
      path: moduleDef.path,
      constants: (moduleDef.constants || []).map((constantDef) => {
        const linked = constantsById.get(constantDef.id);
        if (linked == null) {
          return constantDef;
        }

        return {
          ...constantDef,
          fileName: linked.fileName
        };
      })
    }));

  return {
    modules,
    classRecords,
    constantRecords,
    classesByName,
    classesById,
    constantsById,
    standaloneConstantModules
  };
}

function resolveClassRecordByName(model, className, preferredModulePath = null) {
  if (className == null) {
    return null;
  }

  const candidates = model.classesByName.get(className) || [];
  if (candidates.length === 0) {
    return null;
  }

  if (candidates.length === 1) {
    return candidates[0];
  }

  if (preferredModulePath != null) {
    const sameModule = candidates.find((candidate) => candidate.modulePath === preferredModulePath);
    if (sameModule != null) {
      return sameModule;
    }
  }

  return candidates[0];
}

function computeClassContext(model, classRecord) {
  const ownMembers = (classRecord.members || []).filter((member) => member.kind !== 'constructor');

  const chain = [];
  const inheritedGroups = [];
  const seenMemberKeys = new Set(ownMembers.map(memberKey));

  const visitedClasses = new Set([classRecord.id]);
  let current = classRecord;

  while (current.extends != null) {
    const extendsName = resolveExtendsIdentifier(current.extends);
    if (extendsName == null) {
      break;
    }

    const resolved = resolveClassRecordByName(model, extendsName, current.modulePath);

    const chainItem = {
      name: extendsName,
      extendsText: current.extends,
      resolved: resolved != null,
      classRecord: resolved || null,
      fileName: resolved ? resolved.fileName : null,
      modulePath: resolved ? resolved.modulePath : null
    };

    chain.push(chainItem);

    if (resolved == null || visitedClasses.has(resolved.id)) {
      break;
    }

    visitedClasses.add(resolved.id);

    const resolvedOwnMembers = (resolved.members || []).filter((member) => member.kind !== 'constructor');
    const resolvedReferences = buildDeclaredMemberReferences(resolved, resolvedOwnMembers);
    const resolvedReferenceByKey = new Map();
    for (const ref of resolvedReferences) {
      if (resolvedReferenceByKey.has(memberKey(ref.member)) === false) {
        resolvedReferenceByKey.set(memberKey(ref.member), ref);
      }
    }

    const inherited = [];
    for (const member of resolvedOwnMembers) {

      const key = memberKey(member);
      if (seenMemberKeys.has(key)) {
        continue;
      }

      seenMemberKeys.add(key);
      const reference = resolvedReferenceByKey.get(key) || null;
      inherited.push({
        member,
        memberKey: key,
        anchorId: reference?.anchorId || null,
        sourceFileName: resolved.fileName || null
      });
    }

    if (inherited.length > 0) {
      inheritedGroups.push({
        ancestor: resolved,
        members: inherited
      });
    }

    current = resolved;
  }

  const inheritancePath = [classRecord.name, ...chain.map((item) => item.name)].reverse();

  return {
    ownMembers,
    chain,
    inheritedGroups,
    inheritancePath,
    inheritedMemberCount: inheritedGroups.reduce((sum, group) => sum + group.members.length, 0)
  };
}

function renderApiIndexPage(contract, model, nestedNav) {
  const propertyCount = model.classRecords.reduce((sum, classRecord) => {
    return sum + (Array.isArray(classRecord.properties) ? classRecord.properties.length : 0);
  }, 0);

  function classifyApiClassCategory(classRecord) {
    const category = String(classRecord?.moduleCategory || '').trim();
    const className = String(classRecord?.name || '').trim();
    const modulePath = String(classRecord?.modulePath || '').trim();

    const direct = {
      builders: 'Builder',
      clients: 'Client',
      codecs: 'Codec',
      data: 'Core Element',
      dicom: 'Core Element',
      'EASI.js': 'Factory',
      environment: 'Runtime',
      fhir: 'FHIR Resource',
      handlers: 'Entity Accessor',
      parsers: 'Parser',
      pipelines: 'Pipeline Stage',
      readers: 'Reader',
      tools: 'Tooling',
      transports: 'Transport',
      utils: 'Utility',
      writers: 'Writer'
    };

    if (Object.prototype.hasOwnProperty.call(direct, category)) {
      return direct[category];
    }

    if (className.endsWith('Builder')) return 'Builder';
    if (className.endsWith('Reader')) return 'Reader';
    if (className.endsWith('Writer')) return 'Writer';
    if (className.endsWith('Parser')) return 'Parser';
    if (className.endsWith('Handler')) return 'Entity Accessor';
    if (className.endsWith('Filter')) return 'Policy Filter';
    if (modulePath.includes('/fhir/')) return 'FHIR Resource';
    if (modulePath.includes('/dicom/')) return 'Core Element';

    return 'Core Component';
  }

  const classRows = model.classRecords.map((classRecord) => {
    const context = computeClassContext(model, classRecord);
    const parent = context.chain.length > 0 ? context.chain[0] : null;
    const categoryLabel = classifyApiClassCategory(classRecord);
    const extendsCell = parent == null
      ? '<span class="page-meta">none</span>'
      : (parent.fileName
        ? `<a href="${escapeAttribute(parent.fileName)}"><code>${escapeHtml(parent.name)}</code></a>`
        : `<code>${escapeHtml(parent.name)}</code>`);

    return `
                            <tr data-filter-item="${escapeAttribute(`${classRecord.name} ${categoryLabel} ${classRecord.modulePath} ${classRecord.moduleCategory} ${context.inheritancePath.join(' ')}`)}">
                                <td><a href="${escapeAttribute(classRecord.fileName)}"><code>${escapeHtml(classRecord.name)}</code></a></td>
                                <td>${escapeHtml(categoryLabel)}</td>
                                <td>${extendsCell}</td>
                                <td>${context.ownMembers.length}</td>
                                <td>${context.inheritedMemberCount}</td>
                                <td>${Array.isArray(classRecord.properties) ? classRecord.properties.length : 0}</td>
                            </tr>`;
  }).join('');

  const body = `            <section class="page-hero reveal">
                <h2>API Reference</h2>
                <p>
                    Generated class-centric API reference for exported EASI JavaScript classes, including inheritance,
                    declared and inherited member surfaces, properties, parameter contracts, and option-object field shapes.
                </p>
            </section>

            <section class="section reveal">
                <div class="callout informative">
                    <h4>Contract Snapshot</h4>
                    <p>
                        Classes: <code>${Number(contract.metrics?.classCount || model.classRecords.length)}</code>,
                        Methods: <code>${Number(contract.metrics?.methodCount || 0)}</code>,
                        Properties: <code>${propertyCount}</code>,
                        Constants: <code>${Number(contract.metrics?.constantCount || 0)}</code>.
                    </p>
                </div>
            </section>

            <section class="section reveal">
                <h3>Class Catalog</h3>
                <div class="search">
                    <input id="api-class-search" type="search" placeholder="Search classes, categories, inheritance..."
                           data-filter-input data-filter-target="#api-class-rows">
                </div>
                <div class="table-scroll">
                    <table>
                        <thead>
                            <tr>
                                <th><button type="button" class="table-sort-toggle" data-sort-target="#api-class-rows" data-sort-col="1" aria-label="Sort by class">Class</button></th>
                                <th><button type="button" class="table-sort-toggle" data-sort-target="#api-class-rows" data-sort-col="2" aria-label="Sort by category">Category</button></th>
                                <th>Extends</th>
                                <th>Declared Members</th>
                                <th>Inherited Members</th>
                                <th>Properties</th>
                            </tr>
                        </thead>
                        <tbody id="api-class-rows">
${classRows}
                        </tbody>
                    </table>
                </div>
            </section>`;

  return renderPage({
    title: 'EASI | API Reference',
    description: 'Generated API reference for the full EASI public JavaScript interface.',
    navBlock: nestedNav,
    bodyHtml: body,
    footerNote: 'Informative generated reference from the EASI API contract.'
  });
}

function buildDeclaredMemberReferences(classRecord, members) {
  const refs = [];
  for (let index = 0; index < (members || []).length; index++) {
    const member = members[index];
    const key = `${memberKey(member)}::${index}`;
    refs.push({
      member,
      index,
      key,
      anchorId: `declared-member-${hash8(`${classRecord.id}:${key}`)}`
    });
  }
  return refs;
}

function renderDeclaredMemberRows(memberReferences) {
  return (memberReferences || []).map((ref) => {
    const member = ref.member;

    return `
                            <tr data-filter-item="${escapeAttribute(`${member.name} ${member.kind} ${member.description || ''}`)}">
                                <td><a href="#${escapeAttribute(ref.anchorId)}">${renderLanguageAwareCode(member.name, 'member-name')}</a></td>
                                <td><code>${escapeHtml(member.kind || 'method')}</code></td>
                                <td>${member.description ? withLineBreaks(member.description) : '<span class="page-meta">n/a</span>'}</td>
                            </tr>`;
  }).join('');
}

function renderMemberRows(members, className) {
  return members.map((member) => {
    const signatureName = member.kind === 'constructor'
      ? `${className}(${(member.parameters || []).map((param) => param.name || param.signature || 'param').join(', ')})`
      : `${member.name}(${(member.parameters || []).map((param) => param.name || param.signature || 'param').join(', ')})`;

    return `
                            <tr data-filter-item="${escapeAttribute(`${member.name} ${member.kind} ${member.description || ''} ${member.accessor || ''}`)}">
                                <td><code>${escapeHtml(member.name)}</code></td>
                                <td><code>${escapeHtml(member.kind || 'method')}</code></td>
                                <td>${formatBoolean(member.static === true)}</td>
                                <td><code>${escapeHtml(signatureName)}</code><br><span class="page-meta">${formatParameterSignature(member.parameters)}</span></td>
                                <td>${formatReturn(member.returns)}</td>
                                <td>${member.description ? withLineBreaks(member.description) : '<span class="page-meta">n/a</span>'}</td>
                            </tr>`;
  }).join('');
}

function renderMemberHeading(className, member) {
  if (member.kind === 'constructor') {
    return `${className}(${(member.parameters || []).map((param) => param.name || param.signature || 'param').join(', ')})`;
  }

  return `${member.name}(${(member.parameters || []).map((param) => param.name || param.signature || 'param').join(', ')})`;
}

function renderMemberDetails(classRecord, memberReferences, optionContractsByParameterKey, model) {
  if (!Array.isArray(memberReferences) || memberReferences.length === 0) {
    return '<p class="page-meta">No members.</p>';
  }

  const cards = memberReferences.map((ref) => {
    const member = ref.member;
    const heading = renderMemberHeading(classRecord.name, member);
    const baseDescription = summarizeDescription(member.description, 'No description.');
    const purposeDescription = describeMemberPurpose(member, classRecord.name);
    const coherentDescription = `${baseDescription} ${purposeDescription}`.trim();

    return `
                <article class="card reveal" id="${escapeAttribute(ref.anchorId)}" data-filter-item="${escapeAttribute(`${member.name} ${member.kind} ${member.description || ''}`)}">
                    <h4>${renderLanguageAwareCode(heading, 'signature')}</h4>
                    <p class="page-meta">
                        Kind: <code>${escapeHtml(member.kind || 'method')}</code> |
                        Static: <code>${formatBoolean(member.static === true)}</code> |
                        Async: <code>${formatBoolean(member.async === true)}</code>
                    </p>
                    <br />
                    <p>${escapeHtml(coherentDescription)}</p>
                    <h5>Parameters</h5>
${renderParameterDetails(classRecord, member, member.parameters, optionContractsByParameterKey, model)}
                    <h5>Returns</h5>
                    <p>${formatReturn(member.returns, { linkTypes: true, model, preferredModulePath: classRecord.modulePath })}</p>
                </article>`;
  }).join('');

  return `<div class="grid one">${cards}</div>`;
}

function describeOptionShapePurpose(contract, shape) {
  if (shape?.openObject === true) {
    return 'Use this open options object when fields are context-specific or intentionally implementation-defined.';
  }

  const fieldNames = (shape?.fields || []).map((field) => String(field.name || '').trim()).filter((name) => name.length > 0);
  const lowerFields = new Set(fieldNames.map((name) => name.toLowerCase()));

  if (lowerFields.has('transport')) {
    return 'Use this shape to provide an explicit transport adapter override.';
  }

  if (lowerFields.has('contenttype') || lowerFields.has('contentlength')) {
    return 'Use this shape to pass source content metadata and emission controls.';
  }

  if (lowerFields.has('recursive') || lowerFields.has('includehidden')) {
    if (
      lowerFields.has('settlems')
      || lowerFields.has('stablechecks')
      || lowerFields.has('dedupewindowms')
      || lowerFields.has('reconcileintervalms')
      || lowerFields.has('maxqueue')
      || lowerFields.has('overflow')
    ) {
      return 'Use this shape to configure folder-watch timing, queueing, and backpressure behavior.';
    }

    return 'Use this shape to configure folder enumeration and filtering behavior.';
  }

  if (lowerFields.has('onemit') && fieldNames.length === 1) {
    return 'Use this shape when only per-read emission callback behavior is needed.';
  }

  if (lowerFields.has('method') || lowerFields.has('headers') || lowerFields.has('body')) {
    return 'Use this shape to pass HTTP request behavior and transport settings.';
  }

  const preview = fieldNames.slice(0, 4);
  const remainder = fieldNames.length > preview.length ? ` (+${fieldNames.length - preview.length} more)` : '';
  const joined = preview.length > 0 ? `${preview.join(', ')}${remainder}` : 'standard option fields';

  return `Use this shape to configure ${contract.parameter?.name || 'options'} via ${joined}.`;
}

function deriveOptionShapeName(_contract, shape) {
  if (shape?.openObject === true) {
    return 'Open Options Object';
  }

  const fieldNames = (shape?.fields || []).map((field) => String(field.name || '').trim()).filter((name) => name.length > 0);
  const lowerFields = new Set(fieldNames.map((name) => name.toLowerCase()));

  if (lowerFields.has('transport')) {
    return 'Transport Override';
  }

  if (lowerFields.has('onemit') && fieldNames.length === 1) {
    return 'Emission Callback';
  }

  if (lowerFields.has('contenttype') || lowerFields.has('contentlength')) {
    return 'Content Metadata';
  }

  if (lowerFields.has('recursive') || lowerFields.has('includehidden')) {
    if (
      lowerFields.has('settlems')
      || lowerFields.has('stablechecks')
      || lowerFields.has('dedupewindowms')
      || lowerFields.has('reconcileintervalms')
      || lowerFields.has('maxqueue')
      || lowerFields.has('overflow')
    ) {
      return 'Folder Watch Controls';
    }

    return 'Folder Scan Controls';
  }

  if (lowerFields.has('method') || lowerFields.has('headers') || lowerFields.has('body')) {
    return 'HTTP Request Options';
  }

  if (fieldNames.length > 0) {
    return `${fieldNames[0]} Profile`;
  }

  return 'Option Profile';
}

function renderOptionContractsSection(className, contracts) {
  if (!Array.isArray(contracts) || contracts.length === 0) {
    return '<p class="page-meta">No option-object contracts detected for declared members.</p>';
  }

  const cards = contracts.map((contract) => {
    const heading = renderMemberHeading(className, contract.member);
    const usedNames = new Map();

    const shapeTables = (contract.shapeRecords || []).map((shape) => {
      const baseName = deriveOptionShapeName(contract, shape);
      const nextCount = (usedNames.get(baseName) || 0) + 1;
      usedNames.set(baseName, nextCount);

      const shapeName = nextCount === 1 ? baseName : `${baseName} ${nextCount}`;
      const shapeDescription = describeOptionShapePurpose(contract, shape);

      const fieldRows = shape.fields.map((field) => (`
                                    <tr>
                                        <td>${renderLanguageAwareCode(field.name, 'property-name')}</td>
                                        <td>${renderTypeAsVerticalCode(field.type)}</td>
                                        <td><span class="page-meta">${field.optional ? '(Optional)' : '(Required)'}</span> ${escapeHtml(describeOptionFieldPurpose(field, contract))}</td>
                                    </tr>`)).join('');

      const rows = fieldRows.length > 0
        ? fieldRows
        : `
                                    <tr>
                                        <td colspan="3"><span class="page-meta">Open options object: field names and value types are intentionally context-specific for this member.</span></td>
                                    </tr>`;

      return `
                            <div class="table-scroll" id="${escapeAttribute(shape.anchorId)}">
                                <table>
                                    <thead>
                                        <tr>
                                            <th colspan="3" class="option-shape-header"><span class="option-shape-name">${escapeHtml(shapeName)}</span><span class="option-shape-description"> - ${escapeHtml(shapeDescription)}</span></th>
                                        </tr>
                                        <tr>
                                            <th>Field</th>
                                            <th>Type</th>
                                            <th>Description</th>
                                        </tr>
                                    </thead>
                                    <tbody>
${rows}
                                    </tbody>
                                </table>
                            </div>`;
    }).join('');

    return `
                <article class="card reveal" id="${escapeAttribute(contract.baseId)}" data-filter-item="${escapeAttribute(`${contract.member.name} ${contract.parameter.name} option object`)}">
                    <h4>${renderLanguageAwareCode(heading, 'signature')} &middot; ${renderLanguageAwareCode(contract.parameter.name || 'options', 'parameter-name')}</h4>
${shapeTables}
                </article>`;
  }).join('');

  return `<div class="grid one">${cards}</div>`;
}

function renderInheritancePath(classRecord, context) {
  const parts = [];
  parts.push(`<strong>${escapeHtml(classRecord.name)}</strong>`);

  for (const chainItem of context.chain) {
    if (chainItem.fileName != null) {
      parts.unshift(`<a href="${escapeAttribute(chainItem.fileName)}"><code>${escapeHtml(chainItem.name)}</code></a>`);
    } else {
      parts.unshift(`<code>${escapeHtml(chainItem.name)}</code>`);
    }
  }

  return parts.join(' &rarr; ');
}

function renderInheritedGroups(context) {
  if (!Array.isArray(context.inheritedGroups) || context.inheritedGroups.length === 0) {
    return '<p class="page-meta">No inherited members detected.</p>';
  }

  return context.inheritedGroups.map((group) => {
    const rows = (group.members || []).map((entry) => {
      const member = entry.member;
      const nameHref = entry.anchorId != null
        ? `${group.ancestor.fileName}#${entry.anchorId}`
        : group.ancestor.fileName;
      const baseDescription = summarizeDescription(member?.description, 'Inherited member from the base class.');
      const purpose = describeMemberPurpose(member, group.ancestor.name);
      const coherentDescription = `${baseDescription} ${purpose}`.trim();

      return `
                            <tr data-filter-item="${escapeAttribute(`${member.name} ${member.kind} ${member.description || ''}`)}">
                                <td><a href="${escapeAttribute(nameHref)}">${renderLanguageAwareCode(member.name, 'member-name')}</a></td>
                                <td><code>${escapeHtml(member.kind || 'method')}</code></td>
                                <td>${escapeHtml(coherentDescription)}</td>
                            </tr>`;
    }).join('');

    return `
            <section class="section reveal">
                <h4>
                    Inherited From
                    <a href="${escapeAttribute(group.ancestor.fileName)}"><code>${escapeHtml(group.ancestor.name)}</code></a>
                    <span class="page-meta">(${escapeHtml(group.ancestor.modulePath)})</span>
                </h4>
                <div class="table-scroll">
                    <table>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Kind</th>
                                <th>Description</th>
                            </tr>
                        </thead>
                        <tbody>
${rows}
                        </tbody>
                    </table>
                </div>
            </section>`;
  }).join('');
}

function renderClassPage(model, classRecord, nestedNav) {
  const context = computeClassContext(model, classRecord);

  const propertyRows = (classRecord.properties || []).map((property) => (`
                            <tr>
                                <td>${renderLanguageAwareCode(property.name, 'property-name')}</td>
                                <td>${property.type ? renderTypeAsVerticalCodeLinked(property.type, model, classRecord.modulePath) : '<span class="page-meta">n/a</span>'}</td>
                                <td>${property.optional === true ? 'Optional' : 'Required'}</td>
                                <td>${property.description ? withLineBreaks(property.description) : '<span class="page-meta">n/a</span>'}</td>
                            </tr>`)).join('');

  const declaredMemberReferences = buildDeclaredMemberReferences(classRecord, context.ownMembers);
  const declaredRows = renderDeclaredMemberRows(declaredMemberReferences);
  const optionCatalog = buildOptionContractCatalog(classRecord, context.ownMembers);
  const declaredDetails = renderMemberDetails(classRecord, declaredMemberReferences, optionCatalog.byParameterKey, model);
  const optionContracts = renderOptionContractsSection(classRecord.name, optionCatalog.contracts);

  const moduleConstants = classRecord.moduleConstants || [];
  const moduleConstantRows = moduleConstants.map((constantDef) => {
    const linked = model.constantsById?.get(constantDef.id) || null;
    const nameCell = linked?.fileName
      ? `<a href="${escapeAttribute(linked.fileName)}"><code>${escapeHtml(constantDef.name)}</code></a>`
      : `<code>${escapeHtml(constantDef.name)}</code>`;

    return `
                            <tr>
                                <td>${nameCell}</td>
                                <td><code>${escapeHtml(constantDef.declarationKind || 'const')}</code></td>
                                <td><code>${escapeHtml(constantDef.initializerKind || 'unknown')}</code></td>
                                <td>${constantDef.description ? withLineBreaks(constantDef.description) : '<span class="page-meta">n/a</span>'}</td>
                            </tr>`;
  }).join('');

  const moduleFunctions = classRecord.moduleFunctions || [];
  const moduleFunctionRows = moduleFunctions.map((functionDef) => (`
                            <tr>
                                <td>${renderLanguageAwareCode(functionDef.name, 'member-name')}</td>
                                <td>${formatParameterSignature(functionDef.parameters)}</td>
                                <td>${formatReturn(functionDef.returns)}</td>
                                <td>${functionDef.description ? withLineBreaks(functionDef.description) : '<span class="page-meta">n/a</span>'}</td>
                            </tr>`)).join('');

  const examples = (classRecord.examples || []).filter((example) => typeof example === 'string' && example.trim().length > 0);
  const classPurpose = describeClassPurpose(classRecord);

  const body = `            <section class="page-hero reveal">
                <h2>${escapeHtml(classRecord.name)}</h2>
                <p>${escapeHtml(classPurpose)}</p>
            </section>

${renderApiLanguagePills()}

            <section class="section reveal">
                <h3>Inheritance</h3>
                <p>${renderInheritancePath(classRecord, context)}</p>
                <p class="page-meta">
                    This class declares <code>${context.ownMembers.length}</code> member(s) and inherits
                    <code>${context.inheritedMemberCount}</code> member(s).
                </p>
            </section>

            <section class="section reveal">
                <h3>Class Metadata</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Field</th>
                            <th>Value</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr><td>Extends</td><td>${classRecord.extends ? `<code>${escapeHtml(classRecord.extends)}</code>` : '<span class="page-meta">none</span>'}</td></tr>
                        <tr><td>Declared Members</td><td>${context.ownMembers.length}</td></tr>
                        <tr><td>Inherited Members</td><td>${context.inheritedMemberCount}</td></tr>
                        <tr><td>Properties</td><td>${Array.isArray(classRecord.properties) ? classRecord.properties.length : 0}</td></tr>
                    </tbody>
                </table>
            </section>

            <section class="section reveal">
                <h3>Properties</h3>
                <div class="table-scroll">
                    <table>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Type</th>
                                <th>Required</th>
                                <th>Description</th>
                            </tr>
                        </thead>
                        <tbody>
${propertyRows || '                            <tr><td colspan="4"><span class="page-meta">No documented properties.</span></td></tr>'}
                        </tbody>
                    </table>
                </div>
            </section>

            <section class="section reveal">
                <h3>Declared Members</h3>
                <div class="search">
                    <input id="class-member-search" type="search" placeholder="Search declared members..."
                           data-filter-input data-filter-target="#class-member-rows">
                </div>
                <div class="table-scroll">
                    <table>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Kind</th>
                                <th>Description</th>
                            </tr>
                        </thead>
                        <tbody id="class-member-rows">
${declaredRows || '                            <tr><td colspan="3"><span class="page-meta">No declared members found.</span></td></tr>'}
                        </tbody>
                    </table>
                </div>
            </section>

            <section class="section reveal" id="declared-member-details">
                <h3>Declared Member Details</h3>
${declaredDetails}
            </section>

            <section class="section reveal" id="option-contracts">
                <h3>Option Contracts</h3>
${optionContracts}
            </section>

            <section class="section reveal">
                <h3>Inherited Members</h3>
${renderInheritedGroups(context)}
            </section>

            ${moduleConstants.length > 0 ? `
            <section class="section reveal">
                <h3>Module-Level Constants</h3>
                <div class="table-scroll">
                    <table>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Declaration</th>
                                <th>Initializer Kind</th>
                                <th>Description</th>
                            </tr>
                        </thead>
                        <tbody>
${moduleConstantRows}
                        </tbody>
                    </table>
                </div>
            </section>
            ` : ''}

            ${moduleFunctions.length > 0 ? `
            <section class="section reveal">
                <h3>Module-Level Functions</h3>
                <div class="table-scroll">
                    <table>
                        <thead>
                            <tr>
                                <th>Function</th>
                                <th>Parameters</th>
                                <th>Returns</th>
                                <th>Description</th>
                            </tr>
                        </thead>
                        <tbody>
${moduleFunctionRows}
                        </tbody>
                    </table>
                </div>
            </section>
            ` : ''}

            ${examples.length > 0 ? `
            <section class="section reveal">
                <h3>Class Examples</h3>
                ${examples.map((example) => `<pre><code class="language-text">${escapeHtml(example)}</code></pre>`).join('\n')}
            </section>
            ` : ''}`;

  return renderPage({
    title: `EASI | ${classRecord.name}`,
    description: `Generated API class reference for ${classRecord.name}.`,
    navBlock: nestedNav,
    bodyHtml: body,
    footerNote: 'Informative generated class reference from the EASI API contract.'
  });
}

function renderConstantPage(model, constantRecord, nestedNav) {
  const entries = Array.isArray(constantRecord.entries) ? constantRecord.entries : [];
  const summaryCount = Number(constantRecord?.initializerSummary?.keyCount || 0);
  const documentedCount = entries.length > 0 ? entries.length : summaryCount;
  const exportedByClasses = model.classRecords.filter((classRecord) => (
    (classRecord.moduleConstants || []).some((constantDef) => constantDef.id === constantRecord.id)
  ));

  const entryRows = entries.map((entry) => {
    const value = String(entry?.value || entry?.name || '').trim();
    const name = String(entry?.name || '').trim();
    const baseDescription = `Token used for ${humanizeIdentifier(name)} conditions.`;

    return `
                            <tr data-filter-item="${escapeAttribute(`${name} ${value} ${baseDescription}`)}">
                                <td><code>${escapeHtml(name)}</code></td>
                                <td><code>${escapeHtml(value)}</code></td>
                                <td>${escapeHtml(baseDescription)}</td>
                            </tr>`;
  }).join('');

  const exportedBy = exportedByClasses.length > 0
    ? `<ul>
${exportedByClasses.map((classRecord) => `                    <li><a href="${escapeAttribute(classRecord.fileName)}"><code>${escapeHtml(classRecord.name)}</code></a></li>`).join('\n')}
                </ul>`
    : '<p class="page-meta">No class-level usage records were detected for this constant in the API contract.</p>';

  const body = `            <section class="page-hero reveal">
                <h2>${escapeHtml(constantRecord.name)}</h2>
                <p>${escapeHtml(summarizeDescription(constantRecord.description, 'Generated reference for this module-level constant export.'))}</p>
            </section>

            <section class="section reveal">
                <h3>Constant Metadata</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Field</th>
                            <th>Value</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr><td>Module</td><td><code>${escapeHtml(constantRecord.modulePath)}</code></td></tr>
                        <tr><td>Declaration</td><td><code>${escapeHtml(constantRecord.declarationKind || 'const')}</code></td></tr>
                        <tr><td>Initializer Kind</td><td><code>${escapeHtml(constantRecord.initializerKind || 'unknown')}</code></td></tr>
                        <tr><td>Documented Entries</td><td><code>${documentedCount}</code></td></tr>
                    </tbody>
                </table>
            </section>

            <section class="section reveal">
                <h3>Exported By Classes</h3>
${exportedBy}
            </section>

            <section class="section reveal">
                <h3>Constant Entries</h3>
                <div class="search">
                    <input id="constant-entry-search" type="search" placeholder="Search constant entries..."
                           data-filter-input data-filter-target="#constant-entry-rows">
                </div>
                <div class="table-scroll">
                    <table>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Value</th>
                                <th>Description</th>
                            </tr>
                        </thead>
                        <tbody id="constant-entry-rows">
${entryRows || '                            <tr><td colspan="3"><span class="page-meta">No entry details were available in the generated contract metadata.</span></td></tr>'}
                        </tbody>
                    </table>
                </div>
            </section>`;

  return renderPage({
    title: `EASI | ${constantRecord.name}`,
    description: `Generated API constant reference for ${constantRecord.name}.`,
    navBlock: nestedNav,
    bodyHtml: body,
    footerNote: 'Informative generated constant reference from the EASI API contract.'
  });
}

function patchApiLinkInAllSiteNav() {
  const htmlFiles = [];

  function walk(currentPath) {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });
    for (const entry of entries) {
      const absolutePath = path.join(currentPath, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'assets' || entry.name === 'scripts') {
          continue;
        }
        walk(absolutePath);
        continue;
      }

      if (entry.isFile() && entry.name.endsWith('.html')) {
        htmlFiles.push(absolutePath);
      }
    }
  }

  walk(siteRoot);

  for (const filePath of htmlFiles) {
    const html = fs.readFileSync(filePath, 'utf8');

    if (
      html.includes('href="api/index.html">API Reference</a>')
      || html.includes('href="../api/index.html">API Reference</a>')
    ) {
      continue;
    }

    let updated = html;

    updated = updated.replace(
      /^([ \t]*)<a class="nav-link" data-nav-link href="error-catalog\.html">Errors<\/a>/m,
      '$1<a class="nav-link" data-nav-link href="api/index.html">API Reference</a>\n$&'
    );

    updated = updated.replace(
      /^([ \t]*)<a class="nav-link" data-nav-link href="\.\.\/error-catalog\.html">Errors<\/a>/m,
      '$1<a class="nav-link" data-nav-link href="../api/index.html">API Reference</a>\n$&'
    );

    if (updated !== html) {
      fs.writeFileSync(filePath, updated, 'utf8');
    }
  }
}

function patchTopLevelIndexCard() {
  if (fs.existsSync(topIndexPath) === false) {
    return;
  }

  const html = fs.readFileSync(topIndexPath, 'utf8');
  if (html.includes('data-filter-item="api reference classes methods parameters options constants signatures schema generated contract tooling ai docs"')) {
    return;
  }

  const markerRegex = /\n([ \t]*)<article class="card reveal" data-filter-item="error catalog[^>]*>/;
  const markerMatch = html.match(markerRegex);
  if (markerMatch == null) {
    return;
  }

  const indent = markerMatch[1] || '                    ';
  const apiCard = `${indent}<article class="card reveal" data-filter-item="api reference classes methods parameters options constants signatures schema generated contract tooling ai docs">
${indent}    <h4><a href="api/index.html">API Reference</a></h4>
${indent}    <p>Complete generated reference for exported classes, inheritance, methods, parameters, properties, and constants.</p>
${indent}</article>
`;

  const updated = html.replace(markerRegex, (fullMatch) => `\n${apiCard}\n${fullMatch.slice(1)}`);
  fs.writeFileSync(topIndexPath, updated, 'utf8');
}

function patchDicomModelNavTemplate() {
  const scriptPath = path.join(siteRoot, 'scripts', 'generate-dicom-model-types.js');
  if (fs.existsSync(scriptPath) === false) {
    return;
  }

  let script = fs.readFileSync(scriptPath, 'utf8');
  if (script.includes('href="../api/index.html">API Reference</a>')) {
    return;
  }

  script = script.replace(
    /\n\s*<a class="nav-link" data-nav-link href="\.\.\/error-catalog\.html">Errors<\/a>/,
    '\n                <a class="nav-link" data-nav-link href="../api/index.html">API Reference</a>\n                <a class="nav-link" data-nav-link href="../error-catalog.html">Errors</a>'
  );

  fs.writeFileSync(scriptPath, script, 'utf8');
}

function generateApiReferenceSite() {
  const contract = readContract();
  const model = buildReferenceModel(contract);

  ensureDirectory(apiRoot);
  cleanupGeneratedApiPages();

  const referenceNav = extractReferenceNavFromTopLevelIndex();
  const nestedNav = prefixNavForNestedPages(referenceNav, '../');

  const indexHtml = renderApiIndexPage(contract, model, nestedNav);
  writeFile(path.join(apiRoot, 'index.html'), indexHtml);

  for (const classRecord of model.classRecords) {
    const classHtml = renderClassPage(model, classRecord, nestedNav);
    writeFile(path.join(apiRoot, classRecord.fileName), classHtml);
  }

  for (const constantRecord of model.constantRecords) {
    const constantHtml = renderConstantPage(model, constantRecord, nestedNav);
    writeFile(path.join(apiRoot, constantRecord.fileName), constantHtml);
  }

  patchApiLinkInAllSiteNav();
  patchTopLevelIndexCard();
  patchDicomModelNavTemplate();

  console.log(`Generated API reference pages: ${model.classRecords.length} classes, ${model.constantRecords.length} constants.`);
}

generateApiReferenceSite();
