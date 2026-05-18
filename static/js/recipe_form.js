document.addEventListener('DOMContentLoaded', function() {
  const ingredientList = document.getElementById('ingredient-list');
  const totalFormsInput = document.querySelector('[name="ingredients-TOTAL_FORMS"]');
  const initialFormsInput = document.querySelector('[name="ingredients-INITIAL_FORMS"]');

  // --- Add Ingredient Row ---
  document.getElementById('add-ingredient-btn').addEventListener('click', function() {
    addIngredientRow();
  });

  function addIngredientRow(data) {
    const idx = parseInt(totalFormsInput.value);
    const row = document.createElement('div');
    row.className = 'ingredient-row';
    row.dataset.index = idx;
    row.innerHTML =
      '<input type="hidden" name="ingredients-' + idx + '-id" value="" id="id_ingredients-' + idx + '-id">' +
      '<input type="text" name="ingredients-' + idx + '-name" value="' + esc(data && data.name || '') + '" placeholder="Ingredient name" class="form-input">' +
      '<input type="text" name="ingredients-' + idx + '-amount" value="' + esc(data && data.amount || '') + '" placeholder="Amount" class="form-input">' +
      '<input type="text" name="ingredients-' + idx + '-unit" value="' + esc(data && data.unit || '') + '" placeholder="Unit" class="form-input">' +
      '<input type="hidden" name="ingredients-' + idx + '-order" value="' + idx + '">' +
      '<input type="hidden" name="ingredients-' + idx + '-recipe" value="">' +
      '<button type="button" class="btn btn-danger remove-ingredient" style="padding: 0.5rem 0.75rem;">&times;</button>';
    ingredientList.appendChild(row);
    totalFormsInput.value = idx + 1;
  }

  function esc(s) {
    var d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML.replace(/"/g, '&quot;');
  }

  // --- Remove Ingredient ---
  ingredientList.addEventListener('click', function(e) {
    if (e.target.classList.contains('remove-ingredient')) {
      var rows = ingredientList.querySelectorAll('.ingredient-row');
      if (rows.length > 1) {
        e.target.closest('.ingredient-row').remove();
        reindex();
      }
    }
  });

  function reindex() {
    var rows = ingredientList.querySelectorAll('.ingredient-row');
    rows.forEach(function(row, i) {
      row.dataset.index = i;
      row.querySelectorAll('input').forEach(function(input) {
        var name = input.name.replace(/ingredients-\d+-/, 'ingredients-' + i + '-');
        input.name = name;
        if (input.id) {
          input.id = input.id.replace(/ingredients-\d+-/, 'ingredients-' + i + '-');
        }
        if (input.name.endsWith('-order')) input.value = i;
        // Clear stale PKs so Django treats them as new
        if (input.name.endsWith('-id')) input.value = '';
      });
    });
    totalFormsInput.value = rows.length;
    initialFormsInput.value = 0;
  }

  // --- URL Import ---
  var importUrlInput = document.getElementById('import-url');
  var importUrlBtn = document.getElementById('import-url-btn');
  var importUrlError = document.getElementById('import-url-error');
  var importUrlLoading = document.getElementById('import-url-loading');

  importUrlBtn.addEventListener('click', function() { doImportUrl(); });
  importUrlInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') { e.preventDefault(); doImportUrl(); }
  });
  importUrlInput.addEventListener('paste', function(e) {
    setTimeout(function() {
      var val = importUrlInput.value.trim();
      if (val.startsWith('http://') || val.startsWith('https://')) {
        doImportUrl(val);
      }
    }, 100);
  });

  function doImportUrl(url) {
    url = url || importUrlInput.value.trim();
    if (!url) { showError(importUrlError, 'Please enter a URL'); return; }
    importUrlError.style.display = 'none';
    importUrlLoading.style.display = 'block';
    importUrlBtn.disabled = true;

    fetch('/api/parse-recipe/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: url })
    })
    .then(function(r) { return r.json().then(function(d) { return { ok: r.ok, data: d }; }); })
    .then(function(res) {
      if (!res.ok) throw new Error(res.data.message || 'Failed to import');
      populateForm(res.data.recipe);
      importUrlInput.value = '';
    })
    .catch(function(err) { showError(importUrlError, err.message); })
    .finally(function() {
      importUrlLoading.style.display = 'none';
      importUrlBtn.disabled = false;
    });
  }

  function populateForm(recipe) {
    if (recipe.title) document.getElementById('id_title').value = recipe.title;
    if (recipe.servings) document.getElementById('id_servings').value = recipe.servings;
    if (recipe.prepTime) document.getElementById('id_prep_time').value = recipe.prepTime;
    if (recipe.cookTime) document.getElementById('id_cook_time').value = recipe.cookTime;
    if (recipe.directions && recipe.directions.length) {
      document.getElementById('id_directions_text').value = recipe.directions.join('\n');
    }
    if (recipe.sourceUrl) document.getElementById('id_source_url').value = recipe.sourceUrl;
    if (recipe.tags && recipe.tags.length) document.getElementById('id_tags_text').value = recipe.tags.join(', ');
    if (recipe.imageUrl) document.getElementById('id_image_url').value = recipe.imageUrl;

    if (recipe.ingredients && recipe.ingredients.length) {
      // Clear existing rows and reset formset counters
      ingredientList.innerHTML = '';
      totalFormsInput.value = 0;
      initialFormsInput.value = 0;
      recipe.ingredients.forEach(function(ing) { addIngredientRow(ing); });
    }
  }

  // --- Image Import ---
  var imageUpload = document.getElementById('image-upload');
  var imageLoading = document.getElementById('image-loading');
  var imageError = document.getElementById('image-error');

  imageUpload.addEventListener('change', function() {
    if (!imageUpload.files || !imageUpload.files.length) return;
    imageError.style.display = 'none';
    imageLoading.style.display = 'block';

    var formData = new FormData();
    for (var i = 0; i < imageUpload.files.length; i++) {
      formData.append('images', imageUpload.files[i]);
    }

    fetch('/api/parse-images/', { method: 'POST', body: formData })
    .then(function(r) { return r.json().then(function(d) { return { ok: r.ok, data: d }; }); })
    .then(function(res) {
      if (!res.ok) throw new Error(res.data.message || 'Failed to parse images');
      populateForm(res.data.recipe);
      imageUpload.value = '';
    })
    .catch(function(err) { showError(imageError, err.message); })
    .finally(function() { imageLoading.style.display = 'none'; });
  });

  // --- Bulk Ingredients ---
  document.getElementById('bulk-add-btn').addEventListener('click', function() {
    var text = document.getElementById('bulk-ingredients').value.trim();
    if (!text) return;

    this.disabled = true;
    var btn = this;

    fetch('/api/parse-ingredients/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: text })
    })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (data.ingredients) {
        // Remove empty rows first
        var rows = ingredientList.querySelectorAll('.ingredient-row');
        rows.forEach(function(row) {
          var nameInput = row.querySelector('input[name$="-name"]');
          if (nameInput && !nameInput.value.trim()) row.remove();
        });
        reindex();
        data.ingredients.forEach(function(ing) { addIngredientRow(ing); });
        document.getElementById('bulk-ingredients').value = '';
      }
    })
    .catch(function(err) { alert('Failed to parse ingredients: ' + err.message); })
    .finally(function() { btn.disabled = false; });
  });

  function showError(el, msg) {
    el.textContent = msg;
    el.style.display = 'block';
  }
});
