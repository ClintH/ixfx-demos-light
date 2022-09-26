import { Remote } from "https://unpkg.com/@clinth/remote@latest/dist/index.mjs";

const settings = Object.freeze({
  lastDataEl: document.querySelector(`#lastData`),
});

let state = Object.freeze({
  paused: false
});

const r = new Remote({
  websocket: `wss://${window.location.host}/ws`,
  allowNetwork: true
});

const getXyz = (d) => ({
  x: d.x,
  y: d.y,
  z: d.z
});

const getAbg = (d) => ({
  a: d.alpha,
  b: d.beta,
  g: d.gamma
});

const onMotion = (evt) => {
  const { lastDataEl, log } = settings;
  const { paused } = state;
  if (paused) return;
  
  const v = (x) => x.toPrecision(2);
  
  
  // Grab some values
  const d = {
    accel: getXyz(evt.acceleration),
    accelGrav: getXyz(evt.accelerationIncludingGravity),
    rotRate: getAbg(evt.rotationRate)
  };
  
  // Send it
  r.broadcast(d);
  
  // Show it
  lastDataEl.innerHTML = `
  <table>
  <tr>
    <td colspan=3>accel x, y, z</td>
  </tr>
  <tr>
    <td>${v(d.accel.x)}</td><td>${v(d.accel.y)}</td><td>${v(d.accel.z)}</td>
  </tr>
  <tr>
    <td colspan=3>accelGrav x, y, z</td>
  </tr>
    <tr>
    <td>${v(d.accelGrav.x)}</td><td>${v(d.accelGrav.y)}</td><td>${v(d.accelGrav.z)}</td>
  </tr>
  <tr>
    <td colspan=3>rotRate alpha, beta, gamma</td>
  </tr>
    <tr>
    <td>${v(d.rotRate.a)}</td><td>${v(d.rotRate.b)}</td><td>${v(d.rotRate.g)}</td>
  </tr>
  </table>`;
};

const startEvents = async () => {
  if (typeof DeviceMotionEvent.requestPermission === `function`) {
    const p = await DeviceMotionEvent.requestPermission();
    if (p === `granted`) {
      window.addEventListener(`devicemotion`, onMotion);
    } else {
      console.log(`Permission denied`);
    }
  } else {
    window.addEventListener(`devicemotion`, onMotion);
  }
  document.getElementById(`btnStart`).remove();
};

const setup = () => {
  document.getElementById(`txtPeerId`).value = r.id;
  
  document.getElementById(`btnStart`)?.addEventListener(`click`, startEvents);
  document.getElementById(`btnPause`)?.addEventListener(`click`, evt => {
    state = {
      ...state,
      paused: !state.paused
    };
  });
  
};
setup();