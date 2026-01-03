import {
  GameConfig,
  BotType,
  HostileBot,
  CarefulBot,
  GreedyBot,
} from "../model";
import { Schema as S , Array} from "effect";

export class SettingsError extends Error {
  readonly _tag = "SettingsError";
  constructor(message: string) {
    super(message);
    this.name = "SettingsError";
  }
}

const SettingsSchema = S.Struct({
  soft_block_spawn_chance: S.Int,
  powerup_spawn_chance: S.Int,
  timer_seconds: S.Int,
  num_human_players: S.Int,
  bot_types: S.Array(S.String),
  rounds_to_win: S.Int,
});

const mapStringToBotType = (typeStr: string): BotType => {
  switch (typeStr) {
    case "hostile":
      return HostileBot.make({});
    case "careful":
      return CarefulBot.make({});
    case "greedy":
      return GreedyBot.make({});
    default:
      throw new SettingsError(
        `Invalid bot type '${typeStr}'. Allowed: hostile, careful, greedy`
      );
  }
};

export const parseGameConfig = (raw: unknown): GameConfig => {
  let data;
  try {
    data = S.decodeUnknownSync(SettingsSchema)(raw);
  } catch (error: any) {
    throw new SettingsError(`Invalid JSON structure: ${error.message}`);
  }

  const soft = data.soft_block_spawn_chance;
  const power = data.powerup_spawn_chance;
  const timer = data.timer_seconds;
  const humans = data.num_human_players;
  const botStrs = data.bot_types;
  const rounds = data.rounds_to_win;

  if (soft < 0 || soft > 100) {
    throw new SettingsError("soft_block_spawn_chance must be in [0, 100].");
  }
  if (power < 0 || power > 100) {
    throw new SettingsError("powerup_spawn_chance must be in [0, 100].");
  }
  if (timer < 30 || timer > 600) {
    throw new SettingsError("timer_seconds must be in [30, 600].");
  }
  if (humans !== 1 && humans !== 2) {
    throw new SettingsError("num_human_players must be 1 or 2.");
  }
  if (rounds < 1 || rounds > 4) {
    throw new SettingsError("rounds_to_win must be in [1, 4].");
  }

  const maxBots = 4 - humans;
  if (botStrs.length > maxBots) {
    throw new SettingsError(
      `Too many bots defined. Max for ${humans} human(s) is ${maxBots}.`
    );
  }
  if (humans === 1 && botStrs.length === 0) {
    throw new SettingsError(
      "If num_human_players is 1, bot_types must have at least one entry."
    );
  }

  const finalBotTypes = Array.map(botStrs as readonly string[],mapStringToBotType);

  return GameConfig.make({
    softBlockSpawnChance: soft,
    powerupSpawnChance: power,
    timerSeconds: timer,
    numHumanPlayers: humans,
    botTypes: finalBotTypes,
    roundsToWin: rounds,
  });
};

export const loadGameConfig = async (path: string): Promise<GameConfig> => {
  try {
    const res = await fetch(path);
    if (!res.ok) {
      throw new SettingsError(`Failed to load settings from ${path}: ${res.statusText}`);
    }
    
    const raw = await res.json();
    return parseGameConfig(raw);
    
  } catch (e: any) {
    if (e instanceof SettingsError) {
      throw e;
    }
    throw new SettingsError(String(e));
  }
};