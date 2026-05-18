from django.urls import path
from . import views

urlpatterns = [
    path('', views.recipe_list, name='recipe_list'),
    path('recipe/new/', views.recipe_create, name='recipe_create'),
    path('recipe/random/', views.random_recipe, name='random_recipe'),
    path('recipe/<int:pk>/', views.recipe_detail, name='recipe_detail'),
    path('recipe/<int:pk>/edit/', views.recipe_edit, name='recipe_edit'),
    path('recipe/<int:pk>/delete/', views.recipe_delete, name='recipe_delete'),
    path('calendar/', views.calendar_view, name='calendar'),
    path('grocery-list/', views.grocery_list, name='grocery_list'),
    # JSON API endpoints for async form features
    path('api/parse-recipe/', views.api_parse_recipe, name='api_parse_recipe'),
    path('api/parse-ingredients/', views.api_parse_ingredients, name='api_parse_ingredients'),
    path('api/parse-images/', views.api_parse_images, name='api_parse_images'),
    path('api/meal-plan/', views.api_meal_plan, name='api_meal_plan'),
    path('api/health/', views.api_health, name='api_health'),
]
