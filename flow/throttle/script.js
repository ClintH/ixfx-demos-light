import { throttle } from 'https://unpkg.com/ixfx/dist/flow.js';

const settings = Object.freeze({
  log: document.getElementById(`log`),
  raw: document.getElementById(`raw`),
  resetBtn: document.getElementById(`btnReset`)
});

const onMove = (elapsedMs, ...args) => {
  const { log } = settings;
  
  //console.log(`Elapsed: ${elapsedMs}`);
  //console.log(args);

  /** @type {PointerEvent} */
  const pointerEvt = args[0];

  log?.append(`!`);
};

const setup = () => {
  const { log, raw, resetBtn } = settings;
  const moveThrottled = throttle(onMove, 500);

  // Swallow some events to avoid touch screen issues
  document.addEventListener(`contextmenu`, (ev) => ev.preventDefault());

  document.addEventListener(`pointermove`, (ev) => {
    ev.preventDefault();

    // For comparison also show unthrottled
    raw?.append(`!`);
    moveThrottled(ev);
  });

  // Reset button
  resetBtn?.addEventListener(`click`, () => {
    if (log) log.innerHTML = ``;
    if (raw) raw.innerHTML = ``;
  });
};
setup();