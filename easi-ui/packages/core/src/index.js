import { createCard } from "./components/Card.js";
import { createTable } from "./components/Table.js";
import { createTabs } from "./components/Tabs.js";
import { ensureCoreStyles, initializeCoreStyles } from "./style.js";
import { DEFAULT_THEME_TOKENS, applyThemeTokens, createThemeTokens } from "./tokens.js";

export const EASI_UI_CORE_VERSION = "0.2.0";

export function createComponentDescriptor(name, metadata = {}) {
    return {
        name,
        metadata
    };
}

export {
    DEFAULT_THEME_TOKENS,
    applyThemeTokens,
    createThemeTokens,
    ensureCoreStyles,
    initializeCoreStyles,
    createCard,
    createTable,
    createTabs
};
