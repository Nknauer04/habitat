import { useEffect } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import UpdatePrompt from './components/UpdatePrompt'
import Goals from './pages/Goals'
import Profile from './pages/Profile'
import History from './pages/History'
import Review from './pages/Review'
import Areas from './pages/Areas'
import Settings from './pages/Settings'
import StravaCallback from './pages/StravaCallback'
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
          <Route path="profil" element={<Profile />} />
          <Route path="einstellungen" element={<Settings />} />
          <Route path="bereiche" element={<Areas />} />
          <Route path="strava" element={<StravaCallback />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
