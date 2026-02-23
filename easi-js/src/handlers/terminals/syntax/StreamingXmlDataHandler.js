//
// StreamingXmlDataHandler.js - 1.0.0
//
// Stream XML Handler Class
//

export default class StreamingXmlDataHandler {

    onReset() {
    }

    /**
     * Create or reuse a handler context.
     * @param {object | null} context The prior context.
     * @returns {object} The current context.
     */
    onStart(context) {

        if (context == null) {
            context = {
                current: null,
                document: null,
                stack: [],
                results: []
            };
        }

        return context;

    }

    /**
     * Start a new XML document.
     * @param {object} context The handler context.
     */
    onStartDocument(context) {

        context.document = {
            type: 'document',
            children: []
        };

        context.current = null;
        context.stack = [];

    }

    /**
     * Append a child node to the active parent (element or document).
     * @param {object} context The handler context.
     * @param {object} node The child node.
     */
    appendNode(context, node) {

        if (context == null)
            return;

        if ((context.stack != null) && (context.stack.length > 0)) {
            context.stack[context.stack.length - 1].children.push(node);
            return;
        }

        if (context.document != null) {
            context.document.children.push(node);
            return;
        }

        // Fallback for malformed lifecycle usage.
        context.current = node;

    }

    /**
     * Start an XML element.
     * @param {object} context The handler context.
     * @param {{name:string,prefix:string|null,localName:string,attributes:object,isSelfClosing:boolean}} element The XML element event.
     */
    onStartElement(context, element) {

        var node = {
            type: 'element',
            name: element.name,
            prefix: (element.prefix != null) ? element.prefix : null,
            localName: element.localName,
            attributes: Object.assign({}, element.attributes || {}),
            children: []
        };

        this.appendNode(context, node);

        context.stack.push(node);
        context.current = node;

    }

    /**
     * Append XML text to the active parent, coalescing adjacent text nodes.
     * @param {object} context The handler context.
     * @param {{text:string}} text The XML text event.
     */
    onText(context, text) {

        const value = (text != null && text.text != null) ? text.text : '';
        if (value.length == 0)
            return;

        const parent = ((context != null) && (context.stack != null) && (context.stack.length > 0))
            ? context.stack[context.stack.length - 1]
            : ((context != null) ? context.document : null);

        if ((parent == null) || (Array.isArray(parent.children) == false))
            return;

        const previous = (parent.children.length > 0) ? parent.children[parent.children.length - 1] : null;
        if ((previous != null) && (previous.type == 'text')) {
            previous.text += value;
            return;
        }

        parent.children.push({
            type: 'text',
            text: value
        });

    }

    /**
     * End an XML element.
     * @param {object} context The handler context.
     */
    onEndElement(context) {

        if ((context == null) || (context.stack == null) || (context.stack.length == 0))
            return;

        context.stack.pop();
        context.current = (context.stack.length > 0) ? context.stack[context.stack.length - 1] : context.document;

    }

    onEndDocument(context) {
    }

    /**
     * Finalize the current XML parse session.
     * @param {object} context The handler context.
     * @returns {object | Array<object> | null} The materialized XML document(s).
     */
    onEnd(context) {

        if ((context != null) && (context.document != null)) {
            context.results.push(context.document);
        }

        if ((context == null) || (context.results == null) || (context.results.length == 0))
            return null;

        return (context.results.length == 1) ? context.results[0] : context.results;

    }

    onError(context, error) {
    }

    onProgress(context, progress) {
    }

    constructor() {
    }

};
