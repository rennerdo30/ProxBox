import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  FiArrowRight,
  FiCpu,
  FiHardDrive,
  FiLayers,
  FiPlus,
  FiRefreshCw,
  FiServer,
  FiSettings,
  FiUsers,
} from 'react-icons/fi'
import { IconType } from 'react-icons'
import { api } from '../services/api'
import { useAuth } from '../hooks/useAuth'
import { RECENT_VM_LIMIT } from '../lib/constants'
import Alert from '../components/Alert'
import UsageMeter from '../components/UsageMeter'

interface VM {
  id: number
  name: string
  status: string
  created_at: string
}

interface ClusterUsage {
  cpu_usage: number
  memory_usage: number
  disk_usage: number
}

interface QuickLink {
  to: string
  title: string
  description: string
  icon: IconType
}

const ADMIN_QUICK_LINKS: QuickLink[] = [
  {
    to: '/admin/templates',
    title: 'Manage templates',
    description: 'Configure the VM templates users can clone',
    icon: FiLayers,
  },
  {
    to: '/admin/users',
    title: 'Manage users',
    description: 'Review accounts, roles and access',
    icon: FiUsers,
  },
  {
    to: '/admin',
    title: 'Admin dashboard',
    description: 'Full system overview',
    icon: FiSettings,
  },
]

const STATUS_BADGE_CLASSES: Record<string, string> = {
  running: 'badge-success',
  stopped: 'badge-info',
  failed: 'badge-error',
  pending: 'badge-warning',
}

/** Formats with the browser locale rather than a hardcoded one. */
const dateFormatter = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
})

function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : dateFormatter.format(date)
}

function statusBadgeClass(status: string) {
  return STATUS_BADGE_CLASSES[status.toLowerCase()] ?? 'badge-secondary'
}

export default function Dashboard() {
  const { user } = useAuth()
  const [recentVMs, setRecentVMs] = useState<VM[]>([])
  const [clusterUsage, setClusterUsage] = useState<ClusterUsage | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError('')

    try {
      const vmsResponse = await api.get('/api/vms', {
        params: { limit: RECENT_VM_LIMIT },
      })
      setRecentVMs(vmsResponse.data)

      const usageResponse = await api.get('/api/proxmox/usage')
      setClusterUsage(usageResponse.data)
    } catch (err: any) {
      console.error(err)
      setError('Could not load the dashboard data.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="page-title">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            {user?.first_name ? `Welcome back, ${user.first_name}.` : 'Welcome back.'} Here is the
            current state of your cluster.
          </p>
        </div>
        <Link to="/vms/create" className="btn btn-primary">
          <FiPlus className="h-4 w-4" aria-hidden="true" />
          Create VM
        </Link>
      </div>

      {error && (
        <Alert>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span>{error}</span>
            <button type="button" onClick={fetchData} className="btn btn-outline btn-sm">
              <FiRefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              Try again
            </button>
          </div>
        </Alert>
      )}

      {isLoading ? (
        <div className="space-y-8" aria-busy="true">
          <span className="sr-only" role="status">
            Loading dashboard
          </span>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {[0, 1, 2].map((index) => (
              <div key={index} className="card space-y-3 p-4 sm:p-5">
                <div className="skeleton h-5 w-24" />
                <div className="skeleton h-2 w-full" />
              </div>
            ))}
          </div>
          <div className="space-y-3">
            <div className="skeleton h-6 w-56" />
            <div className="skeleton h-40 w-full" />
          </div>
        </div>
      ) : (
        <>
          {clusterUsage && (
            <section className="space-y-4" aria-labelledby="cluster-usage-heading">
              <h2 id="cluster-usage-heading" className="section-title">
                Cluster utilisation
              </h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <UsageMeter label="CPU" ratio={clusterUsage.cpu_usage} icon={FiCpu} />
                <UsageMeter label="Memory" ratio={clusterUsage.memory_usage} icon={FiServer} />
                <UsageMeter label="Disk" ratio={clusterUsage.disk_usage} icon={FiHardDrive} />
              </div>
            </section>
          )}

          <section className="space-y-4" aria-labelledby="recent-vms-heading">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="recent-vms-heading" className="section-title">
                Recent virtual machines
              </h2>
              <Link to="/vms" className="link inline-flex items-center gap-1.5 text-sm">
                View all
                <FiArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>

            {recentVMs.length === 0 ? (
              <div className="card flex flex-col items-center gap-3 px-6 py-12 text-center">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <FiServer className="h-5 w-5" aria-hidden="true" />
                </span>
                <div className="space-y-1">
                  <p className="font-medium">No virtual machines yet</p>
                  <p className="text-sm text-muted-foreground">
                    Spin one up from a template — it is discarded again when you are done.
                  </p>
                </div>
                <Link to="/vms/create" className="btn btn-primary btn-sm">
                  <FiPlus className="h-3.5 w-3.5" aria-hidden="true" />
                  Create your first VM
                </Link>
              </div>
            ) : (
              <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <caption className="sr-only">
                      The most recently created virtual machines
                    </caption>
                    <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
                      <tr>
                        <th scope="col" className="px-4 py-3 font-medium">
                          Name
                        </th>
                        <th scope="col" className="px-4 py-3 font-medium">
                          Status
                        </th>
                        <th scope="col" className="px-4 py-3 font-medium">
                          Created
                        </th>
                        <th scope="col" className="px-4 py-3 text-right font-medium">
                          <span className="sr-only">Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {recentVMs.map((vm) => (
                        <tr key={vm.id} className="transition-colors hover:bg-muted/40">
                          <th scope="row" className="px-4 py-3 font-medium">
                            {vm.name}
                          </th>
                          <td className="px-4 py-3">
                            <span className={`badge ${statusBadgeClass(vm.status)}`}>
                              {vm.status}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                            {formatDate(vm.created_at)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Link to={`/vms/${vm.id}`} className="link">
                              View
                              <span className="sr-only"> {vm.name}</span>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>

          {user?.role === 'admin' && (
            <section className="space-y-4" aria-labelledby="admin-links-heading">
              <h2 id="admin-links-heading" className="section-title">
                Administration
              </h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {ADMIN_QUICK_LINKS.map(({ to, title, description, icon: Icon }) => (
                  <Link key={title} to={to} className="card-interactive group p-4 sm:p-5">
                    <div className="flex items-center gap-4">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <h3 className="font-medium">{title}</h3>
                        <p className="text-sm text-muted-foreground">{description}</p>
                      </div>
                      <FiArrowRight
                        className="ml-auto h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                        aria-hidden="true"
                      />
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}
