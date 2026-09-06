import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import ResourcePage from '../components/ResourcePage'
import Alert from '../components/Alert'
import { useResource } from '../hooks/useResource'
import { VirtualMachine } from '../lib/resources'
import { api } from '../services/api'

export default function ViewVM() {
  const { id } = useParams()
  const endpoint = `/api/vms/${encodeURIComponent(id ?? '')}`
  const resource = useResource<VirtualMachine>(endpoint)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()
  async function action(name: 'start' | 'shutdown' | 'stop' | 'delete') {
    if (
      (name === 'delete' || name === 'stop') &&
      !window.confirm(
        name === 'delete'
          ? 'Permanently delete this virtual machine and its disks?'
          : 'Force stop this virtual machine? Unsaved work may be lost.',
      )
    )
      return
    setBusy(true)
    setError('')
    setMessage('')
    try {
      if (name === 'delete') {
        await api.delete(endpoint)
        navigate('/vms')
        return
      }
      await api.post(`${endpoint}/${name}`)
      setMessage('Request accepted. Refresh to check the current state.')
      resource.reload()
    } catch {
      setError(
        'The operation failed. Please retry or contact your administrator.',
      )
    } finally {
      setBusy(false)
    }
  }
  const vm = resource.data
  return (
    <ResourcePage title={vm?.name ?? 'Virtual machine'} {...resource}>
      {error && <Alert>{error}</Alert>}
      {message && <Alert variant="success">{message}</Alert>}
      {vm && (
        <>
          <p>{vm.description}</p>
          <dl className="grid max-w-xl grid-cols-2 gap-3">
            <dt>Status</dt>
            <dd>{vm.status}</dd>
            <dt>Node</dt>
            <dd>{vm.proxmox_node}</dd>
            <dt>CPU cores</dt>
            <dd>{vm.cpu_cores}</dd>
            <dt>Memory</dt>
            <dd>{vm.memory_mb} MB</dd>
            <dt>Disk</dt>
            <dd>{vm.disk_gb} GB</dd>
          </dl>
          <div className="flex flex-wrap gap-3">
            <button
              className="btn btn-primary"
              disabled={busy || vm.status !== 'stopped'}
              onClick={() => action('start')}
            >
              Start
            </button>
            <button
              className="btn btn-secondary"
              disabled={busy || vm.status !== 'running'}
              onClick={() => action('shutdown')}
            >
              Shut down
            </button>
            <button
              className="btn btn-secondary"
              disabled={busy || vm.status !== 'running'}
              onClick={() => action('stop')}
            >
              Force stop
            </button>
            <Link className="btn btn-secondary" to={`/vms/${vm.id}/console`}>
              Console
            </Link>
            <button
              className="btn btn-secondary text-destructive"
              disabled={busy}
              onClick={() => action('delete')}
            >
              Delete VM
            </button>
          </div>
        </>
      )}
    </ResourcePage>
  )
}
