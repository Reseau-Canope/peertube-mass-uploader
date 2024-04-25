/**
 * Handles a single playlist.
 *
 * @class
 * @author Grégory Béal <gregory.beal@reseau-canope.fr>
 */

export default class Playlist {
    constructor(data) {
        for (let key in data) {
            this[key] = data[key];
        };
    }
}