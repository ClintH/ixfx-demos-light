
import { clamp } from 'https://unpkg.com/ixfx/dist/data.js';
import { perSecond } from 'https://unpkg.com/ixfx/dist/modulation.js';

const settings = Object.freeze({
  ageMod: perSecond(0.1)
});

let state = Object.freeze({
  /** @type number */
  age: 0
});

const use = () => {
  const { age } = state;

  const element = document.querySelector(`#ageValue`);
  if (element) {
    element.textContent = Math.floor(age*100) + `%`;
  }
};

const update = () => {
  const { ageMod } = settings;
  let { age } = state;

  age += ageMod();
  
  saveState({
    age: clamp(age)
  });

  use();
};

function setup() {
  setInterval(update, 0);

  document.addEventListener(`click`, () => {
    saveState({
      age: 0
    });
  });
};
setup();

/**
 * Update state
 * @param {Partial<state>} s 
 */
function saveState (s) {
  state = Object.freeze({
    ...state,
    ...s
  });
}

