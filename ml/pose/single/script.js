// #region Imports
// @ts-ignore
import { Remote } from "https://unpkg.com/@clinth/remote@latest/dist/index.mjs";
import * as Dom from 'https://unpkg.com/ixfx/dist/dom.js';
import * as CommonPose from '../common-pose.js';
// #endregion

// #region Settings & state
const settings = Object.freeze({
  horizontalMirror: true,
  remote: new Remote(),
  tickRateMs: 100,
  /** Processor of pose we're tracking
   * @type {PoseProcessor}
   */
  processor:CommonPose.poseProcessor({
    // Smoothing amount (0..1) Low numbers is more smoothing.
    smoothingAmt: 0.3,
    // If a different pose id is received, automatically reset processor,
    // rather than trying to interpolate
    autoReset: true,
    sanityChecks: {
      anklesBelowKnees: true,
      kneesBelowHip: true,
      shouldersBelowFace: true,
      hipBelowShoulders: true,
      scoreThreshold: 0.6
    }
  })
});

let state = Object.freeze({
  /** Bounds of screen */
  bounds: { width: 0, height: 0, center: { x: 0, y: 0 } },

  /** 
   * Processed first pose
   * @type {PoseByKeypoint|undefined} */
  processedPose:undefined
});
// #endregion

/**
 * Received data from a source
 * @param {Pose[]} poses 
 */
const onData = (poses) => {
  let { processor } = settings;

  // Naively choose the first pose we receive
  const pose = poses[0];

  // Process: Sanity check keypoint location, removes low confidence points and smoothes pose
  const processed = /** @type {PoseByKeypoint} */(processor.process(pose));

  saveState({ 
    processedPose: processed
  });
};

const tick = () => {
  // Gets called every 100ms.
  // A good place to slowly influence state
};

// Is called at animation speed
const drawState = () => {
  const { processedPose, bounds } = state;

  const canvasEl = /** @type {HTMLCanvasElement|null}*/(document.getElementById(`canvas`));
  const ctx = canvasEl?.getContext(`2d`);
  if (!ctx) return;

  // Clear canvas
  clear(ctx);
  
  // If there is no smoothed pose, exit out
  if (processedPose === undefined) return;

  // Convert coordinates to viewport-relative coordinates
  const abs = CommonPose.absPose(processedPose, bounds, settings.horizontalMirror);

  // Use `debugDrawPose`, defined in common-pose.js
  CommonPose.debugDrawPose(ctx, abs, { 
    pointRadius: 5
  });
};

/**
 * Clear canvas
 * @param {CanvasRenderingContext2D} ctx 
 */
function clear(ctx) {
  const { width, height } = state.bounds;

  // Make background transparent
  ctx.clearRect(0, 0, width, height);

  // Clear with a colour
  //ctx.fillStyle = `orange`;
  //ctx.fillRect(0, 0, width, height);

  // Fade out previously painted pixels
  //ctx.fillStyle = `hsl(200, 100%, 50%, 0.1%)`;
  //ctx.fillRect(0, 0, width, height);
}

const setup = async () => {
  const { remote } = settings;

  // Listen for data from the remote
  remote.onData = (d) => {
    if (d.data && Array.isArray(d.data)) {
      onData(d.data);
    } else {
      console.warn(`Got data we did not expect`);
      console.log(d);
    }
  };

  // Keep CANVAS filling the screen
  Dom.fullSizeCanvas(`#canvas`, args => {
    saveState({ bounds: args.bounds });
  });

  const drawLoop = () => {
    drawState();
    window.requestAnimationFrame(drawLoop);
  };
  window.requestAnimationFrame(drawLoop);

  setInterval(tick, settings.tickRateMs);

  // Listen for button presses, etc
  CommonPose.setup();
};
setup();

// #region Toolbox
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
 * @typedef { import("../../common-vision-source").Keypoint } Keypoint
 * @typedef { import("../../common-vision-source").Box } Box
 * @typedef { import("../../common-vision-source").Pose } Pose
 * @typedef { import ("../common-pose").PoseByKeypoint} PoseByKeypoint 
 * @typedef { import ("../common-pose").PoseProcessor} PoseProcessor 
 * 
 */
// #endregion Toolbox