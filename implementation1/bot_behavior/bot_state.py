"""
implementation for:
- BaseState
    - WanderState
    - EscapeState
    - GetPowerupState
    - AttackState

"""

"""
WanderState:
- on_enter: pick random goal + path
- decide_action: if next cell soft block and no bomb -> PLANT_BOMB else MOVE

EscapeState:
- on_enter: choose escape goal not dangerous
- decide_action: move along path or switch to WANDER if reached

AttackState:
- on_enter: depends on attack policy
- decide_action: follow path/update dynamic policies, plant bombs per rules

GetPowerupState:
- similar to WANDER but goal is powerup cell.
"""

