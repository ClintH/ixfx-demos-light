import * as Dom from 'https://unpkg.com/ixfx/dist/dom.js';
import { repeat } from 'https://unpkg.com/ixfx/dist/flow.js';
import * as Random from 'https://unpkg.com/ixfx/dist/random.js';
import { Points, Circles, Polar } from 'https://unpkg.com/ixfx/dist/geometry.js';

const settings = Object.freeze({
  numberOfPoints: 500,
  piPi:Math.PI*2,
  // Try also using other random sources, such as
  // Random.weightedFn(`cubicIn`), or Random.gaussian()
  randomSource: Math.random,
  pointColour: `hsl(70, 100%, 50%)`,
  pointSize: 0.005,
  origin: { x: 0.5, y:0.5, radius:0.5 },
  radius:0.5
});

let state = Object.freeze({
  bounds: { width: 0, height: 0 },
  /** @type number */
  scaleBy: 1,
});

/**
 * Given the random number source `r`, returns a distance for a point (0..1)
 * 
 * Try these functions:
 *  r()
 *  Math.sqrt(r())
 *  1- r()
 *  1- r()*r()
 *  1- r()*r()*r()
 *  1- r()*r()*r()*r()
 *  Math.sqrt(1- r()*r()*r()*r())
 *  1 - Math.sqrt(1- r())
 *  1 - Math.sqrt(1- r() * r())
 * @param {*} r 
 * @returns number
 */
const randomDistance = (r) => r();

/**
 * 
 * @param {Circles.CirclePositioned} circle
 * @param {number} numberOfPoints 
 * @returns 
 */
const randomPoints = (circle, numberOfPoints) => {
  const { piPi, randomSource  } =  settings;
  const { radius } = circle;

  // Generate a random point in circle
  // Uses Polar to create a point from a random distsance and angle
  const generate = () => Polar.toCartesian(randomDistance(randomSource) * radius, randomSource()*piPi, circle);

  // Run generate() for the number of points needed, returning as an array
  return repeat(numberOfPoints, generate);
};


/**
 * This is run at animation speed. It
 * should just draw based on whatever is in state
 * @returns 
 */
const use = () => {
  const { numberOfPoints, pointColour, origin, radius, pointSize } = settings;
  const { scaleBy, bounds } = state;

  /** @type HTMLCanvasElement|null */
  const canvasElement = document.querySelector(`#canvas`);
  const context = canvasElement?.getContext(`2d`);
  if (!context || !canvasElement) return;

  // Make background transparent
  context.clearRect(0, 0, bounds.width, bounds.height);

  // Get absolutely-positioned circle
  const absCircle = { 
    x: origin.x * bounds.width, 
    y: origin.y * bounds.height,
    radius: radius * scaleBy
  };
  
  // Compute points
  const pts = randomPoints(absCircle, numberOfPoints);

  const size = pointSize * scaleBy; 
  for (const pt of pts) {
    drawPoint(context, pt, pointColour, size);
  }
};

function setup() { 
  Dom.fullSizeCanvas(`#canvas`, arguments_ => {
    saveState({ 
      bounds: arguments_.bounds,
      scaleBy: Math.min(arguments_.bounds.width, arguments_.bounds.height)
    });
    use();
  });
};
setup();

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

/**
 * Draws a point (in pixel coordinates)
 * @param {CanvasRenderingContext2D} context 
 * @param {Points.Point} position 
 */
function drawPoint(context, position, fillStyle = `black`, size = 1)  {
  context.fillStyle = fillStyle;
  context.beginPath();
  context.arc(position.x, position.y, size, 0, settings.piPi);
  context.fill();
}
