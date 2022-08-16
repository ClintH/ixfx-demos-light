import { Points, radianToDegree } from 'https://unpkg.com/ixfx/dist/geometry.js';

// Initial state with empty values
let state = Object.freeze({
  /** @type {number} */
  angleDeg: 0,
  bounds: {
    width: 0,
    height: 0
  },
  reference: {
    x: 0.5,
    y: 0.5
  },
  location: {
    x: Math.random(),
    y: Math.random()
  },
  /** @type {number} */
  distance: 0,
  pointer: { x: 0, y: 0 }
});

// Update state of world
const onTick = () => {
  const { pointer, reference } = state;

  const p = pointer;
  // Demo some calculations
  // Because we're using relative points, distance will be a percentage
  const distance = Points.distance(reference, p);

  // Angle
  const angleDeg = radianToDegree(Points.angle(reference, p));

  // Update state with calculations...
  updateState({
    location: pointer,
    distance,
    angleDeg
  });
};

/**
 * @param el {HTMLElement}
 * @param pos {{x:number, y:number}}
 */
const relativePosition = (el, pos) => {
  const { bounds } = state;
  pos = Points.multiply(pos, bounds.width, bounds.height);

  const b = el.getBoundingClientRect();
  const p = Points.subtract(pos, b.width / 2, b.height / 2);
  el.style.transform = `translate(${p.x}px, ${p.y}px)`;
};

const useState = () => {
  const { location, reference, distance, angleDeg } = state;
  const thingEl = document.getElementById(`thing`);
  const referenceEl = document.getElementById(`reference`);
  const distanceEl = document.getElementById(`lblDistance`);
  const angleDegEl = document.getElementById(`lblAngleDeg`);

  if (!thingEl) return;
  if (!referenceEl) return;
  if (!distanceEl || !angleDegEl) return;
  
  // Position element that tracks pointer
  relativePosition(thingEl, location);

  // Position 'reference' element
  relativePosition(referenceEl, reference);

  // Update labels
  distanceEl.innerText = distance.toPrecision(2);
  angleDegEl.innerText = Math.round(angleDeg).toString();
};

/**
 * Setup and run main loop 
 */
const setup = () => {
  // Keep track of screen size whenever it resizes
  const onResize = () => {
    updateState({
      bounds: {
        width: window.innerWidth,
        height: window.innerHeight
      }
    });
  };
  document.addEventListener(`resize`, onResize);
  onResize();

  document.addEventListener(`pointermove`, e => {
    const { bounds } = state;
    const x = e.clientX;
    const y = e.clientY;
    updateState({
      // Make pointer position relative (on 0..1 scale)
      pointer: Points.divide(x, y, bounds.width, bounds.height)
    });
  });

  const loop = () => {
    onTick();
    useState();
    window.requestAnimationFrame(loop);
  };
  loop();
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