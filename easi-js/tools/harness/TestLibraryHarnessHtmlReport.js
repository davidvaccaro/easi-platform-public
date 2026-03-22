//
// TestLibraryHarnessHtmlReport.js - 1.1.0
//
// HTML rendering for the DICOM test-library harness report.
//

import path from 'node:path';

function escapeHtml(value) {

    if (value == null)
        return '';

    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');

}

function toBrowserPath(value) {

    if (value == null)
        return null;

    var normalized = String(value).trim();
    if (normalized.length == 0)
        return null;

    return normalized.replaceAll(path.sep, '/');

}

function ensureRelativeHref(value) {

    var normalized = toBrowserPath(value);
    if (normalized == null)
        return null;

    if ((normalized.startsWith('http://') == true)
        || (normalized.startsWith('https://') == true)
        || (normalized.startsWith('file://') == true)
        || (normalized.startsWith('/') == true)
        || (normalized.startsWith('./') == true)
        || (normalized.startsWith('../') == true)) {
        return normalized;
    }

    return `./${normalized}`;

}

function buildSourceHrefLookup(report, outputDirectory) {

    var lookup = new Map();
    var files = Array.isArray(report?.files) ? report.files : [];
    var rootDirectory = report?.configuration?.rootDirectory ?? null;
    var resolvedOutputDirectory = (outputDirectory != null)
        ? path.resolve(String(outputDirectory))
        : null;
    var resolvedRootDirectory = (rootDirectory != null)
        ? path.resolve(String(rootDirectory))
        : null;

    for (var index = 0; index < files.length; index++) {

        var file = files[index];
        var relativePathKey = file?.relativePath ?? null;
        if ((relativePathKey == null) || (String(relativePathKey).trim().length == 0))
            continue;

        var absolutePath = file?.absolutePath ?? null;
        if ((absolutePath == null) && (resolvedRootDirectory != null)) {
            absolutePath = path.resolve(resolvedRootDirectory, String(relativePathKey));
        }

        if ((absolutePath == null) || (resolvedOutputDirectory == null))
            continue;

        var relativeHref = ensureRelativeHref(path.relative(resolvedOutputDirectory, String(absolutePath)));
        if (relativeHref == null)
            continue;

        lookup.set(String(relativePathKey), relativeHref);

    }

    return lookup;

}

function resolveEasiEntryHref(outputDirectory, easiSourceDirectory, fallback = '../../../../src/EASI.js') {

    if ((outputDirectory == null) || (easiSourceDirectory == null))
        return ensureRelativeHref(fallback) ?? fallback;

    var entryPath = path.join(path.resolve(String(easiSourceDirectory)), 'EASI.js');
    return (
        ensureRelativeHref(path.relative(path.resolve(String(outputDirectory)), entryPath))
        ?? ensureRelativeHref(fallback)
        ?? fallback
    );

}

function formatNumber(value, digits = 2) {

    if (value == null)
        return '-';

    var number = Number(value);
    if (Number.isFinite(number) == false)
        return '-';

    return number.toFixed(digits);

}

function formatBytes(bytes) {

    if ((bytes == null) || (Number.isFinite(Number(bytes)) == false))
        return '-';

    var value = Number(bytes);

    if (value < 1024)
        return `${value} B`;

    var kib = value / 1024;
    if (kib < 1024)
        return `${kib.toFixed(1)} KB`;

    var mib = kib / 1024;
    if (mib < 1024)
        return `${mib.toFixed(2)} MB`;

    var gib = mib / 1024;
    return `${gib.toFixed(2)} GB`;

}

function formatMilliseconds(value) {

    if ((value == null) || (Number.isFinite(Number(value)) == false))
        return '-';

    return `${Number(value).toFixed(2)} ms`;

}

function normalizeModality(value) {

    if (Array.isArray(value) == true)
        value = (value.length > 0) ? value[0] : null;

    if (value == null)
        return 'UNKNOWN';

    var normalized = String(value).trim().toUpperCase();
    if (normalized.length == 0)
        return 'UNKNOWN';

    return normalized;

}

function resolveFileModality(file) {

    return normalizeModality(
        file?.modality
        ?? file?.scenarios?.parse?.metrics?.modality
        ?? file?.scenarios?.parse?.metrics?.Modality
        ?? null
    );

}

function createSlug(value) {

    var normalized = String(value ?? '')
        .trim()
        .toLowerCase()
        .replaceAll(/[^a-z0-9]+/g, '-');

    normalized = normalized.replaceAll(/^-+|-+$/g, '');

    if (normalized.length == 0)
        normalized = 'unknown';

    return normalized;

}

function splitIntoPages(items, pageSize) {

    var pages = [];

    for (var i = 0; i < items.length; i += pageSize) {
        pages.push(items.slice(i, i + pageSize));
    }

    return pages;

}

function renderScenarioSummaryRows(summary) {

    var scenarioRows = [];
    var scenarioNames = Object.keys(summary.scenarios ?? {});

    for (var i = 0; i < scenarioNames.length; i++) {

        var name = scenarioNames[i];
        var scenario = summary.scenarios[name];

        scenarioRows.push(`
            <tr>
                <td><code>${escapeHtml(name)}</code></td>
                <td>${scenario.passCount ?? 0}</td>
                <td>${scenario.failCount ?? 0}</td>
                <td>${scenario.skipCount ?? 0}</td>
                <td>${formatMilliseconds(scenario.averageMs)}</td>
                <td>${formatMilliseconds(scenario.maxMs)}</td>
            </tr>
        `);

    }

    if (scenarioRows.length == 0) {
        scenarioRows.push(`
            <tr>
                <td colspan="6">No scenario results.</td>
            </tr>
        `);
    }

    return scenarioRows.join('');

}

function renderScenarioCell(result) {

    if (result == null)
        return '<td class="scenario-cell scenario-missing">-</td>';

    var status = String(result.status ?? 'missing').toLowerCase();
    var warningCount = Number(result.warningCount ?? 0);
    var errorCount = Number(result.errorCount ?? 0);

    var extraParts = [];

    if (result.elapsedMs != null)
        extraParts.push(formatMilliseconds(result.elapsedMs));

    if ((warningCount > 0) || (errorCount > 0)) {
        extraParts.push(`W:${warningCount} E:${errorCount}`);
    }

    if ((result.metrics?.bytesWritten != null) && (result.metrics.bytesWritten > 0)) {
        extraParts.push(formatBytes(result.metrics.bytesWritten));
    }

    return `
        <td class="scenario-cell scenario-${escapeHtml(status)}">
            <div class="scenario-status">${escapeHtml(status.toUpperCase())}</div>
            <div class="scenario-meta">${escapeHtml(extraParts.join(' | '))}</div>
        </td>
    `;

}

function renderFileRows(fileEntries, scenarioNames, reportContext = {}) {

    var rows = [];

    for (var i = 0; i < fileEntries.length; i++) {

        var fileEntry = fileEntries[i];
        var file = fileEntry.file;
        var rowNumber = fileEntry.rowNumber;
        var statusClass = `file-${String(file.overallStatus ?? 'unknown').toLowerCase()}`;
        var sourceHref = reportContext.sourceHrefLookup?.get?.(String(file.relativePath ?? '')) ?? null;
        var redactPageFileName = String(reportContext.redactPageFileName ?? 'redact.html');

        var scenarioCells = [];
        for (var scenarioIndex = 0; scenarioIndex < scenarioNames.length; scenarioIndex++) {
            var scenarioName = scenarioNames[scenarioIndex];
            scenarioCells.push(renderScenarioCell(file.scenarios?.[scenarioName]));
        }

        var detailsSections = [];

        for (var detailsScenarioIndex = 0; detailsScenarioIndex < scenarioNames.length; detailsScenarioIndex++) {

            var detailsScenarioName = scenarioNames[detailsScenarioIndex];
            var result = file.scenarios?.[detailsScenarioName];

            if (result == null)
                continue;

            var detailsParts = [];

            if ((result.message != null) && (result.message.length > 0)) {
                detailsParts.push(`<div><strong>Message:</strong> ${escapeHtml(result.message)}</div>`);
            }

            if (result.error != null) {
                detailsParts.push(`<div><strong>Error:</strong> ${escapeHtml(result.error.message ?? '')}</div>`);
            }

            if ((Array.isArray(result.concerns) == true) && (result.concerns.length > 0)) {

                var concernItems = [];
                for (var concernIndex = 0; concernIndex < result.concerns.length; concernIndex++) {
                    var concern = result.concerns[concernIndex];
                    concernItems.push(`<li><code>${escapeHtml(concern.code ?? 'Concern')}</code> - ${escapeHtml(concern.message ?? '')}</li>`);
                }

                detailsParts.push(`<div><strong>Concern Sample:</strong><ul>${concernItems.join('')}</ul></div>`);

            }

            if (result.thumbnailPath != null) {

                var redactActionHtml = '';
                if (sourceHref != null) {
                    var redactQuery = new URLSearchParams({
                        source: sourceHref,
                        file: String(file.relativePath ?? ''),
                        thumbnail: String(result.thumbnailPath ?? '')
                    }).toString();

                    redactActionHtml = `
                        <div class="thumbnail-actions">
                            <a class="action-button" href="${escapeHtml(redactPageFileName)}?${escapeHtml(redactQuery)}" target="_blank" rel="noopener noreferrer">Redact</a>
                        </div>
                    `;
                }

                detailsParts.push(`
                    <div class="thumbnail-block">
                        <strong>Frame Preview:</strong>
                        <div><a href="${escapeHtml(result.thumbnailPath)}" target="_blank">${escapeHtml(result.thumbnailPath)}</a></div>
                        <img src="${escapeHtml(result.thumbnailPath)}" alt="thumbnail" loading="lazy" />
                        ${redactActionHtml}
                    </div>
                `);
            }

            if (detailsParts.length > 0) {
                detailsSections.push(`
                    <div class="scenario-details-group">
                        <h4>${escapeHtml(detailsScenarioName)}</h4>
                        ${detailsParts.join('')}
                    </div>
                `);
            }

        }

        var detailsHtml = (detailsSections.length > 0)
            ? `<details><summary>Details</summary>${detailsSections.join('')}</details>`
            : '-';

        rows.push(`
            <tr class="file-row ${escapeHtml(statusClass)}">
                <td>${rowNumber}</td>
                <td><code>${escapeHtml(file.relativePath)}</code></td>
                <td>${escapeHtml(resolveFileModality(file))}</td>
                <td>${formatBytes(file.sizeBytes)}</td>
                <td>${formatMilliseconds(file.totalElapsedMs)}</td>
                <td>${escapeHtml(String(file.overallStatus ?? 'unknown').toUpperCase())}</td>
                ${scenarioCells.join('')}
                <td>${detailsHtml}</td>
            </tr>
        `);

    }

    return rows.join('');

}

function renderStyles() {

    return `
        :root {
            --bg: #f7f8fb;
            --card: #ffffff;
            --ink: #0f172a;
            --muted: #475569;
            --border: #dbe0ea;
            --pass: #166534;
            --pass-bg: #dcfce7;
            --fail: #991b1b;
            --fail-bg: #fee2e2;
            --skip: #92400e;
            --skip-bg: #ffedd5;
            --unknown: #1e3a8a;
            --unknown-bg: #dbeafe;
        }

        body {
            margin: 0;
            padding: 1rem;
            font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
            color: var(--ink);
            background: var(--bg);
        }

        h1, h2 {
            margin: 0 0 0.75rem 0;
        }

        .cards {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 0.75rem;
            margin-bottom: 1rem;
        }

        .card {
            background: var(--card);
            border: 1px solid var(--border);
            border-radius: 8px;
            padding: 0.75rem;
        }

        .card .label {
            font-size: 0.8rem;
            color: var(--muted);
            margin-bottom: 0.25rem;
        }

        .card .value {
            font-size: 1.15rem;
            font-weight: 700;
        }

        .panel {
            background: var(--card);
            border: 1px solid var(--border);
            border-radius: 8px;
            padding: 0.75rem;
            margin-bottom: 1rem;
            overflow-x: auto;
        }

        .breadcrumbs {
            margin-bottom: 1rem;
            font-size: 0.9rem;
        }

        .breadcrumbs a {
            color: #0b4a6f;
            text-decoration: none;
            font-weight: 600;
        }

        .page-links a {
            margin-right: 0.5rem;
            text-decoration: none;
            color: #0b4a6f;
            font-weight: 600;
        }

        .page-links .current {
            display: inline-block;
            margin-right: 0.5rem;
            font-weight: 700;
            color: #111827;
        }

        table {
            width: 100%;
            border-collapse: collapse;
        }

        th, td {
            border: 1px solid var(--border);
            padding: 0.45rem;
            vertical-align: top;
            font-size: 0.85rem;
        }

        th {
            position: sticky;
            top: 0;
            z-index: 1;
            background: #eef2f9;
            text-align: left;
        }

        .scenario-cell {
            min-width: 120px;
        }

        .scenario-status {
            font-weight: 700;
            font-size: 0.8rem;
        }

        .scenario-meta {
            color: var(--muted);
            font-size: 0.75rem;
            margin-top: 0.2rem;
            word-break: break-word;
        }

        .scenario-pass {
            background: var(--pass-bg);
            color: var(--pass);
        }

        .scenario-fail {
            background: var(--fail-bg);
            color: var(--fail);
        }

        .scenario-skip {
            background: var(--skip-bg);
            color: var(--skip);
        }

        .scenario-missing {
            background: var(--unknown-bg);
            color: var(--unknown);
        }

        details summary {
            cursor: pointer;
            color: #0b4a6f;
            font-weight: 600;
        }

        .scenario-details-group {
            margin-top: 0.5rem;
            padding-top: 0.5rem;
            border-top: 1px dashed var(--border);
        }

        .scenario-details-group h4 {
            margin: 0 0 0.5rem 0;
            font-size: 0.85rem;
        }

        .thumbnail-block img {
            margin-top: 0.4rem;
            max-width: 260px;
            border: 1px solid var(--border);
            border-radius: 4px;
        }

        .thumbnail-actions {
            margin-top: 0.5rem;
        }

        .action-button {
            display: inline-block;
            padding: 0.3rem 0.6rem;
            border: 1px solid #0b4a6f;
            border-radius: 5px;
            color: #0b4a6f;
            text-decoration: none;
            font-size: 0.78rem;
            font-weight: 700;
            background: #eff6ff;
        }

        .action-button:hover {
            background: #dbeafe;
        }

        code {
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, monospace;
            font-size: 0.75rem;
        }
    `;

}

function renderPage(title, bodyHtml) {

    return `<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <style>${renderStyles()}</style>
</head>
<body>
${bodyHtml}
</body>
</html>`;

}

function buildModalityGroups(report, pageSize = 1000) {

    var byModality = new Map();

    var files = Array.isArray(report?.files) ? report.files : [];

    for (var i = 0; i < files.length; i++) {

        var file = files[i];
        var modality = resolveFileModality(file);

        if (byModality.has(modality) == false) {
            byModality.set(modality, {
                modality,
                fileEntries: []
            });
        }

        byModality.get(modality).fileEntries.push({
            file,
            rowNumber: i + 1
        });

    }

    var groups = Array.from(byModality.values());
    groups.sort((a, b) => {

        var leftIsUnknown = a.modality == 'UNKNOWN';
        var rightIsUnknown = b.modality == 'UNKNOWN';

        if (leftIsUnknown != rightIsUnknown)
            return leftIsUnknown ? 1 : -1;

        return a.modality.localeCompare(b.modality);

    });

    var slugCount = new Map();

    for (var groupIndex = 0; groupIndex < groups.length; groupIndex++) {

        var group = groups[groupIndex];
        var baseSlug = createSlug(group.modality);
        var currentCount = slugCount.get(baseSlug) ?? 0;
        var nextCount = currentCount + 1;
        slugCount.set(baseSlug, nextCount);

        group.slug = (nextCount == 1)
            ? baseSlug
            : `${baseSlug}-${nextCount}`;

        group.failureCount = group.fileEntries.reduce((count, fileEntry) => {
            return count + ((fileEntry.file?.overallStatus == 'fail') ? 1 : 0);
        }, 0);

        var pagedEntries = splitIntoPages(group.fileEntries, pageSize);

        group.pages = pagedEntries.map((entries, pageIndex) => ({
            modality: group.modality,
            slug: group.slug,
            pageIndex,
            pageNumber: pageIndex + 1,
            totalPages: pagedEntries.length,
            fileName: `report-${group.slug}-p${String(pageIndex + 1).padStart(3, '0')}.html`,
            fileEntries: entries
        }));

    }

    return groups;

}

function renderScenarioTable(report) {

    return `
    <div class="panel">
        <h2>Scenario Summary</h2>
        <table>
            <thead>
                <tr>
                    <th>Scenario</th>
                    <th>Pass</th>
                    <th>Fail</th>
                    <th>Skip</th>
                    <th>Average</th>
                    <th>Max</th>
                </tr>
            </thead>
            <tbody>
                ${renderScenarioSummaryRows(report.summary ?? {})}
            </tbody>
        </table>
    </div>`;

}

function renderModalityNavigation(groups) {

    if (groups.length == 0) {
        return `
        <div class="panel">
            <h2>Modality Navigation</h2>
            <p>No files available.</p>
        </div>`;
    }

    var rows = [];

    for (var i = 0; i < groups.length; i++) {

        var group = groups[i];
        var pageLinks = [];

        for (var pageIndex = 0; pageIndex < group.pages.length; pageIndex++) {
            var page = group.pages[pageIndex];
            pageLinks.push(`<a href="${escapeHtml(page.fileName)}">${page.pageNumber}</a>`);
        }

        rows.push(`
            <tr>
                <td><code>${escapeHtml(group.modality)}</code></td>
                <td>${group.fileEntries.length}</td>
                <td>${group.failureCount}</td>
                <td>${group.pages.length}</td>
                <td class="page-links">${pageLinks.join(' ')}</td>
            </tr>
        `);

    }

    return `
    <div class="panel">
        <h2>Modality Navigation</h2>
        <p>Each linked page contains at most 1000 rows for a single modality.</p>
        <table>
            <thead>
                <tr>
                    <th>Modality</th>
                    <th>Rows</th>
                    <th>Rows With Any Failure</th>
                    <th>Pages</th>
                    <th>Open Pages</th>
                </tr>
            </thead>
            <tbody>
                ${rows.join('')}
            </tbody>
        </table>
    </div>`;

}

function renderMainPage(report, groups) {

    var body = `
    <h1>EASI Test-Library Harness Report</h1>
    <div class="cards">
        <div class="card">
            <div class="label">Generated At</div>
            <div class="value">${escapeHtml(report.generatedAt ?? '-')}</div>
        </div>
        <div class="card">
            <div class="label">Root</div>
            <div class="value"><code>${escapeHtml(report.configuration?.rootDirectory ?? '-')}</code></div>
        </div>
        <div class="card">
            <div class="label">Files Processed</div>
            <div class="value">${formatNumber(report.summary?.filesProcessed ?? 0, 0)}</div>
        </div>
        <div class="card">
            <div class="label">All-Scenario Pass</div>
            <div class="value">${formatNumber(report.summary?.filesPassedAllScenarios ?? 0, 0)}</div>
        </div>
        <div class="card">
            <div class="label">Any Failure</div>
            <div class="value">${formatNumber(report.summary?.filesWithFailures ?? 0, 0)}</div>
        </div>
        <div class="card">
            <div class="label">Elapsed</div>
            <div class="value">${formatMilliseconds(report.summary?.elapsedMsTotal ?? 0)}</div>
        </div>
    </div>

    ${renderScenarioTable(report)}

    ${renderModalityNavigation(groups)}
    `;

    return renderPage('EASI Test-Library Harness Report', body);

}

function renderModalityPage(report, page, scenarioNames) {

    var scenarioHeaders = [];
    for (var i = 0; i < scenarioNames.length; i++) {
        scenarioHeaders.push(`<th>${escapeHtml(scenarioNames[i])}</th>`);
    }

    var groupPages = [];
    for (var j = 0; j < report.__pageGroupsBySlug[page.slug].length; j++) {
        var item = report.__pageGroupsBySlug[page.slug][j];
        if (item.pageNumber == page.pageNumber) {
            groupPages.push(`<span class="current">${item.pageNumber}</span>`);
        }
        else {
            groupPages.push(`<a href="${escapeHtml(item.fileName)}">${item.pageNumber}</a>`);
        }
    }

    var prevLink = (page.pageNumber > 1)
        ? `<a href="${escapeHtml(report.__pageGroupsBySlug[page.slug][page.pageNumber - 2].fileName)}">Previous</a>`
        : '<span>Previous</span>';

    var nextLink = (page.pageNumber < page.totalPages)
        ? `<a href="${escapeHtml(report.__pageGroupsBySlug[page.slug][page.pageNumber].fileName)}">Next</a>`
        : '<span>Next</span>';

    var firstRow = (page.fileEntries.length > 0) ? page.fileEntries[0].rowNumber : '-';
    var lastRow = (page.fileEntries.length > 0) ? page.fileEntries[page.fileEntries.length - 1].rowNumber : '-';

    var body = `
    <div class="breadcrumbs">
        <a href="report.html">Back To Main Report</a>
    </div>

    <h1>Modality ${escapeHtml(page.modality)} - Page ${page.pageNumber} of ${page.totalPages}</h1>

    <div class="panel">
        <div class="page-links">
            ${prevLink}
            ${nextLink}
        </div>
        <div class="page-links" style="margin-top: 0.5rem;">
            ${groupPages.join(' ')}
        </div>
        <div style="margin-top: 0.5rem; color: #475569; font-size: 0.85rem;">
            Rows ${firstRow} to ${lastRow} (${page.fileEntries.length} rows on this page)
        </div>
    </div>

    <div class="panel">
        <h2>Per-File Results</h2>
        <table>
            <thead>
                <tr>
                    <th>#</th>
                    <th>File</th>
                    <th>Modality</th>
                    <th>Size</th>
                    <th>Total</th>
                    <th>Overall</th>
                    ${scenarioHeaders.join('')}
                    <th>Details</th>
                </tr>
            </thead>
            <tbody>
                ${renderFileRows(page.fileEntries, scenarioNames, {
                    sourceHrefLookup: report.__sourceHrefLookup,
                    redactPageFileName: report.__redactPageFileName
                })}
            </tbody>
        </table>
    </div>
    `;

    return renderPage(`EASI Harness - ${page.modality} - Page ${page.pageNumber}`, body);

}

function renderRedactionToolPage(options = {}) {

    var easiEntryHref = ensureRelativeHref(options.easiEntryHref ?? '../../../../src/EASI.js')
        ?? '../../../../src/EASI.js';
    var reportFileName = String(options.reportFileName ?? 'report.html');

    var body = `
    <div class="breadcrumbs">
        <a href="${escapeHtml(reportFileName)}">Back To Main Report</a>
    </div>

    <h1>Harness Redaction Tool</h1>

    <div class="panel">
        <h2>Source</h2>
        <div style="margin-bottom: 0.5rem;">
            <label style="display:block; margin-bottom:0.25rem;">DICOM Source URL/Path</label>
            <input id="redactionSourcePath" type="text" style="width:100%;" placeholder="../../../../data/test-library/example.dcm" />
        </div>
        <div style="margin-bottom: 0.5rem;">
            <label style="display:block; margin-bottom:0.25rem;">Or Select Local File</label>
            <input id="redactionSourceFile" type="file" accept=".dcm,.dicom,.ima,.img,application/dicom" />
        </div>
        <div id="redactionSourceMeta" style="font-size:0.85rem; color:#475569;"></div>
        <div id="redactionThumbContainer" style="margin-top:0.6rem; display:none;">
            <div style="font-weight:600;">Thumbnail</div>
            <img id="redactionThumb" alt="thumbnail" loading="lazy" style="margin-top:0.4rem; max-width:380px; border:1px solid #dbe0ea; border-radius:4px;" />
        </div>
    </div>

    <div class="panel">
        <h2>Mode</h2>
        <label><input type="radio" name="redactionMode" value="regions" checked /> Regions</label>
        <label style="margin-left:12px;"><input type="radio" name="redactionMode" value="ocr-regions" /> OCR Regions</label>
    </div>

    <div class="panel" id="regionsPanel">
        <h2>Regions (up to 4)</h2>
        ${[1, 2, 3, 4].map((index) => `
            <div style="margin-bottom:0.45rem; padding-bottom:0.45rem; border-bottom:1px dashed #dbe0ea;">
                <label><input type="checkbox" id="region${index}Enabled" ${index == 1 ? 'checked' : ''} /> R${index}</label>
                <label style="margin-left:8px;">X <input type="number" id="region${index}X" min="0" step="1" value="0" style="width:72px;" /></label>
                <label>Y <input type="number" id="region${index}Y" min="0" step="1" value="0" style="width:72px;" /></label>
                <label>Width <input type="number" id="region${index}Width" min="1" step="1" value="128" style="width:72px;" /></label>
                <label>Height <input type="number" id="region${index}Height" min="1" step="1" value="64" style="width:72px;" /></label>
            </div>
        `).join('')}
    </div>

    <div class="panel" id="ocrPanel" style="display:none;">
        <h2>OCR Region Options</h2>
        <div style="margin-bottom:0.4rem;">
            <label><input type="checkbox" id="ocrDetectDarkText" /> Detect Dark Text</label>
            <label style="margin-left:12px;"><input type="checkbox" id="ocrUsePeripheralZones" checked /> Use Peripheral Zones</label>
        </div>
        <div style="margin-bottom:0.4rem;">
            <label>Min High Threshold <input type="number" id="ocrMinHighThreshold" min="0" max="255" step="1" value="176" style="width:72px;" /></label>
            <label style="margin-left:8px;">Max Bright Channel Delta <input type="number" id="ocrMaxBrightChannelDelta" min="0" max="255" step="1" value="64" style="width:72px;" /></label>
        </div>
        <div style="margin-bottom:0.4rem;">
            <label>Top Zone Ratio <input type="number" id="ocrTopZoneRatio" min="0" max="1" step="0.01" value="0.22" style="width:72px;" /></label>
            <label style="margin-left:8px;">Bottom Zone Ratio <input type="number" id="ocrBottomZoneRatio" min="0" max="1" step="0.01" value="0.20" style="width:72px;" /></label>
        </div>
        <div>
            <label>Left Zone Ratio <input type="number" id="ocrLeftZoneRatio" min="0" max="1" step="0.01" value="0.20" style="width:72px;" /></label>
            <label style="margin-left:8px;">Right Zone Ratio <input type="number" id="ocrRightZoneRatio" min="0" max="1" step="0.01" value="0.20" style="width:72px;" /></label>
        </div>
    </div>

    <div class="panel">
        <h2>Coordinates + Fill</h2>
        <div style="margin-bottom:0.45rem;">
            <label><input type="radio" name="coordinateMode" value="auto-fit" checked /> Auto-fit</label>
            <label style="margin-left:8px;"><input type="radio" name="coordinateMode" value="pixel" /> Pixel</label>
            <label style="margin-left:8px;"><input type="radio" name="coordinateMode" value="normalized" /> Normalized</label>
        </div>
        <div style="margin-bottom:0.45rem;">
            <label><input type="radio" name="actionMode" value="black" checked /> Black</label>
            <label style="margin-left:8px;"><input type="radio" name="actionMode" value="white" /> White</label>
            <label style="margin-left:8px;"><input type="radio" name="actionMode" value="constant" /> Constant</label>
            <label style="margin-left:8px;">Constant Value <input type="number" id="constantFill" min="0" max="255" step="1" value="0" style="width:72px;" /></label>
        </div>
        <div style="margin-bottom:0.45rem;">
            <label><input type="checkbox" id="preserveTransferSyntax" checked /> Preserve Transfer Syntax</label>
            <label style="margin-left:8px;">Fallback Target TS <input type="text" id="targetTransferSyntax" value="1.2.840.10008.1.2.1" style="width:240px;" /></label>
        </div>
    </div>

    <div class="panel">
        <h2>Run</h2>
        <div style="margin-bottom:0.5rem;">
            <button id="runRedactionButton">Run Redaction</button>
            <a id="downloadRedactedLink" class="action-button" style="display:none; margin-left:8px;" href="#" download>Download Redacted DICOM</a>
        </div>
        <div style="margin-bottom:0.5rem;">
            <label>Output File Name <input type="text" id="outputFileName" value="redacted.dcm" style="width:280px;" /></label>
        </div>
        <textarea id="redactionLog" rows="12" style="width:100%;" placeholder="Redaction output and concerns..."></textarea>
    </div>

    <script type="module">
        import EASI from '${escapeHtml(easiEntryHref)}';

        const sourcePathInput = document.getElementById('redactionSourcePath');
        const sourceFileInput = document.getElementById('redactionSourceFile');
        const sourceMeta = document.getElementById('redactionSourceMeta');
        const runButton = document.getElementById('runRedactionButton');
        const outputFileNameInput = document.getElementById('outputFileName');
        const downloadLink = document.getElementById('downloadRedactedLink');
        const redactionLog = document.getElementById('redactionLog');
        const thumbContainer = document.getElementById('redactionThumbContainer');
        const thumbImage = document.getElementById('redactionThumb');
        const regionsPanel = document.getElementById('regionsPanel');
        const ocrPanel = document.getElementById('ocrPanel');

        const MaxConcernSamples = 250;
        let outputBlobUrl = null;

        function appendLog(message) {
            const line = String(message ?? '');
            if (redactionLog.value.length > 0)
                redactionLog.value += '\\n';
            redactionLog.value += line;
        }

        function clearLog() {
            redactionLog.value = '';
        }

        function normalizeInteger(value, fallbackValue, minimum = null, maximum = null) {
            let numericValue = Number(value);
            if (Number.isFinite(numericValue) !== true)
                numericValue = fallbackValue;
            numericValue = Math.floor(numericValue);
            if ((minimum != null) && (numericValue < minimum))
                numericValue = minimum;
            if ((maximum != null) && (numericValue > maximum))
                numericValue = maximum;
            return numericValue;
        }

        function normalizeDecimal(value, fallbackValue, minimum = null, maximum = null) {
            let numericValue = Number(value);
            if (Number.isFinite(numericValue) !== true)
                numericValue = fallbackValue;
            if ((minimum != null) && (numericValue < minimum))
                numericValue = minimum;
            if ((maximum != null) && (numericValue > maximum))
                numericValue = maximum;
            return numericValue;
        }

        function getCheckedRadioValue(name, fallbackValue) {
            const selected = document.querySelector('input[name=\"' + String(name) + '\"]:checked');
            return selected?.value ?? fallbackValue;
        }

        function getRegions() {
            const regions = [];
            for (let regionIndex = 1; regionIndex <= 4; regionIndex++) {
                const isEnabled = (document.getElementById('region' + String(regionIndex) + 'Enabled')?.checked === true);
                if (isEnabled !== true)
                    continue;

                regions.push({
                    x: normalizeInteger(document.getElementById('region' + String(regionIndex) + 'X')?.value, 0, 0, null),
                    y: normalizeInteger(document.getElementById('region' + String(regionIndex) + 'Y')?.value, 0, 0, null),
                    width: normalizeInteger(document.getElementById('region' + String(regionIndex) + 'Width')?.value, 128, 1, null),
                    height: normalizeInteger(document.getElementById('region' + String(regionIndex) + 'Height')?.value, 64, 1, null)
                });
            }
            return regions;
        }

        function getOcrOptions() {
            return {
                detectDarkText: (document.getElementById('ocrDetectDarkText')?.checked === true),
                usePeripheralZones: (document.getElementById('ocrUsePeripheralZones')?.checked === true),
                minHighThreshold: normalizeInteger(document.getElementById('ocrMinHighThreshold')?.value, 176, 0, 255),
                maxBrightChannelDelta: normalizeInteger(document.getElementById('ocrMaxBrightChannelDelta')?.value, 64, 0, 255),
                topZoneRatio: normalizeDecimal(document.getElementById('ocrTopZoneRatio')?.value, 0.22, 0, 1),
                bottomZoneRatio: normalizeDecimal(document.getElementById('ocrBottomZoneRatio')?.value, 0.20, 0, 1),
                leftZoneRatio: normalizeDecimal(document.getElementById('ocrLeftZoneRatio')?.value, 0.20, 0, 1),
                rightZoneRatio: normalizeDecimal(document.getElementById('ocrRightZoneRatio')?.value, 0.20, 0, 1)
            };
        }

        function buildRedactionOptions(onConcern) {
            const mode = getCheckedRadioValue('redactionMode', 'regions');
            const action = getCheckedRadioValue('actionMode', 'black');
            const coordinateMode = getCheckedRadioValue('coordinateMode', 'auto-fit');
            const options = {
                mode,
                action,
                coordinateMode,
                regions: getRegions(),
                ocrRegions: getOcrOptions(),
                onConcern
            };

            if (action === 'constant')
                options.fill = normalizeInteger(document.getElementById('constantFill')?.value, 0, 0, 255);

            const preserveTransferSyntax = (document.getElementById('preserveTransferSyntax')?.checked === true);
            options.preserveTransferSyntax = preserveTransferSyntax;

            if (preserveTransferSyntax !== true) {
                const targetTransferSyntax = String(document.getElementById('targetTransferSyntax')?.value ?? '').trim();
                if (targetTransferSyntax.length > 0)
                    options.targetTransferSyntax = targetTransferSyntax;
            }

            return options;
        }

        function inferOutputFileName(name) {
            let normalized = String(name ?? 'dicom').trim();
            if (normalized.length === 0)
                normalized = 'dicom';
            const extensionIndex = normalized.lastIndexOf('.');
            const baseName = (extensionIndex > 0)
                ? normalized.substring(0, extensionIndex)
                : normalized;
            return baseName + '_redacted.dcm';
        }

        function resolveInputSource() {
            const selectedFile = sourceFileInput?.files?.[0] ?? null;
            if (selectedFile != null) {
                return {
                    mode: 'byte',
                    value: selectedFile,
                    displayName: selectedFile.name ?? 'selected file'
                };
            }

            const sourcePath = String(sourcePathInput?.value ?? '').trim();
            if (sourcePath.length === 0)
                throw new Error('Specify a source path/URL or choose a local file.');

            const sourceUrl = (new URL(sourcePath, window.location.href)).href;
            return {
                mode: 'fetch',
                value: sourceUrl,
                displayName: sourcePath
            };
        }

        function updateModePanels() {
            const mode = getCheckedRadioValue('redactionMode', 'regions');
            regionsPanel.style.display = (mode === 'regions') ? 'block' : 'none';
            ocrPanel.style.display = (mode === 'ocr-regions') ? 'block' : 'none';
        }

        function updateSourceMeta() {
            const selectedFile = sourceFileInput?.files?.[0] ?? null;
            if (selectedFile != null) {
                sourceMeta.textContent = 'Using local file: ' + String(selectedFile.name ?? '');
                return;
            }
            const sourcePath = String(sourcePathInput?.value ?? '').trim();
            sourceMeta.textContent = (sourcePath.length > 0)
                ? ('Using source path: ' + sourcePath)
                : 'No source selected.';
        }

        function applyQueryParameters() {
            const search = new URLSearchParams(window.location.search);
            const source = search.get('source') ?? '';
            const relativePath = search.get('file') ?? '';
            const thumbnail = search.get('thumbnail') ?? '';

            if (source.length > 0)
                sourcePathInput.value = source;

            if (relativePath.length > 0) {
                if ((outputFileNameInput.value ?? '').trim().length === 0)
                    outputFileNameInput.value = inferOutputFileName(relativePath);
                sourceMeta.textContent = 'Selected: ' + relativePath;
            }

            if (thumbnail.length > 0) {
                thumbImage.src = thumbnail;
                thumbContainer.style.display = 'block';
            }

            if (outputFileNameInput.value.trim().length === 0)
                outputFileNameInput.value = inferOutputFileName(relativePath || 'dicom');
        }

        async function runRedaction() {
            runButton.disabled = true;
            downloadLink.style.display = 'none';
            clearLog();

            try {
                const inputSource = resolveInputSource();
                let concernCount = 0;
                const concernSamples = [];
                const redactionOptions = buildRedactionOptions((concern) => {
                    concernCount++;
                    if (concernSamples.length >= MaxConcernSamples)
                        return;

                    concernSamples.push({
                        severity: String(concern?.severity ?? 'info'),
                        code: String(concern?.code ?? 'Concern'),
                        message: String(concern?.message ?? '')
                    });
                });

                appendLog('Running redaction...');
                appendLog('Source: ' + String(inputSource.displayName));
                appendLog('Mode: ' + String(redactionOptions.mode));

                const startedAt = performance.now();

                const sourceStage = (inputSource.mode === 'fetch')
                    ? EASI.pipelineBuilder().fromHttpStream()
                    : EASI.pipelineBuilder().fromByteStream();

                const outputFileName = String(outputFileNameInput.value ?? 'redacted.dcm').trim() || 'redacted.dcm';
                const canStreamToBrowserFile = (typeof window.showSaveFilePicker === 'function');
                let outputBytes = null;
                let streamedBytesWritten = 0;

                if (canStreamToBrowserFile === true) {
                    appendLog('Choose destination file...');

                    const outputHandle = await window.showSaveFilePicker({
                        suggestedName: outputFileName,
                        types: [
                            {
                                description: 'DICOM Files',
                                accept: {
                                    'application/dicom': ['.dcm']
                                }
                            }
                        ]
                    });

                    const outputWritable = await outputHandle.createWritable();

                    try {

                        await sourceStage
                            .ofDicomData()
                            .withBurnedInRedaction(redactionOptions)
                            .toDicomData({
                                collectOutput: false,
                                onChunk: async (chunk) => {
                                    const chunkLength = Number(chunk?.length ?? 0);
                                    if (chunkLength > 0)
                                        streamedBytesWritten += chunkLength;
                                    await outputWritable.write(chunk);
                                }
                            })
                            .build()
                            .process(inputSource.value);

                        await outputWritable.close();

                    }
                    catch (error) {

                        try {
                            await outputWritable.abort(error);
                        }
                        catch (abortError) {
                        }

                        throw error;

                    }
                }
                else {
                    outputBytes = await sourceStage
                        .ofDicomData()
                        .withBurnedInRedaction(redactionOptions)
                        .toDicomData()
                        .build()
                        .process(inputSource.value);
                }

                const elapsedMs = Math.max(0, (performance.now() - startedAt));
                appendLog('Completed in ' + String(elapsedMs.toFixed(2)) + ' ms');
                if (outputBytes == null) {
                    appendLog('Bytes written: ' + String(streamedBytesWritten));
                }
                else {
                    appendLog('Output bytes: ' + String(outputBytes?.length ?? 0));
                }

                if (concernCount > 0) {
                    appendLog('Concerns: ' + String(concernCount));
                    for (let concernIndex = 0; concernIndex < concernSamples.length; concernIndex++) {
                        const concern = concernSamples[concernIndex];
                        appendLog(' - [' + String(concern.severity ?? 'info') + '] '
                            + String(concern.code ?? 'Concern') + ': '
                            + String(concern.message ?? ''));
                    }
                    if (concernCount > concernSamples.length) {
                        appendLog(' - ... ' + String(concernCount - concernSamples.length) + ' additional concern(s) not shown');
                    }
                }
                else {
                    appendLog('Concerns: 0');
                }

                if (outputBytes != null) {
                    if (outputBlobUrl != null) {
                        URL.revokeObjectURL(outputBlobUrl);
                        outputBlobUrl = null;
                    }

                    outputBlobUrl = URL.createObjectURL(new Blob([outputBytes], { type: 'application/dicom' }));
                    downloadLink.href = outputBlobUrl;
                    downloadLink.download = outputFileName;
                    downloadLink.style.display = 'inline-block';
                }
                else {
                    appendLog('Saved via browser file stream.');
                }
            }
            catch (error) {
                appendLog('Error: ' + String(error?.message ?? error));
            }
            finally {
                runButton.disabled = false;
            }
        }

        document.querySelectorAll('input[name=\"redactionMode\"]').forEach((element) => {
            element.addEventListener('change', updateModePanels);
        });
        sourcePathInput.addEventListener('input', updateSourceMeta);
        sourceFileInput.addEventListener('change', updateSourceMeta);
        runButton.addEventListener('click', runRedaction);

        applyQueryParameters();
        updateModePanels();
        updateSourceMeta();
    </script>
    `;

    return renderPage('EASI Harness - Redaction Tool', body);

}

export function renderTestLibraryHarnessHtmlPages(report, options = {}) {

    var pageSize = Number(options.pageSize ?? 1000);
    if ((Number.isFinite(pageSize) == false) || (pageSize <= 0))
        pageSize = 1000;

    var scenarioNames = report.configuration?.scenarios ?? [];
    var outputDirectory = options.outputDirectory ?? null;
    var sourceHrefLookup = buildSourceHrefLookup(report, outputDirectory);
    var redactPageFileName = String(options.redactPageFileName ?? 'redact.html');
    var easiEntryHref = resolveEasiEntryHref(outputDirectory, (options.easiSourceDirectory ?? null));
    var groups = buildModalityGroups(report, pageSize);

    var allPages = [];
    var pageGroupsBySlug = {};

    for (var groupIndex = 0; groupIndex < groups.length; groupIndex++) {
        var group = groups[groupIndex];
        pageGroupsBySlug[group.slug] = group.pages;

        for (var pageIndex = 0; pageIndex < group.pages.length; pageIndex++) {
            allPages.push(group.pages[pageIndex]);
        }
    }

    var reportWithPageLookup = {
        ...report,
        __pageGroupsBySlug: pageGroupsBySlug,
        __sourceHrefLookup: sourceHrefLookup,
        __redactPageFileName: redactPageFileName
    };

    var pages = allPages.map((page) => ({
        fileName: page.fileName,
        html: renderModalityPage(reportWithPageLookup, page, scenarioNames)
    }));

    pages.push({
        fileName: redactPageFileName,
        html: renderRedactionToolPage({
            easiEntryHref,
            reportFileName: 'report.html'
        })
    });

    return {
        pageSize,
        mainHtml: renderMainPage(report, groups),
        pages
    };

}

export function renderTestLibraryHarnessHtml(report, options = {}) {

    return renderTestLibraryHarnessHtmlPages(report, options).mainHtml;

}
