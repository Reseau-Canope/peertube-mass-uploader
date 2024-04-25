/**
 * Handles text-based data (xlsx file).
 *
 * @class
 * @author Grégory Béal <gregory.beal@reseau-canope.fr>
 */

import fs from "fs";
import readXlsxFile from "read-excel-file/node";
import writeXlsxFile from "write-excel-file/node";

import Log from "./log.class.js";
import settings from "../settings.js";
import Video from "./video.class.js";

export default class Data {
    /**
     * Xlsx file content.
     * @type {object[]}
     */
    static rows = [];

    /**
     * List of all xlsx columns.
     * @type {string[]}
     */
    static mapping;

    /**
     * List of xlsx columns to be written after upload.
     * @type {string[]}
     */
    static saveKeys;

    /**
     * Xlsx file path.
     * @type {string}
     */
    static xlsUrl = settings.data.file;

    /**
     * Retrieves xlsx file content (path set in this.xlsUrl).
     */
    static async init() {
        Log.debug("Data init.");
        this.mapping = settings.data.in;
        this.saveKeys = settings.data.out;
        try {
            if (fs.existsSync(this.xlsUrl)) {
                Log.debug(`Loading data file "${this.xlsUrl}"`);
                await readXlsxFile(fs.createReadStream(this.xlsUrl))
                    .then(async (rows) => {
                        //Turn array of arrays to array of objects.
                        rows.forEach(row => {
                            let data = {};
                            row.forEach((value, i) => {
                                data[this.mapping[i]] = value;
                            });
                            this.rows.push(data);
                        });
                        //Just save, so it'll crash if file isn't writable (sometimes).
                        await this.save();
                    });
            } else {
                Log.fatal(`Can't find "${this.xlsUrl}".`);
            }
        } catch (error) {
            Log.fatal(error);
        }
    }

    /**
     * Adds data to this.rows[id].
     *
     * @param {number} id
     * @param {Array} data
     */
    static merge(id, data) {
        Object.assign(this.rows[id], data);
    }

    /**
     * Put video essential fields back to data.
     * @param {Video} video
     */
    static updateVideo(video) {
        this.saveKeys.forEach(key => {
            this.rows[video.id - 1][key] = video[key];
        });
    }

    /**
     * Writes data back to xlsx file.
     */
    static async save() {
        let data = [];
        this.rows.forEach(row => {
            let line = [];
            for (let key of this.mapping) {
                let value = row[key]
                if (Array.isArray(value)) {
                    value = value.join(" ; ");
                }
                line.push({ value: value });
            };
            data.push(line);
        });
        await writeXlsxFile(data, { filePath: this.xlsUrl });
    }
}