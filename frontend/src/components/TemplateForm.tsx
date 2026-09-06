import { FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { VMTemplate } from '../lib/resources'
import { api } from '../services/api'
import Alert from './Alert'

export default function TemplateForm({
  template,
  onSaved,
}: {
  template?: VMTemplate
  onSaved?: () => void
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const data = {
      name: String(form.get('name')),
      description: String(form.get('description')),
      default_cpu_cores: Number(form.get('cpu')),
      default_memory_mb: Number(form.get('memory')),
      default_disk_gb: Number(form.get('disk')),
      enabled: form.get('enabled') === 'on',
    }
    setBusy(true)
    setError('')
    try {
      const response = template
        ? await api.put<VMTemplate>(`/api/templates/${template.id}`, data)
        : await api.post<VMTemplate>('/api/templates/', {
            ...data,
            proxmox_node: form.get('node'),
            proxmox_template_id: form.get('proxmoxId'),
          })
      if (template && onSaved) onSaved()
      else navigate(`/admin/templates/${response.data.id}`)
    } catch {
      setError(
        'Could not save the template. Check the Proxmox node and template ID.',
      )
    } finally {
      setBusy(false)
    }
  }
  return (
    <form className="max-w-xl space-y-4" onSubmit={submit}>
      {error && <Alert>{error}</Alert>}
      <label className="block">
        Name
        <input
          className="input mt-1 w-full"
          name="name"
          defaultValue={template?.name}
          required
        />
      </label>
      <label className="block">
        Description
        <textarea
          className="input mt-1 w-full"
          name="description"
          defaultValue={template?.description ?? ''}
        />
      </label>
      {!template && (
        <>
          <label className="block">
            Proxmox node
            <input className="input mt-1 w-full" name="node" required />
          </label>
          <label className="block">
            Proxmox template ID
            <input
              className="input mt-1 w-full"
              name="proxmoxId"
              required
              inputMode="numeric"
              pattern="[0-9]+"
            />
          </label>
        </>
      )}
      <div className="grid gap-3 sm:grid-cols-3">
        <label>
          CPU cores
          <input
            className="input mt-1 w-full"
            type="number"
            name="cpu"
            min="1"
            required
            defaultValue={template?.default_cpu_cores ?? 2}
          />
        </label>
        <label>
          Memory (MB)
          <input
            className="input mt-1 w-full"
            type="number"
            name="memory"
            min="128"
            required
            defaultValue={template?.default_memory_mb ?? 2048}
          />
        </label>
        <label>
          Disk (GB)
          <input
            className="input mt-1 w-full"
            type="number"
            name="disk"
            min="1"
            required
            defaultValue={template?.default_disk_gb ?? 20}
          />
        </label>
      </div>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          name="enabled"
          defaultChecked={template?.enabled ?? true}
        />
        Available for new VMs
      </label>
      <button className="btn btn-primary" disabled={busy}>
        {busy ? 'Saving…' : 'Save template'}
      </button>
    </form>
  )
}
