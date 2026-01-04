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

  } catch (e: any) {

    console.error("ERROR:", e);
    root.innerHTML = `
      <div style="
        display: flex; 
        flex-direction: column; 
        align-items: center; 
        justify-content: center; 
        padding-top: 50px;
        text-align: center;
      ">
        <h1 style="color: #e74c3c;">🔪Configuration Error🔪</h1>
        <p style="font-size: 1.2rem; color: #e74c3c; margin: 10px 0;">
          ${e.message}
        </p>
        <p style="opacity: 0.8; color: #e74c3c;">
          Please check <code>src/settings.json</code> and reload.
        </p>
      </div>
    `;
  }
}

main();