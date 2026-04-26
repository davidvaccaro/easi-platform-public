import {
    EASI_UI_CORE_VERSION,
    applyThemeTokens,
    createCard,
    createTable,
    createTabs,
    initializeCoreStyles
} from "../../../packages/core/src/index.js";
import { createDicomTagViewerModel } from "../../../packages/dicom/src/index.js";
import { createFhirViewerModel } from "../../../packages/fhir/src/index.js";
import { createPipelineNode } from "../../../packages/pipeline/src/index.js";

const COOL_THEME = {
    colorPrimary: "#0b63ce",
    colorPrimarySoft: "#e7f0ff",
    colorAccent: "#0a8f67",
    colorAccentSoft: "#e8f7f1",
    colorBackground: "#edf2f8"
};

const CLINICAL_THEME = {
    colorPrimary: "#005a66",
    colorPrimarySoft: "#dff4f7",
    colorAccent: "#8e5d00",
    colorAccentSoft: "#fff2d9",
    colorBackground: "#f4f7f8"
};

const HIGH_CONTRAST_THEME = {
    colorBackground: "#eceff4",
    colorSurface: "#ffffff",
    colorSurfaceAlt: "#f5f7fa",
    colorText: "#11141a",
    colorMuted: "#2f3a4a",
    colorBorder: "#95a3b7",
    colorPrimary: "#003f93",
    colorPrimarySoft: "#dbe9ff",
    colorAccent: "#0b6d50",
    colorAccentSoft: "#dff5ee"
};

function createCodeBlock(text) {
    const pre = document.createElement("pre");
    pre.className = "easi-ui-code";
    pre.textContent = text;
    return pre;
}

function createThemeControls() {
    const container = document.createElement("div");
    container.className = "showcase-theme-switch";

    const variants = [
        { label: "Cool Default", theme: COOL_THEME },
        { label: "Clinical", theme: CLINICAL_THEME },
        { label: "High Contrast", theme: HIGH_CONTRAST_THEME }
    ];

    variants.forEach((variant) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "showcase-button";
        button.textContent = variant.label;
        button.addEventListener("click", () => {
            applyThemeTokens(document.documentElement, variant.theme);
        });
        container.appendChild(button);
    });

    return container;
}

function buildShowcase() {
    initializeCoreStyles(document, COOL_THEME);

    const app = document.getElementById("app");
    const root = document.createElement("main");
    root.className = "showcase-root easi-ui-shell easi-ui-stack";

    const header = document.createElement("header");
    header.className = "showcase-header";
    header.innerHTML = `
        <h1>EASI UI Core Primitives</h1>
        <p>Version ${EASI_UI_CORE_VERSION}. Live browser showcase for Card, Table, Tabs, and token-based theming.</p>
    `;

    const introCard = createCard({
        title: "Foundation Components",
        subtitle: "Framework-agnostic DOM components with token-driven styling.",
        badge: "Initial Alpha",
        tone: "primary",
        body: [
            "This card is rendered via ",
            "createCard(...)",
            ". Use the theme controls below to validate token overrides in real time."
        ],
        footer: createThemeControls()
    });

    const dicomModel = createDicomTagViewerModel({
        tags: [
            { tag: "(0008,0060)", name: "Modality", value: "CT" },
            { tag: "(0010,0010)", name: "PatientName", value: "DOE^JANE" },
            { tag: "(0020,000D)", name: "StudyInstanceUID", value: "2.25.1001" },
            { tag: "(0008,1030)", name: "StudyDescription", value: "CT CHEST W CONTRAST" }
        ]
    });

    const tableCard = createCard({
        title: "DICOM Tag Table",
        subtitle: "createTable(...) with horizontally safe layout and predictable column definitions.",
        body: createTable({
            caption: "Sample tags (from @easi-ui/dicom model)",
            columns: [
                { id: "tag", label: "Tag" },
                { id: "name", label: "Name" },
                { id: "value", label: "Value" }
            ],
            rows: dicomModel.tags
        })
    });

    const fhirModel = createFhirViewerModel({
        resource: {
            resourceType: "ImagingStudy",
            status: "available",
            subject: { reference: "Patient/example" },
            numberOfSeries: 2,
            numberOfInstances: 184
        }
    });

    const pipelineNodes = [
        createPipelineNode({ id: "reader", label: "Reader", stage: "fromPartStream" }),
        createPipelineNode({ id: "parser", label: "Parser", stage: "ofDicomData" }),
        createPipelineNode({ id: "adapter", label: "Adapter", stage: "withNormalization" }),
        createPipelineNode({ id: "terminal", label: "Terminal", stage: "toFHIRImagingStudy" })
    ];

    const tabs = createTabs({
        tabs: [
            {
                id: "fhir",
                label: "FHIR Preview",
                content: createCodeBlock(JSON.stringify(fhirModel.resource, null, 2))
            },
            {
                id: "pipeline",
                label: "Pipeline Nodes",
                content: createTable({
                    columns: [
                        { id: "id", label: "Id" },
                        { id: "label", label: "Label" },
                        { id: "stage", label: "Stage" }
                    ],
                    rows: pipelineNodes
                })
            },
            {
                id: "theme",
                label: "Theme Tokens",
                content: createCodeBlock(
                    "applyThemeTokens(document.documentElement, {\n" +
                    "  colorPrimary: '#005a66',\n" +
                    "  colorPrimarySoft: '#dff4f7',\n" +
                    "  colorAccent: '#8e5d00'\n" +
                    "});"
                )
            }
        ]
    });

    const tabsCard = createCard({
        title: "Tabs + Mixed Content",
        subtitle: "createTabs(...) hosts DOM content, tables, and code blocks in one composable primitive.",
        body: tabs.element
    });

    root.appendChild(header);
    root.appendChild(introCard);
    root.appendChild(tableCard);
    root.appendChild(tabsCard);

    app.innerHTML = "";
    app.appendChild(root);
}

buildShowcase();
