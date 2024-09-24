/**
 * Handles a single video.
 *
 * @class
 * @author Grégory Béal <gregory.beal@reseau-canope.fr>
 * @license CECILL-2.1
 */

import fs from 'fs';

import Log from "./log.class.js";
import PeertubeApi from "./peertube-api.class.js";
import Categories from "./categories.class.js";
import Utility from "../utilities/general.utility.js";
import Channels from "./channels.class.js";
import Mediafiles from "./mediafiles.class.js";
import settings from "../settings.js";
import Data from './data.class.js';

/**
 * Paths to videos (todo, wip, failed...)
 * @type {object}
 */
const paths = settings.paths;

export default class Video {
    constructor(id) {
        this.id = id;
    }

    /**
     * Initialize a Video by its data.
     * @param {object} data
     */
    async init(data) {
        Log.debug("Video data", data)
        for (let key in data) {
            this[key] = data[key];
        };
        await this.setChannel(data.channel);
        this.setLanguage(data.language);
        this.setPrivacy(data.privacy);
        this.setCategory(data.category);
        this.setTags(data.tags);
        this.setPublicationDate(data.publicationDate);
    }

    /**
     * Adds Peertube captions to Video by its captions data.
     */
    async addCaptions() {
        if (this.captions) {
            for (let lang in this.captions) {
                let form = new FormData();
                let captionurl = paths.wip + this.captions[lang];
                Log.info(`Add captions "${captionurl}"`)
                let captionMimetype = Mediafiles.getMimeType(captionurl);
                if (captionMimetype) {
                    let caption = new Blob([fs.readFileSync(captionurl)], { type: captionMimetype });
                    Log.info(caption);
                    form.set("captionfile", caption);
                    await fetch(`${PeertubeApi.url}videos/${this.peertubeShortUuid}/captions/${lang}`, {
                        method: "PUT",
                        headers: {
                            Authorization: `Bearer ${PeertubeApi.accessToken}`
                        },
                        body: form
                    })
                        .then(response => {
                            if (response.ok) {
                                Log.info("Captions added");
                            } else {
                                Log.error("Couldn't add captions:", response);
                            }
                        });
                } else {
                    Log.error(`Aborted captions "${captionurl}" upload: file MIME type is unknown.`);
                }
            };
        }
    }

    /**
     * Adds Video to Peertube playlists.
     */
    async addToPlaylists() {
        for (let playlist of this.playlists) {
            Log.info(`Adding video to playlist "${playlist.displayName}"`);
            await PeertubeApi.callSync(`video-playlists/${playlist.id}/videos`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${PeertubeApi.accessToken}`
                },
                body: new URLSearchParams({
                    videoId: this.peertubeId
                })
            });
        };
    }

    /**
     * Sets Video's Peertube language by its label.
     * @param {string} language Label
     */
    setLanguage(language) {
        let languageId = Object.keys(settings.data.languages)
            .find(key => language && settings.data.languages[key].toLowerCase() === language.toLowerCase());
        this.language = { id: languageId, label: language };
    }

    /**
     * Sets Video's Peertube privacy by its label.
     * @param {string} privacy Label
     */
    setPrivacy(privacy) {
        let privacyId = settings.data.privacies
            .findIndex(item => privacy && item.toLowerCase() === privacy.toLowerCase()) + 1;
        this.privacy = { id: privacyId, label: privacy };
    }

    /**
     * Sets Video's Peertube category by its label.
     * @param {string} category Label
     */
    setCategory(category) {
        let categoryId = Categories.getByDisplayName(category);
        if (categoryId >= 0) {
            this.category = { id: categoryId, label: category };
        }
    }

    /**
     * Sets Video's tags.
     * @param {string} tags ";" separated tags.
     */
    setTags(tags) {
        this.tags = tags ? Utility.splitTrim(tags, ";") : [];
    }

    /**
     * Sets Video's publication date. If date is a 4-digit year, adds "-01-01".
     * @param {string} date
     * @todo Use a Date object instead.
     */
    setPublicationDate(date) {
        this.publicationDate = `${date}`;
        if (this.publicationDate.length === 4) {
            this.publicationDate += "-01-01";
        }
    }

    /**
     * Sets Video's Peertube channel by its display name.
     * @param {string} channelName
     */
    async setChannel(channelName) {
        this.channel = await Channels.getByDisplayName(channelName);
    }

    /**
     * Sets Video's playlists by their display names.
     * @param {string[]} playlistsNames
     */
    async setPlaylists(playlistsNames) {
        this.playlists = [];
        for (let playlistName of playlistsNames) {
            let playlist = await this.channel.getPlaylistByDisplayName(playlistName);
            if (!playlist) {
                Log.debug(`No "${playlistName}" playlist found, creating it.`);
                playlist = await this.channel.addPlaylist(playlistName);
            }
            this.playlists.push(playlist);
        };

    }

    /**
     * Uploads Video to Peertube.
     */
    async upload() {
        Log.info(`Uploading "${this.filename}"`);
        this.uploadDate = new Date().toLocaleString(settings.data.uploadDateFormat);

        //Move files to "todo" folder.
        await Mediafiles.moveDatafilesToFolder(this, paths.todo, paths.wip, "debug");

        const form = new FormData(),
            fileurl = paths.wip + this.filename;

        //Get file content.
        let fileMimetype = Mediafiles.getMimeType(fileurl);
        if (fileMimetype) {
            const file = new Blob([fs.readFileSync(fileurl)], { type: fileMimetype });
            form.set("videofile", file, this.filename);

            form.set("channelId", this.channel.id);
            if (this.category) {
                form.set("category", this.category.id);
            }
            form.set("name", this.title);
            form.set("description", this.description);
            form.set("originallyPublishedAt", this.publicationDate);
            form.set("language", this.language.id);
            form.set("privacy", this.privacy.id);

            //Tags
            this.tags.forEach(tag => {
                form.set("tags[]", tag);
            });

            //Poster & thumbnail
            if (this.poster) {
                const posterurl = paths.wip + this.poster;
                let posterMimetype = Mediafiles.getMimeType(posterurl);
                if (posterMimetype) {
                    const poster = new Blob([fs.readFileSync(posterurl)], { type: posterMimetype });
                    form.set("previewfile", poster, this.poster);
                    form.set("thumbnailfile", poster, this.poster);
                } else {
                    Log.error(`Aborted poster "${posterurl}" upload: file MIME type is unknown.`);
                }
            }

            //Upload video.
            let result = await PeertubeApi.callSync("videos/upload", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${PeertubeApi.accessToken}`
                },
                body: form
            });

            //Upload ok?
            if (result && result.video) {
                this.peertubeId = result.video.id;
                this.peertubeUuid = result.video.uuid;
                this.peertubeShortUuid = result.video.shortUUID;
                this.peertubeUrl = `${settings.misc.baseurl}w/${this.peertubeShortUuid}`;
                Log.info(`Video url: ${this.peertubeUrl}`);
                Log.info(`Video id: ${this.peertubeId}`);
                Log.info(`Video shortUUID: ${this.peertubeShortUuid}`);
                Log.info(`Video UUID: ${this.peertubeUuid}`);

                await this.addCaptions();
                await this.addToPlaylists();

                //Save data.
                Data.updateVideo(this);
                Data.save();
                //Move files to "done" folder.
                Mediafiles.moveDatafilesToFolder(this, paths.wip, paths.done, "debug");

            } else {
                Log.error(`Video.upload()`, result);
            }
        } else {
            Log.error(`Aborted video "${fileurl}" upload: file MIME type is unknown.`);
        }
    }

}