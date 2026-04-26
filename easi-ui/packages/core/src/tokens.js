const DEFAULT_THEME_TOKENS = {
    colorBackground: "#edf2f8",
    colorSurface: "#ffffff",
    colorSurfaceAlt: "#f7fafc",
    colorText: "#14202b",
    colorMuted: "#4f5f72",
    colorBorder: "#d2dce8",
    colorPrimary: "#0b63ce",
    colorPrimarySoft: "#e7f0ff",
    colorAccent: "#0a8f67",
    colorAccentSoft: "#e8f7f1",
    colorDanger: "#b54646",
    colorTabIdle: "#f0f4fa",
    shadowSm: "0 1px 3px rgba(20, 32, 43, 0.08)",
    shadowMd: "0 10px 22px rgba(20, 32, 43, 0.12)",
    fontBody: "'IBM Plex Sans', 'Avenir Next', 'Segoe UI', sans-serif",
    fontMono: "'IBM Plex Mono', 'SFMono-Regular', Menlo, monospace",
    radiusSm: "8px",
    radiusMd: "12px",
    radiusLg: "16px",
    spacingXs: "4px",
    spacingSm: "8px",
    spacingMd: "12px",
    spacingLg: "16px",
    spacingXl: "24px"
};

function tokenToCssVariableName(tokenName) {
    return `--easi-ui-${tokenName.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`;
}

export function createThemeTokens(overrides = {}) {
    return {
        ...DEFAULT_THEME_TOKENS,
        ...(overrides || {})
    };
}

export function applyThemeTokens(target, overrides = {}) {
    if (!target || !target.style || typeof target.style.setProperty !== "function") {
        throw new Error("applyThemeTokens requires a style-capable target, such as document.documentElement.");
    }

    const tokens = createThemeTokens(overrides);

    Object.entries(tokens).forEach(([tokenName, value]) => {
        target.style.setProperty(tokenToCssVariableName(tokenName), String(value));
    });

    return tokens;
}

export { DEFAULT_THEME_TOKENS };
