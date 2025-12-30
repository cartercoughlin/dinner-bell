import { RecipeProvider } from './contexts/RecipeContext';
import { RecipeList } from './components/RecipeList';

function App() {
  return (
    <RecipeProvider>
      <div className="app">
        <header>
          <h1>Dinner Bell</h1>
          <p>🔔 ding ding!</p>
        </header>
        <main>
          <RecipeList />
        </main>
      </div>
    </RecipeProvider>
  );
}

export default App;
