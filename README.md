# Bomberman Clone (CS 12 25.1)

A multiplayer Bomberman clone developed for CS 12 25.1. This repository contains two separate implementations of the game: 
1. **Python (Pyxel + MVC)**
2. **TypeScript/Effect (CS 12 MVU Framework)**

## Important Notes

### A. Forking of cs12251-mvu

**Implementation 2 (Typescript)** uses a _vendored_ version of [cs12251-mvu](https://github.com/UPD-CS12-251/cs12251-mvu). The following `TaggedStruct`s were implemented:

- Added `MsgKeyUp` and `MsgMouseUp` in `CanvasMsg` ([eed897b](https://github.com/joelbaldapan/cs12251-mvu/commit/eed897bb15a495f50193463fe44769cf4eedf1e2) and [0ea18ac](https://github.com/joelbaldapan/cs12251-mvu/commit/0ea18ac0d521e79e7d3916acc7f8ee65555777bd))

This was done because there was no _reliable_ way to detect when the user had stopped pressing a given key. An alternative would be to set _timeouts_ per `MsgKeyDown` presses. But this implementation led to clunky gameplay, and a not-so-fun experience.

The fork of such repository may be found [here](https://github.com/joelbaldapan/cs12251-mvu).

### B. Faulty Bot _Escape State_

From the specs:
```text
💣 The ESCAPE state

When a bot transitions to the ESCAPE state, it must do the following:
   - Choose a random goal cell that is reachable from its current cell and is not dangerous
   - Compute the shortest path from the bot's current cell to the goal cell

If an appropriate goal cell does not exist (e.g., the bot is trapped), the bot must transition to the WANDER state.

REACHABLE CELLS
   A target cell is reachable from a starting cell if there exists any path connecting the starting cell and the target cell. This path must not have any cell containing soft blocks.
```

While the goal cell is guaranteed to be safe, the **path** itself is not checked for danger. Meaning, a bot might _traverse cells with explosions_.

Alternate `ESCAPE` implementations could:
- Recompute or invalidate the escape **path** if any cell along it becomes dangerous
   - But only do so when the bot's current cell is _not dangerous_ anymore. Otherwise, placing a bomb will freeze the bot.
- Or, have the bot move to the _nearest safe cell_ (including its current cell, if it is safe).
   - This guarantees the bots to stand still on a safe cell when in danger; thus, avoiding path calculations that may include an explosion. 

## Group Members & Part 2 Assignments

| Student Name              | Assigned Option (Part 2) |
| :------------------------ | :----------------------- |
| **Aranas, John Ray**      | **Option 3: extreme bot type (Python)**           |
| **Baldapan, Joel Angelo** | **add ur option guys**           |
| **Crucero Robert Rohan**  | **add ur option guys**           |
| **Gonzalez Dayshaun**     | **Option 1: Rainbow powerup (Python)**           |

## Highest Phase Accomplished

- **Implementation 1 (Python):** Phase 5
- **Implementation 2 (TypeScript):** Phase 5

## Project Structure

```text
.
├── implementation1/        # Python-based implementation (Pyxel/MVC)
│   ├── settings.json       # Configuration file for Python version
│   └── ...
├── implementation2/        # TypeScript-based implementation (MVU)
│   ├── settings.json       # Configuration file for TS version
│   └── ...
├── llm-python.txt          # Logs of LLM prompts/responses for Python
├── llm-typescript.txt      # Logs of LLM prompts/responses for TypeScript
└── README.md               # Project documentation
```

## Configuration (settings.json)

Both implementations are controlled via a `settings.json` file located in their respective directories. Below are the required fields and their expected values based on the final phase of the project.

### JSON Fields

| Key Name            | Type         | Value Range                    | Description                                                                                               |
| :------------------ | :----------- | :----------------------------- | :-------------------------------------------------------------------------------------------------------- |
| `soft_block_spawn_chance` | Integer      | `0` to `100`                   | Percentage chance a soft block spawns in a valid cell.                                                    |
| `powerup_spawn_chance`    | Integer      | `0` to `100`                   | Percentage chance a powerup spawns when a block is destroyed.                                             |
| `timer_seconds`     | Integer      | `30` to `600`                  | Duration of the round in seconds.                                                                         |
| `num_human_players`     | Integer      | `1` or `2`                     | Number of human-controlled players.                                                                       |
| `bot_types`         | List[String] | `hostile`, `careful`, `greedy` | Strategies for the bots. The list length depends on `human_players`. (e.g., If 1 human, provide 3 types). |
| `rounds_to_win`     | Integer      | `1` to `4`                     | Number of round wins required to win the overall match.                                                   |

> **Note on Deprecated Fields:** As per Phase 4 requirements, fields regarding specific bot probabilities (e.g., probability to plant bomb/move) were removed in favor of the `bot_types` logic.

### Example JSON

```json
{
  "soft_block_spawn_chance": 50,
  "powerup_spawn_chance": 20,
  "timer_seconds": 180,
  "num_human_players": 1,
  "bot_types": [ "hostile" ,"careful", "greedy"],
  "rounds_to_win": 3
}
```

## How to Run

### Implementation 1: Python

1. Enter the Implementation 1 directory:
   ```bash
   cd implementation1
   ```
2. Install dependencies (if applicable):
   ```bash
   pip install pyxel
   ```
3. Run the game:
   ```bash
   python3 bomberman.py
   ```

### Implementation 2: TypeScript

1. Enter the Implementation 2 directory:
   ```bash
   cd implementation2
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the game (You may use `vite` for example):
   ```bash
   npx vite
   ```

## LLM Policy & Attribution

All LLM prompts and responses used during the development are documented in `llm-python.txt` and `llm-typescript.txt` in the root directory.
