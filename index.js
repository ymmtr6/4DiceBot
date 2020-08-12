// `cp _env .env` then modify it
// See https://github.com/motdotla/dotenv
const config = require("dotenv").config().parsed;
// Overwrite env variables anyways
for (const k in config) {
  process.env[k] = config[k];
}

const { LogLevel } = require("@slack/logger");
const logLevel = process.env.SLACK_LOG_LEVEL || LogLevel.DEBUG;

const { App, ExpressReceiver } = require("@slack/bolt");
// If you deploy this app to FaaS, turning this on is highly recommended
// Refer to https://github.com/slackapi/bolt/issues/395 for details
const processBeforeResponse = false;
// Manually instantiate to add external routes afterwards
const receiver = new ExpressReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  processBeforeResponse,
});
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  logLevel,
  receiver,
  processBeforeResponse,
});

// Request dumper middleware for easier debugging
if (process.env.SLACK_REQUEST_LOG_ENABLED === "1") {
  app.use(async (args) => {
    const copiedArgs = JSON.parse(JSON.stringify(args));
    copiedArgs.context.botToken = 'xoxb-***';
    if (copiedArgs.context.userToken) {
      copiedArgs.context.userToken = 'xoxp-***';
    }
    copiedArgs.client = {};
    copiedArgs.logger = {};
    args.logger.debug(
      "Dumping request data for debugging...\n\n" +
      JSON.stringify(copiedArgs, null, 2) +
      "\n"
    );
    const result = await args.next();
    args.logger.debug("next() call completed");
    return result;
  });
}

// ---------------------------------------------------------------
// Start coding here..
// see https://slack.dev/bolt/

// https://api.slack.com/apps/{APP_ID}/event-subscriptions
app.event("app_mention", async ({ logger, event, say }) => {
  logger.debug("app_mention event payload:\n\n" + JSON.stringify(event, null, 2) + "\n");
  if (~event.text.indexOf("サイコロ")) {
    const num = 4;
    const side = 6;
    let text = "";
    let total = 0;
    for (let i = 0; i < num; i++) {
      let value = Math.floor(Math.random() * side) + 1;
      total += value;
      text += dice(value);
    }
    const result = await say({ text: `<@${event.user}>  ${throwDice()}${text} (total: ${total})` });

    logger.debug("say result:\n\n" + JSON.stringify(result, null, 2) + "\n");
    return result;
  }
});

function dice(value) {
  return `:dice${value}:`;
}

function throwDice() {
  aa = [
    "(っ'-')╮ =͟͟͞͞",
    "(ﾉ・∀・)ﾉ=",
    "( ･∀･)ﾉ --==≡≡",
    "(ノ ゜Д゜)ノ",
    "(ノ-_-)ノ",
    "|Д`)ノ⌒",
    "|дﾟ)ﾉ⌒",
    "ﾄｽ!!(*ﾟ▽ﾟ)ﾉﾉ",
    "ﾎﾟｲ(　´_ゝ`)σ ⌒",
    "（；`・ω・） 彡",
    "(=ﾟωﾟ)ﾉ==",
    "( ￣ー￣)ﾉ=="
  ]
  return aa[Math.floor(Math.random() * aa.length)];
}


// ---------------------------------------------------------------

// Utility to post a message using response_url
const axios = require('axios');
function postViaResponseUrl(responseUrl, response) {
  return axios.post(responseUrl, response);
}

receiver.app.get("/", (_req, res) => {
  res.send("Your Bolt ⚡️ App is running!");
});

(async () => {
  await app.start(process.env.PORT || 3000);
  console.log("⚡️ Bolt app is running!");
})();
