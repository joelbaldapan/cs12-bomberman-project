import {
  BotInternalState,
  BotMemory,
  BotBehavior,
  WanderState,
  EscapeState,
  GetPowerupState,
  AttackState,
  HostileBot,
  CarefulBot,
  GreedyBot,
  Model,
  World,
  Player,
  GridCoords,
  Direction,
  Bomb,
  Explosion,
  BotType,
  BombOnlyDangerPolicy,
  AttackPolicy2,
  PowerupPolicy2,
  ExplosionPredictionDangerPolicy,
  AttackPolicy1,
  PowerupPolicy1,
  BotUpdateResult,
  BotConfig,
  IdleAction,
  Entity,
} from "../model";
import { Schema as S, HashSet, Match, Option } from "effect";

// FACTORY AND INIT
export const createBotConfig = (botType: BotType): BotConfig => {
  return Match.value(botType).pipe(
    Match.tag("Hostile Bot", (bot) => ({
      botType: bot,
      reevalInterval: 0.5,
      reevalChance: 0.25,
      dangerRadius: 0,
      dangerPolicy: BombOnlyDangerPolicy.make({}),
      attackPolicy: AttackPolicy2.make({}),
      attackRangeTrigger: 2,
      attackSearchRadius: 0,
      powerupPolicy: PowerupPolicy2.make({}),
      powerupChance: 0.2,
    })),

    Match.tag("Careful Bot", (bot) => ({
      botType: bot,
      reevalInterval: 0.25,
      reevalChance: 1.0,
      dangerRadius: 4,
      dangerPolicy: ExplosionPredictionDangerPolicy.make({}),
      attackPolicy: AttackPolicy1.make({ maxDistance: 3 }),
      attackRangeTrigger: 4,
      attackSearchRadius: 3,
      powerupPolicy: PowerupPolicy2.make({}),
      powerupChance: 1.0,
    })),

    Match.tag("Greedy Bot", (bot) => ({
      botType: bot,
      reevalInterval: 1.0,
      reevalChance: 1.0,
      dangerRadius: 2,
      dangerPolicy: ExplosionPredictionDangerPolicy.make({}),
      attackPolicy: AttackPolicy1.make({ maxDistance: 6 }),
      attackRangeTrigger: 3,
      attackSearchRadius: 6,
      powerupPolicy: PowerupPolicy1.make({}),
      powerupChance: 1.0,
    })),

    Match.exhaustive
  );
}