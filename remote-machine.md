# Running on the cloud

Gitpod is the recommended choice because it has better support for websockets.

A warning that these cloud providers can delete unused files after a period of inactivity. For Gitpod, it's 14 days. Be sure to download a local copy of your files.

# Gitpod

1. Sign up or sign in to [Gitpod](https://gitpod.io)
2. [Fork the repository](https://gitpod.io/#https://github.com/ClintH/ixfx-demos-light) You can accept the default options. 

During startup, it will ask if you want to install recommended extensions. Say 'Install' for all of these.

You'll also get a notification 'A service is available on port 5555', with 'Open Preview' and 'Open Browser' as options. Choose 'Open Browser' to view your web server in a new window (recommended).

If for some reason you lose the address to view your running sketches, click on 'Ports: 5555' which should appear in the status bar of Gitpod. This will open a panel, and it should list 'ixfx demos' with a green dot. Click on the globe icon to open it in a browser.

## Websockets

By default, the server that starts does not include websockets. In the Gitpod terminal, press CTRL+C to stop the server, and run `npm run ws`.

Because the connection is encrypted, in your sketch you'll have to change the websocket URL from `ws://` to `wss://`

Eg:

```js
const settings = Object.freeze({
  remote: new Remote({
    allowNetwork: true,
    websocket: `wss://${window.location.host}/ws`
  })
});
```

## Local editor

Gitpod has the neat option of editing the files locally, but running them in the cloud. To access this, click on the burger menu at the top-left and choose 'Gitpod: Open in VS Code'. There will be a heck of of a lot of prompts to install this and that, but if it all works, you should get a local VS Code editor.

# Codesandbox

1. Sign up or sign in to [CodeSandbox](https://codesandbox.io/)
2. [Open the repository](https://githubbox.com/clinth/ixfx-demos-light), and click 'Fork' from the top-right to make a copy.

You'll get a preview window of your server. Use the overlapped boxes icon at the top of the preview to open it in a new window. Close the mini preview.

## Websockets

By default, the server that starts does not include websockets. Below the code editor, you should see a terminal and 'Start'. Click in it, and press CTRL+C to stop it. From the > button, select 'New task' and then choose 'ws'. This will start the websocket-enabled server.

Because the connection is encrypted, in your sketch you'll have to change the websocket URL from `ws://` to `wss://`
Eg:

```js
const settings = Object.freeze({
  remote: new Remote({
    allowNetwork: true,
    websocket: `wss://${window.location.host}/ws`
  })
});
```

# Glitch

1. Login/signup for [Glitch](https://glitch.com)
2. [Remix the demos project](https://glitch.com/edit/#!/ixfx-demos)

Check the README.md there.

# Stackblitz

[Fork the repository](https://stackblitz.com/github/clinth/ixfx-demos-light/), signing up for Stackblitz along the way

After setting up, you'll see a familiar VS Code interface. There is a toolbar on the left side of the screen, starting with a blue lightning bolt. Look for the plug-like icon. It should have a (1) badge. Click this, and you should see a panel with 'Port 5555'. This tells you the server is running properly.

By default it will also open a mini web-browser to show your work. As you edit, it should refresh to show changes. However, it's hard to see the browser developer tools.  Instead, click 'Open in New Tab', found in the top toolbar of Stackblitz. And then click 'Close' to close the preview.

## Websockets

By default, the server that starts does not include websockets. To change this, edit `package.json`, found in the root of the project. At the bottom of the file, you'll see:

```json
  .
  .
  "stackblitz": {
    "startCommand": "npm run start"
  }
}
```

Change `startCommand` to `npm run ws`, like this:
```json
  .
  .
  "stackblitz": {
    "startCommand": "npm run ws"
  }
}
```

Because of how Stackblitz runs, you cannot however use it with websockets between devices.