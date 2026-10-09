//
// HumanName.js
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

import Element from "./Element.js"
import { NameUse } from "./NameUse.js";
import StringUtils from "../utils/StringUtils.js";
import { asArray, toFhirJSON } from "./FhirJson.js";

export default class HumanName extends Element {
  
    /**
     * Gets the use value.
     */
    get use() {
        return this._use;
    }

    /**
     * Sets the use value.
     */
    set use(use) {
        this._use = use;
    }

    /**
     * Gets the text value.
     */
    get text() {
        return this._text;
    }

    /**
     * Sets the text value.
     */
    set text(text) {
        this._text = text;
    }

    /**
     * Gets the family value.
     */
    get family() {
        return this._family;
    }

    /**
     * Sets the family value.
     */
    set family(family) {
        this._family = family;
    }

    /**
     * Gets the given value.
     */
    get given() {
        return this._given;
    }

    /**
     * Sets the given value.
     */
    set given(given) {
        this._given = given;
    }

    /**
     * Add an name to the multi-value given name.
     * @param {string} given The specified given name.
     */
    addGiven(given) {
        this.addMultiValue('given', given);
    }

    /**
     * Gets the prefix value.
     */
    get prefix() {
        return this._prefix;
    }    

    /**
     * Sets the prefix value.
     */
    set prefix(prefix) {
        this._prefix = prefix;
    }

    /**
     * Add an prefix to the multi-value prefix.
     * @param {string} prefix The specified prefix.
     */
    addPrefix(prefix) {
        this.addMultiValue('prefix', prefix);
    }

    /**
     * Gets the suffix value.
     */
    get suffix() {
        return this._suffix;
    }

    /**
     * Sets the suffix value.
     */
    set suffix(suffix) {
        this._suffix = suffix;
    }

    /**
     * Add an suffix to the multi-value suffix.
     * @param {string} suffix The specified suffix.
     */
    addSuffix(suffix) {
        this.addMultiValue('suffix', suffix);
    }

    /**
     * Gets the period value.
     */
    get period() {
        return this._period;
    }

    /**
     * Sets the period value.
     */
    set period(period) {
        this._period = period;
    }

    /**
     * Coerce the specified value into a complete HumanName.
     * @param {HumanName | string} value The specified value.
     */
    static coerce(value) {

        // Handle NOOP NULL or HumanName
        if ((value == null) || (value instanceof HumanName)) {
            return value;
        }

        if (typeof value === 'object') {
            return new HumanName(value);
        }

        // Create the resultant human name
        var result = new HumanName();

        // Handle coercing a string
        if (typeof value === 'string') {

            // Detemine the type of name based on certain encoding information

            // If there are carets "^", treat this as an DICOM/HL7 multi-component "Person Name"
            if (value.includes("^")) {

                // MODEL: family name complex^given name complex^middle name^name prefix^name suffix.

                // Split the name value
                var parts = value.split('^');

                // Set the "family name complex"
                if ((parts.length > 0) && (StringUtils.isValid(parts[0]) == true)) {
                    result.family = parts[0].trim();
                }

                // Set the "given name complex"
                if ((parts.length > 1) && (StringUtils.isValid(parts[1]) == true)) {
                    result.addGiven(parts[1].trim());
                }

                // Set the "middle name"
                if ((parts.length > 2) && (StringUtils.isValid(parts[2]) == true)) {
                    result.addGiven(parts[2].trim());
                }

                // Set the "name prefix"
                if ((parts.length > 3) && (StringUtils.isValid(parts[3]) == true)) {
                    result.addPrefix(parts[3].trim());
                }

                // Set the "name suffix"
                if ((parts.length > 4) && (StringUtils.isValid(parts[4]) == true)) {
                    result.addSuffix(parts[4].trim());
                }

                // Formulate the "text"
                var names = [];

                // First the "given"
                if (result.given != null) {
                    if (Array.isArray(result.given))
                        names.push(...result.given);
                    else
                        names.push(result.given);
                }

                // Next the "family"
                if (result.family != null) {
                    names.push(result.family);
                }

                // Set the "text" value
                result.text = names.join(' ');

            }
            else {

                // Simply set the family name
                result.family = value;

            }

            // Set the "name use" to "USUAL"
            result.use = NameUse.USUAL;

        }

        // Return the human name
        return result;

    }

    /**
     * Convert to JSON data
     * @returns 
     */
    toJSON() {
        return toFhirJSON({
            use: NameUse.toJSON(this.use),
            text: this.text,
            family: this.family,
            given: asArray(this.given),
            prefix: asArray(this.prefix),
            suffix: asArray(this.suffix),
            period: this.period
        });
    }

    constructor(data = null) {

        // Call the super
        super(data);

    }

};
