from __future__ import annotations
import json
from dataclasses import dataclass
from typing import cast

from common_types import BotType


class SettingsError(ValueError):
    ...

def _require_int(data: dict[str, object], key: str) -> int:
    if key not in data:
        raise SettingsError(f"Missing required field: {key}")
    field_value = data[key]
    if isinstance(field_value, bool) or not isinstance(field_value, int):
        raise SettingsError(f"{key} must be an integer")
    return field_value

def _require_str_list(data: dict[str, object], key: str) -> list[str]:
    if key not in data:
        raise SettingsError(f"Missing required field: {key}")
    field_value = data[key]
    
    if not isinstance(field_value, list):
        raise SettingsError(f"{key} must be a list of strings")
        
    # Help static type checkers: we've confirmed it's a list, cast to list[object]
    field_list: list[object] = cast(list[object], field_value)

    out: list[str] = []
    for i, element in enumerate(field_list):
        if not isinstance(element, str):
            raise SettingsError(f"{key}[{i}] must be a string")
        out.append(element)
    return out

@dataclass(frozen=True, slots=True)
class Settings:
    _soft_block_spawn_chance: int
    _powerup_spawn_chance: int
    _timer_seconds: int
    _num_human_players: int
    _bot_types: list[BotType]
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
    def bot_types(self) -> list[BotType]:
        return list(self._bot_types)

    @property
    def rounds_to_win(self) -> int:
        return self._rounds_to_win

    @classmethod
    def from_json(cls, path: str) -> Settings:
        try:
            with open(path, "r", encoding="utf-8") as f:
                raw: object = json.load(f)
        except FileNotFoundError:
            raise SettingsError("settings.json not found")
        except json.JSONDecodeError as e:
            raise SettingsError(f"settings.json is not valid JSON: {e}")

        if not isinstance(raw, dict):
            raise SettingsError("settings.json must contain a JSON object")

        return cls.from_dict(cast(dict[str, object], raw))
    
    @classmethod
    def from_dict(cls, raw: dict[str, object]) -> Settings:
        soft = _require_int(raw, "soft_block_spawn_chance")
        power = _require_int(raw, "powerup_spawn_chance")
        timer = _require_int(raw, "timer_seconds")
        humans = _require_int(raw, "num_human_players")
        bot_types_str = _require_str_list(raw, "bot_types")
        rounds_to_win = _require_int(raw, "rounds_to_win")

        # Range Validations
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

        # Bot Logic Validation & Conversion
        allowed_bot_types = {t.value for t in BotType}
        final_bot_types: list[BotType] = []

        for b_str in bot_types_str:
            if b_str not in allowed_bot_types:
                # Provide a sorted list for clear error messages
                raise SettingsError(f"Invalid bot type '{b_str}'. Allowed: {sorted(list(allowed_bot_types))}")
            # Convert string to Enum
            final_bot_types.append(BotType(b_str))

        # "The list of this field must have at most 4 - H strings"
        max_bots = 4 - humans
        if len(final_bot_types) > max_bots:
            raise SettingsError(f"Too many bots defined. Max for {humans} human(s) is {max_bots}.")

        # "There must be at least one string if H=1"
        if humans == 1 and len(final_bot_types) == 0:
            raise SettingsError("If num_human_players is 1, bot_types must have at least one entry.")

        return cls(soft, power, timer, humans, final_bot_types, rounds_to_win)