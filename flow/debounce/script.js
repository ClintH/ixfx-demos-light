import { debounce } from 'https://unpkg.com/ixfx/dist/flow.js';

const settings = Object.freeze({
  /** @type {HTMLElement|null} */
  log: document.querySelector(`#log`)
});

const onMove = (elapsedMs, ...args) => {
  const { log } = settings;
  // PointerEvent if we wanted it...
  // const evt = args[0]; 
  log?.append(`Move!`);
};

const setup = () => {
  const moveDebounced = debounce(onMove, 1000);
  document.addEventListener(`pointermove`, moveDebounced);
};
setup();