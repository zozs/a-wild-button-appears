# A wild BUTTON appears

**A completely useless bot for Slack**

_A wild BUTTON appears_ is a completely useless bot for Slack.
During work days, at a random time between 09:00-16:00, the bot will post a message with a button to Slack channel of choice.
The first user to click the button wins, and can enjoy the glory during the rest of the day.

## Screenshots

![Before clicking](/../screenshots/before.png?raw=true "Before clicking")

![After clicking](/../screenshots/after.png?raw=true "After clicking")

## Usage

Install the bot, and then proceed by waiting for a wild BUTTON to appear.

## Installation, configuration, and running

### Installation

#### Install with a cloud-hosted instance

<a href="https://slack.com/oauth/v2/authorize?client_id=398308658001.1314237615088&scope=commands,channels:read,chat:write,groups:read,im:write,channels:join,chat:write.public&user_scope="><img alt="Add to Slack" height="40" width="139" src="https://platform.slack-edge.com/img/add_to_slack.png" srcSet="https://platform.slack-edge.com/img/add_to_slack.png 1x, https://platform.slack-edge.com/img/add_to_slack@2x.png 2x" /></a>

After installation, you will receive a message by DM in your Slack client. You can then go to the Home tab of wildbutton, where you can configure settings. You need to at least select the proper channel to post buttons to :slightly_smiling_face:

The cloud-hosted service is free to use, and kindly sponsored by [Debricked](https://debricked.com/).

#### Deploy own instance

Configure new Slack app with following properties:

* Fill in app name, description, icon, and colour.
* Configure interactive components with the URL ending in `/interactive`
* Configure slash commands with the URL ending in `/commands`
* Configure event subscriptions with URL ending in `/events`. Subscribe to bot scope `app_uninstall` and `app_home_opened`.
* Configure bot user/app home. Set Home Tab to active.
* Configure permissions:
  * Add the redirect url to the URL ending in `/auth`.
  * Add Bot Token Scopes: `commands`, `channels:read`, `chat:write`, `groups:read`, `im:write`, `channels:join`, `chat:write.public`.

### Configuration

A wild BUTTON appears needs some environmental variables configured. You can either supply them as regular
environmental variables in your shell, or put them in a `.env` file in the same folder as
`wildbutton.js`.

 * `MONGO_URL`: A connection string to connect to MongoDB. Example: `mongodb+srv://user:pass@some-atlas-example.mongodb.net/test?retryWrites=true&w=majority`
 * `MONGO_DATABASE_NAME`: Name of database in Mongo to store the instance data.
 * `SLACK_SIGNING_SECRET`: Signing secret to verify that the requests comes from Slack
 * `SLACK_CLIENT_ID`: Client ID for Slack app.
 * `SLACK_CLIENT_SECRET`: Client secret for Slack app.
 * `SLACK_REDIRECT_URI`: Publicly available url where Slack should redirect to after adding app (the endpoint ending in `/auth`)
 * `PORT`: Port for HTTP server to listen on.
 * `SENTRY_DSN`: Optional DSN if you want to submit errors to Sentry. Truly optional, if not set, log only to stderr/stdout.
 * `SENTRY_ENVIRONMENT`: Optional. The environment sent to sentry. Useful if you have e.g. both staging and production.

### Running

Launch the `handler-standalone.js` file with Node.

## License

A wild BUTTON appears is licensed under GNU AGPL v3 or later, see the `LICENSE` file for the full license.

```
a-wild-button-appears - a slack bot for posting random buttons
Copyright (c) 2018, 2019, 2020, 2021, 2022, Linus Karlsson

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.
```
