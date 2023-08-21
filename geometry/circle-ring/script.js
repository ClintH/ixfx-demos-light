import { continuously } from 'https://unpkg.com/ixfx/dist/flow.js';
import { Points } from 'https://unpkg.com/ixfx/dist/geometry.js';
import { Polar } from 'https://unpkg.com/ixfx/dist/geometry.js';

const settings = Object.freeze({
  // how many points to distribute around the circumference
  totalPoints: 8
});

let state = Object.freeze({
  /** 
   * Polar points
   * @type {Polar.Coord[]}
   * */
  points: []
});

const useState = () => {
  const { points } = state;
  
  const origin = {
    x: window.innerWidth/2,
    y: window.innerHeight/2
  };

  for (const [index,pt] of points.entries()) {
    const element = document.querySelector(`#pt-${index}`);
    if (element === null) continue;
    const absPolar = Polar.multiply(pt, scaleBy());
    const absPt = Polar.toCartesian(absPolar, origin);
    positionElementByAbs(element, absPt);
  }
};

const setup = () => {
  const { totalPoints } = settings;

  // Evenly distribute angle by number of points
  const angleSteps = (Math.PI*2) / totalPoints;
  const points = [];
  let angle = 0;

  for (let index=0;index<totalPoints;index++) {
    // Create polar coordinate for this point
    points.push({
      distance: 0.3,
      angleRadian: angle
    });
    angle += angleSteps;

    // Create HTML element for this # point
    const element = document.createElement(`DIV`);
    element.id = `pt-${index}`;
    element.classList.add(`pt`);
    document.body.append(element);
  }
  saveState({ points });
};
setup();

// Call `useState` continuously
continuously(useState).start();

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
 * Returns the scale factor
 * (the smaller of either the window width/height)
 * @returns 
 */
function scaleBy() {
  return Math.min(window.innerWidth, window.innerHeight);
}

/**
 * Positions an element using absolute coordinates
 * @param el {HTMLElement}
 * @param pos {{x:number, y:number}}
 */
function positionElementByAbs(element, pos) {
  const b = element.getBoundingClientRect();
  pos = Points.subtract(pos, b.width / 2, b.height / 2);
  element.style.transform = `translate(${pos.x}px, ${pos.y}px)`;
}