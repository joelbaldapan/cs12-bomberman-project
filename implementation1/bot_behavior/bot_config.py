from dataclasses import dataclass
from bot_behavior.bot import BotController
from bot_behavior.bot_policy import AttackPolicy1, AttackPolicy2, BombOnlyDangerPolicy, ExplosionPredictionDangerPolicy, PowerupPolicy1, PowerupPolicy2
from common_types import BotConfigInfo, BotControllerInfo, BotType


@dataclass(frozen=True)
class HostileBotConfig:
    bot_type = BotType.HOSTILE

    reeval_interval = 0.5
    reeval_chance = 0.25

    danger_radius = 0
    danger_check_type = BombOnlyDangerPolicy()

    attack_policy = AttackPolicy2()
    attack_range_trigger = 2
    attack_search_radius = 0

    powerup_policy = PowerupPolicy2()
    powerup_chance = 0.20

@dataclass(frozen=True)
class CarefulBotConfig:
    bot_type = BotType.CAREFUL

    reeval_interval = 0.25
    reeval_chance = 1.0

    danger_radius = 4
    danger_check_type = ExplosionPredictionDangerPolicy()

    attack_policy = AttackPolicy1(max_distance=3)
    attack_range_trigger = 4
    attack_search_radius = 3

    powerup_policy = PowerupPolicy2()
    powerup_chance = 1.0


@dataclass(frozen=True)
class GreedyBotConfig:
    bot_type = BotType.GREEDY

    reeval_interval = 1.0
    reeval_chance = 1.0

    danger_radius = 2
    danger_check_type = ExplosionPredictionDangerPolicy()

    attack_policy = AttackPolicy1(max_distance=6)
    attack_range_trigger = 3
    attack_search_radius = 6

    powerup_policy = PowerupPolicy1()
    powerup_chance = 1.0

@dataclass(frozen=True)
class ExtremeBotConfig:
    bot_type = BotType.EXTREME

    reeval_interval = 0.1
    reeval_chance = 0.1

    danger_radius = 10
    danger_check_type = ExplosionPredictionDangerPolicy()

    attack_policy = AttackPolicy2()
    attack_range_trigger = 10
    attack_search_radius = 0

    powerup_policy = PowerupPolicy1()
    powerup_chance = 1.0

class BotFactory:
    _CONFIG_MAP: dict[BotType, type[BotConfigInfo]] = {
        BotType.HOSTILE: HostileBotConfig,
        BotType.CAREFUL: CarefulBotConfig,
        BotType.GREEDY: GreedyBotConfig,
        BotType.EXTREME: ExtremeBotConfig,
        }

    @classmethod
    def make(cls, bot_type: BotType) -> BotControllerInfo:
        config = cls.create_bot_config(bot_type)
        return BotController(config)

    @classmethod
    def create_bot_config(cls, bot_type: BotType) -> BotConfigInfo:
        config_class = cls._CONFIG_MAP.get(bot_type)
        
        if config_class is None:
            raise ValueError(f"Unknown bot type: {bot_type}")
        
        return config_class()
