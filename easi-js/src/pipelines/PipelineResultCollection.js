//
// PipelineResultCollection.js
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

const CollectionMarker = Symbol('PipelineResultCollectionMarker');
const InternalItems = Symbol('PipelineResultCollectionItems');

function isIndexProperty(propertyName) {

    if (typeof propertyName == 'number') {
        return Number.isInteger(propertyName) && (propertyName >= 0);
    }

    if (typeof propertyName != 'string') {
        return false;
    }

    return /^[0-9]+$/.test(propertyName);

}

function toIndex(propertyName) {

    if (typeof propertyName == 'number') {
        return propertyName;
    }

    return Number.parseInt(propertyName, 10);

}

function isForwardableObject(value) {
    return ((value != null) && ((typeof value == 'object') || (typeof value == 'function')));
}

function normalizeItems(value) {

    if (value == null) {
        return [];
    }

    if (Array.isArray(value) == true) {
        return value;
    }

    return [value];

}

export default class PipelineResultCollection {

    /**
     * Normalize one result value to a stable pipeline result collection.
     * @param {*} value The source result value.
     * @returns {PipelineResultCollection} A normalized result collection.
     */
    static from(value) {

        if (PipelineResultCollection.isCollection(value) == true) {
            return value;
        }

        return new PipelineResultCollection(normalizeItems(value));

    }

    /**
     * Determine whether one value is already a result collection.
     * @param {*} value The source value.
     * @returns {boolean} TRUE when value is a PipelineResultCollection.
     */
    static isCollection(value) {
        return ((value != null) && (value[CollectionMarker] === true));
    }

    /**
     * Total items in this collection.
     * @returns {number} Collection count.
     */
    get count() {
        return this[InternalItems].length;
    }

    /**
     * Alias for count to support array-style length access.
     * @returns {number} Collection length.
     */
    get length() {
        return this.count;
    }

    /**
     * Determine whether collection has no items.
     * @returns {boolean} TRUE when empty.
     */
    get isEmpty() {
        return (this.count === 0);
    }

    /**
     * Access the first item in the collection.
     * @param {*} fallback Optional fallback value when collection is empty.
     * @returns {*} The first item or fallback.
     */
    first(fallback = null) {

        if (this.count === 0) {
            return fallback;
        }

        return this[InternalItems][0];

    }

    /**
     * Access the last item in the collection.
     * @param {*} fallback Optional fallback value when collection is empty.
     * @returns {*} The last item or fallback.
     */
    last(fallback = null) {

        if (this.count === 0) {
            return fallback;
        }

        return this[InternalItems][this.count - 1];

    }

    /**
     * Access one item by index.
     * Supports negative indexing from collection tail.
     * @param {number} index The index.
     * @returns {*} The item or null when index is out of range.
     */
    at(index) {

        if (Number.isFinite(Number(index)) == false) {
            return null;
        }

        var resolved = Math.trunc(Number(index));
        if (resolved < 0) {
            resolved = (this.count + resolved);
        }

        if ((resolved < 0) || (resolved >= this.count)) {
            return null;
        }

        return this[InternalItems][resolved];

    }

    /**
     * Return the one expected item for single-item workflows.
     * @returns {*} The only item or null when collection cardinality is not one.
     */
    single() {
        return (this.count === 1) ? this[InternalItems][0] : null;
    }

    /**
     * Clone items to a plain array.
     * @returns {Array<*>} Cloned items.
     */
    toArray() {
        return [...this[InternalItems]];
    }

    /**
     * Iterate each item.
     * @param {Function} callback The callback.
     */
    forEach(callback) {
        this[InternalItems].forEach(callback);
    }

    /**
     * Project each item to a new array.
     * @param {Function} callback The callback.
     * @returns {Array<*>} Projected array.
     */
    map(callback) {
        return this[InternalItems].map(callback);
    }

    /**
     * Filter items and return a new result collection.
     * @param {Function} callback The callback.
     * @returns {PipelineResultCollection} Filtered collection.
     */
    filter(callback) {
        return new PipelineResultCollection(this[InternalItems].filter(callback));
    }

    /**
     * Determine whether any item satisfies callback.
     * @param {Function} callback The callback.
     * @returns {boolean} TRUE when any item matches.
     */
    some(callback) {
        return this[InternalItems].some(callback);
    }

    /**
     * Determine whether all items satisfy callback.
     * @param {Function} callback The callback.
     * @returns {boolean} TRUE when all items match.
     */
    every(callback) {
        return this[InternalItems].every(callback);
    }

    /**
     * Locate one item using callback.
     * @param {Function} callback The callback.
     * @returns {*} First matching item or undefined.
     */
    find(callback) {
        return this[InternalItems].find(callback);
    }

    /**
     * Determine whether collection contains a value.
     * @param {*} value The candidate value.
     * @returns {boolean} TRUE when value is found.
     */
    includes(value) {
        return this[InternalItems].includes(value);
    }

    /**
     * Return the default primitive representation using the first item.
     * @param {'default' | 'number' | 'string'} hint Primitive hint.
     * @returns {*} Primitive value.
     */
    [Symbol.toPrimitive](hint) {

        var first = this.first(null);
        if (first == null) {
            return (hint === 'number') ? 0 : '';
        }

        if (typeof first == 'object') {
            return (hint === 'number') ? Number.NaN : String(first);
        }

        return first;

    }

    /**
     * Return first item as valueOf for compatibility with simple comparisons.
     * @returns {*} First item.
     */
    valueOf() {
        return this.first(null);
    }

    /**
     * Return string representation of first item.
     * @returns {string} String representation.
     */
    toString() {
        return String(this.first(''));
    }

    /**
     * JSON representation serializes to plain array of items.
     * @returns {Array<*>} JSON-safe array.
     */
    toJSON() {
        return this.toArray();
    }

    /**
     * Support standard collection iteration.
     * @returns {Iterator<*>} Items iterator.
     */
    [Symbol.iterator]() {
        return this[InternalItems][Symbol.iterator]();
    }

    /**
     * Construct one pipeline result collection.
     * @param {Array<*>} items Source items.
     */
    constructor(items = []) {

        Object.defineProperty(this, CollectionMarker, {
            value: true,
            enumerable: false,
            configurable: true,
            writable: false
        });

        Object.defineProperty(this, InternalItems, {
            value: normalizeItems(items),
            enumerable: false,
            configurable: true,
            writable: true
        });

        return new Proxy(this, {

            get(target, propertyName, receiver) {

                if (propertyName === CollectionMarker) {
                    return true;
                }

                if (propertyName === Symbol.iterator) {
                    var firstIterable = target.single();
                    if ((firstIterable != null) && (typeof firstIterable[Symbol.iterator] == 'function')) {
                        return firstIterable[Symbol.iterator].bind(firstIterable);
                    }

                    return target[Symbol.iterator].bind(target);
                }

                if (isIndexProperty(propertyName) == true) {
                    var firstIndexTarget = target.single();
                    if (firstIndexTarget != null) {

                        if (isForwardableObject(firstIndexTarget) == false) {
                            var primitiveIndexTarget = Object(firstIndexTarget);
                            if (Reflect.has(primitiveIndexTarget, propertyName) == true) {
                                return Reflect.get(primitiveIndexTarget, propertyName);
                            }
                        }
                        else if (Reflect.has(firstIndexTarget, propertyName) == true) {
                            return Reflect.get(firstIndexTarget, propertyName);
                        }

                    }

                    return target.at(toIndex(propertyName));
                }

                if (propertyName === 'length') {
                    var firstLengthTarget = target.single();
                    if (firstLengthTarget != null) {

                        if (isForwardableObject(firstLengthTarget) == false) {
                            var primitiveLengthTarget = Object(firstLengthTarget);
                            if (Reflect.has(primitiveLengthTarget, propertyName) == true) {
                                return Reflect.get(primitiveLengthTarget, propertyName);
                            }
                        }
                        else if (Reflect.has(firstLengthTarget, propertyName) == true) {
                            return Reflect.get(firstLengthTarget, propertyName);
                        }

                    }
                }

                if (Reflect.has(target, propertyName) == true) {
                    var owned = Reflect.get(target, propertyName, receiver);
                    if (typeof owned == 'function') {
                        return owned.bind(target);
                    }
                    return owned;
                }

                var first = target.first(undefined);
                if (first === undefined) {
                    return undefined;
                }

                if (isForwardableObject(first) == false) {
                    var primitiveObject = Object(first);
                    if (Reflect.has(primitiveObject, propertyName) == false) {
                        return undefined;
                    }

                    var primitiveMember = Reflect.get(primitiveObject, propertyName);
                    if (typeof primitiveMember == 'function') {
                        return primitiveMember.bind(first);
                    }

                    return primitiveMember;
                }

                var forwarded = Reflect.get(first, propertyName);
                if (typeof forwarded == 'function') {
                    return forwarded.bind(first);
                }

                return forwarded;

            },

            has(target, propertyName) {

                if (isIndexProperty(propertyName) == true) {
                    var firstIndexTarget = target.single();
                    if (firstIndexTarget != null) {

                        if (isForwardableObject(firstIndexTarget) == false) {
                            return Reflect.has(Object(firstIndexTarget), propertyName);
                        }

                        return Reflect.has(firstIndexTarget, propertyName);
                    }

                    var index = toIndex(propertyName);
                    return ((index >= 0) && (index < target.count));
                }

                if (Reflect.has(target, propertyName) == true) {
                    return true;
                }

                var first = target.first(undefined);
                if (first === undefined) {
                    return false;
                }

                if (isForwardableObject(first) == false) {
                    return Reflect.has(Object(first), propertyName);
                }

                return Reflect.has(first, propertyName);

            },

            getOwnPropertyDescriptor(target, propertyName) {

                if (isIndexProperty(propertyName) == true) {
                    var value = target.at(toIndex(propertyName));
                    if (value === null) {
                        return undefined;
                    }

                    return {
                        configurable: true,
                        enumerable: true,
                        writable: false,
                        value
                    };
                }

                var ownDescriptor = Object.getOwnPropertyDescriptor(target, propertyName);
                if (ownDescriptor != null) {
                    return ownDescriptor;
                }

                if (propertyName === 'length') {
                    return {
                        configurable: true,
                        enumerable: false,
                        writable: false,
                        value: target.length
                    };
                }

                var first = target.single();
                if (isForwardableObject(first) == false) {
                    return undefined;
                }

                var forwardedDescriptor = Object.getOwnPropertyDescriptor(first, propertyName);
                if (forwardedDescriptor == null) {
                    return undefined;
                }

                return Object.assign({}, forwardedDescriptor, {
                    configurable: true
                });

            },

            ownKeys(target) {

                var keys = Reflect.ownKeys(target).filter((key) => (key !== CollectionMarker) && (key !== InternalItems));
                var first = target.single();

                if (isForwardableObject(first) == false) {
                    return keys;
                }

                var forwardedKeys = Reflect.ownKeys(first);
                for (var i = 0; i < forwardedKeys.length; i++) {
                    if (keys.includes(forwardedKeys[i]) == false) {
                        keys.push(forwardedKeys[i]);
                    }
                }

                return keys;

            },

            getPrototypeOf(target) {

                var first = target.single();
                if (isForwardableObject(first) == true) {
                    return Object.getPrototypeOf(first);
                }

                return Reflect.getPrototypeOf(target);

            }

        });

    }

}
