import { useEffect } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import Placeholder from './pages/Placeholder'
import Settings from './pages/Settings'
import Today from './pages/Today'
import { requestPersistentStorage } from './lib/db'
import { startSyncEngine } from './lib/sync'

export default function App() {
  useEffect(() => {
    void requestPersistentStorage()
    return startSyncEngine()
  }, [])

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Today />} />
          <Route path="ziele" element={<Placeholder title="Ziele" hint="Kommt in einem späteren Schritt." />} />
          <Route path="verlauf" element={<Placeholder title="Verlauf" hint="Kommt in einem späteren Schritt." />} />
          <Route path="einstellungen" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
