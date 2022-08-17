import { Points } from 'https://unpkg.com/ixfx/dist/geometry.js';
import { movingAverage, scalePercent, scaleClamped } from 'https://unpkg.com/ixfx/dist/data.js';

const settings = Object.freeze({
  // Maximum speed for either x/y
  // This determines the scaling of speed
  maxSpeed: 1,

  // Range for font width
  fontWidth: [ 50, 200 ],

  // Range for font weight
  fontWeight: [ 200, 900 ],

  // Two moving averagers for x,y
  // Average over 30 samples
  avg: {
    x: movingAverage(30),
    y: movingAverage(30)
  },
  // Update rate for calculating speed (milliseconds)
  updateRateMs: 50
});

let state = Object.freeze({
  /** @type number */
  distance: 0,

  // Accumulates movement in x,y
  /** @type {{x:number, y:number}} */
  movement: { x:0, y:0 },

  // Current speed in x,y
  /** @type {{x:number, y:number}} */
  speed: { x:0, y: 0 },

  // Output of x,y movingAveragers
  /** @type {{x:number, y:number}} */
  speedAvg: { x:0, y: 0 }
});

const useState = () => {
  const { speed, speedAvg } = state;
  const { fontWidth, fontWeight } = settings;
  
  const lblSpeed = document.getElementById(`lblSpeed`);
  const lblSpeedAvg = document.getElementById(`lblSpeedAvg`);
  if (!lblSpeed || !lblSpeedAvg) return;

  lblSpeed.innerText = Points.toString(speed, 2);
  lblSpeedAvg.innerText = Points.toString(speedAvg, 2);

  const el = document.getElementById(`speed`);
  if (!el) return;

  // Generate CSS text for each variable font axis
  const wdth = `'wdth' ` + Math.round(scalePercent(speedAvg.y, fontWidth[0], fontWidth[1]));
  const wght = `'wght' ` + Math.round(scalePercent(speedAvg.x, fontWeight[0], fontWeight[1]));

  // Apply to element
  // Note that axies must be in alphabetical order (!)
  el.style.fontVariationSettings = `${wdth}, ${wght}`;
};

/**
 * @param {PointerEvent} evt
 */
const onPointerMove = (evt) => {
  const { movement } = state;

  // Accumulate movement in x,y
  // Use Math.abs because we don't care about the direction
  updateState({
    movement: {
      x: movement.x + Math.abs(evt.movementX),
      y: movement.y + Math.abs(evt.movementY)
    }
  });
};
const setup = () => {
  const { avg, maxSpeed } = settings;

  document.addEventListener(`pointermove`, onPointerMove);

  // Scale & clamp speed with an input range of 0..maxSpeed. This yields a value of 0..1
  const scale = (v) => scaleClamped(v, 0, maxSpeed);

  let lastUpdate = performance.now();

  // Update speed every 50ms
  setInterval(() => {
    const { movement } = state;
    const now = performance.now();

    // Speed in x,y, made relative.
    const speed = {
      x: scale(movement.x / (now - lastUpdate)),
      y: scale(movement.y / (now - lastUpdate))
    };

    lastUpdate = now;

    updateState({
      // Reset accumulated movement
      movement: { x:0 , y: 0 },

      // Update with latest calculated values
      speed,
      speedAvg: {
        x: avg.x.add(speed.x),
        y: avg.y.add(speed.y)
      }
    });
    useState();
  }, settings.updateRateMs);
};
setup();

/**
 * Update state
 * @param {Partial<state>} s 
 */
function updateState (s) {
  state = Object.freeze({
    ...state,
    ...s
  });
}

