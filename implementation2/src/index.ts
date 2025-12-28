import { startModelCmd } from "cs12251-mvu/src";
import { initModel } from "./model";
import { update } from "./update";
import { view } from "./view";

const root = document.getElementById("app")!;

startModelCmd(root, initModel, update, view);
