from django import template

register = template.Library()


@register.filter
def ingredient_count(recipe):
    return recipe.ingredients.count()


@register.filter
def split(value, delimiter=','):
    return value.split(delimiter)


@register.filter
def get_meal(day_dict, meal_type):
    return day_dict.get(meal_type)
