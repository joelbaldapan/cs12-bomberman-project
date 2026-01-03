import { startModelCmd } from "cs12251-mvu/src";
import { GameConfig, initModel } from "./model";
import { update } from "./update";
import { view } from "./view";
import { loadGameConfig } from "./helpers/settings";
import { loadFonts } from "./helpers/fonts";

const root = document.getElementById("app")!;

const ROWS = 13
const COLS = 15
const FPS = 60
const SETTINGS_URL = "/settings.json";

async function main() {
  try {
    loadFonts()
    console.log("TRY");
    const config = await loadGameConfig(SETTINGS_URL);
    console.log("LOADED:", config);
    const model = initModel(ROWS, COLS, FPS, config);
    console.log("SUCCESS");

    startModelCmd(root, model, update, view);

  } catch (e) {

    console.error("ERROR:", e);
  }
}

main();