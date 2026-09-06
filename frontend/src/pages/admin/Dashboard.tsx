import { Link } from 'react-router-dom'
import Dashboard from '../Dashboard'
export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      <nav aria-label="Administration" className="flex flex-wrap gap-3">
        <Link className="btn btn-secondary" to="/admin/templates">
          Templates
        </Link>
        <Link className="btn btn-secondary" to="/admin/users">
          Users
        </Link>
        <Link className="btn btn-secondary" to="/vms">
          All virtual machines
        </Link>
      </nav>
      <Dashboard />
    </div>
  )
}
