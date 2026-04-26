function isDomNode(value) {
    return typeof Node !== "undefined" && value instanceof Node;
}

export function appendContent(target, value) {
    if (!target) {
        return;
    }

    if (value == null) {
        return;
    }

    if (Array.isArray(value)) {
        value.forEach((item) => appendContent(target, item));
        return;
    }

    if (typeof value === "function") {
        appendContent(target, value());
        return;
    }

    if (isDomNode(value)) {
        target.appendChild(value);
        return;
    }

    target.appendChild(target.ownerDocument.createTextNode(String(value)));
}
