from common_types import EntityInfo, SoundType, WorldInfo, EventInfo
from dataclasses import dataclass


class UpdateResult():
    def __init__(self):
        self._events: list[EventInfo] = []
        self._sounds: list[SoundType] = []
    @property
    def events(self) -> list[EventInfo]:
        return self._events[:]
    @property
    def sounds(self) -> list[SoundType]:
        return self._sounds[:]
    def add_event(self, cmd: EventInfo):
        self._events.append(cmd)
    def add_sound(self, cmd: SoundType):
        self._sounds.append(cmd)

@dataclass(frozen=True)
class SpawnCommand:
    _entity: EntityInfo
    def execute(self, world: WorldInfo) -> None:
        world.add_entity(self._entity)

@dataclass(frozen=True)
class DestroyCommand:
    _entity: EntityInfo
    def execute(self, world: WorldInfo) -> None:
        world.remove_entity(self._entity)