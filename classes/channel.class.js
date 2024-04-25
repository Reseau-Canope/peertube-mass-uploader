/**
 * Handles a single channel.
 *
 * @class
 * @author Grégory Béal <gregory.beal@reseau-canope.fr>
 */

import Log from "./log.class.js";
import PeertubeApi from "./peertube-api.class.js";
import Playlist from "./playlist.class.js";

export default class Channel {
    /**
     * All Channel playlists.
     * @type {Playlist[]}
     */
    playlists;

    constructor(data) {
        for (let key in data) {
            this[key] = data[key];
        };
    }

    /**
     * Retrieves all Channel playlists.
     */
    async getPlaylists() {
        Log.debug(`Get playlists for channel "${this.displayName}".`);
        this.playlists = [];
        let slice = 100, page = 0, batch;
        do {
            batch = await PeertubeApi.callSync(`video-channels/${this.name}/video-playlists?count=${slice}&start=${page}`);
            batch.data.forEach(playlist => {
                this.playlists.push(new Playlist(playlist));
            });
            page += slice;
        } while (batch.data.length === slice);
    }

    /**
     * Returns a Channel Playlist by its display name.
     * @param {string} displayName
     * @returns {(Playlist|undefined)}
     */
    async getPlaylistByDisplayName(displayName) {
        if (typeof this.playlists === "undefined") {
            await this.getPlaylists();
        }
        let playlist = this.playlists.find(playlist => playlist.displayName.toLowerCase() === displayName.toLowerCase());
        return playlist;
    }

    /**
     * Adds new Playlist to Channel and returns it.
     * @param {string} displayName
     * @returns {Playlist}
     */
    async addPlaylist(displayName) {
        Log.info(`Create public playlist "${displayName}" for channel "${this.displayName}".`);
        let form = new FormData();
        form.set("displayName", displayName);
        form.set("videoChannelId", this.id);
        form.set("privacy", 1);//Public.

        let createdPlaylist = await PeertubeApi.callSync("video-playlists", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${PeertubeApi.accessToken}`
            },
            body: form
        });

        //Get complete playlist data, not just ids.
        let completePlaylist = await PeertubeApi.callSync("video-playlists", {
            playlistId: createdPlaylist.videoPlaylist.id
        });

        let playlist = new Playlist(completePlaylist.data[0]);
        Log.debug('New playlist:', playlist);
        this.playlists.push(playlist);
        return playlist;
    }

}