import './App.css'
import { Route, Routes } from 'react-router-dom'
import { AuthProvider, RequireAuth, RequireRole } from './auth'
import { Layout } from './Layout'
import { LoginPage } from './LoginPage'
import { NewReferralPage } from './NewReferralPage'
import { ReferralDetailPage } from './ReferralDetailPage'
import { ReferralListPage } from './ReferralListPage'

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<RequireAuth />}>
          <Route element={<Layout />}>
            <Route index element={<ReferralListPage />} />
            <Route element={<RequireRole roles={['referrer', 'admin']} />}>
              <Route path="referrals/new" element={<NewReferralPage />} />
            </Route>
            <Route path="referrals/:id" element={<ReferralDetailPage />} />
            <Route path="*" element={<p>Page not found.</p>} />
          </Route>
        </Route>
      </Routes>
    </AuthProvider>
  )
}
