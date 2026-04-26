import { appendContent } from "./content.js";

export function createTable({
    columns = [],
    rows = [],
    caption,
    emptyText = "No rows available."
} = {}) {
    const tableWrap = document.createElement("div");
    tableWrap.className = "easi-ui-table-wrap";

    if (!Array.isArray(rows) || rows.length === 0) {
        const empty = document.createElement("div");
        empty.className = "easi-ui-table-empty";
        appendContent(empty, emptyText);
        tableWrap.appendChild(empty);
        return tableWrap;
    }

    const table = document.createElement("table");
    table.className = "easi-ui-table";

    if (caption) {
        const captionElement = document.createElement("caption");
        appendContent(captionElement, caption);
        table.appendChild(captionElement);
    }

    const headerRow = document.createElement("tr");
    columns.forEach((column) => {
        const th = document.createElement("th");
        th.scope = "col";
        th.dataset.align = column.align || "left";
        appendContent(th, column.label || column.id || "");
        headerRow.appendChild(th);
    });

    const thead = document.createElement("thead");
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");

    rows.forEach((row, rowIndex) => {
        const tr = document.createElement("tr");

        columns.forEach((column) => {
            const td = document.createElement("td");
            td.dataset.align = column.align || "left";

            const value = typeof column.render === "function"
                ? column.render(row, rowIndex)
                : row[column.id];

            appendContent(td, value);
            tr.appendChild(td);
        });

        tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    tableWrap.appendChild(table);

    return tableWrap;
}
