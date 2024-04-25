/**
 * Handles data logged into console.
 *
 * @class
 * @author Grégory Béal <gregory.beal@reseau-canope.fr>
 */

import settings from "../settings.js";

export default class Log {
    /**
     * Log levels and their activation.
     * @type {object} each property as {level: {boolean}}
     */
    static levels = settings.logs;

    /**
     * @returns {string} French format date: d/m/Y h:i:s.
     */
    static getTime() {
        return new Date().toLocaleString("fr");
    }

    /**
     * Logs data with "debug" level.
     * @param  {...any} data
     */
    static debug(...data) {
        this.sendMessage('debug', data);
    }

    /**
     * Logs data with "info" level.
     * @param  {...any} data
     */
    static info(...data) {
        this.sendMessage('info', data);
    }

    /**
     * Logs data with "warning" level.
     * @param  {...any} data
     */
    static warning(...data) {
        this.sendMessage('warning', data);
    }

    /**
     * Logs data with "error" level.
     * @param  {...any} data
     */
    static error(...data) {
        this.sendMessage('error', data);
    }

    /**
     * Logs data with "fatal" level, then stops script.
     * @param  {...any} data
     */
    static fatal(...data) {
        this.sendMessage('fatal', data);
        throw new Error('Script stopped.');
    }

    /**
     * Logs data at "level" level it this level is enabled.
     * @param {string} level
     * @param {*} data
     */
    static sendMessage(level, data) {
        if (!Array.isArray(data)) {
            data = [data];
        }
        if (this.levels[level]) {
            console.log(`${this.getTime()} [${level.toUpperCase()}]:`, ...data);
        }
    }
}