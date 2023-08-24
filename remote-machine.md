# Running on the cloud

 [Fork the repository](https://gitpod.io/#https://github.com/ClintH/ixfx-demos-light), signing up for Gitpod along the way.

 During startup, it will ask if you want to install recommended extensions. Say 'Install' for all of these.

# Gitpod

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