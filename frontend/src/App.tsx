import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from './components/theme-provider'
import { DashboardLayout } from './components/layout/dashboard-layout'
import { Dashboard } from './pages/dashboard'
import { Members } from './pages/members'
import { Wars } from './pages/wars'
import { CWL } from './pages/cwl'
import { CapitalRaids } from './pages/capital-raids'
import { ClanGames } from './pages/clan-games'
import { Settings } from './pages/settings'
import { Recruitment } from './pages/recruitment'
import { Promotions } from './pages/promotions'

const queryClient = new QueryClient()

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="clan-manager-theme">
      <QueryClientProvider client={queryClient}>
        <Router>
          <Routes>
            <Route path="/" element={<DashboardLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="members" element={<Members />} />
              <Route path="wars" element={<Wars />} />
              <Route path="cwl" element={<CWL />} />
              <Route path="capital-raids" element={<CapitalRaids />} />
              <Route path="clan-games" element={<ClanGames />} />
              <Route path="recruitment" element={<Recruitment />} />
              <Route path="promotions" element={<Promotions />} />
              <Route path="settings" element={<Settings />} />
            </Route>
          </Routes>
        </Router>
      </QueryClientProvider>
    </ThemeProvider>
  )
}

export default App
