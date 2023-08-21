import { Points } from 'https://unpkg.com/ixfx/dist/geometry.js';
import { clamp } from 'https://unpkg.com/ixfx/dist/data.js';

// Define our Thing
/** 
 * @typedef Thing
 * @property {boolean} dragging
 * @property {Points.Point} position
 * @property {number} mass
 * @property {number} agitation
 * @property {HTMLElement} el
 */


const settings = Object.freeze({
  agitationDecay: 0.99
});

let state = Object.freeze({
  /** @type Thing[] */
  things: []
});


const useState = () => {
  for (const t of state.things) {
    const { el, position, agitation } = t;

    // Calculate top-left pos from relative center position
    const pos = calcPositionByMiddle(el,  position);

    // Calculate rotatation based on 'agitation'
    const rot = t.agitation * 360;

    // Apply via CSS
    el.style.transform = `translate(${pos.x}px, ${pos.y}px) rotate(${rot}deg)`;

  }
};

const loop =() => {
  const { agitationDecay } = settings;

  for (const t of state.things) {
    let agitation = t.agitation;
    if (t.dragging) {
      // Expand agitation
      agitation += Math.min(agitation, 0.001) * (1-t.mass);
    } else {
      // Decay agitation
      agitation *= agitationDecay;
    }
    t.agitation = clamp(agitation, 0.0001, 1);
  }
  useState();
  window.requestAnimationFrame(loop);
};

/**
 * Triggered on 'pointerdown' on a 'thing' HTML element
 * @param {Draggable} t 
 * @param {PointerEvent} event 
 */
const onDragStart = (t, event) => {
  const { el } = t;

  el.classList.add(`dragging`);
  t.dragging = true;

  const startedAt = pointToRelative(event);
  const thingStartPosition = { ...t.position };
  
  const pointerMove = (event) => {
    // Compare relative pointer position to where we started
    // This yields the x,y offset from where dragging started
    const offset = Points.subtract(pointToRelative(event), startedAt);

    // Add this offset to the thing's original 
    // position to get the new position.
    t.position = Points.sum(thingStartPosition, offset);
  };


  // Dragging...
  document.addEventListener(`pointermove`, pointerMove);

  // Dragging done
  document.addEventListener(`pointerup`, event => {  
    el.classList.remove(`dragging`);
    document.removeEventListener(`pointermove`, pointerMove);
    t.dragging = false;
  }, { once: true });
};

/**
 * Sets up a thing
 * - listens for pointerdown events on the thing to initiate drag
 * @param {Thing} t 
 */
const setupThing = (t) => {
  const { el } = t;

  el.addEventListener(`pointerdown`, event => {
    event.preventDefault();
    onDragStart(t, event);
  });
};

const setup = () => {
  // Make three random things
  updateState({ things: [ generateRandomThing(), generateRandomThing(), generateRandomThing() ] });

  // Set up things
  for (const t of state.things) {
    setupThing(t);
  }
  loop();
};
setup();


/**
 * Generates a Thing
 * @returns {Thing}
 */
function generateRandomThing () {
  const element = document.createElement(`div`);
  element.classList.add(`thing`);
  document.body.append(element);

  const mass = Math.random();
  const size = mass * 100 + 100;
  element.style.width = `${size}px`;
  element.style.height = `${size}px`;
  
  return {
    dragging: false,
    mass,
    agitation: 0,
    position: { x: Math.random(), y: Math.random() },
    el: element
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
 * Return position for element
 * @param {HTMLElement} element 
 * @param {Points.Point} relativePos 
 */
function calcPositionByMiddle(element, relativePos) {
  // Convert relative to absolute units
  const absPosition = Points.multiply(relativePos, window.innerWidth,window.innerHeight);
  
  const thingRect = element.getBoundingClientRect();
  const offsetPos = Points.subtract(absPosition, thingRect.width / 2, thingRect.height / 2);

  return offsetPos;

}

function pointToRelative(p) {
  return {
    x: p.x / window.innerWidth,
    y: p.y / window.innerHeight
  };
}

/**
 * @typedef Draggable
 * @property {boolean} dragging
 * @property {Points.Point} position
 * @property {HTMLElement} el
 */