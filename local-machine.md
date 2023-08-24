# Running on your own machine

[Install Node.js if needed](./_readmes/install-nodejs.md)

```
npm install
```

To serve sketches, automatically refreshing when changes are made to source:
```
npm start
```

You can view them in your browser at `http://localhost:5555`
Saving the file in VSC will automatically refresh the browser.

To serve sketches and also have a websockets back-end:
```
npm run ws
``` 

# Websockets

To enable the websockets server, start with `npm run ws` instead of `npm start`. This is at the cost of the live-reloading capability.

The websockets server will not be over HTTPs, so make sure the URL you use is `ws://`, not `wss://`

```js
const settings = Object.freeze({
  remote: new Remote({
    allowNetwork: true,
    websocket: `ws://${window.location.host}/ws`
  })
});
```
