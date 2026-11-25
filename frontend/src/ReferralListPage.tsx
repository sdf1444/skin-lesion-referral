import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listReferrals } from './api'
import { useAuth } from './auth'
import { StatusBadge } from './ReferralDetail'
import { STATUS_LABELS, type Referral, type Status } from './types'

export function ReferralListPage() {
  const { user } = useAuth()
  const [status, setStatus] = useState<Status | ''>('')
  const [rows, setRows] = useState<Referral[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    listReferrals(status || undefined, controller.signal)
      .then((r) => {
        setRows(r)
        setError(null)
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e instanceof Error ? e.message : 'Failed to load')
      })
    return () => controller.abort()
  }, [status])

  const canCreate = user?.role === 'referrer' || user?.role === 'admin'

  return (
    <>
      <h2>{user?.role === 'referrer' ? 'My referrals' : 'Referrals'}</h2>
      <div className="toolbar">
        <label>
          Status
          <select value={status} onChange={(e) => setStatus(e.target.value as Status | '')}>
            <option value="">All</option>
            {(Object.keys(STATUS_LABELS) as Status[]).map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
        </label>
        {canCreate && <Link to="/referrals/new" className="button">New referral</Link>}
      </div>
      {error && <p role="alert" className="error">{error}</p>}
      {rows && rows.length === 0 && <p>No referrals found.</p>}
      {rows && rows.length > 0 && (
        <table>
          <thead>
            <tr><th>Patient</th><th>Site</th><th>Priority</th><th>Status</th><th>Created</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td><Link to={`/referrals/${r.id}`}>{r.patientName}</Link></td>
                <td>{r.site}</td>
                <td><span className={r.urgency}>{r.urgency}</span></td>
                <td><StatusBadge status={r.status} /></td>
                <td>{new Date(r.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  )
}
