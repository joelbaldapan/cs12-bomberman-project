from model import Model
from view import View

class Controller:
    def __init__(self, model: Model, view: View):
        self._model: Model = model
        self._view: View = view
        

    def start(self) -> None:
        self._view.run(self.update, self.draw)


    def update(self):
        key = self._view.key

        self._model.handle_input(key)
        self._model.update(1)

        for sfx in self._model.pop_sfx():
            self._view.play_sound(sfx) 

        for vfx in self._model.pop_vfx():
            self._view.start_animation(vfx)

    def draw(self):
        world = self._model.world
        entities = world.entities
        timer = self._model.timer
        players = self._model.alive_players
        state = self._model.state
        result = self._model.round_result
        countdown = self._model.countdown_frames
        scores = self._model.scores
        debug_mode = self._model.debug_mode
        num_players = len(self._model.players)

        if result and result.match_over:
            winner_id = result.overall_winner_id if result else None
            if winner_id:
                message = f"Player {winner_id} Wins!"
            else:
                message = "Game Over!"
            self._view.draw_game_over(message)
        else:
            self._view.draw(entities, players, timer, state, result, countdown, scores, debug_mode, num_players)
        # model and view share the same world, no need to pass entities, except Players