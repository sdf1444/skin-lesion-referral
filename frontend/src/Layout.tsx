import { Link, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from './auth'

export function Layout() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <main>
      <header className="topbar">
        <Link to="/"><strong>Skin Lesion Referral</strong></Link>
        <span>
          {user?.name} <small>({user?.role})</small>{' '}
          <button type="button" onClick={handleSignOut}>Sign out</button>
        </span>
      </header>
      <Outlet />
    </main>
  )
}
