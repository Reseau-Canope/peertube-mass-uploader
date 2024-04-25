/**
 * All-purpose utility.
 *
 * @class
 * @author Grégory Béal <gregory.beal@reseau-canope.fr>
 */

export default class Utility {
    /**
     * "typeof" alias that returns "array" for arrays instead of "object".
     *
     * @param {*} v
     * @returns {string}
     */
    static getType(v) {
        return Array.isArray(v) ? 'array' : typeof v;
    }

    /**
     * Returns clone of obj1 with each property common to obj2:
     * - recursively merged if it's an object ONLY (excl. arrays)
     * - replaced in any other case.
     * Original obj1 & obj2 are not modified.
     *
     * @param {object} obj1
     * @param {object} obj2
     * @returns {object}
     */
    static recursiveMerge(obj1, obj2) {
        if (this.getType(obj1) !== 'object' || this.getType(obj2) !== 'object') {
            return obj2;
        }
        let obj = structuredClone(obj1);
        for (let key in obj2) {
            obj[key] = this.recursiveMerge(obj[key], obj2[key]);
        }
        return obj;
    }

    /**
     * Slices str using sep as separator, trims them
     * and returns result as an array.
     *
     * @param {string} str
     * @param {string} sep
     * @returns {string[]}
     */
    static splitTrim(str, sep) {
        return str.split(sep)
            .map(slice => slice.trim());
    }

    /**
     * Returns str in snake_case: "One+two = THREE!" => "one_two___three_".
     * Does NOT handle camelCase: "oneTwoThree" => "onetwothree".
     *
     * @param {*} str
     * @returns {string}
     */
    static toSnakeCase(str) {
        return str.normalize("NFKD")
            .toLowerCase()
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/œ/g, "oe")
            .replace(/æ/g, "ae")
            .split(/[^0-9a-z]/)
            .join("_");
    }
}