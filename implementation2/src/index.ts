import { startModelCmd } from "cs12251-mvu/src";
import { GameConfig, initModel } from "./model";
import { update } from "./update";
import { view } from "./view";

const root = document.getElementById("app")!;

const ROWS = 13
const COLS = 15
const FPS = 60
const TEMP_CONFIG: GameConfig = GameConfig.make({
  softBlockSpawnChance: 0.7,
  powerupSpawnChance: 0.3,
  timerSeconds: 180,
  numHumanPlayers: 2,
  botTypes: [],
  roundsToWin: 3,
});

const _initModel = initModel(ROWS,COLS,FPS, TEMP_CONFIG)
console.log("running rn dawg")

startModelCmd(root, _initModel, update, view);
