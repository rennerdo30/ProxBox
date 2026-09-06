import { useState } from 'react'
import ResourcePage, { Pagination } from '../../components/ResourcePage'
import Alert from '../../components/Alert'
import { useResource } from '../../hooks/useResource'
import { useAuth } from '../../hooks/useAuth'
import { Account } from '../../lib/resources'
import { api } from '../../services/api'
export default function Users() {
  const [page, setPage] = useState(0)
  const resource = useResource<Account[]>(
    `/api/users/?skip=${page * 50}&limit=50`,
  )
  const { user: currentUser } = useAuth()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function update(user: Account, changes: Partial<Account>) {
    if (!window.confirm(`Update access for ${user.username}?`)) return
    setBusy(true)
    setError('')
    try {
      await api.put(`/api/users/admin/${user.id}`, changes)
      resource.reload()
    } catch {
      setError('Could not update account access. Please retry.')
    } finally {
      setBusy(false)
    }
  }
  const users = resource.data ?? []
  return (
    <ResourcePage title="Users" {...resource}>
      {error && <Alert>{error}</Alert>}
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-left">
          <thead>
            <tr>
              <th className="p-3">Username</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr className="border-t" key={user.id}>
                <td className="p-3">{user.username}</td>
                <td>{user.email}</td>
                <td>{user.role}</td>
                <td>{user.is_active ? 'Active' : 'Disabled'}</td>
                <td className="flex flex-wrap gap-2 py-3">
                  <button
                    className="btn btn-secondary"
                    disabled={busy || user.id === currentUser?.id}
                    onClick={() =>
                      update(user, {
                        role: user.role === 'admin' ? 'user' : 'admin',
                      })
                    }
                  >
                    {user.role === 'admin' ? 'Remove admin' : 'Make admin'}
                  </button>
                  <button
                    className="btn btn-secondary"
                    disabled={busy || user.id === currentUser?.id}
                    onClick={() => update(user, { is_active: !user.is_active })}
                  >
                    {user.is_active ? 'Disable' : 'Enable'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!users.length && <p className="p-4">No users on this page.</p>}
      </div>
      <Pagination page={page} count={users.length} onChange={setPage} />
    </ResourcePage>
  )
}
