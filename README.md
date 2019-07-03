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

First grab the source code.

```
$ git clone https://github.com/zozs/a-wild-button-appears.git
$ npm install
```

Then add an app to your Slack workspace. Configure it as follows:

#### Interactive components

Add the URL to the server the app is running on, followed by `/interactive`, e.g. `https://example.com/interactive`

#### Slash commands

Add the command `/wildbutton`, with the request url similar to: `https://example.com/commands`

#### Permissions

Add the following scopes:

- `commands`
- `chat:write:bot`
- `users:read`

#### Install the app

The install the app, and go to Permissions and note down the generated token. Also look
up the Verification token.

### Configuration

A wild BUTTON appears needs some environmental variables configured. You can either supply them as regular
environmental variables in your shell, or put them in a `.env` file in the same folder as
`wildbutton.js`.

 * `ALLOW_MANUAL_ANNOUNCE`: Set to `yes` to allow manual announcement of button (good for testing)
 * `SLACK_ACCESS_TOKEN`: The app token
 * `SLACK_SIGNING_SECRET`: Signing secret to verify that the requests comes from Slack
 * `PORT`: Port for HTTP server to listen on
 * `ANNOUNCE_CHANNEL`: Channel ID (e.g. C12345678) in which to post the button.
 * `DATA`: path to json-file where statistics are stored.

### Running

Just launch the `wildbutton.js` file with Node.

## License

A wild BUTTON appears is licensed under the ISC license, see the `LICENSE` file, or the text below:

```
Copyright (c) 2018, 2019, Linus Karlsson

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
