from django.db import models


class Recipe(models.Model):
    title = models.CharField(max_length=300)
    directions = models.JSONField(default=list)
    prep_time = models.PositiveIntegerField(null=True, blank=True, help_text='Minutes')
    cook_time = models.PositiveIntegerField(null=True, blank=True, help_text='Minutes')
    servings = models.PositiveIntegerField(default=4)
    source_url = models.URLField(max_length=2000, blank=True)
    tags = models.JSONField(default=list, blank=True)
    tools = models.JSONField(default=list, blank=True)
    image_url = models.URLField(max_length=2000, blank=True)
    date_added = models.DateTimeField(auto_now_add=True)
    last_made = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-date_added']

    def __str__(self):
        return self.title

    def tags_display(self):
        return ', '.join(self.tags) if self.tags else ''

    def tools_display(self):
        return ', '.join(self.tools) if self.tools else ''

    def directions_display(self):
        return '\n'.join(self.directions) if self.directions else ''

    @property
    def source_domain(self):
        if self.source_url:
            from urllib.parse import urlparse
            parsed = urlparse(self.source_url)
            return parsed.hostname or ''
        return ''


class Ingredient(models.Model):
    recipe = models.ForeignKey(Recipe, related_name='ingredients', on_delete=models.CASCADE)
    name = models.CharField(max_length=300)
    amount = models.CharField(max_length=50, blank=True)
    unit = models.CharField(max_length=50, blank=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order']

    def __str__(self):
        parts = []
        if self.amount:
            parts.append(self.amount)
        if self.unit:
            parts.append(self.unit)
        parts.append(self.name)
        return ' '.join(parts)


class MealPlan(models.Model):
    MEAL_CHOICES = [
        ('breakfast', 'Breakfast'),
        ('lunch', 'Lunch'),
        ('dinner', 'Dinner'),
    ]
    recipe = models.ForeignKey(Recipe, on_delete=models.CASCADE, related_name='meal_plans')
    date = models.DateField()
    meal_type = models.CharField(max_length=20, choices=MEAL_CHOICES, default='dinner')

    class Meta:
        ordering = ['date', 'meal_type']
        unique_together = ['date', 'meal_type']

    def __str__(self):
        return f'{self.date} - {self.get_meal_type_display()}: {self.recipe.title}'
