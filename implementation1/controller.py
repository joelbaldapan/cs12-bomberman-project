import pyxel
from model import Model, World
from view import View
from helpers.grid_adapter import GridAdapter
from common_types import WorldInfo, PlayerInfo, PowerUpType

class Controller:
    def __init__(self, world: WorldInfo, model: Model, view: View, rounds_to_win: int):
        self._rounds_to_win = rounds_to_win
        self._fps = 30
        self._world: WorldInfo = world
        self._model: Model = model
        self._view: View = view
        self._players: set[PlayerInfo] = set()
        self._rounds_won: dict[int, int] = {}  # for each: player_id, rounds_won
        self._current_round = 1
        self._timer: int = 60 * self._fps

        self._init_game()

    def _init_game(self):
        rows, cols = 13, 15
        self._world = World(rows, cols)
        self._grid = GridAdapter(0, 24)

        self._model = Model(self._world, self._grid, self._fps)
        self._view = View(self._world, self._grid)

        self._generate_board()
        self._create_players()
        self._rounds_won = {}
        
    def _generate_board(self):
        if not self._world:
            return   
        
        row, cols = self._world.rows, self._world.cols
        ...
        # makes the board
        
    def _is_starting_position(self, row: int, col: int) -> bool:
        if not self._world:
            return False
            
        rows, cols = self._world.rows, self._world.cols
        
        starting_pos = [
            (1, 1), (1, 2), (2, 1),  # p1
            (1, cols - 2), (1, cols - 3), (2, cols - 2),  # p2
            (rows - 2, 1), (rows - 2, 2), (rows - 3, 1),  # p3
            (rows - 2, cols - 2), (rows - 2, cols - 3), (rows - 3, cols - 2)  # p4
        ]
        return (row, col) in starting_pos
    
    def _create_players(self):
        if not self._world or not self._grid or not self._model:
            return
            
        rows, cols = self._world.rows, self._world.cols
        
        starting_pos = [
            (1, 1),  # p1
            (1, cols - 2),  # p2
            (rows - 2, 1),  # p3
            (rows - 2, cols - 2)  # p4
        ]
        
        # missing: playerfactory implementation for players (human and bot)

    def run(self):
        pyxel.run(self.update, self.draw)

    def update(self):
        ...

    def draw(self):
        ...


    def _next_round(self):
        self._current_round += 1
        self._init_game()

    def _check_game_over(self):
        if not self._model:
            return
            
        alive_players = [p for p in self._players if not p.is_expired]
        
        # game over
        if len(alive_players) <= 1:
            self._end_round()

    def _end_round(self):
        alive_players = [p for p in self._players if not p.is_expired]
        if len(alive_players) == 1:
            winner = alive_players[0]
            self._rounds_won[winner.id] = self._rounds_won.get(winner.id, 0) + 1
            
            if self._rounds_won[winner.id] >= self._rounds_to_win:
                return

    def _end_round_timeout(self):
        alive_players = [p for p in self._players if not p.is_expired]
        if len(alive_players) == 1:
            winner = alive_players[0]
            self._rounds_won[winner.id] = self._rounds_won.get(winner.id, 0) + 1

def main():
    ...


if __name__ == "__main__":
    main()