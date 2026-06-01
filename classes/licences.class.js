/**
 * Handles licences.
 *
 * @class
 * @author Shalabh Agarwal
 * @license CECILL-2.1
 */

import PeertubeApi from "./peertube-api.class.js";

export default class Licences {
    /**
     * @type {object} array-like where numeric keys are strings.
     */
    static list;

    /**
     * Retrieves all Peertube licences.
     */
    static async init() {
        this.list = await PeertubeApi.callSync("videos/licences");
    }

    /**
     * Returns licence id by its display name.
     *
     * @param {string} displayName
     * @returns {number}
     */
    static getByDisplayName(displayName) {
        let licenceId = Object.keys(this.list).find(key => displayName && this.list[key].toLowerCase() === displayName.toLowerCase());
        return licenceId ? parseInt(licenceId) : -1;
    }

}