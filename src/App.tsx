import { useState, useEffect } from 'react'
import ItemsTable from './components/ItemsTable'
import { Item, HealthResponse } from './types'
import './App.css'

const BASE_URL = 'http://localhost:8000'

function App() {
  const [items, setItems] = useState<Item[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [apiStatus, setApiStatus] = useState('Checking...')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setIsLoading(true)
    setErrorMessage(null)

    // Check health
    try {
      const healthRes = await fetch(`${BASE_URL}/health`)
      const health: HealthResponse = await healthRes.json()
      setApiStatus(health.status)
    } catch {
      setApiStatus('offline')
      setErrorMessage('API not running')
      setIsLoading(false)
      return
    }

    // Fetch items
    try {
      const itemsRes = await fetch(`${BASE_URL}/items`)
      const data: Item[] = await itemsRes.json()
      setItems(data)
    } catch {
      setErrorMessage('Failed to load items')
    }

    setIsLoading(false)
  }

  return (
    <div className="app">
      <header className="header">
        <h1>teamfred</h1>
        <div className="status">
          <span className={`status-dot ${apiStatus === 'healthy' ? 'healthy' : 'offline'}`} />
          <span className="status-text">{apiStatus}</span>
        </div>
      </header>

      <main className="content">
        {errorMessage ? (
          <div className="error-container">
            <span className="error-icon">Warning</span>
            <p className="error-message">{errorMessage}</p>
            <p className="error-hint">Start API: cd services/api && uv run fastapi dev</p>
          </div>
        ) : isLoading ? (
          <div className="loading">Loading items...</div>
        ) : (
          <ItemsTable items={items} />
        )}
      </main>
    </div>
  )
}

export default App
