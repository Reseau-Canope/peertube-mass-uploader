# What is it?
Peertube Mass Uploader (PMU) is a Node.js script allowing bulk upload of videos to Peertube from MP4 files, posters (JPG, PNG, WebP), subtitles (SRT, VTT), and an XLSX data file. Once videos are uploaded, their Peertube data can be sent back into the XLSX file, like their URL, ID, short UUID, UUID, and upload date.

# How does it work?
PMU scans a folder for mp4 files. Based on the name of the first mp4 file found, it retrieves its associated files (poster, subtitle) and its data in the XLSX file. It also uses this file name to check if the video is indeed absent from Peertube. If so, it uploads the video to Peertube with all the retrieved data and, if desired, sends Peertube information about the video back to the XLSX. Then it moves on to the next mp4 file.

# Requirements
- Node.js (v20.11.1)
- npm (v9)
- Required modules installed using:
```
npm install
```
Configuration is done via two files:
- A [**.yaml** settings file](#settings-yaml-file) defining script usage parameters. Its path must be set in [script launch](#script-launch) parameters. We'll use *settings.yaml* in the present manual but it may have any name.
- An [**.xlsx** data file](#xlsx-file) containing video informations (title, description, channel, etc.) where the URL and IDs of each video can be injected after upload. This file's path must be defined in [`data:file:`](#datafile) part of settings file.

Additionally, some arguments can be defined at [script launch](#script-launch).

# XLSX file
This file contains data for each video, such as its title or description, with one video per row and one data per column.
The order of these columns is arbitrary but needs to be indicated in [`data:in:`](#datain) in [settings.yaml](#settings-yaml-file).

All these columns contain text as it appears in the front end, not IDs. For example, if you want to add a video to the channel named "Concert Captures" with the ID "concert_captures_1", its *channel* column should contain "Concert Captures" (or "concert captures" because case is ignored).

For more information on the content of these columns, see [`data:in:`](#datain).

# settings.yaml file

## Environments
Each key at the root level of this file defines an environment. There must be at least `default:`, which is the environment used if none is specified when launching the script with the `--env` argument. Other environments can be created by giving them any name and placing the parameters that will override the default ones, as values from `default` are retrieved first regardless of the environment used.
> 💡 Use the `default:` environment for generic values, and create other environments to put only specific values there.

## Parameters
To be placed in environments. All parameters are required unless otherwise stated.

## `misc:`
- `baseurl:` base URL of Peertube, e.g., *http://127.0.0.1:9001/*. The API will then be called at *http://127.0.0.1:9001/api/v1/*.<br>
- `uploadPauseMs:` (optional) pause time in ms after each upload (none by default).<br>
- `limit:` (optional) limits processing to the first N MP4 files in the [`paths:`](#paths)`todo:` folder, in alphabetical order. By default, all are processed. The value 0 cancels this limit, and lower values return all MP4 files except the last -N. Can be overridden when launching the script with the `--limit` argument.

## `user:`
- `name:` Peertube account name to use.<br>
- `pwd:` Password of this account.

Example for default local environment:
```yaml
user:
  name: root
  pwd: test
```

## `db:`
Parameters for accessing the Peertube PostgreSQL database. Default example for local:
```yaml
db:
  host: 127.0.0.1
  port: 5432
  database: peertube_dev
  user: postgres
  password: postgres
```

## `paths:`
- `todo:` folder where the files to upload are located: MP4, posters, and subtitles (subfolders are ignored).<br>
- `wip:` folder where the tool will move each MP4 file before processing.<br>
- `done:` folder where the tool will move files once successfully uploaded.<br>
- `doubles:` folder where the tool will move already existing videos.<br>
- `failed:` folder where the tool will move files in case of failure.<br>

> 👉 When an MP4 file is moved, its related and used files (subtitles, poster) are moved with it.

## `files:`
### `files:identifierRegex:`
Case-sensitive regular expression applied to each MP4 file name and used to build the video identifier in the XLSX file (see [`data:identifierValue:`](#dataidentifiervalue)), to know if it already exists in Peertube (see [`data:dbCheck:`](#datadbcheck)), and to retrieve its poster and subtitle files (see below).<br>
### `files:posters:`
List of files that can be used as posters, in order of preference. The first existing file will be used. Each item in the list is applied to `files:identifierRegex:` to build a file name. For example:
```yaml
posters:
  - $1.jpg
  - $1.jpeg
  - $1.webp
  - $1.png
```
### `files:captions:`
List of files that can be used as subtitles, similar to posters, for example:
```yaml
captions:
  - $1.vtt
  - $1.srt
```

## `data:`
### `data:file:`
Path to the XLSX file containing the data.

### `data:identifierValue:`
Pattern applied on [`files:identifierRegex:`](#filesidentifierregex) to build the string searched in the *identifier* column of the XLSX file (see [`data:in:`](#datain)`identifier:`).<br>

### `data:dbCheck:`
Pattern applied on `files:identifierRegex:` to check in the database if the video already exists or not, using a [SIMILAR TO](https://www.postgresql.org/docs/current/functions-matching.html#FUNCTIONS-SIMILARTO-REGEXP) on the *filename* field of the *videoSource* table. If the video is already in Peertube, it will be moved to the *doubles* folder (see [paths](#paths)).<br>

### Example
---
A file named "quite-long-video-2023-08-31.mp4" corresponds to the row in the XLSX where the column `identifier` (defined in [`data:in:`](#datain)) contains "quite-long-video". We do not want to upload the video to Peertube if it is found under the name "quite-long-video-2023-08-31.mp4" or "quite-long-video-2024-02-20.mp4", or any other date. The same applies to all other videos.

- Therefore, the video's identifier will be built using its filename minus its last 15 characters. This results in "quite-long-video".
- The script will search in the XLSX for the row where the column "identifier" contains this identifier "quite-long-video".
- To check if this video already exists in Peertube, we will use this identifier followed by any 15 characters, as it may exist with different dates.

The setting will be:

```yaml
files:
  identifierRegex: ^(.*).{15}$
data:
  identifierValue: $1
  dbCheck: $1_{15}
```
- `files:identifierRegex:` The identifier is defined by capturing all the characters of the filename, except the last 15.
- `data:identifierValue:` The identifier searched for in the XLSX will simply be this identifier.
- `data:dbCheck:` A search is made in the database for a video whose source is this identifier followed by any 15 characters. If it exists, the upload is canceled.

>👉 Use [Regex101](https://regex101.com/r/kUW4Ug/1) to test regex substitutions.

---

### `data:in:`
This is a list of keywords that identify the role of each column in the XLSX file, from left to right. If a column has no role in the upload tool, use any value that is not a keyword. For example, if the first column contains the **identifier** of the video, the third its **title**, and the second is of no particular use, the first element of this list will be `identifier`, the third `title`, and the second `useless` or any other value (even an empty string or one already present elsewhere).

`- identifier`<br>
Column containing the identifier used to find the video in the XLSX from the file name (see [`data:identifierValue:`](#dataidentifiervalue)).

`- title`<br>
Column containing the video title.

`- description`<br>
Column containing the video description.

`- channel`<br>
Column containing the Peertube channel of the video. This channel must exist before upload; otherwise, the script will move the video to [`paths:`](#paths)`failed:` and move to the next one.

`- playlists`<br>
Column containing the playlist(s) of the channel where the video will be placed (separated by a semicolon). Unlike channels, the script will create missing playlists.

`- privacy`<br>
Column containing the video visibility. On the XLSX side, it must take one of the values indicated in [`data:privacies:`](#dataprivacies).

`- category`<br>
Column containing the video category based on values returned by the API [videos/categories](https://docs.joinpeertube.org/api-rest-reference.html#tag/Video/operation/getCategories).

`- language`<br>
Column containing the video audio language. On the XLSX side, it must take one of the values indicated in [`data:languages:`](#datalanguages).

`- tags`<br>
Column containing the video keyword(s), separated by a semicolon.

`- publicationDate`<br>
Column containing the video publication date, in "Y-m-d" format (e.g., "2023-12-31") or just a year (in which case "-01-01" will be added).

There are also optional keywords to define the columns hosting values returned by the tool. See [`data:out:`](#dataout) below for more information.


### `data:out:`
After each successful upload, the tool can write in the XLSX informations retrieved from Peertube. Just add one of the keywords below in this section, as well as in [`data:in:`](#datain) in the corresponding column in the XLSX.

`- peertubeUrl`<br>
Video URL, e.g., *http://127.0.0.1:9001/w/cZyCiabkHDqLrmy6sYmthv*.

`- peertubeId`<br>
Video ID, e.g., *155*.

`- peertubeShortUuid`<br>
Video short UUID, e.g., *cZyCiabkHDqLrmy6sYmthv*.

`- peertubeUuid`<br>
Video UUID, e.g., *611e06c9-31a7-44bc-b5e9-604963b56ca9*.

`- uploadDate`<br>
Upload date in the format defined in [`data:uploadDateFormat:`](#datauploaddateformat), e.g., *3/25/2024, 4:10:35 PM* in "en-US" format or  *25/03/2024 16:10:35* in "fr-FR" format.

### `data:uploadDateFormat:`
Format used for writing the upload date in the XLSX, e.g., `en-US` or `fr-FR`. This is the first argument of [Date.prototype.toLocaleString()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toLocaleString).

### `data:languages:`
List of equivalences between [languages in Peertube](https://docs.joinpeertube.org/api-rest-reference.html#tag/Video/operation/getLanguages) and those in the XLSX, in the format `key: value`. In the example below, the `language` column in the XLSX should contain "English" to indicate that the video is in English (see [`data:in:`](#datain)).
```yaml
languages:
  en: English
  fr: French
```

### `data:privacies:`
List of equivalences between [privacies in Peertube](https://docs.joinpeertube.org/api-rest-reference.html#tag/Video/operation/getVideoPrivacyPolicies) and those in the XLSX. For example:
```yaml
privacies:
  - Public
  - Unlisted
  - Private
  - Internal
  - Protected
```

## `logs:`
Set each of the 5 levels to `true` or `false` depending on whether information related to them needs to be sent to the console, for example:
```yaml
logs:
  debug: false
  info: true
  warning: true
  error: true
  fatal: true
```

# Script launch
Once configuration is done, the script can be launched on the default environment with:
```
node upload.js --settings=../settings.yaml | tee -a logs/upload.log
```
The `node upload.js` part runs the script with parameters set in *settings.yaml* file located in parent folder, and the optional part `| tee -a logs/upload.log` adds (flag -a) the information displayed in the console to the *logs/upload.txt* file.
> ❗❗ **ATTENTION** Ensure that the XLSX file is not open before upload as it makes it inaccessible for writing; therefore, the information retrieved from Peertube (URLs, IDs, etc.) cannot be saved there and will be lost.

## Optional arguments

- `--env` to set the environment to use.
- `--limit` to process only a certain number of files, overriding the value possibly defined in [settings.yaml](#settings-yaml-file).

For example, to process only the first **10** files in the **prod** environment:
```
node upload.js --limit=10 --env=prod | tee -a logs/uploadProd.log
```

# Known issues
- The XLSX file loses its formatting.
- Licenses are not handled.
- Uploading a video can sometimes fail with errors like "write EPIPE" or "write ECONNRESET". Most of the time, this is related to a disk space issue or an overburdened CPU. Typically, simply restarting the tool later, once these resources are available again, will ensure that the same videos are successfully uploaded.

# Suggested improvement
- All fields are mandatory in the XLSX file, while some could have default values (e.g., channel or privacy), extracted from the filename (e.g., title), returned by a function (e.g., 'now' for publicationDate), or simply ignored.
- Other data file formats should be allowed in addition to XLSX, such as CSV or JSON.
- The tool retrieves all data from the XLSX as strings, but it should also be able to handle IDs.
- Add unit and functional tests.