# Dinner Bell - Development Plan

## Architecture Decisions

### Frontend Stack
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite (fast dev server, optimized builds)
- **Routing**: React Router v6 (when needed for multi-page navigation)
- **State Management**: React Context API (recipes, meal plans, grocery lists)
- **Styling**: CSS Modules or Tailwind CSS (decision pending)
- **Storage**: LocalStorage for MVP, migrate to backend later

### Backend & Data (Future)
- **Database**:
  - Option 1: Firebase (quick setup, real-time sync, authentication)
  - Option 2: Supabase (PostgreSQL, open-source, great DX)
  - Option 3: Custom Node.js/Express + PostgreSQL
- **API**: REST or GraphQL (depends on backend choice)
- **Authentication**: Firebase Auth or Supabase Auth
- **File Storage**: For recipe images (Firebase Storage / Supabase Storage / Cloudinary)

### Recipe Parsing
- **URL Parser**:
  - Custom scraper using cheerio/puppeteer
  - Third-party API: Recipe Scrapers, Spoonacular API
  - OpenAI API for intelligent extraction
- **Implementation**: Server-side to avoid CORS issues

### Vision Model (Refrigerator/Pantry Tracker)
- **Options**:
  - TensorFlow.js (browser-based, lighter models)
  - Cloud Vision APIs (Google Vision, AWS Rekognition)
  - Custom model with PyTorch + FastAPI backend
- **Approach**: Hybrid - simple detection in browser, complex recognition server-side

### Search & Filtering
- **Client-side**: Fuse.js for fuzzy search (sufficient for MVP)
- **Server-side**: PostgreSQL full-text search or Elasticsearch (future scaling)

---

## Development Roadmap

### Phase 1: Core Recipe Management ✅
**Status**: ✅ COMPLETE

**Completed**:
- [x] Project setup with React + TypeScript + Vite
- [x] Recipe data model and TypeScript interfaces
- [x] Recipe storage context with LocalStorage
- [x] Basic recipe list display
- [x] React Router setup (v6)
- [x] Add recipe form (manual entry)
  - [x] Title input
  - [x] Dynamic ingredient inputs (add/remove)
  - [x] Directions text area (parsed into array)
  - [x] Servings number input
  - [x] Prep time, cook time (in minutes)
  - [x] Tags, tools, source URL, image URL
  - [x] Form validation (title, ingredients, directions)
- [x] Recipe detail view
  - [x] Full recipe display with all metadata
  - [x] Ingredient list formatting
  - [x] Step-by-step numbered directions
  - [x] Metadata (times, servings, tags, tools)
- [x] Edit recipe functionality
  - [x] Reuse RecipeForm component with edit mode
  - [x] Pre-populate form with existing data
- [x] Delete recipe with confirmation
  - [x] ConfirmDialog reusable component
  - [x] Delete action with context update
  - [x] Keyboard support (Enter/Escape)
- [x] Basic styling and layout
  - [x] Responsive grid for recipe cards
  - [x] Form styling with inline styles
  - [x] Navigation/header styling
  - [x] Mobile-first responsive design
  - [x] Dark/light mode support
  - [x] Hover effects and transitions

**Success Criteria**: ✅ Users can manually add, view, edit, and delete recipes with a clean, usable interface

**Deployment**: Dev server running at http://localhost:5173/

---

### Phase 2: Enhanced Recipe Input
**Status**: In Progress

- [x] Recipe URL parser integration
  - [x] Research and select parsing solution (JSON-LD + Cheerio)
  - [x] Implement parser service
  - [x] Handle common recipe sites (AllRecipes, Food Network, NYTimes Cooking)
  - [x] Fallback for unsupported sites
- [x] Import recipe from URL feature
- [x] Ingredient parser (convert text to structured data)
- [ ] Bulk import (multiple recipes)
- [x] Recipe image upload/URL (OCR support implemented)

**Success Criteria**: Users can paste URLs and automatically extract recipe data

---

### Phase 3: Search & Discovery
**Status**: Not Started

- [ ] Search implementation
  - [ ] Search by recipe title
  - [ ] Search by ingredient
  - [ ] Search by tools/equipment
  - [ ] Tag-based filtering
- [ ] Advanced filters
  - [ ] Prep time range
  - [ ] Cook time range
  - [ ] Servings
  - [ ] Multiple tools selection
- [ ] Sort options (recently added, alphabetical, recently made)
- [ ] Search results UI with highlighting

**Success Criteria**: Users can quickly find recipes by multiple criteria

---

### Phase 4: Meal Planning
**Status**: Not Started

- [ ] Calendar integration
  - [ ] Weekly/monthly calendar view
  - [ ] Drag-and-drop recipe assignment
  - [ ] Date tracking for when recipes were made
- [ ] Meal planner with smart suggestions
  - [ ] Filter by ingredient type
  - [ ] Filter by cooking tool
  - [ ] Filter by prep/cook time
  - [ ] Suggestion algorithm based on recent ingredients
- [ ] Meal history tracking
- [ ] Repeat favorite meals feature

**Success Criteria**: Users can plan meals for the week and track cooking history

---

### Phase 5: Grocery List Builder
**Status**: Not Started

- [ ] Generate grocery list from selected recipes
- [ ] Ingredient aggregation (combine duplicate ingredients)
- [ ] Manual list editing (add/remove items)
- [ ] Check off items as purchased
- [ ] List persistence
- [ ] Export/share list (print, SMS, email)
- [ ] Categorize by food type (produce, dairy, meat, etc.)

**Success Criteria**: Users can generate and manage grocery lists from meal plans

---

### Phase 6: Servings Adjustment
**Status**: Not Started

- [ ] Dynamic servings calculator
- [ ] Ingredient quantity scaling
- [ ] Fractional display (1/2 cup, 1 1/3 cups, etc.)
- [ ] Update directions if quantity-dependent
- [ ] Save custom serving sizes

**Success Criteria**: Users can adjust recipes for any number of servings

---

### Phase 7: Tagging System
**Status**: Not Started

- [ ] Tag creation and management
- [ ] Pre-defined tags (breakfast, lunch, dinner, dessert, vegetarian, etc.)
- [ ] Custom user tags
- [ ] Tag-based filtering and grouping
- [ ] Tag statistics (most used tags)
- [ ] Bulk tagging

**Success Criteria**: Users can organize recipes with flexible tagging

---

### Phase 8: Backend Migration
**Status**: Not Started

- [ ] Select and set up backend platform (Firebase/Supabase/Custom)
- [ ] Database schema design
- [ ] API endpoints for CRUD operations
- [ ] User authentication system
- [ ] Data migration from LocalStorage
- [ ] Sync mechanism (online/offline support)
- [ ] User account management

**Success Criteria**: Data persists across devices with user accounts

---

### Phase 9: Advanced Features
**Status**: Not Started

#### Recipe Discovery
- [ ] New recipe finder algorithm
- [ ] Integration with recipe APIs (Spoonacular, Edamam)
- [ ] Personalized recommendations
- [ ] Based on highly-rated recipes
- [ ] Based on ingredients from recent meals
- [ ] User rating system for recipes

#### Store Helper
- [ ] Grocery store locator (Google Maps integration)
- [ ] Store layout parser (crowd-sourced or manual)
- [ ] Organize grocery list by aisle
- [ ] Store preferences

#### Refrigerator Tracker
- [ ] Camera integration
- [ ] Vision model for ingredient recognition
- [ ] Manual ingredient entry
- [ ] Expiration date tracking
- [ ] Low stock alerts
- [ ] Recipe suggestions based on available ingredients

#### Kitchen Appliance Tracker
- [ ] Appliance inventory (on account creation)
- [ ] Mutable settings page for appliances
- [ ] Filter recipes by available appliances
- [ ] Appliance-specific recipe suggestions

**Success Criteria**: Users have advanced tools for meal planning and pantry management

---

## Technical Debt & Improvements

### Code Quality
- [ ] Set up ESLint configuration
- [ ] Add Prettier for code formatting
- [ ] Unit tests with Vitest
- [ ] Component tests with React Testing Library
- [ ] E2E tests with Playwright/Cypress

### Performance
- [ ] Code splitting and lazy loading
- [ ] Image optimization
- [ ] Debounce search input
- [ ] Virtual scrolling for large recipe lists
- [ ] PWA support (offline capability, installable)

### UX/UI
- [ ] Mobile-responsive design
- [ ] Dark mode support
- [ ] Accessibility audit (WCAG compliance)
- [ ] Loading states and skeletons
- [ ] Error boundaries and error handling
- [ ] Toast notifications for actions
- [ ] Keyboard shortcuts

### DevOps
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Automated testing in pipeline
- [ ] Deployment to Vercel/Netlify
- [ ] Environment configuration
- [ ] Monitoring and error tracking (Sentry)

---

## Current Sprint Focus

**Sprint Goal**: ✅ COMPLETE - Phase 1 Core Recipe Management

**Phase 1 Completed** (All tasks finished):
- ✅ Project foundation with React + TypeScript + Vite
- ✅ Recipe data model with comprehensive interfaces
- ✅ Context-based state management with LocalStorage persistence
- ✅ React Router v6 integration with 4 routes
- ✅ Page components (RecipeListPage, RecipeFormPage, RecipeDetailPage)
- ✅ Recipe form with dynamic ingredients and full validation
- ✅ Recipe detail view with all metadata
- ✅ Edit functionality using same form component
- ✅ Delete with confirmation dialog (keyboard accessible)
- ✅ Comprehensive styling with responsive design
- ✅ Dark/light mode support

**Ready for Phase 2**: Enhanced Recipe Input
- Next major feature: Recipe URL parser integration
- See Phase 2 section below for detailed roadmap

---

## Open Questions & Decisions Needed

### Immediate (Phase 1)
1. **Styling Approach**: CSS Modules, Tailwind CSS, or component library (MUI, Chakra)?
   - **Recommendation**: Start with CSS Modules for Phase 1 (simple, no dependencies)
   - Can migrate to Tailwind in Phase 2 once core features work
2. **Routing**: When to add React Router?
   - **Recommendation**: Add in this sprint for recipe detail view
   - Routes needed: `/` (list), `/recipe/new` (form), `/recipe/:id` (detail), `/recipe/:id/edit` (edit)

### Future (Phase 2+)
3. **Recipe Parser**: Build custom or use third-party API?
   - Options: OpenAI API, Spoonacular, custom cheerio scraper
4. **Backend Choice**: Firebase vs Supabase vs custom backend?
   - Evaluate in Phase 8 based on scaling needs
5. **Vision Model**: Client-side TensorFlow.js or server-side model?
   - Phase 9 feature, defer decision
6. **Component Library**: Use pre-built components or custom design system?
   - Start custom for learning, evaluate component library if development slows

---

## Design Patterns & Best Practices

### Component Architecture
```
App.tsx
├── RecipeProvider (Context)
│   ├── Routes
│   │   ├── / → RecipeListPage
│   │   │   ├── RecipeList
│   │   │   │   └── RecipeCard (multiple)
│   │   │   └── AddRecipeButton
│   │   ├── /recipe/new → RecipeFormPage
│   │   │   └── RecipeForm (mode: create)
│   │   ├── /recipe/:id → RecipeDetailPage
│   │   │   ├── RecipeDetail
│   │   │   └── ActionButtons (Edit, Delete)
│   │   └── /recipe/:id/edit → RecipeFormPage
│   │       └── RecipeForm (mode: edit)
```

### State Management Strategy
- **Global State** (RecipeContext): Recipe CRUD operations, recipe list
- **Local Component State**: Form inputs, UI toggles, modals
- **URL State**: Current recipe ID (via React Router params)
- **Derived State**: Filtered/sorted recipes (compute in component, don't store)

### Data Flow Patterns
1. **Create Recipe**: Form → RecipeContext.addRecipe() → LocalStorage → Navigate to detail
2. **Edit Recipe**: Load from context → Populate form → Update context → Navigate to detail
3. **Delete Recipe**: Confirmation modal → RecipeContext.deleteRecipe() → Navigate to list
4. **View Recipe**: Get ID from URL → RecipeContext.getRecipe() → Display

### Naming Conventions
- **Components**: PascalCase (e.g., `RecipeForm.tsx`)
- **Hooks**: camelCase with `use` prefix (e.g., `useRecipes`)
- **Types**: PascalCase (e.g., `Recipe`, `Ingredient`)
- **CSS Modules**: camelCase (e.g., `recipeCard.module.css`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `STORAGE_KEY`)

### File Organization
```
src/
├── components/          # Reusable UI components
│   ├── recipe/         # Recipe-specific components
│   ├── common/         # Shared components (Button, Modal, Input)
│   └── layout/         # Layout components (Header, Footer)
├── pages/              # Page-level components (connected to routes)
├── contexts/           # React Context providers
├── hooks/              # Custom hooks
├── types/              # TypeScript interfaces and types
├── utils/              # Helper functions
├── constants/          # App constants
└── styles/             # Global styles and CSS modules
```

### Testing Strategy (Phase 1+)
- **Unit Tests**: Utility functions, hooks
- **Component Tests**: User interactions, props
- **Integration Tests**: Context providers, data flow
- **E2E Tests**: Critical user journeys (add/edit/delete recipe)

---

## Performance Considerations

### Phase 1 Optimizations
- Use `React.memo` for RecipeCard to prevent unnecessary re-renders
- Debounce search input (when search is added in Phase 3)
- Lazy load recipe detail page

### Future Optimizations (Phase 3+)
- Virtual scrolling for 100+ recipes
- Image lazy loading and compression
- Code splitting by route
- Service worker for offline support (PWA)

---

## Accessibility Checklist

### Phase 1 Requirements
- [ ] Semantic HTML (headings, lists, forms)
- [ ] Keyboard navigation (Tab, Enter, Escape)
- [ ] Focus indicators on interactive elements
- [ ] ARIA labels for icon buttons
- [ ] Form validation with error messages
- [ ] Color contrast ratio ≥ 4.5:1

### Future Improvements
- [ ] Screen reader testing
- [ ] Skip to main content link
- [ ] ARIA live regions for dynamic content
- [ ] Keyboard shortcuts documentation
- [ ] High contrast mode support

---

## Error Handling Strategy

### Phase 1 (LocalStorage)
- **Form Validation**: Display inline errors for invalid inputs
- **Storage Errors**: Catch LocalStorage quota errors, show user-friendly message
- **Missing Data**: Handle missing recipe gracefully (redirect to list with message)
- **Error Boundary**: Catch component errors, display fallback UI

### Future (Backend Integration)
- **Network Errors**: Retry logic, offline queue
- **Authentication Errors**: Redirect to login
- **Validation Errors**: Display server-side validation messages
- **Rate Limiting**: Show user-friendly "too many requests" message

### User Feedback Patterns
```typescript
// Success: Toast notification (auto-dismiss in 3s)
"Recipe added successfully!"

// Error: Persistent error message with action
"Failed to save recipe. [Retry]"

// Warning: Dismissible alert
"Storage is almost full. Consider deleting old recipes."
```

---

## Future Backend API Design (Phase 8)

### RESTful Endpoints
```
GET    /api/recipes           # List all recipes (with pagination)
GET    /api/recipes/:id       # Get single recipe
POST   /api/recipes           # Create recipe
PUT    /api/recipes/:id       # Update recipe
DELETE /api/recipes/:id       # Delete recipe
GET    /api/recipes/search    # Search recipes (?q=pasta&tags=dinner)
```

### Data Synchronization Strategy
- **Optimistic Updates**: Update UI immediately, sync to server in background
- **Conflict Resolution**: Last-write-wins for MVP, eventually use version timestamps
- **Offline Support**: Queue mutations, sync when online
- **Real-time Updates**: WebSocket or polling for multi-device sync

### Authentication Flow
```
POST /api/auth/register       # Create account
POST /api/auth/login          # Get JWT token
POST /api/auth/refresh        # Refresh token
POST /api/auth/logout         # Invalidate token
GET  /api/auth/me             # Get current user
```

### Recipe Import Endpoints (Phase 2)
```
POST /api/recipes/import      # Parse recipe from URL
  Request: { url: string }
  Response: { recipe: RecipeFormData }
```

---

## Data Migration Strategy (Phase 8)

### LocalStorage → Backend Migration
1. User creates account
2. Prompt: "Import existing recipes?"
3. Read from LocalStorage
4. Batch upload to backend API
5. Verify successful upload
6. Clear LocalStorage (with backup option)
7. Show migration summary

### Backup & Export
- **Export Format**: JSON (schema.org Recipe compatible)
- **Export Options**: Single recipe, all recipes, filtered recipes
- **Import**: Allow re-importing exported JSON files

---

## Security Considerations

### Phase 1 (Client-side)
- Sanitize user input before rendering (prevent XSS)
- Validate data types before storing in LocalStorage
- No sensitive data storage (all data is public on the device)

### Phase 8 (Backend)
- **Authentication**: JWT with httpOnly cookies
- **Authorization**: Users can only access their own recipes
- **Input Validation**: Server-side validation for all inputs
- **Rate Limiting**: Prevent abuse (100 requests/minute per user)
- **CORS**: Whitelist only production domain
- **SQL Injection**: Use parameterized queries (or ORM)
- **Content Security Policy**: Restrict script sources

---

## Notes

- Keep components small and focused (single responsibility)
- Prioritize mobile experience (most users on phones while cooking)
- Ensure data can be exported (no vendor lock-in)
- Consider accessibility from the start (keyboard navigation, screen readers)
- Recipe data should follow schema.org Recipe format for potential SEO benefits
- Commit frequently with descriptive messages
- Document complex logic with comments
- Use TypeScript strictly (avoid `any` type)
- Test on multiple browsers (Chrome, Firefox, Safari, mobile browsers)
- Keep bundle size small (< 500KB initial load)
