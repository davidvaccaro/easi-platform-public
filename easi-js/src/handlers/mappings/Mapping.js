//
// Mapping.js
//
// Proprietary Notices:
// The Products, Documentation and Materials are proprietary to Xinonix Interactive Development Inc. and its licensors 
// and protected by applicable U.S. and international patent, copyright, trademark and trade secret laws. Xinonix 
// Interactive Development Inc and its licensors shall retain ownership in the Products, Documentation and Materials; 
// all derivatives thereof (in whole or part); and any intellectual property or other rights embodied therein. 
// 
// All proprietary notices incorporated in or affixed to any Products, Documentation or Materials shall be duplicated 
// by you on all copies of the Products, Documentation, or Material, as applicable, and shall not be altered, removed 
// or obliterated. Lease Equipment is, and shall at all times be and remain Our sole and exclusive property; you have 
// no right, title or interest therein or thereto except as expressly set forth in this Agreement. You shall keep the 
// Lease Equipment free and clear of all levies, liens and encumbrances and shall immediately notify us in writing of 
// any circumstances with respect to the location of the Equipment which will adversely affect it or our security 
// interests therein. You shall not install, attach, mount or otherwise house the Lease Equipment in a manner that 
// would render it a fixture under applicable law within the jurisdiction in which the Lease Equipment is located.
//

export default class Mapping {

    static get OmitValue() {
        return Mapping._OmitValue;
    }

    get omitValue() {
        return Mapping._OmitValue;
    }

    /**
     * Gets the currently configured default template policy.
     * @returns {'omit' | 'blank' | 'error'} The current policy.
     */
    get templatePolicy() {
        return this._templatePolicy;
    }

    /**
     * Sets the default template policy.
     * @param {'omit' | 'blank' | 'error'} policy The policy to set.
     */
    set templatePolicy(policy) {
        this._templatePolicy = this.normalizeTemplatePolicy(policy, this._templatePolicy);
    }

    /**
     * Sets the default template policy.
     * @param {'omit' | 'blank' | 'error'} policy The policy to set.
     * @returns {Mapping} The current mapping.
     */
    setTemplatePolicy(policy) {
        this.templatePolicy = policy;
        return this;
    }

    /**
     * Set one scalar property value used by template expansion.
     * @param {string} name The property name.
     * @param {string | number | boolean | bigint | Date | null} value The scalar property value.
     * @returns {Mapping} The current mapping.
     */
    setProperty(name, value) {

        if ((typeof name !== 'string') || (name.length == 0))
            throw new Error('Invalid mapping property name. Expected non-empty string.');

        if (this.isScalar(value) == false)
            throw new Error('Invalid mapping property value. Expected scalar value (string, number, boolean, bigint, Date or null).');

        this._properties[name] = value;
        return this;

    }

    /**
     * Set multiple scalar property values used by template expansion.
     * @param {object | null} properties The property bag object.
     * @returns {Mapping} The current mapping.
     */
    setProperties(properties) {

        if ((properties == null) || (typeof properties !== 'object'))
            return this;

        for (var key of Object.keys(properties)) {
            this.setProperty(key, properties[key]);
        }

        return this;

    }

    /**
     * Gets the mapping property value for the specified key.
     * @param {string} name The property name.
     * @returns {*} The current property value.
     */
    getProperty(name) {
        return this._properties[name];
    }

    /**
     * Clears all mapping property values.
     * @returns {Mapping} The current mapping.
     */
    clearProperties() {
        this._properties = {};
        return this;
    }

    /**
     * Adds a computed mapping rule that is not directly triggered by a mapped key.
     * @param {string} property The destination property path.
     * @param {object | string | Function | null} options The computed options.
     * @returns {Mapping} The current mapping.
     */
    addComputed(property, options = null) {

        if ((typeof property !== 'string') || (property.length == 0))
            throw new Error('Invalid computed mapping property. Expected non-empty string.');

        if (typeof options === 'string') {
            options = { template: options };
        }
        else if (typeof options === 'function') {
            options = { resolve: options };
        }
        else if ((options == null) || (typeof options !== 'object')) {
            options = {};
        }

        this._computed.push({
            id: options.id,
            property: property,
            template: options.template,
            resolve: options.resolve,
            transform: options.transform,
            when: this.normalizeComputedPhase(options.when, 'end'),
            policy: this.normalizeTemplatePolicy(options.policy, this._templatePolicy)
        });

        this.onDefinitionChanged();
        return this;

    }

    /**
     * Removes computed mappings.
     * @param {string | Function | null} predicateOrId The predicate or ID used to remove entries.
     * @returns {Mapping} The current mapping.
     */
    clearComputed(predicateOrId = null) {

        if (predicateOrId == null) {
            this._computed = [];
            this.onDefinitionChanged();
            return this;
        }

        if (typeof predicateOrId === 'string') {
            this._computed = this._computed.filter((entry) => entry.id !== predicateOrId);
            this.onDefinitionChanged();
            return this;
        }

        if (typeof predicateOrId === 'function') {
            this._computed = this._computed.filter((entry) => predicateOrId(entry) != true);
            this.onDefinitionChanged();
            return this;
        }

        throw new Error('Invalid computed clear predicate. Expected null, string ID or function.');

    }

    /**
     * Apply computed mappings for the specified phase.
     * @param {object} context The mapping context.
     * @param {'start' | 'end'} phase The mapping phase.
     */
    applyComputed(context, phase) {

        var normalizedPhase = this.normalizeComputedPhase(phase, 'end');

        for (var i = 0; i < this._computed.length; i++) {

            var definition = this._computed[i];
            if (definition.when !== normalizedPhase)
                continue;

            var computedValue = this.resolveDefinitionValue(
                definition,
                context,
                null,
                null
            );

            if (computedValue === Mapping._OmitValue)
                continue;

            this.setPathValue(context, definition.property, computedValue);

        }

    }

    /**
     * Gets all direct key mapping definitions.
     * @returns {Array<object>} The key mapping definition list.
     */
    getDefinitions() {
        return Array.from(this._definitions.values());
    }

    /**
     * Gets all computed mapping definitions.
     * @returns {Array<object>} The computed definition list.
     */
    getComputedDefinitions() {
        return this._computed.slice();
    }

    /**
     * Extract template token names from the specified template string.
     * @param {string | null} template The template string.
     * @returns {Array<string>} The token names.
     */
    extractTemplateTokens(template) {

        if ((template == null) || (typeof template !== 'string') || (template.length == 0))
            return [];

        var matches = template.matchAll(/\{([^{}]+)\}/g);
        var tokens = [];
        for (var match of matches) {
            tokens.push(match[1].trim());
        }

        return tokens;

    }

    /**
     * Add a maping from a key to an object property.
     * @param {string} key The specified key.
     * @param {string} property The property name or path to a property within an object hierarchy.
     */
    add(key, property, options = null) {

        if ((typeof property !== 'string') || (property.length == 0))
            throw new Error('Invalid mapping destination property. Expected non-empty string.');

        if ((options != null) && (typeof options !== 'object'))
            throw new Error('Invalid mapping options. Expected object or null.');

        var definition = {
            key: String(key),
            property: property,
            template: options?.template,
            transform: options?.transform,
            policy: this.normalizeTemplatePolicy(options?.policy, this._templatePolicy)
        };

        this._definitions.set(definition.key, definition);
        this.onDefinitionChanged();
        return this;

    }

    /**
     * Determine if the mapping has the current key.
     * @param {string} key The specified key.
     * @returns TRUE if the mapping maps the key, FALSE otherwise.
     */
    has(key){
        return this._definitions.has(String(key));
    }

    /**
     * Gets the definition for the specified key.
     * @param {string} key The key to lookup.
     * @returns {object | null} The mapping definition.
     */
    get(key) {
        return this._definitions.get(String(key)) ?? null;
    }
    
    /**
     * Start the mapping session.
     * @param {object} context The session context.
     */
    start(context) {
        this.applyComputed(context, 'start');
        return context;
    }

    /**
     * End the mapping session.
     * @param {object} context The session context.
     */
    end(context) {
        this.applyComputed(context, 'end');
    }

    /**
     * Map the key and value to the destination property.
     * @param {object} context The session context.
     * @param {string} key The specified key. 
     * @param {unknown} value The value to set to the destination mapped attribute.
     */
    map(context, key, value) {

        // If the current key is NOT mapped, return
        if (this.has(key) == false)
            return;

        // Get the mapping definition
        var definition = this.get(key);

        // Resolve the value
        var resolvedValue = this.resolveDefinitionValue(definition, context, key, value);
        if (resolvedValue === Mapping._OmitValue)
            return;

        // Set the destination path value
        this.setPathValue(context, definition.property, resolvedValue);

    }

    /**
     * Sets the value of a destination path.
     * @param {object} context The destination context.
     * @param {string} path The destination path.
     * @param {*} value The value to set.
     */
    setPathValue(context, path, value) {

        if ((context == null) || (path == null))
            return;

        // Split the path by "."
        var parts = path.split('.');

        // The object reference
        var reference = context;

        // Establish the final object reference
        if (parts.length > 1) {

            // Loop binding to each part until we reach the next to last part
            for (var i = 0; i < (parts.length - 1); i++) {

                // Save the last reference
                var lastReference = reference;

                // Access the current part
                reference = reference[parts[i]];

                // If the reference is a function, de-reference it
                if (typeof reference === 'function') {
                    reference = reference.call(lastReference);
                }

                if (reference == null)
                    return;

            }

        }

        // Set the value
        if (typeof reference[parts[parts.length - 1]] === 'function') {
            reference[parts[parts.length - 1]].call(reference, value);
        }
        else {
            reference[parts[parts.length - 1]] = value;
        }        

    }

    /**
     * Resolve the mapped value for a definition.
     * @param {object} definition The mapping definition.
     * @param {object} context The mapping context.
     * @param {string | null} key The current key.
     * @param {*} value The current value.
     * @returns {*} The mapped value or Mapping.OmitValue.
     */
    resolveDefinitionValue(definition, context, key, value) {

        var mappedValue = value;

        if (typeof definition.resolve === 'function') {
            mappedValue = definition.resolve({
                context: context,
                key: key,
                value: value,
                mapping: this
            });
        }

        if ((definition.template != null) && (typeof definition.template === 'string')) {
            mappedValue = this.applyTemplate(
                definition.template,
                {
                    context: context,
                    key: key,
                    value: mappedValue
                },
                definition.policy
            );
        }

        if (mappedValue === Mapping._OmitValue)
            return Mapping._OmitValue;

        if (typeof definition.transform === 'function') {
            mappedValue = definition.transform(mappedValue, {
                context: context,
                key: key,
                value: value,
                mapping: this
            });
        }

        return mappedValue;

    }

    /**
     * Apply template token replacements for the specified template.
     * @param {string} template The template string.
     * @param {object} scope The template scope.
     * @param {'omit' | 'blank' | 'error' | null} policy The missing token policy.
     * @returns {*} The rendered template string or Mapping.OmitValue.
     */
    applyTemplate(template, scope = null, policy = null) {

        if ((template == null) || (typeof template !== 'string'))
            return template;

        var missingPolicy = this.normalizeTemplatePolicy(policy, this._templatePolicy);
        var shouldOmit = false;

        var rendered = template.replace(/\{([^{}]+)\}/g, (match, tokenName) => {

            var resolved = this.resolveTemplateToken(tokenName, scope);
            if (resolved == null) {
                if (missingPolicy === 'blank')
                    return '';
                if (missingPolicy === 'omit') {
                    shouldOmit = true;
                    return '';
                }
                throw new Error(`Failed resolving template token "${tokenName}".`);
            }

            return this.stringifyTemplateValue(resolved);

        });

        if (shouldOmit == true)
            return Mapping._OmitValue;

        return rendered;

    }

    /**
     * Resolve a template token value.
     * @param {string} tokenName The token name.
     * @param {object | null} scope The template scope.
     * @returns {*} The resolved value.
     */
    resolveTemplateToken(tokenName, scope = null) {

        var token = (tokenName != null) ? String(tokenName).trim() : null;
        if ((token == null) || (token.length == 0))
            return null;

        if (token === 'value')
            return scope?.value;

        if (token === 'key')
            return scope?.key;

        if (token.startsWith('prop.')) {
            var propertyName = token.substring('prop.'.length);
            return this.getProperty(propertyName);
        }

        return this.resolveTemplateTokenExtension(token, scope);

    }

    /**
     * Resolve custom template token values.
     * Subclasses should override to support custom token namespaces.
     * @param {string} tokenName The token name.
     * @param {object | null} scope The template scope.
     * @returns {*} The resolved value.
     */
    resolveTemplateTokenExtension(tokenName, scope = null) {
        return null;
    }

    /**
     * Converts any scalar or scalar-like value to a template string representation.
     * @param {*} value The template value.
     * @returns {string} The string value.
     */
    stringifyTemplateValue(value) {

        if (value == null)
            return '';

        if (value instanceof Date)
            return value.toISOString();

        if (Array.isArray(value)) {
            return value.map((element) => this.stringifyTemplateValue(element)).join('\\');
        }

        if (typeof value === 'object') {
            return JSON.stringify(value);
        }

        return String(value);

    }

    /**
     * Determine if the supplied value is scalar.
     * @param {*} value The supplied value.
     * @returns {boolean} TRUE when scalar.
     */
    isScalar(value) {

        if (value == null)
            return true;

        if (value instanceof Date)
            return true;

        var type = typeof value;
        return (
            (type === 'string')
            ||
            (type === 'number')
            ||
            (type === 'boolean')
            ||
            (type === 'bigint')
        );

    }

    /**
     * Normalize the template policy.
     * @param {'omit' | 'blank' | 'error' | null | undefined} policy The policy to normalize.
     * @param {'omit' | 'blank' | 'error'} fallback The fallback policy.
     * @returns {'omit' | 'blank' | 'error'} The normalized policy.
     */
    normalizeTemplatePolicy(policy, fallback) {

        var normalized = (typeof policy === 'string') ? policy.trim().toLowerCase() : null;
        if ((normalized == null) || (normalized.length == 0))
            return fallback;

        if ((normalized !== 'omit') && (normalized !== 'blank') && (normalized !== 'error'))
            throw new Error(`Invalid mapping template policy "${policy}". Expected "omit", "blank", or "error".`);

        return normalized;

    }

    /**
     * Normalize the computed phase.
     * @param {'start' | 'end' | null | undefined} phase The phase value.
     * @param {'start' | 'end'} fallback The fallback phase.
     * @returns {'start' | 'end'} The normalized phase.
     */
    normalizeComputedPhase(phase, fallback) {

        var normalized = (typeof phase === 'string') ? phase.trim().toLowerCase() : null;
        if ((normalized == null) || (normalized.length == 0))
            return fallback;

        if ((normalized !== 'start') && (normalized !== 'end'))
            throw new Error(`Invalid mapping computed phase "${phase}". Expected "start" or "end".`);

        return normalized;

    }

    /**
     * Called when mapping definitions change.
     * Subclasses can override this to maintain derived lookup tables.
     */
    onDefinitionChanged() {
    }

    constructor() {

        this._templatePolicy = 'error';
        this._properties = {};
        this._definitions = new Map();
        this._computed = [];

    }

};

Mapping._OmitValue = Symbol('Mapping.OmitValue');
