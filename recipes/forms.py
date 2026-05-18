from django import forms
from django.forms import inlineformset_factory
from .models import Recipe, Ingredient


class RecipeForm(forms.ModelForm):
    directions_text = forms.CharField(
        widget=forms.Textarea(attrs={
            'rows': 8,
            'placeholder': '1. Preheat oven to 350\u00b0F\n2. Mix dry ingredients\n3. Add wet ingredients and stir...',
        }),
        label='Directions (one step per line)',
        help_text='Enter each step on a new line',
    )
    tags_text = forms.CharField(
        required=False,
        label='Tags (comma-separated)',
        widget=forms.TextInput(attrs={'placeholder': 'e.g., dinner, Italian, vegetarian'}),
    )
    tools_text = forms.CharField(
        required=False,
        label='Tools/Equipment (comma-separated)',
        widget=forms.TextInput(attrs={'placeholder': 'e.g., oven, skillet, food processor'}),
    )

    class Meta:
        model = Recipe
        fields = ['title', 'servings', 'prep_time', 'cook_time', 'source_url', 'image_url']
        widgets = {
            'title': forms.TextInput(attrs={'placeholder': 'Recipe title'}),
            'servings': forms.NumberInput(attrs={'min': 1}),
            'prep_time': forms.NumberInput(attrs={'min': 0, 'placeholder': 'e.g., 15'}),
            'cook_time': forms.NumberInput(attrs={'min': 0, 'placeholder': 'e.g., 30'}),
            'source_url': forms.URLInput(attrs={'placeholder': 'https://...'}),
            'image_url': forms.URLInput(attrs={'placeholder': 'https://...'}),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if self.instance and self.instance.pk:
            self.fields['directions_text'].initial = '\n'.join(self.instance.directions or [])
            self.fields['tags_text'].initial = ', '.join(self.instance.tags or [])
            self.fields['tools_text'].initial = ', '.join(self.instance.tools or [])

    def save(self, commit=True):
        recipe = super().save(commit=False)
        directions_raw = self.cleaned_data.get('directions_text', '')
        recipe.directions = [line.strip() for line in directions_raw.split('\n') if line.strip()]
        tags_raw = self.cleaned_data.get('tags_text', '')
        recipe.tags = [t.strip() for t in tags_raw.split(',') if t.strip()]
        tools_raw = self.cleaned_data.get('tools_text', '')
        recipe.tools = [t.strip() for t in tools_raw.split(',') if t.strip()]
        if commit:
            recipe.save()
        return recipe


class IngredientForm(forms.ModelForm):
    class Meta:
        model = Ingredient
        fields = ['name', 'amount', 'unit', 'order']
        widgets = {
            'name': forms.TextInput(attrs={'placeholder': 'Ingredient name'}),
            'amount': forms.TextInput(attrs={'placeholder': 'Amount'}),
            'unit': forms.TextInput(attrs={'placeholder': 'Unit'}),
            'order': forms.HiddenInput(),
        }


IngredientFormSet = inlineformset_factory(
    Recipe,
    Ingredient,
    form=IngredientForm,
    extra=1,
    can_delete=True,
)
