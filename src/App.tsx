import { useEffect } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import UpdatePrompt from './components/UpdatePrompt'
import Goals from './pages/Goals'
import History from './pages/History'
import Review from './pages/Review'
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
      <UpdatePrompt />
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Today />} />
          <Route path="ziele" element={<Goals />} />
          <Route path="verlauf" element={<History />} />
          <Route path="rueckblick" element={<Review />} />
          <Route path="rueckblick/:week" element={<Review />} />
          <Route path="einstellungen" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
