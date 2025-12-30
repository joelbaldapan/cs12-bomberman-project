from __future__ import annotations
from common_types import  Action, ActionInfo, BotPlayerInfo, BotState, PlayerAction, BotMemoryInfo, EntityType, GridCoords, WorldInfo
from bot_behavior.helpers.pathfinding import follow_path_action, get_random_floor_cell, get_reachable_safe_cell
from .bot_policy import get_shortest_path, get_manhattan


class WanderState:
    def on_enter(self, memory: BotMemoryInfo, world: WorldInfo, entity: BotPlayerInfo) -> None:
        goal = get_random_floor_cell(world)
        memory.set_goal(goal)

        path = get_shortest_path(
            world, (entity.row, entity.col), goal, ignore_soft_blocks=True)
        memory.set_path(path)

    def on_tick(self, memory: BotMemoryInfo, world: WorldInfo, entity: BotPlayerInfo) -> BotState | None:
        if memory.goal and (entity.row, entity.col) == memory.goal:
            self.on_enter(memory, world, entity)

        if not memory.path and memory.goal != (entity.row, entity.col):
            self.on_enter(memory, world, entity)

        return None

    def decide_action(self, memory: BotMemoryInfo, world: WorldInfo, entity: BotPlayerInfo) -> ActionInfo | None:
        return follow_path_action(memory, world, entity, allow_bombing=True)


class EscapeState:
    def on_enter(self, memory: BotMemoryInfo, world: WorldInfo, entity: BotPlayerInfo) -> None:
        self._left_danger = False
        dangerous_cells = memory.config.danger_check_type.get_all_danger_zones(
            world)
        goal = get_reachable_safe_cell(world, entity, dangerous_cells)

        if goal:
            memory.set_goal(goal)
            path = get_shortest_path(
                world, (entity.row, entity.col), goal, ignore_soft_blocks=False)
            memory.set_path(path)
        else:
            memory.set_goal(None)
            memory.set_path([])

    def on_tick(self, memory: BotMemoryInfo, world: WorldInfo, entity: BotPlayerInfo) -> BotState | None:
        overlap_pos = entity.get_overlapping_cells()
        danger_zones = memory.config.danger_check_type.get_all_danger_zones(world)

        if not memory.path:
            self.on_enter(memory, world, entity)

        in_danger = any(p in danger_zones for p in overlap_pos)
        if not in_danger:
            self._left_danger = True
        else:
            return None

        if self._left_danger:
            if any(p in danger_zones for p in memory.path):
                self.on_enter(memory, world, entity)

        # Success check
        if memory.goal and (entity.row, entity.col) == memory.goal:
            if not memory.is_strict_movement:
                return WanderState()

        # Failure check (Trapped)
        if not memory.goal:
            return WanderState()

        return None

    def decide_action(self, memory: BotMemoryInfo, world: WorldInfo, entity: BotPlayerInfo) -> ActionInfo | None:
        return follow_path_action(memory, world, entity, allow_bombing=False)


class GetPowerupState:
    def __init__(self, target_goal: GridCoords):
        self._target_goal = target_goal

    def on_enter(self, memory: BotMemoryInfo, world: WorldInfo, entity: BotPlayerInfo) -> None:
        memory.set_goal(self._target_goal)
        path = memory.config.powerup_policy.get_path(world, entity, memory)
        memory.set_path(path)

    def on_tick(self, memory: BotMemoryInfo, world: WorldInfo, entity: BotPlayerInfo) -> BotState | None:
        if (entity.row, entity.col) == memory.goal:
            return WanderState()
        return None

    def decide_action(self, memory: BotMemoryInfo, world: WorldInfo, entity: BotPlayerInfo) -> ActionInfo | None:
        allow_bomb = memory.config.powerup_policy.can_place_bomb()
        return follow_path_action(memory, world, entity, allow_bombing=allow_bomb)


class AttackState:
    def __init__(self, target_goal: GridCoords):
        self._target_goal = target_goal

    def on_enter(self, memory: BotMemoryInfo, world: WorldInfo, entity: BotPlayerInfo) -> None:
        memory.set_goal(self._target_goal)
        path = memory.config.attack_policy.get_path(world, entity, memory)
        memory.set_path(path)

    def on_tick(self, memory: BotMemoryInfo, world: WorldInfo, entity: BotPlayerInfo) -> BotState | None:
        if (entity.row, entity.col) == memory.goal:
            return WanderState()
        return None

    def decide_action(self, memory: BotMemoryInfo, world: WorldInfo, entity: BotPlayerInfo) -> ActionInfo | None:
        # Check Attack Range Trigger
        if memory.goal:
            dist = get_manhattan((entity.row, entity.col), memory.goal)
            if dist <= memory.config.attack_range_trigger:
                curr = world.get_entity_at(entity.row, entity.col)
                has_bomb = curr and curr.entity_type == EntityType.BOMB
                if not has_bomb:
                    return Action(PlayerAction.PLANT_BOMB)

        # Move / Break Walls
        return follow_path_action(memory, world, entity, allow_bombing=True)
