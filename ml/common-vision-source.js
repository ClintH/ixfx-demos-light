/**
 * Provides some common plumbing for controlling an and using a visual source.
 * 
 * 
 * setup(onFrame, onPlayback?, frameProcessorOpts?, playbackRateMs?)
 * * Initialise this module. Must be called before use.
 * * `onFrame` gets called for each frame from a source
 * * (Optional) Callback for handling playback data
 * * (Optional) options when creating the FrameProcessor
 * * (Optional) Delay between frames when playing back data
 *
 * startRecorderPlayback()
 *  * Trigger playback of user-selected recording
 *  
 * setDisplayTextResults(display)
 * * Call to enable/display footer text result display
 * 
 * setReady(ready)
 * * Signals that everything is ready and UI should be enabled
 * * ready should be true/false boolean
 * 
 * displayListResults(fn, numbered?)
 * * If text results are enabled, `fn` is called
 * * `fn` should return an array of strings which are made into a ordered or unordered list
 * 
 * enableTextReults(fn)
 * * If text results are enabled, `fn` is called
 * * `fn` should return HTML to add to footer
 *  
 * status(msg)
 * * Displays a text status message
 * * Send an empty string to hide status
 * 
 * drawDot(ctx, x, y, radius, filled?, stroke?)
 * * Draws a circle
 * 
 * drawCenteredText(ctx, msg, offsetX?, offsetY?)
 * * Draws text centered by its size
 * 
 * drawLine(ctx, ...pts)
 * * Draws a line connecting points {x,y}
 */
import { FrameProcessor } from 'https://unpkg.com/ixfx/dist/io.js';
import { Camera } from 'https://unpkg.com/ixfx/dist/io.js';
import { defaultErrorHandler } from 'https://unpkg.com/ixfx/dist/dom.js';
import { continuously, throttle, interval } from 'https://unpkg.com/ixfx/dist/flow.js';

// Settings determined by caller
const caller = {
  /** @type {FrameProcessor|undefined} */
  frameProcessor: undefined,
  /** @type {OnFrame|undefined} */
  onFrame: undefined,
  /** @type {OnPlayback|undefined} */
  onPlayback: undefined,
  /** @type {postCaptureDrawCallback|undefined} */
  postCaptureDrawCallback: undefined,
  playbackRateMs: 1000,
  /** @type {FrameProcessorOpts} */
  frameProcessorOpts: {
    showCanvas: true,
    cameraConstraints: {
      facingMode: `user`,
      max: { height: 480, width: 640 },
      min: { height: 270, width: 360 }
    }
  },
};

const settings = Object.freeze({
  loop: continuously(read),
  // Rendering
  defaultDotRadius: 5,
  videoOpacity: 0.5,
  // Don't record every frame - use a minimum rate
  recordThrottle: throttle((_elapsedMs, data, frameSize) => {
    recordDataImpl(data, frameSize);
  }, 20)
});

let state = Object.freeze({
  frameSize: { width: 0, height: 0 },
  /** @type {number} */
  sourceReadMs: 10,
  /** @type {boolean} */
  freeze: false,
  /** @type {boolean} */
  enableTextResults: true,
  /** @type {boolean} */
  displaySource: true,
  /** @type {boolean} */
  displayData: true,
  /** @type {number} */
  lastListCount: 0,
  /** @type {boolean} */
  uiVisible: true,
  /** @type {``|`recording`|`playing`} */
  recorder: ``,
  /** @type {Recording|undefined} */
  currentRecording: undefined,
  /** @type {'none'|'camera'|'recording'} */
  currentSource: `none`
});

/**
 * Runs in a loop via `continuously`
 * @returns 
 */
async function read() {
  if (state.freeze) return; // When frozen, skip everything
  const start = performance.now();
  const fp = caller.frameProcessor;

  if (fp !== undefined) {
    // Request a frame from the source
    const frame = fp.getFrame();

    if (frame !== undefined) {
      // If we haven't yet noted the frame size, do so now
      if (state.frameSize.width === 0) updateState({ frameSize: { width: frame.width, height: frame.height } });

      // Dispatch frame
      if (caller.onFrame) await caller.onFrame(frame, state.frameSize, fp.getTimestamp());
    }
  }
  // Adjust loop speed based on how quickly we're able to process
  const elapsed = performance.now() - start;
  settings.loop.intervalMs = Math.floor(elapsed * 1.1);
}


/**
 * Display HTML/text results
 * @param {HtmlProducer} htmlFn
 */
export const displayTextResults = (htmlFn) => {
  if (!state.enableTextResults || !state.displayData) return;
  const el = document.getElementById(`cs-data`);
  if (el) el.innerHTML = htmlFn();
};

/**
 * Display a list of string
 * @param {ListProducer} listFn 
 * @param {boolean} numbered If true(default) list will be numbered
 */
export const displayListResults = (listFn, numbered = true) => {
  if (!state.enableTextResults || !state.displayData) return;

  const list = listFn();

  let max = Math.max(state.lastListCount, list.length);
  let toAdd = max - list.length;

  for (let i = 0; i < toAdd; i++) list.push(`&nbsp;`);
  let html = numbered ? `<ol>` : `<ul>`;
  html += list.map(txt => `<li>${txt}</li>`).join(`\n`);
  html += numbered ? `</ol>` : `</ul>`;

  const el = document.getElementById(`cs-data`);
  if (el) el.innerHTML = html;

  updateState({ lastListCount: max });
};

/**
 * Display text in the status line
 * @param {string} msg 
 */
export const status = (msg) => {
  const el = document.getElementById(`cs-lblStatus`);
  if (el) el.innerText = msg;
};

/**
 * Draws centered text (assuming canvas has been offset already)
 * @param {string} msg 
 * @param {CanvasRenderingContext2D} ctx 
 * @param {number} offsetX 
 * @param {number} offsetY 
 * @returns 
 */
export const drawCenteredText = (ctx, msg, offsetX, offsetY) => {
  const x = offsetX ?? 0;
  const y = offsetY ?? 0;
  const txt = ctx.measureText(msg);
  ctx.fillText(msg,
    -txt.width / 2 + x,
    -txt.fontBoundingBoxDescent + txt.fontBoundingBoxAscent / 2 + y);
  return txt;
};

/**
 * Draws a dot
 * @param {CanvasRenderingContext2D} ctx 
 * @param {number} x 
 * @param {number} y 
 * @param {number} radius Radius for dot
 * @param {boolean} fill If true, dot is filled-in
 * @param {boolean} stroke If true, dot outline is drawn
 */
export const drawDot = (ctx, x, y, radius = -1, fill = true, stroke = false) => {
  if (radius === -1) radius = settings.defaultDotRadius;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
  ctx.closePath();
};

/**
 * Draw a set of {x,y} pairs as a connected line.
 * Skips undefined points.
 * @param {CanvasRenderingContext2D} ctx 
 * @param  {...{x:number,y:number}|undefined} pts 
 */
export const drawLine = (ctx, ...pts) => {
  let drawn = 0;
  for (let i = 0; i < pts.length; i++) {
    const pt = pts[i];
    if (pt === undefined) continue;
    if (drawn === 0) {
      ctx.moveTo(pt.x, pt.y);
    } else {
      ctx.lineTo(pt.x, pt.y);
    }
    drawn++;
  }
  if (drawn > 1) ctx.stroke();
};

export const setCssFlag = (flagValue, cssFilter, cssTrueClass) => {
  document.querySelectorAll(cssFilter).forEach(el => {
    if (flagValue) {
      el.classList.add(cssTrueClass);
    } else {
      el.classList.remove(cssTrueClass);
    }
  });
};

export const setReady = (ready) => {
  const btnCameraStart = document.getElementById(`cs-btnCameraStart`);
  setCssFlag(ready, `.needs-ready`, `ready`);
  if (btnCameraStart)  /** @type {HTMLButtonElement}*/(btnCameraStart).disabled = false;
};

export const clearRecordings = () => {
  localStorage.setItem(`recordings`, JSON.stringify([]));
  updateRecordingsUi(getRecordings());
};

/**
 * Gets a localStorage-persisted recording of pose data
 * @returns {Recording[]}
 */
const getRecordings = () => {
  const recordingsStr = localStorage.getItem(`recordings`);
  const recordings = recordingsStr === null ? [] : JSON.parse(recordingsStr);
  return recordings;
};

/**
 * Updates the recordings SELECT element based on localStorage
 * @param {Recording[]} recordings 
 * @returns 
 */
const updateRecordingsUi = (recordings) => {
  // Update select
  const el = document.getElementById(`cs-selRecording`);
  if (el === null) return;
  el.innerHTML = ``;
  recordings.forEach(r => {
    const opt = document.createElement(`option`);
    opt.setAttribute(`data-name`, r.name);
    opt.innerText = `${r.name} (${r.data.length})`;
    el.append(opt);
  });

  // Select most recent
  /** @type {HTMLSelectElement} */(el).selectedIndex = recordings.length - 1;

  // Disable if there are no recordings
  const btnPlay = document.getElementById(`cs-btnPlayback`);
  if (btnPlay) /** @type {HTMLButtonElement} */(btnPlay).disabled = recordings.length === 0;
  /** @type {HTMLSelectElement} */(el).disabled = recordings.length === 0;
};

export const startRecorderPlayback = async () => {
  const el = document.getElementById(`cs-selRecording`);
  if (el === null) return;

  const name = /** @type {HTMLSelectElement} */(el).selectedOptions[0].getAttribute(`data-name`);

  const rec = getRecordings().find(r => r.name === name);
  if (rec === undefined) {
    alert(`Recording '${name}' not found.`);
    return;
  }

  const onPlayback = caller.onPlayback;
  if (onPlayback === undefined) {
    console.log(`No onPlayback handler. Aborting`);
    return;
  }

  updateState({ currentSource:`recording` });

  // Stop camera
  await setCamera(false);

  const btn = document.getElementById(`cs-btnPlayback`);
  if (btn !== null) btn.innerText = `stop`;
  /** @type {HTMLButtonElement}*/(document.getElementById(`cs-btnRecord`)).disabled = true;

  // Set canvas
  const canvasEl = /** @type HTMLCanvasElement|null */(document.getElementById(`dataCanvas`));
  if (canvasEl) {
    canvasEl.width = rec.frameSize.width;
    canvasEl.height = rec.frameSize.height;
  }

  const ctx = getDrawingContext();
  const frameSize = rec.frameSize;
  let index = 0;
  updateState({ recorder:`playing` });
  
  continuously(() => {
    const d = rec.data[index];
    recorderStatus(`${index + 1}/${rec.data.length}`);
    onPlayback(d, index, rec);
    if (ctx) postCaptureDraw(ctx.ctx, ctx.width, ctx.height);
    index++;
    if (index + 1 === rec.data.length || state.recorder !== `playing`) {
      console.log(`Playback done of ${rec.data.length} steps.`);
      recorderStatus(``);
      stopRecorderPlayback();
      updateState({ currentSource:`none` });
      return false; // Stop loop
    }
  }, caller.playbackRateMs).start();
};

const stopRecorderPlayback = () => {
  updateState({ recorder: `` });
  let btn = document.getElementById(`cs-btnPlayback`);
  if (btn !== null) btn.innerText = `play_arrow`;

  /** @type {HTMLButtonElement}*/(document.getElementById(`cs-btnRecord`)).disabled = false;

};

/**
 * Returns the drawing context and dimensions for the image capturer.
 * {ctx, width, height}
 * @returns {{width:number,height:number,ctx:CanvasRenderingContext2D}|undefined}
 */
export const getDrawingContext = () => {
  const canvasEl = /** @type HTMLCanvasElement|null */(document.getElementById(`dataCanvas`));

  //caller.frameProcessor?.getCapturer()?.canvasEl;
  if (!canvasEl) {
    console.log(`Warning, drawing canvas not found`);
    return;
  }
  const ctx = canvasEl.getContext(`2d`);
  if (ctx === null) return;
  return {
    width: canvasEl.width,
    height: canvasEl.height,
    ctx: ctx
  };
};

const stopRecording = async () => {
  if (state.recorder !== `recording`) return;
  updateState({ recorder: `` });
  /** @type {HTMLButtonElement}*/(document.getElementById(`cs-btnPlayback`)).disabled = false;

  recorderStatus(``);

  const rec = state.currentRecording;
  if (rec === undefined || rec.data.length === 0) return;

  const name = prompt(`Recording name (${rec.data.length} steps)`, rec.name);
  if (name === null) return; // cancelled
  rec.name = name;

  const recordings = getRecordings();
  recordings.push(rec);

  localStorage.setItem(`recordings`, JSON.stringify(recordings));
  updateRecordingsUi(recordings);
  updateState({ currentRecording: undefined });
};

const startRecording = async () => {
  if (state.recorder === `recording`) {
    await stopRecording();
  }
  recorderStatus(`Ready...`);
  updateState({ currentRecording: {
    name: new Date().toLocaleString(),
    data: [],
    frameSize: { width: 0, height: 0 }
  },
  recorder: `recording` });
  /** @type {HTMLButtonElement}*/(document.getElementById(`cs-btnPlayback`)).disabled = true;
};

const recorderStatus = (msg) => {
  const el = document.getElementById(`lblRecorderStatus`);
  if (el === null) return;
  el.innerText = msg;
};

export const onRecordData = (data, frameSize) => {
  if (state.recorder !== `recording`) return;
  settings.recordThrottle(data, frameSize);
};

const recordDataImpl = (data, frameSize) => {
  const rec = state.currentRecording;
  if (rec === undefined) return;
  rec.data.push(data);
  rec.frameSize = frameSize;
  recorderStatus(rec.data.length);
};

const addUi = () => {
  const html = `
  <link href="https://fonts.googleapis.com/css2?family=Material+Icons" rel="stylesheet" />
  <div class="cs-ui">
  <div id="cs-lblStatus">Loading...</div>
  <div id="cs-controls" class="needs-ready">
    <div>
      <h2>Camera</h2>
      <select title="Which camera source" id="cs-selCamera">
        <option>front</option>
        <option>back</option>
      </select>
      <button style="color:yellow" title="Play/stop camera" class="material-icons" id="cs-btnCameraStartStop">check_circle</button> 
    </div>
    <div class="needs-stream">
      <h2>Display</h2>
      <label><input title="Show data" id="cs-chkDataShow" checked type="checkbox"> Data </label>
      <label><input title="Show source" id="cs-chkSourceShow" checked type="checkbox"> Source </label>
      <button title="Freeze display" class="material-icons" id="cs-btnFreeze">ac_unit</button>
    </div>
    <div>
      <h2>Record</h2>
      <select id="cs-selRecording">
      </select>    
      <button title="Play back selected recording" class="material-icons" id="cs-btnPlayback">play_arrow</button>
      <button title="Make a new recording" class="material-icons" id="cs-btnRecord">fiber_manual_record</button>
      <div id="lblRecorderStatus"></div>
    </div>
  </div>
</div>
<div id="canvasContainer">
  <canvas id="dataCanvas">
</div>
<div id="cs-data"></div>
`;
  document.body.insertAdjacentHTML(`beforeend`, html);

  const css = `
  <style>
  .material-icons { 
    color: rgba(255, 255, 255, 1); 
    background: none;
    border: none;
    padding: 0.3em;
    border-radius: 0.1em;
  }
  .material-icons[disabled] {
    opacity: 0.2;
  }
  .material-icons:hover:not([disabled]) {
    background-color: hsl(var(--hue), 10%, 50%);
  }
  .cs-ui {
    user-select: none;
    padding-bottom: 0.1em;
  }
  .cs-ui>div {
    margin-bottom: 1em;
  }
  .needs-ready:not(.ready) {
    display: none !important;
  }

  .needs-stream:not(.streaming) {
    display: none !important;
  }
  #cs-data {
    position: fixed;
    bottom: 0;
    font-family: var(--mono-font);
    padding: 1em;
    min-width: 6em;
  }

  #cs-controls {
    display: flex;
    gap: 0.3em;
    flex-direction: row;
    flex-wrap: wrap;
  }

  #cs-controls h2 {
    text-transform: uppercase;
    font-size: 0.6em;
    letter-spacing: 0.05em;
    display: inline-block;
    width: 5em;
  }

  #cs-controls>div {
    padding: 0.3em;
    border: 2px solid rgba(255,255,255,0.1);
    border-radius: 3px;
    display: flex;
    align-items: center;
  }

  #cs-selCamera,#cs-selRecording {
    max-width: 4em;
  }

  .https://unpkg.com/ixfx/dist-capture {
    position: fixed;
    top: 0;
    left: 0;
    z-index: -1;
    max-width: 100vw;
    max-height: 100vh;
  }
  #canvasContainer {
    position: absolute;
    width: 100%;
    height: 100%;
    top: 0;
    left: 0;
    z-index: -1;
    display:flex;
  }
  #canvasContainer>canvas {
  }
  </style>
  `;
  document.body.insertAdjacentHTML(`beforeend`, css);
};

/**
 * Called after a frame is captured from the video source.
 * This allows us to draw on top of the frame after it has been analysed.
 * @param {CanvasRenderingContext2D} ctx 
 * @param {number} width 
 * @param {number} height 
 */
function postCaptureDraw(ctx, width, height) {
  const { videoOpacity } = settings;
  if (state.displaySource && state.currentSource === `camera`) {
    // Clear canvas with some translucent white to fade out video
    ctx.fillStyle = `rgba(255,255,255,${videoOpacity})`;
  } else {
    // Clear canvas completely white
    ctx.fillStyle = `rgb(255,255,255)`;
  }
  ctx.fillRect(0, 0, width, height);

  if (state.displayData) {
    caller.postCaptureDraw(ctx, width, height);
  }
}

/**
 * Shows or hides the UI.
 * If no parameter is provided, state is toggled, otherwise `enabled` flag is used
 * @param {boolean} [enabled] 
 * @returns 
 */
export const toggleUi = (enabled) => {
  if (enabled === undefined) {
    enabled = !state.uiVisible;
  }

  const uiElements = document.querySelectorAll(`.cs-ui`);
  uiElements.forEach(uiEl => {
    /** @type {HTMLElement} */(uiEl).style.display = enabled ? `block` : `none`;
  });
  updateState({ uiVisible:enabled });
  return enabled;
};

/**
 * Set up
 * @param {OnFrame} onFrame Callback when a frame is ready for processing
 * @param {OnPlayback} onPlayback Callback for when there is a playback data set
 * @param {FrameProcessorOpts} frameProcessorOpts Options for the frame processor
 * @param {number} playbackRateMs Delay between each frame of recorded data playback
 */
export const setup = async (onFrame, onPlayback, frameProcessorOpts, playbackRateMs) => {
  addUi();

  const btnCameraStartStop = document.getElementById(`cs-btnCameraStartStop`);
  const btnRecord = document.getElementById(`cs-btnRecord`);
  const btnPlayback = document.getElementById(`cs-btnPlayback`);
  const btnFreeze = document.getElementById(`cs-btnFreeze`);
  const chkSourceShow = document.getElementById(`cs-chkSourceShow`);
  const chkDataShow = document.getElementById(`cs-chkDataShow`);
  const selCamera = document.getElementById(`cs-selCamera`);

  const dataEl = document.getElementById(`cs-data`);

  const captureCanvasEl = document.getElementById(`dataCanvas`);
  if (!captureCanvasEl) throw new Error(`Capture canvas null`);

  if (!(`mediaDevices` in navigator)) {
    console.warn(`navigator.mediaDevices is missing -- are you running over https:// or http://127.0.01 ?`);
  }

  const devices = await navigator.mediaDevices.enumerateDevices();
  for (const d of devices) {
    if (d.kind !== `videoinput`) continue;
    const opt = document.createElement(`option`);
    opt.setAttribute(`data-id`, d.deviceId);
    opt.innerText = d.label;
    selCamera?.append(opt);
  }

  caller.onFrame = onFrame;
  caller.onPlayback = onPlayback;
  if (playbackRateMs) caller.playbackRateMs = playbackRateMs;

  // Override default settings with what has been provided
  if (frameProcessorOpts.cameraConstraints) {
    let cc = { ...caller.frameProcessorOpts.cameraConstraints, ...frameProcessorOpts.cameraConstraints };

    // @ts-ignore
    if (cc.facingMode === `back`) cc.facingMode = `environment`;
    // @ts-ignore
    if (cc.facingMode === `front`) cc.facingMode = `user`;

    if (selCamera) {
      if (cc.facingMode === `environment`) {
        /** @type {HTMLSelectElement} */(selCamera).selectedIndex = 1;
      } else if (cc.facingMode === `user`) {
        /** @type {HTMLSelectElement} */(selCamera).selectedIndex = 0;
      }
      if (cc.deviceId) {
        // Find & select option by id
        const opt = selCamera.querySelector(`[data-id="${cc.deviceId}"]`);
        /** @type {HTMLOptionElement} */(opt).selected = true;
      }
    }
    caller.frameProcessorOpts.cameraConstraints = cc;
  } else {
    // use existing
    frameProcessorOpts.cameraConstraints = caller.frameProcessorOpts.cameraConstraints;
  }

  if (frameProcessorOpts !== undefined) {
    caller.frameProcessorOpts = frameProcessorOpts;
  }

  // Intercept drawing
  caller.postCaptureDraw = frameProcessorOpts.postCaptureDraw;
  frameProcessorOpts.postCaptureDraw = postCaptureDraw;
  // @ts-ignore
  frameProcessorOpts.captureCanvasEl = /* @type HTMLCanvasElement */(captureCanvasEl);
  
  setReady(false);
  defaultErrorHandler();
  status(`Loading...`);

  btnFreeze?.addEventListener(`click`, evt => {
    updateState({ freeze: !state.freeze });
    const el = evt?.target;
    if (el) /** @type {HTMLElement}*/(el).innerText = state.freeze ? `severe_cold` : `ac_unit`;
  });

  btnCameraStartStop?.addEventListener(`click`, async () => {
    const start = settings.loop.isDone;
    if (state.currentSource !== `camera` && start) updateState({ currentSource: `camera` });
    else if (!start && state.currentSource === `camera`) updateState({ currentSource:`none` });
    setCamera(start);
  });

  chkSourceShow?.addEventListener(`change`, () => {
    updateState({ displaySource: !state.displaySource });

    // If both are off, hide canvas entirely
    const showCanvas = state.displaySource || state.displayData;
    caller.frameProcessor?.showCanvas(showCanvas);
  });

  chkDataShow?.addEventListener(`change`, () => {
    updateState({ displayData: /** @type {HTMLInputElement} */(chkDataShow).checked });
    if (dataEl) dataEl.style.display = state.displayData ? `block` : `none`;
  });

  selCamera?.addEventListener(`change`, () => {
    const v = /** @type {HTMLSelectElement} */(selCamera).value;
    const cc = caller.frameProcessorOpts.cameraConstraints;

    if (v === `back`) {
      cc.facingMode = `environment`;
      cc.deviceId = undefined;
    }
    else if (v === `front`) {
      cc.facingMode = `user`;
      cc.deviceId = undefined;
    } else {
      const opts = /** @type {HTMLSelectElement} */(selCamera).selectedOptions;
      const opt = opts.item(0);
      if (opt !== null) {
        cc.facingMode = undefined;
        // @ts-ignore
        cc.deviceId = opt.getAttribute(`data-id`);
      } else {
        console.warn(`Weirdness, no item selected`);
      }
    }
    caller.frameProcessorOpts.cameraConstraints = cc;
  });

  btnRecord?.addEventListener(`click`, () => {
    if (state.recorder === `playing`) stopRecorderPlayback();

    if (state.recorder === `recording`) {
      btnRecord.innerText = `fiber_manual_record`;
      stopRecording();
    } else if (state.recorder === ``) {
      btnRecord.innerText = `stop_circle`;
      startRecording();
    }
  });

  btnPlayback?.addEventListener(`click`, async () => {
    if (state.recorder === `recording`) await stopRecording();
    if (state.recorder === `playing`) {
      stopRecorderPlayback();
      return;
    }
    startRecorderPlayback();
  });

  updateRecordingsUi(getRecordings());
};

const onStreamStarted = () => {
  
  // Update UI
  if (state.currentSource === `camera`) {
    const btnCameraStartStop = document.getElementById(`cs-btnCameraStartStop`);
    if (btnCameraStartStop) btnCameraStartStop.innerText = `stop_circle`;
  }

  setCssFlag(true, `.needs-stream`, `streaming`);
};

const onStreamStopped = () => {
  const dataEl = document.getElementById(`cs-data`);
  const btnCameraStartStop = document.getElementById(`cs-btnCameraStartStop`);
  const selCamera = document.getElementById(`cs-selCamera`);
  // Update UI
  if (dataEl) dataEl.innerHTML = ``;
  if (btnCameraStartStop) btnCameraStartStop.innerText = `check_circle`;
  /** @type {HTMLSelectElement}*/(selCamera).disabled = false;
  setCssFlag(false, `.needs-stream`, `streaming`);
};

/**
 * Start/stop camera
 * @param {*} start 
 */
const setCamera = async (start) => {
  const dataEl = document.getElementById(`cs-data`);
  const btnCameraStartStop = document.getElementById(`cs-btnCameraStartStop`);
  const selCamera = document.getElementById(`cs-selCamera`);

  if (start) {
    /** @type {HTMLButtonElement}*/(btnCameraStartStop).disabled = true;
    try {
      // Start
      /** @type {HTMLSelectElement}*/(selCamera).disabled = true;
    
      // Set up frame processor
      caller.frameProcessor = new FrameProcessor(caller.frameProcessorOpts);
      await caller.frameProcessor.useCamera();
    
      // Start loop to pull frames from camera
      settings.loop.start();

    } finally {
      /** @type {HTMLButtonElement}*/(btnCameraStartStop).disabled = false;
    }
  } else {
    // Stop loop and dispose of frame processor
    settings.loop.cancel();
    caller.frameProcessor?.dispose();
    caller.frameProcessor = undefined;    
  }
};

/**
 * Enable or disable footer text display
 * @param {boolean} v 
 */
export const enableTextDisplayResults = (v) => {
  updateState({ enableTextResults: v });
};

/**
 * Update state
 * @param {Partial<state>} s 
 */
function updateState (s) {
  const source = state.currentSource;
  state = Object.freeze({
    ...state,
    ...s
  });

  const someSource = (state.currentSource !== `none`);
  

  if (source === `none` && someSource) onStreamStarted();
  else if (source !== `none` && !someSource) onStreamStopped();
}

// https://github.com/tensorflow/tfjs-models/blob/676a0aa26f89c9864d73f4c7389ac7ec61e1b8a8/pose-detection/src/types.ts
/**
 * @typedef Keypoint
 * @type {object}
 * @property {number} x
 * @property {number} y
 * @property {number} [z]
 * @property {number} [score]
 * @property {string} [name]
 */

/**
 * @typedef Box
 * @type {object}
 * @property {number} width
 * @property {number} height
 * @property {number} xMax
 * @property {number} xMin
 * @property {number} yMax
 * @property {number} yMin
 */

/**
 * @typedef Pose
 * @type {object}
 * @property {Keypoint[]} keypoints
 * @property {number} [score]
 * @property {Box} [box]
 * @property {string} [id]
 */

/**
 * @typedef FaceKeypoint
 * @property {'rightEye'|'leftEye'|'noseTip'|'mouthCenter'|'rightEarTragion'|'leftEarTragion'} name
 * @property {number} x
 * @property {number} y
 */

/**
 * @typedef Face
 * @type {object}
 * @property {FaceKeypoint[]} keypoints
 * @property {number} [score]
 * @property {Box} [box]
 */

/**
 * @typedef BlazePoseModelConfig
 * @type {object}
 * @property {boolean} [enableSmoothing]
 * @property {string} runtime 'mediapipe' or 'tfjs'
 * @property {string} [modelType] 'lite', 'full' or 'heavy'
 */

// https://github.com/tensorflow/tfjs-models/blob/master/pose-detection/src/movenet/types.ts
/**
 * @typedef MoveNetModelConfig
 * @type {object}
 * @property {boolean} [enableSmoothing]
 * @property {string} [modelType] 'SinglePose.Lightning', 'SinglePose.Thunder' or 'MultiPose.Lightning'
 * @property {string} [modelUrl]
 * @property {number} [minPoseScore]
 * @property {number} [multiPoseMaxDimension]
 * @property {boolean} [enableTracking]
 * @property {string} [trackerType] 'keypoint' or 'boundingbox' (default)
 * @property {object} [trackerConfig] See TrackerConfig https://github.com/tensorflow/tfjs-models/blob/master/pose-detection/src/calculators/interfaces/config_interfaces.ts
 */

/**
 * @typedef PoseNetEstimateConfig
 * @type {object}
 * @property {boolean} [flipHorizontal]
 * @property {number} [scoreThreshold]
 * @property {number} [nmsRadius]
 * @property {number} [maxPoses]
 */

/**
 * @typedef FrameProcessorOpts
 * @type {object}
 * @property {HTMLCanvasElement} [captureCanvasEl] Element to capture frames to
 * @property {CameraConstraints} cameraConstraints
 * @property {boolean} [showCanvas] If true, the CANVAS element images are grabbed to is shown. (default: false)
 * @property {boolean} [showPreview] If true, the source element is shown (for a camera this is a VIDEO element).
 * @property {postCaptureDrawCallback} [postCaptureDraw] If set, this function is run after capturing, allowing for drawing on top of capture
*/

/**
 * @callback postCaptureDrawCallback
 * @param {CanvasRenderingContext2D} ctx Drawing canvas
 * @param {number} width Width of canvas
 * @param {number} height Height of canvas
 */

/**
 * @callback ListProducer
 * @return {string[]} list
 */
/**
 * @callback HtmlProducer
 * @return {string} html
 */
/**
 * @callback OnFrame
 * @param {ImageData} frame
 * @param {{width:number,height:number}} frameSize
 * @param {number} timestamp
 * @returns {Promise<void>}
 */

/**
 * @callback OnPlayback
 * @param {Face[]|Pose[]|ObjectPrediction[]} frame
 * @param {number} index
 * @param {Recording} rec
 * @returns void
 */

/**
 * @typedef PoseDetector
 * @type {object}
 * @property {PoseDetectorEstimatePoses} estimatePoses
 */

/**
 * @typedef PoseDetectorEstimatePoses
 * @type {function}
 * @param {ImageData} frame
 * @param {any} options
 * @param {number} timestamp
 */

/**
 * @typedef {object} PoseDetectionLib
 * @property {createDetector} createDetector
 */

/**
 * @callback createDetector
 * @param {string} model
 * @param {any} args
 * @returns {PoseDetector}
 */

/**
 * @typedef FaceDetectorEstimateFaces
 * @type {function}
 * @param {ImageData} frame
 * @param {any} options
 * @param {number} timestamp
 */


/**
 * @typedef {object} FaceDetectionLib
 * @property {createFaceDetector} createDetector
 */

/**
 * @typedef FaceDetector
 * @type {object}
 * @property {FaceDetectorEstimateFaces} estimateFaces
 */

/**
 * @typedef FaceDetectorOpts
 * @property {string} runtime
 */
/**
 * @callback createFaceDetector
 * @param {string} model
 * @param {any} args
 * @returns {FaceDetector}
 */

/**
 * @typedef CameraConstraints
 * @type {object}
 * @property {('user'|'environment')} [facingMode]
 * @property {{width:number,height:number}} [min]
 * @property {{width:number,height:number}} [max]
 * @property {{width:number,height:number}} [ideal]
 * @property {string} [deviceId]
 */

/**
 * @typedef Recording
 * @type {object}
 * @property {string} name
 * @property {Pose[][]} data
 * @property {{width:number,height:number}} frameSize
 */



// Ported from the https://github.com/tensorflow/tfjs-models/blob/master/coco-ssd/src/index.ts
/**
 * @typedef {object} ObjectPrediction
 * @property {readonly [x:number, y:number, width:number, height:number]} bbox
 * @property {string} class
 * @property {number} score
 */


/**
 * Detect objects for an image returning a list of bounding boxes with
 * assocated class and score.
 * @callback ObjectDetectorDetect
 * @param {ImageData|HTMLImageElement|HTMLCanvasElement|HTMLVideoElement} img
 * @param {number} [maxNumBoxes] The maximum number of bounding boxes of detected objects. There can be multiple objects of the same class, but at different ocations. Defaults to 20.
 * @param {number} [minScore] The minimum score of the returned bounding boxes of detected objects. Value between 0 and 1. Defaults to 0.5.
 * @returns {ObjectPrediction[]}
 */

/**
 * @typedef {object} ObjectDetector
 * @property {ObjectDetectorDetect} detect
 */