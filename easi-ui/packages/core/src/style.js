import { applyThemeTokens } from "./tokens.js";

const CORE_STYLE_ELEMENT_ID = "easi-ui-core-styles";

const CORE_STYLE_TEXT = `
.easi-ui-shell {
    color: var(--easi-ui-color-text);
    font-family: var(--easi-ui-font-body);
}

.easi-ui-stack {
    display: flex;
    flex-direction: column;
    gap: var(--easi-ui-spacing-lg);
}

.easi-ui-card {
    background: var(--easi-ui-color-surface);
    border: 1px solid var(--easi-ui-color-border);
    border-radius: var(--easi-ui-radius-lg);
    box-shadow: var(--easi-ui-shadow-sm);
    padding: var(--easi-ui-spacing-lg);
}

.easi-ui-card--primary {
    border-color: color-mix(in srgb, var(--easi-ui-color-primary) 40%, white);
    background: linear-gradient(
        180deg,
        color-mix(in srgb, var(--easi-ui-color-primary-soft) 55%, white),
        var(--easi-ui-color-surface)
    );
}

.easi-ui-card__header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--easi-ui-spacing-md);
    margin-bottom: var(--easi-ui-spacing-md);
}

.easi-ui-card__title {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
}

.easi-ui-card__subtitle {
    margin: var(--easi-ui-spacing-xs) 0 0;
    color: var(--easi-ui-color-muted);
    font-size: 13px;
}

.easi-ui-card__badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    font-weight: 600;
    color: var(--easi-ui-color-primary);
    background: var(--easi-ui-color-primary-soft);
    border: 1px solid color-mix(in srgb, var(--easi-ui-color-primary) 25%, white);
    border-radius: 999px;
    padding: 4px 10px;
    white-space: nowrap;
}

.easi-ui-card__body {
    margin: 0;
}

.easi-ui-card__footer {
    margin-top: var(--easi-ui-spacing-lg);
    color: var(--easi-ui-color-muted);
    font-size: 12px;
}

.easi-ui-table-wrap {
    overflow-x: auto;
    border: 1px solid var(--easi-ui-color-border);
    border-radius: var(--easi-ui-radius-md);
    background: var(--easi-ui-color-surface);
}

.easi-ui-table {
    width: 100%;
    border-collapse: collapse;
    min-width: 640px;
}

.easi-ui-table caption {
    text-align: left;
    font-weight: 600;
    color: var(--easi-ui-color-muted);
    padding: var(--easi-ui-spacing-md) var(--easi-ui-spacing-md) 0;
}

.easi-ui-table th,
.easi-ui-table td {
    text-align: left;
    padding: 10px var(--easi-ui-spacing-md);
    border-bottom: 1px solid var(--easi-ui-color-border);
    vertical-align: top;
    font-size: 13px;
}

.easi-ui-table th {
    background: var(--easi-ui-color-surface-alt);
    color: var(--easi-ui-color-muted);
    font-weight: 600;
}

.easi-ui-table tr:last-child td {
    border-bottom: none;
}

.easi-ui-table td[data-align="right"],
.easi-ui-table th[data-align="right"] {
    text-align: right;
}

.easi-ui-table-empty {
    padding: var(--easi-ui-spacing-lg);
    color: var(--easi-ui-color-muted);
    font-size: 13px;
}

.easi-ui-tabs {
    border: 1px solid var(--easi-ui-color-border);
    border-radius: var(--easi-ui-radius-md);
    background: var(--easi-ui-color-surface);
    overflow: hidden;
}

.easi-ui-tabs__list {
    display: flex;
    flex-wrap: wrap;
    gap: var(--easi-ui-spacing-sm);
    padding: var(--easi-ui-spacing-md);
    background: var(--easi-ui-color-surface-alt);
    border-bottom: 1px solid var(--easi-ui-color-border);
}

.easi-ui-tabs__button {
    border: 1px solid color-mix(in srgb, var(--easi-ui-color-border) 70%, white);
    background: var(--easi-ui-color-tab-idle);
    border-radius: var(--easi-ui-radius-sm);
    color: var(--easi-ui-color-text);
    padding: 8px 12px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
}

.easi-ui-tabs__button[aria-selected="true"] {
    border-color: color-mix(in srgb, var(--easi-ui-color-primary) 45%, white);
    background: var(--easi-ui-color-primary-soft);
    color: var(--easi-ui-color-primary);
}

.easi-ui-tabs__panel {
    padding: var(--easi-ui-spacing-lg);
}

.easi-ui-tabs__panel[hidden] {
    display: none;
}

.easi-ui-code {
    margin: 0;
    padding: var(--easi-ui-spacing-md);
    border: 1px solid var(--easi-ui-color-border);
    border-radius: var(--easi-ui-radius-sm);
    background: #0f1720;
    color: #d4e3ff;
    font-family: var(--easi-ui-font-mono);
    font-size: 12px;
    white-space: pre-wrap;
    overflow-x: auto;
}
`;

export function ensureCoreStyles(documentRef = document) {
    if (!documentRef || !documentRef.head) {
        throw new Error("ensureCoreStyles requires a browser-like document with a head element.");
    }

    let styleElement = documentRef.getElementById(CORE_STYLE_ELEMENT_ID);

    if (!styleElement) {
        styleElement = documentRef.createElement("style");
        styleElement.id = CORE_STYLE_ELEMENT_ID;
        styleElement.textContent = CORE_STYLE_TEXT;
        documentRef.head.appendChild(styleElement);
    }

    return styleElement;
}

export function initializeCoreStyles(documentRef = document, overrides = {}) {
    ensureCoreStyles(documentRef);
    applyThemeTokens(documentRef.documentElement, overrides);
}
