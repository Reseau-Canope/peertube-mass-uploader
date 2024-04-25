import fs from "fs";
import yaml from "js-yaml";
import minimist from "minimist";

import Utility from "./utilities/general.utility.js";

const rawSettings = yaml.load(fs.readFileSync("settings.yaml", "utf8"));
const args = minimist(process.argv.slice(2));
const defaultSettings = {
    misc: {
        uploadPauseMs: 0
    }
};
let settings = rawSettings.default;

//Default values.
settings = Utility.recursiveMerge(defaultSettings, settings);

//--env arg.
if (args.env) {
    if (rawSettings[args.env]) {
        settings = Utility.recursiveMerge(settings, rawSettings[args.env]);
    } else {
        //Couldn't find env.
        throw new Error(`Couldn't find settings for --env=${args.env}, known envs are: ${Object.keys(rawSettings)}`);
    }
}
//--limit arg.
if (typeof args.limit !== 'undefined') {
    settings.misc.limit = args.limit;
}
export default settings;