from model import Model
from view import View

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
        if self._model.transition_screen:
            ... # different draw type of view, shows result screen
            return
        timer = self._model.timer
        self._view.draw(timer)
        # model and view share the same world, no need to pass entities, except Players
