/**
 * Handles calls to Peertube API.
 *
 * @class
 * @author Grégory Béal <gregory.beal@reseau-canope.fr>
 */

import Log from "./log.class.js";
import settings from "../settings.js";

export default class PeertubeApi {
    /**
     * Peertube API url.
     * @type {string}
     */
    static url = `${settings.misc.baseurl}api/v1/`;

    /**
     * Current token.
     * @type {string}
     */
    static accessToken;

    /**
     * Cached tokens, one for each username.
     * @type {object}
     */
    static cachedTokens = {};

    /**
     * User.
     * @typedef {object} User
     * @property {string} name
     * @property {string} pwd
     */
    /**
     * @type {User}
     */
    static user;

    /**
     * Sets API user.
     * @param {User} user
     */
    static userSet(user) {
        this.user = user;
    }

    /**
     * Synchronous call to Peertube API.
     * @param {string} service ie "videos/categories"
     * @param {object=} options
     * @returns {object}
     */
    static async callSync(service, options) {
        try {
            if (options) {
                Log.debug(`PeertubeApi.callSync: "${this.url + service}" with options:`, options);
            } else {
                Log.debug(`PeertubeApi.callSync: "${this.url + service}" with no option.`);
            }
            const res = await fetch(this.url + service, options);
            const response = res.clone();//Attempt at solving "SocketError: other side closed"
            const result = await response.json();
            return result;
        } catch (error) {
            Log.error(`Peertube API callSync error "${this.url + service}":`, error);
        }
    }

    /**
     * Returns a Peertube API token.
     * @returns {string} Token
     */
    static async getAccessToken() {
        if (this.cachedTokens[this.user.name]) {
            return this.cachedTokens[this.user.name];
        } else {
            //Get client tokens.
            return fetch(this.url + "oauth-clients/local")
                .then(response => {
                    if (response.ok) {
                        return response.json();//is a promise.
                    } else {
                        throw new Error("Couldn't get client tokens.");
                    }
                })
                .then(async data => {
                    //Get user tokens.
                    return fetch(this.url + "users/token", {
                        method: "POST",
                        body: new URLSearchParams({
                            'client_id': data.client_id,
                            'client_secret': data.client_secret,
                            'grant_type': 'password',
                            'response_type': 'code',
                            'username': this.user.name,
                            'password': this.user.pwd
                        })
                    })
                })
                .then(async response => {
                    if (response.ok) {
                        return response.json()
                            .then(response => {
                                this.accessToken = response.access_token;
                                this.cachedTokens[this.user.name] = this.accessToken;
                                Log.debug(`Got access token ${this.accessToken}`);
                                return this.accessToken;
                            });
                    } else {
                        throw new Error("Couldn't get user tokens.");
                    }
                })
                .catch(error => {
                    Log.fatal(error);
                });
        }
    }

}
