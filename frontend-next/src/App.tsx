import './App.css'

function App() {
  return (
    <div className="min-h-screen bg-bg-app text-text-primary flex items-center justify-center">
      <div className="bg-bg-surface border border-border rounded-lg p-8 shadow-md max-w-md w-full text-center">
        <h1 className="text-3xl font-bold mb-2">LyfeHub</h1>
        <p className="text-text-secondary text-sm">
          Tech stack upgrade — React + TypeScript + Vite + Tailwind
        </p>
        <div className="mt-6 flex gap-3 justify-center">
          <span className="px-3 py-1 rounded-md bg-accent-light text-accent text-xs font-medium">
            React 19
          </span>
          <span className="px-3 py-1 rounded-md bg-accent-light text-accent text-xs font-medium">
            TypeScript
          </span>
          <span className="px-3 py-1 rounded-md bg-accent-light text-accent text-xs font-medium">
            Tailwind 4
          </span>
        </div>
      </div>
    </div>
  )
}

export default App
