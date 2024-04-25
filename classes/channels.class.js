/**
 * Handles channels.
 *
 * @class
 * @author Grégory Béal <gregory.beal@reseau-canope.fr>
 */

import Channel from "./channel.class.js";
import PeertubeApi from "./peertube-api.class.js";

export default class Channels {
    /**
     * All Peertube channels.
     * @type {Channel[]}
     */
    static list = [];

    /**
     * Retrieves all Peertube channels.
     */
    static async init() {
        this.list = [];
        let slice = 100, page = 0, batch;
        do {
            batch = await PeertubeApi.callSync(`video-channels?count=${slice}&start=${page}&sort=name`);
            batch.data.forEach(data => {
                this.list.push(new Channel(data));
            });
            page += slice;
        } while (batch.data.length === slice);
    }

    /**
     * Returns a Channel by its display name.
     * @param {string} displayName
     * @returns {(Channel|undefined)}
     */
    static getByDisplayName(displayName) {
        let channel = this.list.find(channel => channel.displayName.toLowerCase() === displayName.toLowerCase());
        return channel;
    }

}