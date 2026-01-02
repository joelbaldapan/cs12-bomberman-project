import { HashMap, HashSet } from "effect";
import { InputState } from "../model";

type PlayerControlScheme = {
  up: string[];
  down: string[];
  left: string[];
  right: string[];
  bomb: string[];
};

export const CONTROLS: Record<number, PlayerControlScheme> = {
  // Player 1
  0: {
    up: ["ArrowUp"],
    down: ["ArrowDown"],
    left: ["ArrowLeft"],
    right: ["ArrowRight"],
    bomb: [" "] 
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

export const isHeld = (inputState: InputState, keys: string[]): boolean => {
  // HashSet.has returns true if the key exists
  return keys.some((k) => HashSet.has(inputState, k));
};