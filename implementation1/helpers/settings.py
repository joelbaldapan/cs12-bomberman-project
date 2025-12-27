from __future__ import annotations
import json
from dataclasses import dataclass
from typing import Any


class SettingsError(ValueError):
    ...
def _require_int(data: dict[str, Any], key: str) -> int:
    if key not in data:
        raise SettingsError(f"Missing required field: {key}")
    field_value = data[key]
    if isinstance(field_value, bool) or not isinstance(field_value, int):
        raise SettingsError(f"{key} must be an integer")
    return field_value

def _require_opt_str_list(data: dict[str, Any], key: str) -> list[str] | None:
    if key not in data:
        raise SettingsError(f"Missing required field: {key}")
    field_value = data[key]
    if field_value is None:
        return None
    if not isinstance(field_value, list):
        raise SettingsError(f"{key} must be a list of strings or null")
    out: list[str] = []
    i: int = 0
    for element in field_value: # type: ignore
        if not isinstance(element, str):
            raise SettingsError(f"{key}[{i}] must be a string")
        i += 1
        out.append(element)
    return out

@dataclass(frozen=True, slots=True)
class Settings:
    _soft_block_spawn_chance: int
    _powerup_spawn_chance: int
    _timer_seconds: int
    _num_human_players: int
    _bot_types: list[str] | None
    _rounds_to_win: int
    
    @property
    def soft_block_spawn_chance(self) -> int:
        return self._soft_block_spawn_chance

    @property
    def powerup_spawn_chance(self) -> int:
        return self._powerup_spawn_chance

    @property
    def timer_seconds(self) -> int:
        return self._timer_seconds

    @property
    def num_human_players(self) -> int:
        return self._num_human_players

    @property
    def bot_types(self) -> list[str] | None:
        return None if self._bot_types is None else list(self._bot_types)

    @property
    def rounds_to_win(self) -> int:
        return self._rounds_to_win

    @classmethod
    def from_json(cls, path: str) -> Settings:
        try:
            with open(path, "r", encoding="utf-8") as f:
                raw = json.load(f)
        except FileNotFoundError as e:
            raise SettingsError("settings.json not found")
        except json.JSONDecodeError as e:
            raise SettingsError(f"settings.json is not valid JSON: {e}")

        if not isinstance(raw, dict):
            raise SettingsError("settings.json must contain a JSON object")

        return cls.from_dict(raw) # type: ignore

    @classmethod
    def from_dict(cls, raw: dict[str, Any]) -> Settings:
        soft = _require_int(raw, "soft_block_spawn_chance")
        power = _require_int(raw, "powerup_spawn_chance")
        timer = _require_int(raw, "timer_seconds")
        humans = _require_int(raw, "num_human_players")
        bot_types = _require_opt_str_list(raw, "bot_types")
        rounds_to_win = _require_int(raw, "rounds_to_win")
        if not (0 <= soft <= 100):
            raise SettingsError("soft_block_spawn_chance must be in [0, 100].")
        if not (0 <= power <= 100):
            raise SettingsError("powerup_spawn_chance must be in [0, 100].")
        if not (30 <= timer <= 600):
            raise SettingsError("timer_seconds must be in [30, 600].")
        if humans not in (1, 2):
            raise SettingsError("num_human_players must be 1 or 2.")
        if not (1 <= rounds_to_win <= 4):
            raise SettingsError("rounds_to_win must be in [1, 4].")
        allowed_bot_types = {"hostile", "careful", "greedy"}
        if bot_types is not None:
            for type in bot_types:
                if type not in allowed_bot_types:
                    raise SettingsError(f"Invalid bot type {type}. Allowed: {sorted(allowed_bot_types)}")
            if humans == 1 and len(bot_types) == 0:
                raise SettingsError("If num_human_players == 1, bot_types must have at least one entry.")
            if not (0 <= len(bot_types) <= 4 - humans):
                raise SettingsError(f"length of bot_types must be [0, {4 - humans}] for {humans} human players.")
        return cls(soft, power, timer, humans, bot_types, rounds_to_win)
