/**
 * Get settings from yaml file and script arguments.
 *
 * @author Grégory Béal <gregory.beal@reseau-canope.fr>
 * @license CECILL-2.1
 */

import fs from "fs";
import yaml from "js-yaml";
import minimist from "minimist";

import Utility from "./utilities/general.utility.js";

const args = minimist(process.argv.slice(2));

//Is settings file defined?
if (!args.settings) {
    throw new Error(`[FATAL] Settings file is not defined. Use --settings= to define settings file path.`);
}
if (!fs.existsSync(args.settings)) {
    throw new Error(`[FATAL] Couldn't load setting file at "${args.settings}".`);
}

const rawSettings = yaml.load(fs.readFileSync(args.settings, "utf8"));
const defaultSettings = {
    misc: {
        uploadPauseMs: 0
    }
};

// Default values.
let settings = Utility.recursiveMerge(defaultSettings, rawSettings.default);

//--env arg.
if (args.env) {
    if (rawSettings[args.env]) {
        settings = Utility.recursiveMerge(settings, rawSettings[args.env]);
    } else {
        //Couldn't find env.
        throw new Error(`[FATAL] Couldn't find settings for --env=${args.env}, known envs are: ${Object.keys(rawSettings)}`);
    }
}
//--limit arg.
if (typeof args.limit !== 'undefined') {
    settings.misc.limit = args.limit;
}
export default settings;