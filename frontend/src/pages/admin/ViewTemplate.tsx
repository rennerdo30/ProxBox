import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import ResourcePage from '../../components/ResourcePage'
import TemplateForm from '../../components/TemplateForm'
import Alert from '../../components/Alert'
import { useResource } from '../../hooks/useResource'
import { VMTemplate } from '../../lib/resources'
import { api } from '../../services/api'
export default function ViewTemplate() {
  const { id } = useParams()
  const resource = useResource<VMTemplate>(
    `/api/templates/${encodeURIComponent(id ?? '')}`,
  )
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const navigate = useNavigate()
  async function remove() {
    if (!resource.data || !window.confirm('Delete this template registration?'))
      return
    setBusy(true)
    setError('')
    try {
      await api.delete(`/api/templates/${resource.data.id}`)
      navigate('/admin/templates')
    } catch {
      setError('Could not delete the template. It may still be used by a VM.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <ResourcePage title={resource.data?.name ?? 'Template'} {...resource}>
      {error && <Alert>{error}</Alert>}
      {resource.data && (
        <>
          <TemplateForm
            key={resource.data.id}
            template={resource.data}
            onSaved={resource.reload}
          />
          <button
            className="btn btn-secondary text-destructive"
            disabled={busy}
            onClick={remove}
          >
            Delete template
          </button>
        </>
      )}
    </ResourcePage>
  )
}
