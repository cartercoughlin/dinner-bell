# 🔔 Dinner Bell

A modern recipe management app built with React and TypeScript. Organize your recipes, plan meals, and generate grocery lists all in one place.

## Current Status

**Phase 1 of 9**: Core Recipe Management (In Progress)
- Foundation complete with React, TypeScript, and LocalStorage
- Building manual recipe entry, detail view, and edit/delete functionality
- See [PLAN.md](./PLAN.md) for complete roadmap

## Features

### ✅ Implemented

- **Project Foundation**: React 18 + TypeScript + Vite setup with ESLint
- **Data Models**: Comprehensive TypeScript interfaces for recipes, ingredients, and metadata
- **Recipe Storage**: LocalStorage-based persistence with full CRUD operations
- **React Context**: Centralized state management with `RecipeProvider` and `useRecipes` hook
- **Recipe List**: Display all saved recipes in a grid with basic information
- **Development Plan**: Comprehensive 9-phase roadmap with architecture decisions

### 🚧 In Progress (Phase 1)

- React Router v6 integration for multi-page navigation
- Recipe form for manual entry (create/edit modes)
- Recipe detail view with full ingredient/direction display
- Edit and delete functionality with confirmation
- Basic styling with CSS Modules and responsive layout

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

### Current (Phase 1)
- **React 18** - UI framework with hooks and Context API
- **TypeScript** - Strict type safety and better developer experience
- **Vite** - Fast dev server and optimized production builds
- **LocalStorage** - Client-side data persistence (MVP)
- **CSS Modules** - Component-scoped styling (planned)

### Planned (Future Phases)
- **React Router v6** - Client-side routing (Phase 1)
- **Backend**: Firebase, Supabase, or custom Node.js/Express (Phase 8)
- **Database**: PostgreSQL or Firebase Firestore (Phase 8)
- **Recipe Parser**: OpenAI API or custom scraper (Phase 2)
- **Vision Model**: For refrigerator tracking (Phase 9)

See [PLAN.md](./PLAN.md) for detailed architecture decisions, design patterns, and complete development roadmap.

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
│   ├── components/          # React components
│   │   ├── recipe/         # Recipe-specific components (planned)
│   │   ├── common/         # Shared UI components (planned)
│   │   ├── layout/         # Layout components (planned)
│   │   └── RecipeList.tsx
│   ├── pages/              # Page-level components (planned)
│   ├── contexts/           # React Context providers
│   │   └── RecipeContext.tsx
│   ├── hooks/              # Custom hooks (planned)
│   ├── types/              # TypeScript type definitions
│   │   └── recipe.ts
│   ├── utils/              # Helper functions (planned)
│   ├── constants/          # App constants (planned)
│   ├── styles/             # CSS Modules (planned)
│   ├── App.tsx             # Main app component
│   ├── main.tsx            # Entry point
│   └── index.css           # Global styles
├── dist/                   # Production build output
├── PLAN.md                 # Development roadmap & architecture
├── DESCRIPTION.md          # Detailed explanation of every file
└── README.md
```

**Key Documentation**:
- [DESCRIPTION.md](./DESCRIPTION.md) - Detailed explanation of every file
- [PLAN.md](./PLAN.md) - Complete development roadmap with:
  - 9-phase development plan
  - Architecture decisions & design patterns
  - Component architecture diagrams
  - State management strategy
  - Error handling & security considerations
  - Future backend API design

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
