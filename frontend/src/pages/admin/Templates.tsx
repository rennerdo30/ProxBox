import { useState } from 'react'
import { Link } from 'react-router-dom'
import ResourcePage, { Pagination } from '../../components/ResourcePage'
import { useResource } from '../../hooks/useResource'
import { VMTemplate } from '../../lib/resources'
export default function Templates() {
  const [page, setPage] = useState(0)
  const resource = useResource<VMTemplate[]>(
    `/api/templates/?skip=${page * 50}&limit=50`,
  )
  const templates = resource.data ?? []
  return (
    <ResourcePage
      title="Templates"
      {...resource}
      actions={
        <Link className="btn btn-primary" to="/admin/templates/create">
          Add template
        </Link>
      }
    >
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-left">
          <thead>
            <tr>
              <th className="p-3">Name</th>
              <th>Node</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {templates.map((item) => (
              <tr className="border-t" key={item.id}>
                <td className="p-3">
                  <Link
                    className="text-primary underline"
                    to={`/admin/templates/${item.id}`}
                  >
                    {item.name}
                  </Link>
                </td>
                <td>{item.proxmox_node}</td>
                <td>{item.enabled ? 'Enabled' : 'Disabled'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!templates.length && <p className="p-4">No templates on this page.</p>}
      </div>
      <Pagination page={page} count={templates.length} onChange={setPage} />
    </ResourcePage>
  )
}
