# SEAbot

Hello, I am a bot used for various meaningless tasks on the /r/Seattle discord server.

This is a hobbyist project and nobody should ever in their right mind take a dependency on any code or configurations found within.

If you find a bug or have an idea for an improvement or a new feature - please create an issue!

Pull requests will be reviewed but please, be gentle.

---

## Running a SEABot
If you do (for whatever reason) decide to fork/clone/run this amazing bot on your own machine or environment, you'll need to perform the following steps initially:
1. Clone the repo
2. `npm i` to install all dependant packages
3. `tsc` to compile beautiful typescript code into unintelligble javascript in the `dist/` folder
4. `npm start` or `node ./dist/server.js` to start the bot.

## Environment Variables
In order for the bot to be useful, you'll need the following environment variables set to do various things:

### Discord bot token
`botToken` - Without this value, the client will never connect to discord and therefore the bot is useless. It is important and also should be kept secret.
```
process.env['botToken']
```

### API Keys
`weatherAPIKey` - This value is used for the $weather and $forecast commands - it's an API key for https://api.openweathermap.org
```
process.env['weatherAPIKey']
```

### Various app config things
The following are used in my release pipeline so I can check the status of the SEABot process, if you want you can overwrite them with our own values:
```
    export const BOT_RELEASE_VERSION = process.env['botReleaseVersion'] || undefined;
    export const BOT_RELEASE_REASON = process.env['botReleaseReason'] || undefined;
    export const BOT_RELEASE_DESCRIPTION = process.env['botReleaseDescription'] || undefined;
    export const BOT_RELEASE_COMMIT = process.env['botReleaseCommit'] || undefined;
```
