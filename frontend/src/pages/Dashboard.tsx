import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../services/api'
import { useAuth } from '../hooks/useAuth'

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

export default function Dashboard() {
  const { user } = useAuth()
  const [recentVMs, setRecentVMs] = useState<VM[]>([])
  const [clusterUsage, setClusterUsage] = useState<ClusterUsage | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      setError('')
      
      try {
        // Fetch recent VMs
        const vmsResponse = await api.get('/api/vms', {
          params: { limit: 5 },
        })
        setRecentVMs(vmsResponse.data)
        
        // Fetch cluster usage
        const usageResponse = await api.get('/api/proxmox/usage')
        setClusterUsage(usageResponse.data)
      } catch (err: any) {
        console.error(err)
        setError('Failed to load dashboard data')
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchData()
  }, [])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const getStatusBadgeClass = (status: string) => {
    switch (status.toLowerCase()) {
      case 'running':
        return 'badge-success'
      case 'stopped':
        return 'badge-info'
      case 'failed':
        return 'badge-error'
      case 'pending':
        return 'badge-warning'
      default:
        return 'badge-secondary'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <Link to="/vms/create" className="btn btn-primary">
          Create VM
        </Link>
      </div>
      
      {error && (
        <div className="p-3 rounded-md bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-400">
          {error}
        </div>
      )}
      
      {isLoading ? (
        <div className="flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </div>
      ) : (
        <>
          {/* Cluster Usage */}
          {clusterUsage && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="card p-4">
                <div className="flex flex-col">
                  <span className="text-lg font-semibold">CPU Usage</span>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full bg-primary"
                      style={{ width: `${clusterUsage.cpu_usage * 100}%` }}
                    ></div>
                  </div>
                  <span className="mt-1 text-sm text-muted-foreground">
                    {Math.round(clusterUsage.cpu_usage * 100)}%
                  </span>
                </div>
              </div>
              
              <div className="card p-4">
                <div className="flex flex-col">
                  <span className="text-lg font-semibold">Memory Usage</span>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full bg-primary"
                      style={{ width: `${clusterUsage.memory_usage * 100}%` }}
                    ></div>
                  </div>
                  <span className="mt-1 text-sm text-muted-foreground">
                    {Math.round(clusterUsage.memory_usage * 100)}%
                  </span>
                </div>
              </div>
              
              <div className="card p-4">
                <div className="flex flex-col">
                  <span className="text-lg font-semibold">Disk Usage</span>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full bg-primary"
                      style={{ width: `${clusterUsage.disk_usage * 100}%` }}
                    ></div>
                  </div>
                  <span className="mt-1 text-sm text-muted-foreground">
                    {Math.round(clusterUsage.disk_usage * 100)}%
                  </span>
                </div>
              </div>
            </div>
          )}
          
          {/* Recent VMs */}
          <div>
            <h2 className="text-xl font-semibold">Recent Virtual Machines</h2>
            <div className="mt-4 overflow-hidden rounded-lg border">
              {recentVMs.length === 0 ? (
                <div className="flex items-center justify-center p-4 text-muted-foreground">
                  No virtual machines found
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b bg-muted">
                        <th className="px-4 py-3 text-sm font-medium">Name</th>
                        <th className="px-4 py-3 text-sm font-medium">Status</th>
                        <th className="px-4 py-3 text-sm font-medium">Created</th>
                        <th className="px-4 py-3 text-sm font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentVMs.map((vm) => (
                        <tr key={vm.id} className="border-b">
                          <td className="px-4 py-3">{vm.name}</td>
                          <td className="px-4 py-3">
                            <span
                              className={`badge ${getStatusBadgeClass(vm.status)}`}
                            >
                              {vm.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">
                            {formatDate(vm.created_at)}
                          </td>
                          <td className="px-4 py-3">
                            <Link
                              to={`/vms/${vm.id}`}
                              className="text-sm text-primary hover:underline"
                            >
                              View
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            
            <div className="mt-4 text-right">
              <Link
                to="/vms"
                className="text-sm font-medium text-primary hover:underline"
              >
                View all VMs
              </Link>
            </div>
          </div>
          
          {/* Admin quick links */}
          {user?.role === 'admin' && (
            <div>
              <h2 className="text-xl font-semibold">Admin Quick Links</h2>
              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                <Link
                  to="/admin/templates"
                  className="card p-4 transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-5 w-5"
                      >
                        <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                        <line x1="8" y1="21" x2="16" y2="21"></line>
                        <line x1="12" y1="17" x2="12" y2="21"></line>
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-medium">Manage Templates</h3>
                      <p className="text-sm text-muted-foreground">
                        Configure VM templates
                      </p>
                    </div>
                  </div>
                </Link>
                
                <Link
                  to="/admin/users"
                  className="card p-4 transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-5 w-5"
                      >
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-medium">Manage Users</h3>
                      <p className="text-sm text-muted-foreground">
                        Configure user accounts
                      </p>
                    </div>
                  </div>
                </Link>
                
                <Link
                  to="/admin"
                  className="card p-4 transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-5 w-5"
                      >
                        <path d="M12 20h9"></path>
                        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-medium">Admin Dashboard</h3>
                      <p className="text-sm text-muted-foreground">
                        Full system overview
                      </p>
                    </div>
                  </div>
                </Link>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}