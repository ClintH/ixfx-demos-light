// #region Imports
// @ts-ignore
import { Remote } from "https://unpkg.com/@clinth/remote@latest/dist/index.mjs";
import * as Dom from 'https://unpkg.com/ixfx/dist/dom.js';
import { Correlate } from 'https://unpkg.com/ixfx/dist/data.js';
import { Points } from 'https://unpkg.com/ixfx/dist/geometry.js';
import { Sync as IterableSync } from 'https://unpkg.com/ixfx/dist/generators.js';
import * as CommonPose from '../common-pose.js';
import { PosesManager } from '../pose-manager.js';

// #endregion

// #region Settings & state
const settings = Object.freeze({
  poses: new PosesManager({
    processor: {
      // Interpolation amount applied per frame (0...1)
      //  Lower = less jitter & more latency. 
      //  Higher = more jitter & lower latency
      smoothingAmt: 0.1,
      sanityChecks: {
        anklesBelowKnees: true,
        kneesBelowHip: true,
        shouldersBelowFace: true,
        hipBelowShoulders: true,
        scoreThreshold: 0.6
      }
    }
  }),
  // If true, x-axis is flipped
  horizontalMirror: true,
  remote: new Remote(),
  // How often to do calculations based on pose data
  tickRateMs: 100
});

let state = Object.freeze({
  /** Bounds of the viewport */
  bounds: { width: 0, height: 0, center: { x: 0, y: 0 } },
  /** @type {number} */
  egDensity: 0
});
// #endregion

/**
 * Tick is the place to use pose data in state
 * and derive some new things to stuff into state.
 * 
 * It loops at the interval settings.tickRateMs
 */
const tick = () => {
  const { poses } = settings;
  
  const allPoses = Array.from(poses.iteratePoses());

  // Do something with the pose data...
  // In this example, we're averaging the distance between noses of all poses.
  // First we need to add up all the densities...
  let egDensity = 0;

  // Eg. sort poses by nose x position
  // Returns [[pose1, noseKp], [pose2, noseKp] ...]
  const sorted = /** @type {PoseByKeypoint[]} */(CommonPose.getSortedPosesByX(allPoses, `nose`));

  // Get pairwise combinations of poses
  // eg pose1 <-> pose2, pose2 <-> pose 3 ...
  const pairs = Array.from(IterableSync.chunksOverlapping(sorted, 2));

  for (const pair of pairs) {
    const aLeftHip = pair[0].left_hip;
    const bRightHip = pair[1].right_hip;

    if (aLeftHip && bRightHip) {
      const distance = Points.distance(aLeftHip, bRightHip);
      egDensity += distance;
    }
  }
  
  // Calculate average
  egDensity /= pairs.length;

  // Sanity-check
  if (Number.isNaN(egDensity)) egDensity = 0;

  // Update state
  saveState({ egDensity });
};


/**
 * Called in a loop at animation speed (see setup())
 * @returns 
 */
const useState = () => {
  // Show calculated 'density' example
  CommonPose.setText(`debug`, `
  Density: ${state.egDensity}
  `);
  
  // Draw poses
  drawState();
};

const drawState = () => {
  const { poses } = settings;
  const canvasEl = /** @type {HTMLCanvasElement|null}*/(document.getElementById(`canvas`));
  const ctx = canvasEl?.getContext(`2d`);
  if (!ctx) return;

  // Clear canvas
  clear(ctx);
  
  // Draw every pose
  for (const pose of poses.iteratePoses()) {
    drawPose(ctx, pose);
  }
};

/**
 * Draw pose
 * @param {CanvasRenderingContext2D} ctx 
 * @param {PoseByKeypoint} pose
 */
const drawPose = (ctx, pose) => {
  // Get pose in absolute coordinates
  const abs = CommonPose.absPose(pose, state.bounds, settings.horizontalMirror);
  const colour = `hsl(${pose.hue}, 50%, 50%)`; 

  // Draw pose (debugDrawPose is defined in common-pose.js)
  CommonPose.debugDrawPose(ctx, abs, {
    colour,
  });
  
  let boxMin = CommonPose.absPoint({
    x: pose.box?.xMax ?? 0,
    y: pose.box?.yMin ?? 0
  }, state.bounds, settings.horizontalMirror);

  ctx.fillStyle = colour;
  ctx.fillText(pose.id, boxMin.x, boxMin.y);
};

/**
 * Clear canvas
 * @param {CanvasRenderingContext2D} ctx 
 */
const clear = (ctx) => {
  const { width, height } = state.bounds;

  // Make background transparent
  ctx.clearRect(0, 0, width, height);

  // Clear with a colour
  //ctx.fillStyle = `orange`;
  //ctx.fillRect(0, 0, width, height);

  // Fade out previously painted pixels
  //ctx.fillStyle = `hsl(200, 100%, 50%, 0.1%)`;
  //ctx.fillRect(0, 0, width, height);
};

/**
 * Called when a pose we're tracking has disappeared
 * @param {*} evt 
 */
const onPoseLost = (evt) => {
  const { poseId, pose } = evt.detail;
  console.log(`Pose lost: ${poseId}`);
};

/**
 * Called when a new pose appears
 * @param {*} evt 
 */
const onPoseGained = (evt) => {
  const { poseId, pose } = evt.detail;
  console.log(`Pose gained: ${poseId}`);
};

const setup = async () => {
  const { remote, poses } = settings;

  poses.addEventListener(`pose-lost`, onPoseLost);
  poses.addEventListener(`pose-gained`, onPoseGained);
  
  /**
   * Data received from remote
   * @param {ReceivedData} d 
   */
  remote.onData = (d) => {
    if (d.data && Array.isArray(d.data)) {
      // Send incoming poses to PosesManager
      poses.onData(d.data, d._from);
    } else {
      console.warn(`Got data we did not expect`);
      console.log(d);
    }
  };

  // Resize canvas element to match viewport
  Dom.fullSizeCanvas(`#canvas`, args => {
    saveState({ bounds: args.bounds });
  });

  const drawLoop = () => {
    useState();
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
 * Saves state
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
 * @typedef { import("../../common-vision-source").ReceivedData } ReceivedData
 * @typedef { import("../../common-vision-source").Box } Box
 * @typedef { import("../../common-vision-source").Pose } Pose
 * @typedef { import ("../common-pose").PoseByKeypoint} PoseByKeypoint
 */
// #endregion
