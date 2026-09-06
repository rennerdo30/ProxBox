import { FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ResourcePage from '../components/ResourcePage'
import Alert from '../components/Alert'
import { useResource } from '../hooks/useResource'
import { VMTemplate, VirtualMachine } from '../lib/resources'
import { api } from '../services/api'

export default function CreateVM() {
  const templates = useResource<VMTemplate[]>('/api/templates/?limit=100')
  const nodes =
    useResource<{ name: string; status: string }[]>('/api/proxmox/nodes')
  const [template, setTemplate] = useState('')
  const [node, setNode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const selected = templates.data?.find((item) => String(item.id) === template)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selected) return
    const fields = new FormData(event.currentTarget)
    setBusy(true)
    setError('')
    try {
      const result = await api.post<VirtualMachine>('/api/vms/', {
        name: fields.get('name'),
        description: fields.get('description'),
        template_id: selected.id,
        proxmox_node: node,
        cpu_cores: Number(fields.get('cpu')),
        memory_mb: Number(fields.get('memory')),
        disk_gb: Number(fields.get('disk')),
        discard_type: 'none',
        discard_enabled: true,
      })
      navigate(`/vms/${result.data.id}`)
    } catch {
      setError(
        'Could not create the virtual machine. Check resources and retry.',
      )
    } finally {
      setBusy(false)
    }
  }
  return (
    <ResourcePage
      title="Create virtual machine"
      loading={templates.loading || nodes.loading}
      error={templates.error || nodes.error}
      reload={() => {
        templates.reload()
        nodes.reload()
      }}
    >
      {error && <Alert>{error}</Alert>}
      <form onSubmit={submit} className="max-w-xl space-y-4">
        <label className="block">
          Name
          <input
            name="name"
            required
            maxLength={100}
            className="input mt-1 w-full"
          />
        </label>
        <label className="block">
          Description
          <textarea name="description" className="input mt-1 w-full" />
        </label>
        <label className="block">
          Template
          <select
            required
            value={template}
            onChange={(event) => {
              setTemplate(event.target.value)
              setNode(
                templates.data?.find(
                  (item) => String(item.id) === event.target.value,
                )?.proxmox_node ?? '',
              )
            }}
            className="input mt-1 w-full"
          >
            <option value="">Choose a template</option>
            {templates.data
              ?.filter((item) => item.enabled)
              .map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
          </select>
        </label>
        <label className="block">
          Node
          <select
            required
            value={node}
            onChange={(event) => setNode(event.target.value)}
            className="input mt-1 w-full"
          >
            <option value="">Choose a node</option>
            {nodes.data
              ?.filter((item) => item.status === 'online')
              .map((item) => (
                <option key={item.name} value={item.name}>
                  {item.name}
                </option>
              ))}
          </select>
        </label>
        <div key={template} className="grid gap-3 sm:grid-cols-3">
          <label>
            CPU cores
            <input
              className="input mt-1 w-full"
              name="cpu"
              type="number"
              min="1"
              required
              defaultValue={selected?.default_cpu_cores ?? 2}
            />
          </label>
          <label>
            Memory (MB)
            <input
              className="input mt-1 w-full"
              name="memory"
              type="number"
              min="128"
              required
              defaultValue={selected?.default_memory_mb ?? 2048}
            />
          </label>
          <label>
            Disk (GB)
            <input
              className="input mt-1 w-full"
              name="disk"
              type="number"
              min="1"
              required
              defaultValue={selected?.default_disk_gb ?? 20}
            />
          </label>
        </div>
        <button
          className="btn btn-primary"
          disabled={busy || !selected || !node}
        >
          {busy ? 'Creating…' : 'Create VM'}
        </button>
      </form>
    </ResourcePage>
  )
}
