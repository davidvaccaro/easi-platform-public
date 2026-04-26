import { appendContent } from "./content.js";

let tabIdCounter = 0;

function nextTabId(prefix = "easi-ui-tabs") {
    tabIdCounter += 1;
    return `${prefix}-${tabIdCounter}`;
}

export function createTabs({
    tabs = [],
    activeId,
    onChange
} = {}) {
    if (!Array.isArray(tabs) || tabs.length === 0) {
        throw new Error("createTabs requires at least one tab.");
    }

    const rootId = nextTabId();
    const root = document.createElement("section");
    root.className = "easi-ui-tabs";

    const tabList = document.createElement("div");
    tabList.className = "easi-ui-tabs__list";
    tabList.setAttribute("role", "tablist");

    const panelHost = document.createElement("div");

    const tabRecords = tabs.map((tab, index) => {
        const tabId = tab.id || `${rootId}-tab-${index + 1}`;
        const button = document.createElement("button");
        button.type = "button";
        button.className = "easi-ui-tabs__button";
        button.setAttribute("role", "tab");
        button.id = `${rootId}-button-${tabId}`;
        button.setAttribute("aria-controls", `${rootId}-panel-${tabId}`);
        appendContent(button, tab.label || tabId);

        const panel = document.createElement("article");
        panel.className = "easi-ui-tabs__panel";
        panel.setAttribute("role", "tabpanel");
        panel.id = `${rootId}-panel-${tabId}`;
        panel.setAttribute("aria-labelledby", button.id);

        appendContent(panel, tab.content);

        tabList.appendChild(button);
        panelHost.appendChild(panel);

        return { tabId, button, panel };
    });

    let currentTabId = activeId && tabRecords.some((record) => record.tabId === activeId)
        ? activeId
        : tabRecords[0].tabId;

    function setActiveTab(tabId) {
        const match = tabRecords.find((record) => record.tabId === tabId);
        if (!match) {
            return currentTabId;
        }

        currentTabId = match.tabId;

        tabRecords.forEach((record) => {
            const isActive = record.tabId === currentTabId;
            record.button.setAttribute("aria-selected", isActive ? "true" : "false");
            record.button.setAttribute("tabindex", isActive ? "0" : "-1");
            record.panel.hidden = !isActive;
        });

        if (typeof onChange === "function") {
            onChange(currentTabId);
        }

        return currentTabId;
    }

    tabRecords.forEach((record) => {
        record.button.addEventListener("click", () => {
            setActiveTab(record.tabId);
        });

        record.button.addEventListener("keydown", (event) => {
            if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
                return;
            }

            event.preventDefault();
            const currentIndex = tabRecords.findIndex((entry) => entry.tabId === currentTabId);
            const direction = event.key === "ArrowRight" ? 1 : -1;
            const nextIndex = (currentIndex + direction + tabRecords.length) % tabRecords.length;
            const next = tabRecords[nextIndex];
            setActiveTab(next.tabId);
            next.button.focus();
        });
    });

    root.appendChild(tabList);
    root.appendChild(panelHost);

    setActiveTab(currentTabId);

    return {
        element: root,
        setActiveTab,
        getActiveTab() {
            return currentTabId;
        }
    };
}
