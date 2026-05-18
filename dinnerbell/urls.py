from django.contrib import admin
from django.urls import path, include, re_path
from recipes import views as recipe_views

# JSON API endpoints called by the React frontend
api_patterns = [
    path('parse-recipe', recipe_views.api_parse_recipe),
    path('parse-recipe/', recipe_views.api_parse_recipe),
    path('parse-ingredients', recipe_views.api_parse_ingredients),
    path('parse-ingredients/', recipe_views.api_parse_ingredients),
    path('parse-images', recipe_views.api_parse_images),
    path('parse-images/', recipe_views.api_parse_images),
    path('meal-plan/', recipe_views.api_meal_plan),
    path('health', recipe_views.api_health),
    path('health/', recipe_views.api_health),
]

urlpatterns = [
    path('admin/', admin.site.urls),
    path('health', recipe_views.api_health),
    path('health/', recipe_views.api_health),
    path('api/', include(api_patterns)),
    # Serve the React SPA for every other route so BrowserRouter works
    re_path(r'.*', recipe_views.spa),
]
