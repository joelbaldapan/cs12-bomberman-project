from common_types import AnimationCmd, EntityInfo, SoundType, WorldInfo, EventInfo
from dataclasses import dataclass



class UpdateResult():
    def __init__(self):
        self._events: list[EventInfo] = []
        self._sounds: list[SoundType] = []
        self._animations: list[AnimationCmd]
    @property
    def events(self) -> list[EventInfo]:
        return self._events[:]
    @property
    def sounds(self) -> list[SoundType]:
        return self._sounds[:]
    @property
    def animations(self) -> list[AnimationCmd]:
        return self._animations[:]
    def add_event(self, cmd: EventInfo):
        self._events.append(cmd)
    def add_sound(self, cmd: SoundType):
        self._sounds.append(cmd)
    def add_animation(self, cmd: AnimationCmd):
        self._animations.append(cmd)

@dataclass(frozen=True)
class SpawnEvent:
    _entity: EntityInfo
    def execute(self, world: WorldInfo) -> None:
        world.add_entity(self._entity)

@dataclass(frozen=True)
class RemoveEvent:
    _entity: EntityInfo
    def execute(self, world: WorldInfo) -> None:
        world.remove_entity(self._entity)