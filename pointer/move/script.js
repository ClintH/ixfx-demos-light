import { Points } from 'https://unpkg.com/ixfx/dist/geometry.js';
import { clamp } from 'https://unpkg.com/ixfx/dist/data.js';

// Define our Thing
/** 
 * @typedef Thing
 * @property {'none'|'dragging'} dragState
 * @property {Points.Point} position
 * @property {number} mass
 */

const settings = Object.freeze({
  meltRate: 0.9999,
  movementMax: 50,
  sizeEm: 10,
  massRange: [ 0.1, 4 ]
});

let state = Object.freeze({
  /** @type number */
  freezeRay: 1,
  /** @type Thing */
  thing: generateThing(),
  /** @type number */
  currentMovement: 0
});

/**
 * Use the data of the Thing somehow...
 * @param {Thing} thing 
 */
const useThing = (thing) => {
  const { sizeEm } = settings;

  const el = document.getElementById(`thing`);
  if (!el) return;

  const { position, mass } = thing;

  // Change opacity based on mass
  el.style.opacity = mass.toString();

  // Change size based on mass
  el.style.height = el.style.width = `${sizeEm*mass}em`;

  // Position
  positionFromMiddle(el, position);
};

/**
 * Position an element from its middle
 * @param {HTMLElement} el 
 * @param {Points.Point} relativePos 
 */
const positionFromMiddle = (el, relativePos) => {
  // Convert relative to absolute units
  const absPosition = Points.multiply(relativePos, window.innerWidth,window.innerHeight);
  
  const thingRect = el.getBoundingClientRect();
  const offsetPos = Points.subtract(absPosition, thingRect.width / 2, thingRect.height / 2);

  // Apply via CSS
  el.style.transform = `translate(${offsetPos.x}px, ${offsetPos.y}px)`;
};

/**
 * Continually loops, updating the thing
 * @param {Thing} thing
 */
const loopThing = (thing) => {
  const { meltRate, massRange } = settings;
  const { freezeRay } = state; // Get thing from state

  let { mass } = thing;

  // Apply relevant state from the world. 0.01 is used to scale it down
  mass = mass + (mass*freezeRay*0.01);

  // Apply the 'logic' of the thing
  // - Our thing melts over time
  mass *= meltRate;

  // Make sure mass doesn't go outside our desired range
  mass = clamp(mass, massRange[0], massRange[1]);

  // Apply changes to a new Thing
  return updateThing(thing, { mass });
};

const useState = () => {
  const { thing } = state;

  // Use thing
  useThing(thing);
};

const setup = () => {
  const loop = () => {
    const { thing } = state;
    
    // Update freeze ray based on movement
    const newFreeze = state.currentMovement / settings.movementMax;

    // Update thing
    const newThing = loopThing(thing);

    // Update state
    updateState({ 
      thing: newThing,
      freezeRay: newFreeze,
      currentMovement: 0
    });

    useState();
    window.requestAnimationFrame(loop);
  };
  loop();

  window.addEventListener(`pointermove`, evt => {
    
    // Get magnitude of movement
    const magnitude = Points.distance({ x: evt.movementX, y: evt.movementY });
    // Add to state
    updateState({ 
      currentMovement: state.currentMovement + magnitude 
    });
  });
};
setup();


/**
 * Generates a Thing
 * @returns {Thing}
 */
function generateThing () {
  return {
    dragState:  `none`,
    position: { x: 0.5, y:0.5 },
    mass: 1
  };
}

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

/**
 * Updates `thing` with supplied `data`
 * @param {Thing} thing
 * @param {Partial<Thing>} data 
 */
function updateThing(thing, data) {
  return Object.freeze({
    ...thing,
    ...data
  });
}