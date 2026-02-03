from enum import Enum


class ProductType(str, Enum):
    cigarette = "cigarette"
    snus = "snus"
    vape = "vape"
    chew = "chew"
    patch = "patch"
    gum = "gum"
    lozenge = "lozenge"
    other = "other"


class GoalType(str, Enum):
    reduce_to_zero = "reduce_to_zero"
    immediate_zero = "immediate_zero"


class EventType(str, Enum):
    use = "use"
    craving = "craving"
    relapse = "relapse"


class TriggerType(str, Enum):
    stress = "stress"
    social = "social"
    alcohol = "alcohol"
    boredom = "boredom"
    morning = "morning"
    after_meal = "after_meal"
    other = "other"
