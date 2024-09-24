/**
 * Handles a single playlist.
 *
 * @class
 * @author Grégory Béal <gregory.beal@reseau-canope.fr>
 * @license CECILL-2.1
 */

export default class Playlist {
    constructor(data) {
        for (let key in data) {
            this[key] = data[key];
        };
    }
}