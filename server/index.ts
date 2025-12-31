import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { parseRecipeFromUrl, parseIngredients } from './recipeParser.js';
import { parseRecipeFromImages } from './imageParser.js';

const app = express();
const PORT = 3001;

// Configure multer for image uploads
const uploadDir = path.join(process.cwd(), 'uploads');
try {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
} catch (err) {
  console.error('Failed to create upload directory:', err);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Recipe parsing endpoint
app.post('/api/parse-recipe', async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    console.log(`Parsing recipe from: ${url}`);

    const recipe = await parseRecipeFromUrl(url);

    console.log(`Successfully parsed recipe: ${recipe.title}`);

    res.json({ recipe });
  } catch (error: any) {
    console.error('Error parsing recipe:', error.message || error);

    let message = 'An unexpected error occurred while parsing the recipe.';
    if (error.message?.includes('timeout')) {
      message = 'The request timed out. The website might be slow or blocking our connection.';
    } else if (error.message?.includes('403') || error.message?.includes('denied')) {
      message = 'Access was denied by the website. This site has strong anti-bot protections.';
    } else if (error instanceof Error) {
      message = error.message;
    }

    res.status(500).json({
      error: 'Failed to parse recipe',
      message
    });
  }
});

// Ingredient parsing endpoint for bulk text
app.post('/api/parse-ingredients', async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text is required' });
    }

    const lines = text.split('\n').map(line => line.trim()).filter(line => line);
    const ingredients = parseIngredients(lines);

    res.json({ ingredients });
  } catch (error) {
    console.error('Error parsing ingredients:', error);
    res.status(500).json({
      error: 'Failed to parse ingredients',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Recipe image parsing endpoint
app.post('/api/parse-images', upload.array('images'), async (req, res) => {
  try {
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'At least one image is required' });
    }

    console.log(`Parsing recipe from ${files.length} images`);
    const imagePaths = files.map(file => file.path);

    const recipe = await parseRecipeFromImages(imagePaths);

    // Clean up uploaded files after processing
    for (const filePath of imagePaths) {
      fs.unlink(filePath, (err) => {
        if (err) console.error(`Failed to delete temp file ${filePath}:`, err);
      });
    }

    res.json({ recipe });
  } catch (error) {
    console.error('Error parsing recipe from images:', error);
    res.status(500).json({
      error: 'Failed to parse recipe from images',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

app.listen(PORT, () => {
  console.log(`Recipe parser server running on http://localhost:${PORT}`);
});
