import { interpolate, pointTracker, clamp } from "https://unpkg.com/ixfx/dist/data.js";
import * as Util from "./util.js";

const settings = Object.freeze({
  // Tracker for point. Reset when there is a pointerdown
  tracker: pointTracker({
    sampleLimit: 5
  }),
  // How much to decay values by each loop
  decayAmount: 0.99,
  // Interpolation speed to new value
  interpolateAmount: 0.25,
  // What seems to be the highest speed
  speedMax: 2
});

/** 
 * @typedef {{
 * relative:import("https://unpkg.com/ixfx/dist/data").PointTrack|undefined,
 * angle: number
 * speed: number
 * }} State
*/

/**
 * @type State
 */
let state = Object.freeze({
  relative: undefined,
  angle: 0,
  speed:0
});

const update = () => {
  let { speed } = state;
  const { decayAmount, interpolateAmount, speedMax } = settings;

  // Get latest calculated relative data
  const { relative } = state;
  
  // Decay values
  speed = speed * decayAmount;

  // Yes, there is new data from the pointTracker
  if (relative) {    
    // Get speed, but could be other things like
    //    .angle, .centroid, .distanceFromStart
    const relativeSpeed = clamp(relative.speed / speedMax); // make proportional

    // Interpolate to new speed value
    speed = interpolate(interpolateAmount, speed, relativeSpeed);
  }

  saveState({
    relative: undefined, // reset
    speed
  });

  // Visualise
  use();
};

const use = () => {
  const { speed } = state;
  
  // Update HTML element with current speed
  Util.textContent(`#speed`,speed);
};

function setup() {
  document.addEventListener(`pointerdown`, event => {
    // Reset tracker
    settings.tracker.reset();
  });

  document.addEventListener(`pointermove` ,event => {
    if (event.buttons === 0) return;

    const { tracker } = settings;

    // Add to tracker, get back computed results
    const info = tracker.seenEvent(event);

    // Keep track of infom about move event with respect
    // to last pointerdown
    saveState( {
      relative: info.fromLast // could also use .fromInitial
    });
  });
  
  // Call every half a second
  setInterval(update, 500);
};

// #region Toolbox
/**
 * Save state
 * @param {Partial<state>} s 
 */
function saveState (s) {
  state = Object.freeze({
    ...state,
    ...s
  });
}
setup();
// #endregion