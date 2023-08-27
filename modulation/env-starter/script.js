
import { defaultAdsrOpts as defaultAdsrOptions, adsr } from 'https://unpkg.com/ixfx/dist/modulation.js';
import { continuously } from 'https://unpkg.com/ixfx/dist/flow.js';

const settings = Object.freeze({
  sampleRateMs: 5,
  adsrOptions: {
    ...defaultAdsrOptions(),
    attackBend: 1,
    attackDuration: 10*1000,
    releaseLevel: 0,
    releaseDuration: 15*1000,
    sustainLevel: 1
  }
});

let state = Object.freeze({
  envelope: adsr(settings.adsrOptions),
  /** @type number */
  target: 0,
  /** @type number */
  value: 0,
  abortController: new AbortController()
});

const update = () => {
  let { envelope } = state;
  
  // Read value from envelope and set it to state
  saveState({ value: envelope.value});
};
/**
 * Use state properties for something...
 */
const use = () => {
  const { value } = state;
  console.log(value);
};

function setup() {
  continuously(() => {
    update();
    use();
  }).start();

  // Trigger envelope
  state.envelope.trigger();
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