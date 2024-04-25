/**
 * Handles media files.
 *
 * @class
 * @author Grégory Béal <gregory.beal@reseau-canope.fr>
 */

import fs from 'fs';

import Log from './log.class.js';

export default class Mediafiles {
    //Mime types source: https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types/Common_types
    static mimeTypes = {
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        mp4: "video/mp4",
        png: "image/png",
        srt: "text/plain",
        vtt: "text/vtt",
        webp: "image/webp",
    };

    /**
     * Parse folder for files ending with ext.
     * @param {string} folder to parse.
     * @param {string} ext including dot, ie ".mp4".
     */
    static async getFilesInFolder(folder, ext) {
        return fs.promises.readdir(folder)
            .then((files) => {
                if (typeof ext === 'string') {
                    files = files.filter(file => file.substring(file.length - ext.length).toLowerCase() === ext.toLowerCase());
                }
                files.sort();
                return files;
            })
            .catch((error) => {
                Log.error(`Couldn't read "${folder}" folder.`);
            });
    }

    /**
     * Returns mime type from filename or url.
     * @param {string} filename
     * @returns {(string|false)} string if mime type was found, false otherwise.
     */
    static getMimeType = filename => {
        if (filename) {
            let slices = filename.split('.');
            let fileext = slices[slices.length - 1].toLowerCase();
            return this.mimeTypes[fileext] || false;
        }
        return false;
    }

    /**
     * Move src file to dest folder (keeping the filename).
     * @param {string} src ex. "/sourcefolder/myfile.mp4"
     * @param {string} dest ex. "/destinationfolder/"
     */
    static async moveFileToFolder(src, dest) {
        let filename = src.split("/").pop();
        if (src !== dest + filename) {
            fs.renameSync(src, dest + filename, err => {
                if (err) {
                    Log.error(`Couldn't move "${src}" to "${dest + filename}"`);
                    throw err;
                }
            });
        }
    }

    /**
     * Move media files set in data (mp4, jpg, str...) from srcFolder to destFolder.
     * @param {object} data
     * @param {string} srcFolder
     * @param {string} destFolder
     * @param {string=} loglevel If set, logs files moved, with loglevel.
     */
    static async moveDatafilesToFolder(data, srcFolder, destFolder, loglevel) {
        if (srcFolder !== destFolder) {
            if (loglevel) {
                Log.sendMessage(loglevel, `Moving "${srcFolder + data.filename}" to "${destFolder}".`);
            }
            //Video file.
            await this.moveFileToFolder(srcFolder + data.filename, destFolder);
            //Poster file.
            if (data.poster) {
                if (loglevel) {
                    Log.sendMessage(loglevel, `Moving "${srcFolder + data.poster}" to "${destFolder}".`);
                }
                await this.moveFileToFolder(srcFolder + data.poster, destFolder);
            }
            //Caption files.
            if (data.captions) {
                for (let lang in data.captions) {
                    if (loglevel) {
                        Log.sendMessage(loglevel, `Moving "${srcFolder + data.captions[lang]}" to "${destFolder}".`);
                    }
                    await this.moveFileToFolder(srcFolder + data.captions[lang], destFolder);
                };
            }
        } else {
            Log.debug(`moveDatafilesToFolder: srcFolder & destFolder are both "${srcFolder}"`);
        }
    }

}
