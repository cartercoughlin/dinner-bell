import { createWorker } from 'tesseract.js';
import { parseIngredients } from './recipeParser.js';
import fs from 'node:fs';

interface ParsedRecipe {
    title: string;
    ingredients: Array<{ id: string; name: string; amount: string; unit: string }>;
    directions: string[];
    servings?: number;
    prepTime?: number;
    cookTime?: number;
}

export async function parseRecipeFromImages(imagePaths: string[]): Promise<ParsedRecipe> {
    console.log(`Starting OCR on ${imagePaths.length} images...`);
    const worker = await createWorker('eng');

    let combinedText = '';

    try {
        for (const path of imagePaths) {
            console.log(`Processing image: ${path}`);
            if (!fs.existsSync(path)) {
                console.error(`Image path does not exist: ${path}`);
                continue;
            }

            const stats = fs.statSync(path);
            if (stats.size < 1000) {
                console.log(`Skipping tiny file: ${path} (${stats.size} bytes)`);
                continue;
            }

            const imageBuffer = fs.readFileSync(path);
            const { data: { text } } = await worker.recognize(imageBuffer);
            combinedText += text + '\n';
        }
    } catch (error) {
        console.error('OCR Error:', error);
        throw new Error('Failed to extract text from images. Please ensure they are clear photos of a recipe.');
    } finally {
        await worker.terminate();
    }

    // Basic cleanup and extraction logic
    const lines = combinedText.split('\n').map(l => l.trim()).filter(l => l);

    // Heuristic: Find a good title
    let title = 'Imported Recipe';
    const brandingPatterns = /half[- \s]*baked|harvest|tieghan|gerard|calories|prep|cook|total|time|servings|recipe/i;

    for (let i = 0; i < Math.min(lines.length, 15); i++) {
        const line = lines[i].trim();
        // Cleaner line without symbols for checking
        const alphaOnly = line.replace(/[^a-zA-Z]/g, '').toLowerCase();

        // Skip common branding and short noise
        if (line.length > 8 &&
            !brandingPatterns.test(line) &&
            !line.includes('http') &&
            alphaOnly.length > 5) {
            title = line.replace(/^[|—\-\s]+|[|—\-\s]+$/g, '').trim();
            break;
        }
    }

    const ingredients: string[] = [];
    const directions: string[] = [];
    let servings: number | undefined;
    let prepTime: number | undefined;
    let cookTime: number | undefined;

    let currentSection: 'none' | 'ingredients' | 'directions' = 'none';

    // More flexible regex for headers that might have OCR noise around them
    const ingredientKeywords = /(ingredients|what you'll need|shopping list)/i;
    const directionKeywords = /(directions|instructions|steps|method|how to make)/i;
    const servingsKeywords = /servings?:?\s*(\d+)/i;
    const prepTimeKeywords = /prep\s*time:?\s*(\d+)/i;
    const cookTimeKeywords = /cook\s*time:?\s*(\d+)/i;

    for (const line of lines) {
        // Try to extract metadata
        const servingsMatch = line.match(servingsKeywords);
        if (servingsMatch && !servings) servings = parseInt(servingsMatch[1]);

        const prepMatch = line.match(prepTimeKeywords);
        if (prepMatch && !prepTime) prepTime = parseInt(prepMatch[1]);

        const cookMatch = line.match(cookTimeKeywords);
        if (cookMatch && !cookTime) cookTime = parseInt(cookMatch[1]);

        // Section detection - check for instructions BEFORE ingredients to be safe
        // And don't require the keyword to be the start of the line to handle things like "| Instructions"
        if (directionKeywords.test(line)) {
            currentSection = 'directions';
            continue;
        }
        if (ingredientKeywords.test(line) && currentSection !== 'directions') {
            currentSection = 'ingredients';
            continue;
        }

        if (currentSection === 'ingredients') {
            // Basic cleanup of bullet points and OCR noise like "E" or "|"
            const cleaned = line.replace(/^[^a-zA-Z0-9\d(¼-¾)]+\s*/, '').trim();
            if (cleaned && cleaned.length > 2) ingredients.push(cleaned);
        } else if (currentSection === 'directions') {
            // Cleanup leading numbers and OCR debris
            const cleaned = line.replace(/^\d+\.?\s*(\d+\.?\s*)?/, '').replace(/^[|•-]\s*/, '').trim();
            if (cleaned && cleaned.length > 3 && !cleaned.includes('footer') && !cleaned.includes('http')) {
                directions.push(cleaned);
            }
        }
    }

    // Fallback: if no sections found, try to guess
    let finalIngredients = ingredients;
    let finalDirections = directions;

    if (finalIngredients.length === 0 && finalDirections.length === 0) {
        const half = Math.floor(lines.length / 2);
        finalIngredients = lines.slice(1, half);
        finalDirections = lines.slice(half);
    }

    return {
        title,
        ingredients: parseIngredients(finalIngredients),
        directions: finalDirections.length > 0 ? finalDirections : ['No directions found in scanning. Please add manually.'],
        servings,
        prepTime,
        cookTime,
    };
}
