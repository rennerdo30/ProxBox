import { useState } from 'react'
import { Link } from 'react-router-dom'
import ResourcePage, { Pagination } from '../components/ResourcePage'
import { useResource } from '../hooks/useResource'
import { VirtualMachine } from '../lib/resources'

export default function VirtualMachines() {
  const [page, setPage] = useState(0)
  const resource = useResource<VirtualMachine[]>(
    `/api/vms/?skip=${page * 50}&limit=50`,
  )
  const machines = resource.data ?? []
  return (
    <ResourcePage
      title="Virtual machines"
      {...resource}
      actions={
        <Link className="btn btn-primary" to="/vms/create">
          Create VM
        </Link>
      }
    >
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-left">
          <thead>
            <tr>
              <th className="p-3">Name</th>
              <th>Status</th>
              <th>Resources</th>
              <th>Node</th>
            </tr>
          </thead>
          <tbody>
            {machines.map((vm) => (
              <tr key={vm.id} className="border-t">
                <td className="p-3">
                  <Link className="text-primary underline" to={`/vms/${vm.id}`}>
                    {vm.name}
                  </Link>
                </td>
                <td>{vm.status}</td>
                <td>
                  {vm.cpu_cores} CPU · {vm.memory_mb} MB · {vm.disk_gb} GB
                </td>
                <td>{vm.proxmox_node}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!machines.length && (
          <p className="p-4 text-muted-foreground">
            No virtual machines on this page.
          </p>
        )}
      </div>
      <Pagination page={page} count={machines.length} onChange={setPage} />
    </ResourcePage>
  )
}
