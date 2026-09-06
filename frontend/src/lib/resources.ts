export interface VirtualMachine {
  id: number
  name: string
  description: string | null
  status: string
  cpu_cores: number
  memory_mb: number
  disk_gb: number
  proxmox_node: string
  discard_type: string
  discard_enabled: boolean
  discard_at: string | null
}
export interface VMTemplate {
  id: number
  name: string
  description: string | null
  proxmox_template_id: string
  proxmox_node: string
  default_cpu_cores: number
  default_memory_mb: number
  default_disk_gb: number
  enabled: boolean
}
export interface Account {
  id: number
  username: string
  email: string
  role: 'admin' | 'user'
  is_active: boolean
}
