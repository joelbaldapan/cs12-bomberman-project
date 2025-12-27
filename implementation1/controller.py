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
        # call handle input
        # model.update
        # retrieve sfx and vfx
        # pass sfx and vfx to view
        ...

    def draw(self):
        timer = self._model.timer
        self._view.draw(timer)
