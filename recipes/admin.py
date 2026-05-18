from django.contrib import admin
from .models import Recipe, Ingredient, MealPlan


class IngredientInline(admin.TabularInline):
    model = Ingredient
    extra = 3


@admin.register(Recipe)
class RecipeAdmin(admin.ModelAdmin):
    list_display = ['title', 'servings', 'date_added']
    list_filter = ['date_added']
    search_fields = ['title']
    inlines = [IngredientInline]


@admin.register(MealPlan)
class MealPlanAdmin(admin.ModelAdmin):
    list_display = ['date', 'meal_type', 'recipe']
    list_filter = ['meal_type', 'date']
