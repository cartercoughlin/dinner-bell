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

### Phase 1: Core Recipe Management ✓
**Status**: In Progress

- [x] Project setup with React + TypeScript + Vite
- [x] Recipe data model and TypeScript interfaces
- [x] Recipe storage context with LocalStorage
- [x] Basic recipe list display
- [ ] Add recipe form (manual entry)
- [ ] Recipe detail view
- [ ] Edit recipe functionality
- [ ] Delete recipe with confirmation
- [ ] Basic styling and layout

**Success Criteria**: Users can manually add, view, edit, and delete recipes

---

### Phase 2: Enhanced Recipe Input
**Status**: Not Started

- [ ] Recipe URL parser integration
  - [ ] Research and select parsing solution
  - [ ] Implement parser service
  - [ ] Handle common recipe sites (AllRecipes, Food Network, NYTimes Cooking)
  - [ ] Fallback for unsupported sites
- [ ] Import recipe from URL feature
- [ ] Ingredient parser (convert text to structured data)
- [ ] Bulk import (multiple recipes)
- [ ] Recipe image upload/URL

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

**Sprint Goal**: Complete Phase 1 - Core Recipe Management

**In Progress**:
- Recipe form for manual entry
- Basic styling with component library (decision needed)

**Next Up**:
- Recipe detail view
- Edit/delete functionality

---

## Open Questions & Decisions Needed

1. **Styling Approach**: CSS Modules, Tailwind CSS, or component library (MUI, Chakra)?
2. **Recipe Parser**: Build custom or use third-party API?
3. **Backend Choice**: Firebase vs Supabase vs custom backend?
4. **Vision Model**: Client-side TensorFlow.js or server-side model?
5. **Component Library**: Use pre-built components or custom design system?

---

## Notes

- Keep components small and focused (single responsibility)
- Prioritize mobile experience (most users on phones while cooking)
- Ensure data can be exported (no vendor lock-in)
- Consider accessibility from the start (keyboard navigation, screen readers)
- Recipe data should follow schema.org Recipe format for potential SEO benefits
