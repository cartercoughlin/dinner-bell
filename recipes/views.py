import json
import os
import random
import tempfile
from datetime import date, timedelta

from django.db.models import Q
from django.http import JsonResponse
from django.shortcuts import render, get_object_or_404, redirect
from django.contrib import messages
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST

from .models import Recipe, MealPlan
from .forms import RecipeForm, IngredientFormSet
from .parsers import parse_recipe_from_url, parse_ingredients, parse_recipe_from_images
from .parsers.categorizer import auto_categorize


def recipe_list(request):
    recipes = Recipe.objects.prefetch_related('ingredients').all()

    # Search
    query = request.GET.get('q', '').strip()
    if query:
        recipes = recipes.filter(
            Q(title__icontains=query)
            | Q(source_url__icontains=query)
            | Q(ingredients__name__icontains=query)
        ).distinct()

    # Filters
    tag_filter = request.GET.get('tag', '').strip()
    if tag_filter:
        recipes = [r for r in recipes if tag_filter.lower() in [t.lower() for t in (r.tags or [])]]
    else:
        recipes = list(recipes)

    tool_filter = request.GET.get('tool', '').strip()
    if tool_filter:
        recipes = [r for r in recipes if tool_filter.lower() in [t.lower() for t in (r.tools or [])]]

    ingredient_filter = request.GET.get('ingredient', '').strip()
    if ingredient_filter:
        # Already handled by Q query above for search, but this is a dedicated filter
        if not query:
            recipe_ids = Recipe.objects.filter(
                ingredients__name__icontains=ingredient_filter
            ).values_list('id', flat=True).distinct()
            recipes = [r for r in recipes if r.id in set(recipe_ids)]

    # Collect all tags and tools for filter dropdowns
    all_recipes = Recipe.objects.all()
    all_tags = set()
    all_tools = set()
    for r in all_recipes:
        for t in (r.tags or []):
            all_tags.add(t)
        for t in (r.tools or []):
            all_tools.add(t)

    return render(request, 'recipes/recipe_list.html', {
        'recipes': recipes,
        'query': query,
        'tag_filter': tag_filter,
        'tool_filter': tool_filter,
        'ingredient_filter': ingredient_filter,
        'all_tags': sorted(all_tags),
        'all_tools': sorted(all_tools),
    })


def recipe_detail(request, pk):
    recipe = get_object_or_404(Recipe.objects.prefetch_related('ingredients'), pk=pk)
    return render(request, 'recipes/recipe_detail.html', {'recipe': recipe})


def _save_recipe_with_ingredients(form, formset, recipe=None):
    """Save recipe with auto-categorization and ingredients."""
    recipe = form.save(commit=False)

    # Auto-categorize: merge auto tags with any user-provided tags
    ingredient_names = []
    for ing_form in formset:
        if ing_form.cleaned_data and not ing_form.cleaned_data.get('DELETE'):
            name = ing_form.cleaned_data.get('name', '')
            if name:
                ingredient_names.append(name)

    auto_tags = auto_categorize(recipe.title, ingredient_names)
    existing_tags = [t for t in (recipe.tags or []) if t]
    # Merge: keep user tags, add auto tags that aren't already present
    merged = list(existing_tags)
    for tag in auto_tags:
        if tag.lower() not in [t.lower() for t in merged]:
            merged.append(tag)
    recipe.tags = merged
    recipe.save()
    return recipe


def recipe_create(request):
    if request.method == 'POST':
        form = RecipeForm(request.POST)
        formset = IngredientFormSet(request.POST, prefix='ingredients')
        if form.is_valid() and formset.is_valid():
            recipe = _save_recipe_with_ingredients(form, formset)
            ingredients = formset.save(commit=False)
            for i, ingredient in enumerate(ingredients):
                ingredient.recipe = recipe
                ingredient.order = i
                ingredient.save()
            messages.success(request, f'"{recipe.title}" has been saved!')
            return redirect('recipe_detail', pk=recipe.pk)
    else:
        form = RecipeForm()
        formset = IngredientFormSet(prefix='ingredients')
    return render(request, 'recipes/recipe_form.html', {
        'form': form,
        'formset': formset,
        'is_edit': False,
    })


def recipe_edit(request, pk):
    recipe = get_object_or_404(Recipe, pk=pk)
    if request.method == 'POST':
        form = RecipeForm(request.POST, instance=recipe)
        formset = IngredientFormSet(request.POST, instance=recipe, prefix='ingredients')
        if form.is_valid() and formset.is_valid():
            recipe = _save_recipe_with_ingredients(form, formset, recipe)
            recipe.ingredients.all().delete()
            ingredients = formset.save(commit=False)
            for i, ingredient in enumerate(ingredients):
                ingredient.recipe = recipe
                ingredient.order = i
                ingredient.pk = None
                ingredient.save()
            messages.success(request, f'"{recipe.title}" has been updated!')
            return redirect('recipe_detail', pk=recipe.pk)
    else:
        form = RecipeForm(instance=recipe)
        formset = IngredientFormSet(instance=recipe, prefix='ingredients')
    return render(request, 'recipes/recipe_form.html', {
        'form': form,
        'formset': formset,
        'is_edit': True,
        'recipe': recipe,
    })


def recipe_delete(request, pk):
    recipe = get_object_or_404(Recipe, pk=pk)
    if request.method == 'POST':
        title = recipe.title
        recipe.delete()
        messages.success(request, f'"{title}" has been deleted.')
        return redirect('recipe_list')
    return render(request, 'recipes/recipe_confirm_delete.html', {'recipe': recipe})


def random_recipe(request):
    recipes = list(Recipe.objects.values_list('pk', flat=True))
    if not recipes:
        messages.info(request, 'No recipes yet! Add some first.')
        return redirect('recipe_list')
    pk = random.choice(recipes)
    return redirect('recipe_detail', pk=pk)


def calendar_view(request):
    today = date.today()
    # Default to current week (Monday to Sunday)
    start_str = request.GET.get('start')
    if start_str:
        try:
            start_date = date.fromisoformat(start_str)
        except ValueError:
            start_date = today - timedelta(days=today.weekday())
    else:
        start_date = today - timedelta(days=today.weekday())

    end_date = start_date + timedelta(days=6)

    meal_plans = MealPlan.objects.filter(
        date__gte=start_date, date__lte=end_date
    ).select_related('recipe')

    # Build calendar grid
    days = []
    for i in range(7):
        d = start_date + timedelta(days=i)
        day_meals = {
            'date': d,
            'breakfast': None,
            'lunch': None,
            'dinner': None,
        }
        for mp in meal_plans:
            if mp.date == d:
                day_meals[mp.meal_type] = mp
        days.append(day_meals)

    prev_week = start_date - timedelta(days=7)
    next_week = start_date + timedelta(days=7)

    recipes = Recipe.objects.all().order_by('title')

    return render(request, 'recipes/calendar.html', {
        'days': days,
        'start_date': start_date,
        'end_date': end_date,
        'prev_week': prev_week.isoformat(),
        'next_week': next_week.isoformat(),
        'recipes': recipes,
    })


@csrf_exempt
@require_POST
def api_meal_plan(request):
    try:
        body = json.loads(request.body)
        action = body.get('action')
        if action == 'add':
            recipe_id = body.get('recipe_id')
            meal_date = body.get('date')
            meal_type = body.get('meal_type', 'dinner')
            recipe = get_object_or_404(Recipe, pk=recipe_id)
            mp, created = MealPlan.objects.update_or_create(
                date=meal_date, meal_type=meal_type,
                defaults={'recipe': recipe}
            )
            return JsonResponse({'ok': True, 'title': recipe.title})
        elif action == 'remove':
            meal_date = body.get('date')
            meal_type = body.get('meal_type')
            MealPlan.objects.filter(date=meal_date, meal_type=meal_type).delete()
            return JsonResponse({'ok': True})
        elif action == 'random':
            meal_date = body.get('date')
            meal_type = body.get('meal_type', 'dinner')
            recipes = list(Recipe.objects.all())
            if not recipes:
                return JsonResponse({'error': 'No recipes available'}, status=400)
            recipe = random.choice(recipes)
            mp, created = MealPlan.objects.update_or_create(
                date=meal_date, meal_type=meal_type,
                defaults={'recipe': recipe}
            )
            return JsonResponse({'ok': True, 'title': recipe.title, 'recipe_id': recipe.pk})
        return JsonResponse({'error': 'Invalid action'}, status=400)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


def grocery_list(request):
    # Get meal plans for a date range, or selected recipe IDs
    recipe_ids = request.GET.getlist('recipe')
    start_str = request.GET.get('start')
    end_str = request.GET.get('end')

    recipes = []
    if recipe_ids:
        recipes = Recipe.objects.filter(pk__in=recipe_ids).prefetch_related('ingredients')
    elif start_str and end_str:
        try:
            start_date = date.fromisoformat(start_str)
            end_date = date.fromisoformat(end_str)
            meal_plan_recipe_ids = MealPlan.objects.filter(
                date__gte=start_date, date__lte=end_date
            ).values_list('recipe_id', flat=True)
            recipes = Recipe.objects.filter(pk__in=meal_plan_recipe_ids).prefetch_related('ingredients')
        except ValueError:
            pass

    # Aggregate ingredients
    grocery_items = {}
    for recipe in recipes:
        for ing in recipe.ingredients.all():
            key = ing.name.lower().strip()
            if key in grocery_items:
                grocery_items[key]['recipes'].add(recipe.title)
                if ing.amount:
                    grocery_items[key]['amounts'].append(f'{ing.amount} {ing.unit}'.strip())
            else:
                grocery_items[key] = {
                    'name': ing.name,
                    'amounts': [f'{ing.amount} {ing.unit}'.strip()] if ing.amount else [],
                    'recipes': {recipe.title},
                }

    # Categorize and sort
    for item in grocery_items.values():
        item['recipes'] = sorted(item['recipes'])
        item['category'] = _grocery_category(item['name'])

    # Group by category, sorted alphabetically within each
    category_order = [
        'Produce', 'Meat & Seafood', 'Dairy & Eggs', 'Bakery & Bread',
        'Pasta & Grains', 'Canned & Jarred', 'Condiments & Sauces',
        'Spices & Seasonings', 'Oils & Vinegars', 'Baking',
        'Frozen', 'Beverages', 'Other',
    ]
    grouped = {}
    for item in grocery_items.values():
        cat = item['category']
        grouped.setdefault(cat, []).append(item)
    for cat in grouped:
        grouped[cat].sort(key=lambda x: x['name'].lower())

    # Build ordered list of (category, items) tuples
    categories = []
    for cat in category_order:
        if cat in grouped:
            categories.append((cat, grouped[cat]))
    # Catch any categories not in the predefined order
    for cat in sorted(grouped.keys()):
        if cat not in category_order:
            categories.append((cat, grouped[cat]))

    total_items = sum(len(items) for _, items in categories)

    all_recipes = Recipe.objects.all().order_by('title')

    # Get current week dates for the "from calendar" button
    today = date.today()
    week_start = today - timedelta(days=today.weekday())
    week_end = week_start + timedelta(days=6)

    return render(request, 'recipes/grocery_list.html', {
        'categories': categories,
        'total_items': total_items,
        'selected_recipes': recipes,
        'all_recipes': all_recipes,
        'week_start': week_start.isoformat(),
        'week_end': week_end.isoformat(),
    })


GROCERY_CATEGORIES = {
    'Produce': [
        'lettuce', 'tomato', 'onion', 'garlic', 'pepper', 'bell pepper',
        'jalapeño', 'jalapeno', 'cilantro', 'parsley', 'basil', 'mint',
        'rosemary', 'thyme', 'dill', 'chives', 'scallion', 'green onion',
        'spinach', 'kale', 'arugula', 'cabbage', 'broccoli', 'cauliflower',
        'carrot', 'celery', 'cucumber', 'zucchini', 'squash', 'potato',
        'sweet potato', 'corn', 'mushroom', 'avocado', 'lemon', 'lime',
        'orange', 'apple', 'banana', 'berry', 'blueberry', 'strawberry',
        'raspberry', 'grape', 'mango', 'pineapple', 'peach', 'pear',
        'ginger', 'shallot', 'leek', 'asparagus', 'green bean',
        'snap pea', 'radish', 'beet', 'turnip', 'eggplant', 'artichoke',
        'fennel', 'bok choy', 'watercress', 'endive', 'radicchio',
    ],
    'Meat & Seafood': [
        'chicken', 'beef', 'pork', 'steak', 'ground beef', 'ground turkey',
        'turkey', 'lamb', 'bacon', 'sausage', 'ham', 'prosciutto',
        'salmon', 'shrimp', 'fish', 'tuna', 'cod', 'tilapia', 'crab',
        'lobster', 'scallop', 'mussel', 'clam', 'anchovy', 'sardine',
    ],
    'Dairy & Eggs': [
        'milk', 'cream', 'half and half', 'half-and-half', 'butter',
        'cheese', 'cheddar', 'mozzarella', 'parmesan', 'feta', 'gouda',
        'gruyere', 'ricotta', 'cream cheese', 'sour cream', 'yogurt',
        'egg', 'whipping cream', 'heavy cream', 'cottage cheese',
        'buttermilk', 'ghee', 'mascarpone', 'brie', 'goat cheese',
    ],
    'Bakery & Bread': [
        'bread', 'bun', 'roll', 'tortilla', 'pita', 'naan', 'baguette',
        'croissant', 'english muffin', 'bagel', 'flatbread', 'ciabatta',
        'sourdough', 'crouton', 'breadcrumb', 'panko',
    ],
    'Pasta & Grains': [
        'pasta', 'spaghetti', 'penne', 'fettuccine', 'linguine',
        'macaroni', 'noodle', 'rice', 'quinoa', 'couscous', 'barley',
        'oat', 'oatmeal', 'farro', 'bulgur', 'polenta', 'grits',
        'orzo', 'risotto', 'arborio',
    ],
    'Canned & Jarred': [
        'canned', 'diced tomatoes', 'crushed tomatoes', 'tomato paste',
        'tomato sauce', 'beans', 'black beans', 'kidney beans',
        'chickpeas', 'garbanzo', 'lentil', 'coconut milk', 'broth',
        'stock', 'bouillon', 'olives', 'capers', 'artichoke hearts',
        'roasted peppers', 'chipotle in adobo', 'salsa',
    ],
    'Condiments & Sauces': [
        'ketchup', 'mustard', 'mayonnaise', 'mayo', 'soy sauce',
        'hot sauce', 'sriracha', 'worcestershire', 'barbecue sauce',
        'bbq sauce', 'hoisin', 'teriyaki', 'fish sauce', 'oyster sauce',
        'pesto', 'marinara', 'salad dressing', 'ranch', 'vinaigrette',
        'tahini', 'miso', 'gochujang', 'sambal', 'chili crisp',
        'chili crunch', 'chimichurri', 'harissa',
    ],
    'Spices & Seasonings': [
        'salt', 'pepper', 'black pepper', 'cumin', 'paprika',
        'chili powder', 'cayenne', 'cinnamon', 'nutmeg', 'clove',
        'turmeric', 'coriander', 'oregano', 'bay leaf', 'red pepper flake',
        'garlic powder', 'onion powder', 'smoked paprika', 'curry powder',
        'garam masala', 'cardamom', 'allspice', 'za\'atar', 'zaatar',
        'italian seasoning', 'taco seasoning', 'everything bagel seasoning',
        'seasoning', 'spice',
    ],
    'Oils & Vinegars': [
        'olive oil', 'vegetable oil', 'canola oil', 'coconut oil',
        'sesame oil', 'avocado oil', 'cooking spray', 'vinegar',
        'balsamic', 'apple cider vinegar', 'red wine vinegar',
        'white wine vinegar', 'rice vinegar', 'sherry vinegar',
    ],
    'Baking': [
        'flour', 'sugar', 'brown sugar', 'powdered sugar',
        'baking soda', 'baking powder', 'yeast', 'cornstarch',
        'vanilla', 'vanilla extract', 'cocoa', 'chocolate chip',
        'chocolate', 'honey', 'maple syrup', 'molasses', 'corn syrup',
        'almond extract', 'food coloring', 'gelatin', 'pectin',
    ],
    'Frozen': [
        'frozen', 'ice cream', 'frozen vegetable', 'frozen fruit',
        'frozen pizza', 'frozen dinner',
    ],
    'Beverages': [
        'water', 'juice', 'wine', 'beer', 'coffee', 'tea',
        'soda', 'sparkling water', 'club soda', 'tonic',
    ],
}


def _grocery_category(ingredient_name):
    name_lower = ingredient_name.lower()
    # Build a flat list of (keyword, category) sorted longest-first
    # so "rice vinegar" matches Oils & Vinegars before "rice" matches Pasta & Grains
    matches = []
    for category, keywords in GROCERY_CATEGORIES.items():
        for keyword in keywords:
            if keyword in name_lower:
                matches.append((len(keyword), keyword, category))
    if matches:
        matches.sort(reverse=True)
        return matches[0][2]
    return 'Other'


# --- JSON API endpoints (called via fetch from form JS) ---

@csrf_exempt
@require_POST
def api_parse_recipe(request):
    try:
        body = json.loads(request.body)
        url = body.get('url', '').strip()
        if not url:
            return JsonResponse({'error': 'URL is required'}, status=400)
        recipe = parse_recipe_from_url(url)
        return JsonResponse({'recipe': recipe})
    except ValueError as e:
        return JsonResponse({'error': 'Failed to parse recipe', 'message': str(e)}, status=500)
    except Exception as e:
        return JsonResponse({'error': 'Failed to parse recipe', 'message': str(e)}, status=500)


@csrf_exempt
@require_POST
def api_parse_ingredients(request):
    try:
        body = json.loads(request.body)
        text = body.get('text', '')
        if not text:
            return JsonResponse({'error': 'Text is required'}, status=400)
        lines = [line.strip() for line in text.split('\n') if line.strip()]
        ingredients = parse_ingredients(lines)
        return JsonResponse({'ingredients': ingredients})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@csrf_exempt
@require_POST
def api_parse_images(request):
    try:
        files = request.FILES.getlist('images')
        if not files:
            return JsonResponse({'error': 'At least one image is required'}, status=400)

        temp_paths = []
        try:
            for f in files:
                tmp = tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(f.name)[1])
                for chunk in f.chunks():
                    tmp.write(chunk)
                tmp.close()
                temp_paths.append(tmp.name)

            recipe = parse_recipe_from_images(temp_paths)
            return JsonResponse({'recipe': recipe})
        finally:
            for path in temp_paths:
                try:
                    os.unlink(path)
                except OSError:
                    pass
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


def api_health(request):
    return JsonResponse({'status': 'ok'})
