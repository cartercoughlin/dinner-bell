# 🔔 Dinner Bell

A modern recipe management app built with React and TypeScript.

## Features

### ✅ Implemented

- **Recipe Storage**: LocalStorage-based recipe management with full CRUD operations
- **Data Models**: TypeScript interfaces for recipes, ingredients, and meal planning
- **React Context**: Centralized state management for recipes
- **Recipe List**: View all saved recipes with basic information

### 🚧 In Progress

- Recipe form for manual entry
- Recipe detail view
- Edit and delete functionality

### 📋 Planned Features

#### Must-haves
- Recipe URL parser for automatic data extraction
- Search by ingredient, title, and cooking tools
- Calendar for tracking when recipes were made
- Weekly meal planner with smart filters:
  - Ingredient type (steak, chicken, pasta)
  - Cooking tool (grill, crock pot, skillet)
  - Time to prepare
  - Suggestion generator for similar ingredients
- Built-in grocery list builder

#### Should-haves
- Adjust servings dynamically
- Recipe tagging system for organization

#### Could-haves
- New recipe finder based on highly-rated recipes and recent ingredients
- Store helper with grocery finder and aisle layout
- Refrigerator tracker with camera + vision model
- Kitchen appliance tracker for better recipe suggestions

## Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **React Router** - Navigation (planned)
- **LocalStorage** - Data persistence (MVP)

See [PLAN.md](./PLAN.md) for detailed architecture decisions and development roadmap.

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint

## Project Structure

```
dinner-bell/
├── src/
│   ├── components/       # React components
│   │   └── RecipeList.tsx
│   ├── contexts/         # React Context providers
│   │   └── RecipeContext.tsx
│   ├── types/            # TypeScript type definitions
│   │   └── recipe.ts
│   ├── App.tsx           # Main app component
│   ├── main.tsx          # Entry point
│   └── index.css         # Global styles
├── PLAN.md               # Development roadmap
└── README.md
```

## Contributing

This is a personal project, but suggestions and feedback are welcome!

## Development Roadmap

See [PLAN.md](./PLAN.md) for the complete development roadmap with 9 phases covering:
1. Core Recipe Management
2. Enhanced Recipe Input
3. Search & Discovery
4. Meal Planning
5. Grocery List Builder
6. Servings Adjustment
7. Tagging System
8. Backend Migration
9. Advanced Features (Discovery, Store Helper, Fridge Tracker)

## License

MIT
