import fs from "node:fs";
import path from "node:path";
import { BVHLoader } from "three/examples/jsm/loaders/BVHLoader.js";

const SELECTION = {
  walk: { file: "action_walk", fps: 30, loop: true, category: "movement" },
  jog: { file: "action_jog", fps: 30, loop: true, category: "movement" },
  run: { file: "action_run", fps: 30, loop: true, category: "movement" },
  jump: { file: "action_jump", fps: 30, loop: false, category: "movement" },
  crouch: { file: "action_crouch", fps: 15, loop: false, category: "movement" },
  pick_up: { file: "action_pickingup", fps: 15, loop: false, category: "gesture" },
  greeting: { file: "action_greeting", fps: 15, loop: false, category: "gesture" },
  greeting_wave: { file: "action_greeting1", fps: 15, loop: false, category: "gesture" },
  idle_relaxed: { file: "neutral_idle", fps: 15, loop: true, category: "idle" },
  jumping_jacks: { file: "exercise_jumping_jacks", fps: 15, loop: false, category: "movement" },
  dance: { file: "dance_1", fps: 15, loop: false, category: "movement" },
  dance_dab: { file: "dance_dab", fps: 15, loop: false, category: "movement" },
  dance_rumba: { file: "dance_rumba", fps: 15, loop: false, category: "movement" },
  dance_gangnam: { file: "dance_gangnam_style", fps: 15, loop: false, category: "movement" },
  dance_mariachi: { file: "dance_marachinostep", fps: 15, loop: false, category: "movement" },
  admiration: { file: "admiration2", fps: 15, loop: false, category: "gesture" },
  amusement: { file: "amusement", fps: 15, loop: false, category: "gesture" },
  anger: { file: "anger", fps: 15, loop: false, category: "gesture" },
  annoyance: { file: "annoyance", fps: 15, loop: false, category: "gesture" },
  approval: { file: "approval", fps: 15, loop: false, category: "gesture" },
  confusion: { file: "confusion2", fps: 15, loop: false, category: "gesture" },
  curiosity: { file: "curiosity", fps: 15, loop: false, category: "gesture" },
  disappointment: { file: "disappointment", fps: 15, loop: false, category: "gesture" },
  disapproval: { file: "disaproval1", fps: 15, loop: false, category: "gesture" },
  disgust: { file: "disgust1", fps: 15, loop: false, category: "gesture" },
  embarrassment: { file: "embarrassment", fps: 15, loop: false, category: "gesture" },
  excitement: { file: "excitement3", fps: 15, loop: false, category: "gesture" },
  fear: { file: "fear2", fps: 15, loop: false, category: "gesture" },
  gratitude: { file: "gratitude", fps: 15, loop: false, category: "gesture" },
  grief: { file: "grief", fps: 15, loop: false, category: "gesture" },
  joy: { file: "joy3", fps: 15, loop: false, category: "gesture" },
  love: { file: "love3", fps: 15, loop: false, category: "gesture" },
  nervousness: { file: "nervousness2", fps: 15, loop: false, category: "gesture" },
  optimism: { file: "optimism", fps: 15, loop: false, category: "gesture" },
  pride: { file: "pride", fps: 15, loop: false, category: "gesture" },
  realization: { file: "realization", fps: 15, loop: false, category: "gesture" },
  relief: { file: "relief", fps: 15, loop: false, category: "gesture" },
  remorse: { file: "remorse3", fps: 15, loop: false, category: "gesture" },
  sadness: { file: "sadness", fps: 15, loop: false, category: "gesture" },
  surprise: { file: "surprise", fps: 15, loop: false, category: "gesture" },
};

const SKIP_BONES = new Set(["leftEye", "rightEye", "jaw"]);
const STATIC_EPSILON = 0.01;

const round = (v) => Math.round(v * 1000) / 1000;

function convert(text, cfg) {
  const { clip, skeleton } = new BVHLoader().parse(text);
  const hips = skeleton.bones[0];
  const hipsOffsetY = hips.position.y;
  const fullTimes = clip.tracks.find((t) => t.name.endsWith(".quaternion")).times;
  const stepEvery = Math.max(1, Math.round(30 / cfg.fps));
  const keep = [];
  for (let i = 0; i < fullTimes.length; i += stepEvery) keep.push(i);
  if (keep[keep.length - 1] !== fullTimes.length - 1) keep.push(fullTimes.length - 1);
  const times = keep.map((i) => round(fullTimes[i]));
  const bones = {};
  let hipsY = null;
  for (const track of clip.tracks) {
    const match = /^(.+)\.(quaternion|position)$/.exec(track.name);
    if (!match) continue;
    const [, bone, kind] = match;
    if (kind === "position") {
      if (bone !== skeleton.bones[0].name) continue;
      hipsY = keep.map((i) => round((track.values[i * 3 + 1] - hipsOffsetY) / hipsOffsetY));
      continue;
    }
    if (SKIP_BONES.has(bone)) continue;
    const q = [];
    let moves = false;
    for (const i of keep) {
      const x = track.values[i * 4];
      const y = track.values[i * 4 + 1];
      const z = track.values[i * 4 + 2];
      const w = track.values[i * 4 + 3];
      if (Math.abs(x) + Math.abs(y) + Math.abs(z) > STATIC_EPSILON) moves = true;
      q.push(round(x), round(y), round(z), round(w));
    }
    if (moves) bones[bone] = q;
  }
  return { duration: times[times.length - 1], times, bones, hipsY };
}

const [srcDir, outDir] = process.argv.slice(2);
if (!srcDir || !outDir) {
  console.error("usage: node convertBvhAnimations.mjs <bvhDir> <outDir>");
  process.exit(1);
}
fs.mkdirSync(outDir, { recursive: true });
const manifest = [];
let total = 0;
for (const [name, cfg] of Object.entries(SELECTION)) {
  const file = path.join(srcDir, `${cfg.file}.bvh`);
  if (!fs.existsSync(file)) {
    console.error(`missing ${file}`);
    process.exitCode = 1;
    continue;
  }
  const data = convert(fs.readFileSync(file, "utf8"), cfg);
  const json = JSON.stringify({ name, ...data });
  fs.writeFileSync(path.join(outDir, `${name}.json`), json);
  total += json.length;
  manifest.push({ name, category: cfg.category, loop: cfg.loop, duration: data.duration, bones: Object.keys(data.bones).length });
}
fs.writeFileSync(path.join(outDir, "manifest.json"), JSON.stringify({ version: 1, clips: manifest }));
console.log(`${manifest.length} clips, ${(total / 1024).toFixed(0)} KB total`);
