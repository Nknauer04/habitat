import { useEffect } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import Placeholder from './pages/Placeholder'
import Settings from './pages/Settings'
import { requestPersistentStorage } from './lib/db'

export default function App() {
  useEffect(() => {
    void requestPersistentStorage()
  }, [])

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Placeholder title="Heute" hint="Hier erscheinen deine Gewohnheiten für heute." />} />
          <Route path="ziele" element={<Placeholder title="Ziele" hint="Kommt in einem späteren Schritt." />} />
          <Route path="verlauf" element={<Placeholder title="Verlauf" hint="Kommt in einem späteren Schritt." />} />
          <Route path="einstellungen" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
