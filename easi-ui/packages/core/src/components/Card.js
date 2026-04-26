import { appendContent } from "./content.js";

export function createCard({
    title,
    subtitle,
    body,
    footer,
    badge,
    tone = "default"
} = {}) {
    const card = document.createElement("section");
    card.className = `easi-ui-card${tone === "primary" ? " easi-ui-card--primary" : ""}`;

    if (title || subtitle || badge) {
        const header = document.createElement("header");
        header.className = "easi-ui-card__header";

        const heading = document.createElement("div");

        if (title) {
            const titleElement = document.createElement("h3");
            titleElement.className = "easi-ui-card__title";
            appendContent(titleElement, title);
            heading.appendChild(titleElement);
        }

        if (subtitle) {
            const subtitleElement = document.createElement("p");
            subtitleElement.className = "easi-ui-card__subtitle";
            appendContent(subtitleElement, subtitle);
            heading.appendChild(subtitleElement);
        }

        header.appendChild(heading);

        if (badge) {
            const badgeElement = document.createElement("span");
            badgeElement.className = "easi-ui-card__badge";
            appendContent(badgeElement, badge);
            header.appendChild(badgeElement);
        }

        card.appendChild(header);
    }

    const bodyElement = document.createElement("div");
    bodyElement.className = "easi-ui-card__body";
    appendContent(bodyElement, body);
    card.appendChild(bodyElement);

    if (footer != null) {
        const footerElement = document.createElement("footer");
        footerElement.className = "easi-ui-card__footer";
        appendContent(footerElement, footer);
        card.appendChild(footerElement);
    }

    return card;
}
