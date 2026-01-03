from controller import Controller
from model import Model, World
from view import View
from helpers.grid_adapter import GridAdapter
from helpers.settings import Settings as SettingsLoader, SettingsError
from common_types import ConfigInfo
from entities.powerup import Powerup_Factories
import sys

def main():
    try:
        config: ConfigInfo = SettingsLoader.from_json("settings.json")
    except SettingsError as e:
        print(f"Error loading settings.json: {e}", file=sys.stderr)
        sys.exit(1)
    except FileNotFoundError:
        print("Error: settings.json not found", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Unexpected error loading settings: {e}", file=sys.stderr)
        sys.exit(1)

    world = World(13, 15)
    grid = GridAdapter(0, 0)
    fps = 30
    
    config: ConfigInfo = SettingsLoader.from_json("settings.json")

    powerups = Powerup_Factories
    
    model = Model(world, grid, fps, config, powerups)
    view = View(grid, fps)
    controller = Controller(model, view)
    
    controller.start()


if __name__ == "__main__":
    main()