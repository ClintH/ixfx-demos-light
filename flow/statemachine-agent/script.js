import { clamp } from 'https://unpkg.com/ixfx/dist/data.js';
import { StateMachine, continuously } from 'https://unpkg.com/ixfx/dist/flow.js';

// States
const settings = Object.freeze({
  updateSpeed: 2000,
  labelStateEmoji: /** @type HTMLElement */(document.getElementById(`labelStateEmoji`)),
  labelState: /** @type HTMLElement */(document.getElementById(`labelState`)),
  labelEnergy:/** @type HTMLElement */(document.getElementById(`labelEnergy`)),
  stateMachine: {
    sleeping: `waking`,
    waking: [ `resting`, `sleeping` ],
    resting: [ `sleeping`, `walking` ],
    walking: [ `running`, `resting` ],
    running: [ `walking` ],
  },
  stateHandlers: Object.freeze([
    {
      // State is 'sleeping'
      if: `sleeping`,
      then: [
        // Increase energy by 10%
        () => updateEnergy(0.1),
        () => {
          // Wake up if 100% energy
          if (state.energy >= 1) {
            return { next: true };
          }
        },
      ],
    },
    Object.freeze({
      // State is 'waking'
      if: `waking`,
      resultChoice: `random`,
      then: [ { next: `resting` }, { next: `sleeping` } ],
    }),
    {
      // State is 'resting'
      if: `resting`,
      then: [
        // Increase energy by 1%
        () => updateEnergy(0.01),
        () => {
          // 20% chance of a nap
          if (Math.random() < 0.2) return { next: `sleeping` };
          // If we have some energy, go for a walk
          if (state.energy > 0.5) return { next: `walking` };
        },
      ],
    },
    {
      // State is 'walking'
      if: `walking`,
      then: [
        // Drop energy by 5%
        () => updateEnergy(-0.05),
        () => {
          // If we're exhausted, rest
          if (state.energy < 0.2) return { next: `resting` };
          // Lots of energy + chance: run!
          if (state.energy > 0.7 && Math.random() > 0.6)
            return { next: `running` };
        },
      ],
    },
    {
      // State is 'running'
      if: `running`,
      then: [
        // Drop energy by 15%
        () => updateEnergy(-0.15),
        () => {
          // If we're tiring, walk
          if (state.energy < 0.5) return { next: `walking` };
        },
      ],
    },
  ]),
});

let state = {
  current: ``,
  energy: 0.5,
};

// Update UI based on current state
const updateUi = () => {
  const { current, energy } = state;
  const { labelStateEmoji, labelState, labelEnergy } = settings;
  labelStateEmoji.innerText = stateToEmoji(current);
  labelState.innerHTML = `<p>${current}</p>`;
  labelEnergy.innerText = `${Math.floor(energy * 100)}%`;
};

// Set up driver
const setup = async () => {
  const { stateMachine, stateHandlers, updateSpeed } = settings;
  const driver = await StateMachine.driver(stateMachine, stateHandlers);

  continuously(async () => {
    const result = await driver.run();
    if (result?.value !== state.current) {
      state = {
        ...state,
        current: /** @type string*/(result?.value),
      };
    }

    updateUi();
  }, updateSpeed).start();
};
await setup();

function updateEnergy(amt) {
  const { energy } = state;
  state = { ...state, energy: clamp(energy + amt) };
}

function stateToEmoji(state) {
  switch (state) {
  case `sleeping`:
    return `😴`;
  case `waking`:
    return `😵‍💫`;
  case `resting`:
    return `😌`;
  case `walking`:
    return `🚶🏻‍♀️`;
  case `running`:
    return `🏃🏻‍♀️`;
  }
  return `?`;
}
