from model import Model, World
from view import View
from common_types import ConfigInfo
from helpers.grid_adapter import GridAdapter
from helpers.settings import Settings


class Controller:
    def __init__(self, model: Model, view: View):
        self._model: Model = model
        self._view: View = view
        

    def start(self) -> None:
        self._view.run(self.update, self.draw)


    def update(self):
        key = self._view.key # type: ignore

        self._model.handle_input(key)
        self._model.update(1)

        # not sure yet
        for sfx in self._model.pop_sfx:
            self._view.play_sound(sfx) # type: ignore
        for vfx in self._model.pop_vfx:
            self._view.start_animation(vfx) # type: ignore

    def draw(self):
        timer = self._model.timer
        players = self._model.alive_players
        state = self._model.state
        result = self._model.round_result
        countdown = self._model.countdown_frames
        self._view.draw(players, timer, state, result, countdown)
        # model and view share the same world, no need to pass entities, except Players

world = World(13, 15)
grid = GridAdapter(0, 0)
fps = 30
config: ConfigInfo = Settings.from_json("settings.json")
game = Controller(Model(world, grid, fps, config), View(world, grid, fps))
game.start()
