import { useState } from 'react'
import { useParams } from 'react-router-dom'
import ResourcePage from '../components/ResourcePage'
import Alert from '../components/Alert'
import { api } from '../services/api'

export default function VMConsole() {
  const { id } = useParams()
  const [url, setUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function connect() {
    setBusy(true)
    setError('')
    setUrl('')
    try {
      const response = await api.get<{ console_url: string }>(
        `/api/vms/${encodeURIComponent(id ?? '')}/console`,
      )
      const parsed = new URL(response.data.console_url)
      if (parsed.protocol !== 'vnc:') throw new Error('Unsupported console URL')
      setUrl(response.data.console_url)
    } catch {
      setError('Console unavailable. Ensure the VM is running and retry.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <ResourcePage title="VM console">
      <p>
        The console opens in your installed VNC client. Generate a fresh
        connection when you are ready.
      </p>
      {error && <Alert>{error}</Alert>}
      <button className="btn btn-primary" disabled={busy} onClick={connect}>
        {busy ? 'Connecting…' : 'Get console connection'}
      </button>
      {url && (
        <p>
          <a className="btn btn-secondary" href={url} rel="noreferrer">
            Open VNC client
          </a>
        </p>
      )}
    </ResourcePage>
  )
}
