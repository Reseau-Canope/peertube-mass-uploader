/**
 * Peertube Mass Uploader. Check readme files for more.
 *
 * @author Grégory Béal <gregory.beal@reseau-canope.fr>
 * @license CECILL-2.1
 */

import fs from "fs";
import pg from "pg";

import settings from "./settings.js";

import PeertubeApi from "./classes/peertube-api.class.js";
import Mediafiles from "./classes/mediafiles.class.js";
import Data from "./classes/data.class.js";
import Log from "./classes/log.class.js";
import Utility from "./utilities/general.utility.js";
import Categories from "./classes/categories.class.js";
import Video from "./classes/video.class.js";
import Channels from "./classes/channels.class.js";

const paths = settings.paths;

//Connect to database.
const pgClient = new pg.Client({
    host: settings.db.host,
    port: settings.db.port,
    database: settings.db.database,
    user: settings.db.user,
    password: settings.db.password
});
await pgClient.connect();

/**
 * Starts "filename" upload by checking its poster, captions,
 * then gets video data, checks its absence from Peertube, get channel and playlists.
 * If everything's fine, proceeds to real upload.
 * @param {string} filename
 */
const uploadFile = async (filename) => {
    //Check files (mp4, jpg, srt...)
    Log.info(`Check file "${filename}"`);
    let identifierRegex = new RegExp(settings.files.identifierRegex);
    let identifier = filename.replace(identifierRegex, settings.data.identifierValue);
    let dataFiles = {
        filename: filename,
        identifier: identifier,
        poster: null,
        captions: null,
    };

    //Add poster?
    for (let nameSubst of settings.files.posters) {
        let name = filename.replace(identifierRegex, nameSubst);
        if (fs.existsSync(paths.todo + name)) {
            dataFiles.poster = name;
            break;
        }
    }

    //Add captions?
    //TODO: handle language detection in filename (PEER-174).
    for (let nameSubst of settings.files.captions) {
        let name = filename.replace(identifierRegex, nameSubst);
        if (fs.existsSync(paths.todo + name)) {
            dataFiles.captions = { fr: name };
            break;
        }
    }

    //Retrieve data.
    let videoId = Data.rows.findIndex(
        row => row['identifier'] && row['identifier'].toLowerCase() === identifier.toLowerCase()
    );

    if (videoId >= 0) {
        Log.debug(`Video data found in line ${videoId + 1}.`);
        let data = Data.rows[videoId];
        Data.merge(videoId, dataFiles);

        //File already uploaded?
        const similar = filename.replace(identifierRegex, settings.data.dbCheck);
        const result = await pgClient.query(`SELECT * FROM "videoSource" WHERE filename SIMILAR TO '${similar}';`);

        if (result.rowCount > 0) {
            //File already uploaded.
            Log.warning(`File "${filename}" already uploaded.`);
            Mediafiles.moveDatafilesToFolder(data, paths.todo, paths.doubles, "info");
        } else {
            await PeertubeApi.getAccessToken()
                .then(async token => {
                    if (token) {
                        let video = new Video(videoId + 1);
                        await video.init(data);
                        if (video.channel) {
                            //Playlists
                            if (data.playlists) {
                                await video.setPlaylists(Utility.splitTrim(data.playlists, ";"));
                            }
                            await video.upload();

                        } else {
                            Log.error(`Couldn't find channel "${data.channel}"`);
                        }

                    } else {
                        Log.fatal("videoUpload: couldn't authorize Peertube API.");
                    }
                });

        }

    } else {
        //ERROR: No data for that file.
        Log.error(`No data with identifier="${identifier}"`);
        Mediafiles.moveDatafilesToFolder(dataFiles, paths.todo, paths.failed, "info");
    }
}

//Set user.
PeertubeApi.userSet(settings.user);

//Check todo folder.
let filenames = await Mediafiles.getFilesInFolder(paths.todo, ".mp4");

if (filenames) {
    //Files in todo folder?
    if (filenames.length > 0) {
        Log.debug(`TODO: ${filenames.length} mp4 file(s) in "${paths.todo}"`);
        if (settings.misc.limit) {
            filenames = filenames.slice(0, settings.misc.limit);
            Log.debug(`Limit to ${settings.misc.limit} file(s).`);
        }
        Log.debug(`${filenames.length} planned upload(s):`, filenames);
        //Get data from xls file.
        await Data.init();
        await Channels.init();
        Log.debug(`Found ${Channels.list.length} channel(s):`);
        Channels.list.forEach(channel => {
            Log.debug(`${channel.name}: "${channel.displayName}"`);
        });
        await Categories.init();

        let totalTime = 0,
            filenameN = 0;

        //Upload all files with a pause in-between.
        await new Promise(resolve => {
            (function nextUpload() {
                setTimeout(async () => {
                    let startTime = new Date(),
                        filename = filenames[filenameN];
                    Log.info(`Starting upload ${filenameN + 1}/${filenames.length} ----------`);
                    await uploadFile(filename);
                    let endTime = new Date();
                    totalTime += endTime - startTime + settings.misc.uploadPauseMs;
                    Log.info(`Video uploaded in ${(endTime - startTime) / 1000} s.`);
                    filenameN++;
                    if (filenameN < filenames.length) {
                        if (settings.misc.uploadPauseMs > 0) {
                            Log.debug(`Waiting for ${settings.misc.uploadPauseMs} ms...`);
                        }
                        nextUpload();
                    } else {
                        resolve();
                    }
                }, settings.misc.uploadPauseMs);
            })();
        })
            .then(
                () => {
                    Log.info(`All uploads done in ${totalTime / 1000} s.`);
                }
            );

    } else {
        //No file to process, end script.
        Log.info(`No mp4 file to upload in "${paths.todo}"`);
    }

} else {
    //ERROR: No todo folder.
    Log.fatal(`Can't access TODO folder "${paths.todo}"`);
}

//Close DB connection.
await pgClient.end();
