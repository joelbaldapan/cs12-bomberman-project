from __future__ import annotations
from common_types import EntityType, GridCoords, PlayerInfo, WorldInfo
from bot_behavior.helpers.pathfinding import follow_path_action, get_random_floor_cell, get_reachable_safe_cell
from .bot_types import Action, ActionInfo, BotState, PlayerAction, BotMemoryInfo
from .bot_policy import get_shortest_path, get_manhattan


class WanderState:
    def on_enter(self, bot: BotMemoryInfo, world: WorldInfo, entity: PlayerInfo) -> None:
        goal = get_random_floor_cell(world)
        bot.set_goal(goal)

        path = get_shortest_path(
            world, (entity.row, entity.col), goal, ignore_soft_blocks=True)
        bot.set_path(path)

    def on_tick(self, bot: BotMemoryInfo, world: WorldInfo, entity: PlayerInfo) -> BotState | None:
        if bot.goal and (entity.row, entity.col) == bot.goal:
            self.on_enter(bot, world, entity)

        if not bot.path and bot.goal != (entity.row, entity.col):
            self.on_enter(bot, world, entity)

        return None

    def decide_action(self, bot: BotMemoryInfo, world: WorldInfo, entity: PlayerInfo) -> ActionInfo | None:
        return follow_path_action(bot, world, entity, allow_bombing=True)


class EscapeState:
    def on_enter(self, bot: BotMemoryInfo, world: WorldInfo, entity: PlayerInfo) -> None:
        self._left_danger = False
        dangerous_cells = bot.config.danger_check_type.get_all_danger_zones(
            world)
        goal = get_reachable_safe_cell(world, entity, dangerous_cells)

        if goal:
            bot.set_goal(goal)
            path = get_shortest_path(
                world, (entity.row, entity.col), goal, ignore_soft_blocks=False)
            bot.set_path(path)
        else:
            bot.set_goal(None)
            bot.set_path([])

    def on_tick(self, bot: BotMemoryInfo, world: WorldInfo, entity: PlayerInfo) -> BotState | None:
        overlap_pos = entity.get_overlapping_cells()
        danger_zones = bot.config.danger_check_type.get_all_danger_zones(world)

        if not bot.path:
            self.on_enter(bot, world, entity)

        in_danger = any(p in danger_zones for p in overlap_pos)
        if not in_danger:
            self._left_danger = True
        else:
            return None

        if self._left_danger:
            if any(p in danger_zones for p in bot.path):
                self.on_enter(bot, world, entity)

        # Success check
        if bot.goal and (entity.row, entity.col) == bot.goal:
            if not bot.is_strict_movement:
                return WanderState()

        # Failure check (Trapped)
        if not bot.goal:
            return WanderState()

        return None

    def decide_action(self, bot: BotMemoryInfo, world: WorldInfo, entity: PlayerInfo) -> ActionInfo | None:
        return follow_path_action(bot, world, entity, allow_bombing=False)


class GetPowerupState:
    def __init__(self, target_goal: GridCoords):
        self._target_goal = target_goal

    def on_enter(self, bot: BotMemoryInfo, world: WorldInfo, entity: PlayerInfo) -> None:
        bot.set_goal(self._target_goal)
        path = bot.config.powerup_policy.get_path(world, entity, bot)
        bot.set_path(path)

    def on_tick(self, bot: BotMemoryInfo, world: WorldInfo, entity: PlayerInfo) -> BotState | None:
        if (entity.row, entity.col) == bot.goal:
            return WanderState()
        return None

    def decide_action(self, bot: BotMemoryInfo, world: WorldInfo, entity: PlayerInfo) -> ActionInfo | None:
        allow_bomb = bot.config.powerup_policy.can_place_bomb()
        return follow_path_action(bot, world, entity, allow_bombing=allow_bomb)


class AttackState:
    def __init__(self, target_goal: GridCoords):
        self._target_goal = target_goal

    def on_enter(self, bot: BotMemoryInfo, world: WorldInfo, entity: PlayerInfo) -> None:
        bot.set_goal(self._target_goal)
        path = bot.config.attack_policy.get_path(world, entity, bot)
        bot.set_path(path)

    def on_tick(self, bot: BotMemoryInfo, world: WorldInfo, entity: PlayerInfo) -> BotState | None:
        if (entity.row, entity.col) == bot.goal:
            return WanderState()
        return None

    def decide_action(self, bot: BotMemoryInfo, world: WorldInfo, entity: PlayerInfo) -> ActionInfo | None:
        # Check Attack Range Trigger
        if bot.goal:
            dist = get_manhattan((entity.row, entity.col), bot.goal)
            if dist <= bot.config.attack_range_trigger:
                curr = world.get_entity_at(entity.row, entity.col)
                has_bomb = curr and curr.entity_type == EntityType.BOMB
                if not has_bomb:
                    return Action(PlayerAction.PLANT_BOMB)

        # Move / Break Walls
        return follow_path_action(bot, world, entity, allow_bombing=True)
