import { Arcs } from 'https://unpkg.com/ixfx/dist/geometry.js';
import { Svg } from 'https://unpkg.com/ixfx/dist/visual.js';
import { scalePercent } from 'https://unpkg.com/ixfx/dist/data.js';
import * as Generators from 'https://unpkg.com/ixfx/dist/generators.js';
import * as Dom from 'https://unpkg.com/ixfx/dist/dom.js';

// Define settings
const settings = Object.freeze({
  radiusMin: 20,
  radiusProportion: 0.4,
  startDegrees: 0,
  endDegrees: 90,
  strokeWidthMax: 70,
  strokeWidthMin: 3,
  strokeStyle: `black`,
  // Loop up and down again from 0 and 100%, 1% at a time
  genPingPong: Generators.pingPongPercent(0.01),
  // Loops from 0 to 100%, but starts back at 0. 
  // In contrast, pingPong counts down to 0
  genLoop: Generators.numericPercent(0.01, true)
});

// State
let state = Object.freeze({
  /** @type {number} */
  pingPong: 0,
  /** @type {number} */
  loop: 0,
  bounds: { width: 0, height: 0, center: { x: 0, y: 0 } },
});

// Update state of world
const update = () => {
  const { genPingPong, genLoop } = settings;

  // Value could potentially be undefined
  const genLoopV = genLoop.next().value;

  updateState({
    // Get new values from generators
    pingPong: genPingPong.next().value,
    loop: genLoopV ? genLoopV : 0
  });
};

/**
 * Update path
 * @param {SVGPathElement} arcEl 
 */
const updateSvg = (arcEl) => {
  const { radiusProportion } = settings;
  const { bounds, pingPong, loop } = state;

  // pingPong runs from 0-100%, producing a radius that is too large. 
  // Scale to 0-40%
  const radius = settings.radiusMin + 
    (bounds.width * scalePercent(pingPong, 0, radiusProportion));

  // Apply same pingPong value to stroke width
  const width = settings.strokeWidthMin + (pingPong * settings.strokeWidthMax);

  // Offset both start and end angle based on `loop` generator
  const offset = loop * 360;

  // Define arc
  const arc = Arcs.fromDegrees(radius, 
    settings.startDegrees + offset,
    settings.endDegrees + offset, 
    bounds.center);

  // Apply stroke width
  Svg.applyStrokeOpts(arcEl, { strokeWidth: width });

  // Update existing SVG element with new details
  arcEl.setAttribute(`d`, Arcs.toSvg(arc).join(` `));
};

/**
 * Setup and run main loop 
 */
const setup = () => {
  const svg = document.querySelector(`svg`);
  if (svg === null) return;

  // Resize SVG element to match viewport
  Dom.parentSize(svg, args => {
    updateState({
      bounds: windowBounds()
    });
  });

  // Create SVG `path` element for arc
  const arcEl = Svg.Elements.path(``, svg, {
    fillStyle: `none`,
    strokeStyle: settings.strokeStyle,
    strokeWidth: settings.strokeWidthMax
  });

  const loop = () => {
    update();
    updateSvg(arcEl);
    window.requestAnimationFrame(loop);
  };
  loop();
};

const windowBounds = () => ({
  width: window.innerWidth,
  height: window.innerHeight,
  center: {
    x: window.innerWidth / 2,
    y: window.innerHeight / 2
  }
});
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
