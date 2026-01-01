import { HashMap } from "effect";
import { InputState } from "../model";

export const CONTROLS = {
  // Player 1
  0: {
    up: ["ArrowUp"],
    down: ["ArrowDown"],
    left: ["ArrowLeft"],
    right: ["ArrowRight"],
    bomb: ["Enter"] 
  },
  // Player 2
  1: {
    up: ["w", "W"],
    down: ["s", "S"],
    left: ["a", "A"],
    right: ["d", "D"],
    bomb: ["x", "X", "e", "E"] 
  }
};

export const KEY_TIME_LIMIT = 15;

export const isHeld = (inputState: InputState, keys: string[]): boolean => {
  return keys.some((k) => HashMap.has(inputState, k));
};