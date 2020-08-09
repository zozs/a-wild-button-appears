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

This section needs to be written :).

### Configuration

A wild BUTTON appears needs some environmental variables configured. You can either supply them as regular
environmental variables in your shell, or put them in a `.env` file in the same folder as
`wildbutton.js`.

 * `MONGO_URL`: A connection string to connect to MongoDB. Example: `mongodb+srv://user:pass@some-atlas-example.mongodb.net/test?retryWrites=true&w=majority`
 * `MONGO_DATABASE_NAME`: Name of database in Mongo to store the instance data.
 * `SLACK_SIGNING_SECRET`: Signing secret to verify that the requests comes from Slack
 * `SLACK_CLIENT_ID`: Client ID for Slack app.
 * `SLACK_CLIENT_SECRET`: Client secret for Slack app.
 * `SLACK_REDIRECT_URI`: Publicly available url where Slack should redirect to after adding app.
 * `JWT_SECRET`: A random string used to secure JWT tokens used for internal communications.
 * `PORT`: Port for HTTP server to listen on, *only used in standalone mode, not in serverless*.

### Running

#### Standalone mode

Launch the `handler-standalone.js` file with Node.

#### Serverless

To deploy a staging environment, use e.g. `sls deploy --stage=dev --env=staging` which will load settings from `.env.staging`.

For production, use something like `sls deploy --stage=production --env=production`.

## License

A wild BUTTON appears is licensed under the ISC license, see the `LICENSE` file, or the text below:

```
Copyright (c) 2018, 2019, 2020, Linus Karlsson

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
```
