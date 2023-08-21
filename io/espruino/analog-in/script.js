
import { delay } from 'https://unpkg.com/ixfx/dist/flow.js';
import { Espruino } from 'https://unpkg.com/ixfx/dist/io.js';

const scripts = Object.freeze({
  // Define a function that sends back data
  poll: `
  function sampleData() {
    const data = [analogRead(A0), analogRead(A3), analogRead(A5)];
    USB.println(JSON.stringify(data));
  }`,
  // Defines a function that sends back data,
  // and automatically call it at a fixed interval
  stream: `
  function sampleData() {
    const data = [analogRead(A0), analogRead(A3), analogRead(A5)];
    USB.println(JSON.stringify(data));
  }
  setInterval(sampleData, 2000);`
});

const settings = Object.freeze({
  script: scripts.stream
});

let state = Object.freeze({
  /** @type number[] */
  data: [],
  /** @type {Espruino.EspruinoSerialDevice|undefined} */
  espruino: undefined
});

const useState = () => {
  const { data } = state;
  
  const dataElement = /** @type HTMLElement */(document.querySelector(`#data`));
  if (!dataElement) return;

  const dataString = data.map((v,index) => `<div>${index}. ${v}</div>`);
  dataElement.innerHTML = dataString.join(`\n`);
};

/**
 * Called when string data is received from Pico
 * @param {*} event 
 * @returns 
 */
const onData = (event) => {
  // Remove line breaks etc
  const data = event.data.trim(); 

  // Don't even try to parse if it doesn't
  // look like JSON
  if (!data.startsWith(`{`) && !data.startsWith(`[`)) return;
  if (!data.endsWith(`}`) && !data.endsWith(`]`)) return;

  try {
    const d = JSON.parse(data);
   
    // Assuming its an array of numbers
    updateState({ data: d });
    useState();
  } catch (error) {
    console.warn(error);
  }
};

/**
 * Toggle CSS based on connection status
 * @param {*} connected 
 */
const onConnected = (connected) => {
  setCssDisplay(`preamble`,  connected ? `none` : `block`);
  setCssDisplay(`data`, connected ? `block` : `none`);
  setCssDisplay(`controls`, connected ? `block` : `none`);
};

/**
 * Connect to Pico
 */
const connect = async () => {
  const { script } = settings;

  try {
    // Connect to Pico
    const p = await Espruino.serial();
    console.log(`Connected`);

    // Listen for events
    p.addEventListener(`change`, event => {
      console.log(`${event.priorState} -> ${event.newState}`);
    });

    // Send init script after a moment
    delay(async () => {
      await p.writeScript(script);

      // If we got this far, consider ourselves connected
      onConnected(true);

      updateState({ espruino: p });

      // Listen for data from the Pico
      p.addEventListener(`data`, onData);
    }, 1000);
  } catch (error) {
    console.error(error);
  }
};

const setup = () => {
  document.querySelector(`#btnConnect`)?.addEventListener(`click`, connect);

  document.querySelector(`#btnRequest`)?.addEventListener(`click`, () => {
    const { espruino } = state;
    espruino?.write(`sampleData()\n`);
  });
};
setup();

const setCssDisplay = (id, value) => {
  const element = /** @type HTMLElement */(document.querySelector(`#${id}`));
  if (!element) return;
  element.style.display = value;
};

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