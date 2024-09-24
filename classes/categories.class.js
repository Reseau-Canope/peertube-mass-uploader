/**
 * Handles categories.
 *
 * @class
 * @author Grégory Béal <gregory.beal@reseau-canope.fr>
 * @license CECILL-2.1
 */

import PeertubeApi from "./peertube-api.class.js";

export default class Categories {
    /**
     * @type {object} array-like where numeric keys are strings.
     */
    static list;

    /**
     * Retrieves all Peertube categories.
     */
    static async init() {
        this.list = await PeertubeApi.callSync("videos/categories");
    }

    /**
     * Returns category id by its display name.
     *
     * @param {string} displayName
     * @returns {number}
     */
    static getByDisplayName(displayName) {
        let categoryId = Object.keys(this.list).find(key => displayName && this.list[key].toLowerCase() === displayName.toLowerCase());
        return categoryId ? parseInt(categoryId) : -1;
    }

}