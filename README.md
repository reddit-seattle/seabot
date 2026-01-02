# SEAbot

Hello, I am a bot used for various meaningless tasks on the /r/Seattle discord server.

This is a hobbyist project and nobody should ever in their right mind take a dependency on any code or configurations found within.

If you find a bug or have an idea for an improvement or a new feature - please create an issue!

Pull requests will be reviewed but please, be gentle.

---

## Running a SEABot
If you do (for whatever reason) decide to fork/clone/run this amazing bot on your own, there are a few  different ways to do so.

### 1. VSCode Debug (F5)
Create a `.vscode/launch.json` configuration entry like so:

```json
{
    "configurations": [
      {
        "type": "node",
        "request": "launch",
        "name": "Launch seabot",
        "program": "${workspaceFolder}/src/server.ts",
        "preLaunchTask": "tsc: build - tsconfig.json",
        "outFiles": ["${workspaceFolder}/dist/**/*.js"]
      }
    ]
}
```

### 2. Local run (ye olde fashioned way)
**New** - webpack! Now you can pack the site for dev or production readiness.
1. Clone the repo
2. `npm i` to install all dependent packages
4. `npm start` to pack the thing up and kick it off, or separately:
  a. `npm run pack:dev`, `npm run seabot`


### 3. Containerized
Seabot now runs inside a container, you can run `docker build .` to build the container image.

To build it, tag it, and launch it with a local .env file:
`docker build -t seabot . && docker run --env-file .env seabot`

*Currently the container contains `node_modules` so it's beefy rather than slim, but launches faster inside the web app (theoretically, as opposed to installing npm modules at first launch) so container health checks are happier.

## Configuration

### ENV
In order for the bot to be useful, you'll need environment variables set to do various things. Create a file at the project root named `.env` and fill it with `Key=value` pairs.

There are [a lot to customize](./src/utils/constants.ts), but you really only need `botToken`.

**Feature-dependent variables:**
- `weatherAPIKey`: key for weather API
- `airQualityAPIKey`: key for air quality API
- `cosmosHost`: cosmos database host
- `cosmosAuthKey`: cosmos auth key

**Customization:**
- `DAYS_WITHOUT_BACKGROUND`: url / image link to override url for `days without` image
- `DAYS_SINCE_MEME_TRIGGER_WORDS`: - words to trigger "days without saying" meme - `Piss,etc`
- `TELEMETRY_DB_PATH`: file path override for local telemetry DB path

**Other**:
- `seabotDEBUG`: codebase standard debug flag - extra debug logging

### Config File

Seabot also has [a prod config file](./src/seabotConfig.json) (and a [dev version here](./src/devConfig.json)) for server-specific channel / role IDs
and other various config. If you are debugging locally, change `devConfig` - because [`webpack:dev`](./webpack.config.js) will write this to the output directory and use it.


## Database
Seabot uses two forms of databases
### cosmos db
cosmos db (azure hosted, free tier available) is only used for the `/incident` commands, Seabot should still work without it.
`cosmosHost=https://your-db.documents.azure.com:443/`
`cosmosAuthKey=dIcKbUtTDiCkBuTtdIcKbUtT==`

### sqlite
Seabot uses a local sqlite db for message telemetry (dashboards) and tracking funny words.
Customize which words with `DAYS_SINCE_MEME_TRIGGER_WORDS`, and customize the path of your DB with `TELEMETRY_DB_PATH`. Seabot uses a container-mounted storage blob in production, so it defaults to `/mnt/telemetry/telemetry.db`

### Other weird values for env vars (unused)
```ts
    // Bot status from pipeline run (currently unused)
    export const BOT_RELEASE_VERSION = process.env['botReleaseVersion'] || undefined;
    export const BOT_RELEASE_REASON = process.env['botReleaseReason'] || undefined;
    export const BOT_RELEASE_DESCRIPTION = process.env['botReleaseDescription'] || undefined;
    export const BOT_RELEASE_COMMIT = process.env['botReleaseCommit'] || undefined;
    // Valheim server password (currently unused)
    export const access = process.env["valheim_server_password"];


```
