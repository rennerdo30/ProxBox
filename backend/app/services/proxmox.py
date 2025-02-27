import ssl
from typing import Dict, List, Optional, Tuple

from proxmoxer import ProxmoxAPI

from app.core.config import settings
from app.schemas.template import ProxmoxTemplate


class ProxmoxService:
    def __init__(self):
        # Configure SSL verification based on settings
        if settings.PROXMOX_VERIFY_SSL:
            verify_ssl = True
        else:
            verify_ssl = False
            ssl_context = ssl.create_default_context()
            ssl_context.check_hostname = False
            ssl_context.verify_mode = ssl.CERT_NONE

        # Connect to Proxmox API
        self.proxmox = ProxmoxAPI(
            settings.PROXMOX_HOST,
            user=settings.PROXMOX_USER,
            token_name=settings.PROXMOX_TOKEN_NAME,
            token_value=settings.PROXMOX_TOKEN_VALUE,
            verify_ssl=verify_ssl,
        )

    def get_cluster_resources(self, resource_type: str = "vm"):
        """Get resources of specified type from the cluster."""
        return self.proxmox.cluster.resources.get(type=resource_type)

    def get_nodes(self):
        """Get all nodes in the cluster."""
        return self.proxmox.nodes.get()

    def get_node_status(self, node: str):
        """Get the status of a specific node."""
        return self.proxmox.nodes(node).status.get()

    def get_templates(self) -> List[ProxmoxTemplate]:
        """Get all VM templates from all nodes."""
        templates = []
        for node in self.get_nodes():
            node_name = node["node"]
            vms = self.proxmox.nodes(node_name).qemu.get()
            
            for vm in vms:
                if vm.get("template") == 1:
                    templates.append(
                        ProxmoxTemplate(
                            id=str(vm["vmid"]),
                            name=vm["name"],
                            node=node_name,
                            description=vm.get("description", ""),
                        )
                    )
        
        return templates

    def get_template_config(self, node: str, template_id: str) -> Dict:
        """Get the configuration of a specific template."""
        return self.proxmox.nodes(node).qemu(template_id).config.get()

    def get_cluster_usage(self) -> Tuple[float, float, float]:
        """Get current CPU, memory, and disk usage of the cluster."""
        resources = self.proxmox.cluster.resources.get(type="node")
        
        total_cpu = 0
        used_cpu = 0
        total_mem = 0
        used_mem = 0
        total_disk = 0
        used_disk = 0
        
        for node in resources:
            total_cpu += node["maxcpu"]
            used_cpu += node["cpu"]
            total_mem += node["maxmem"]
            used_mem += node["mem"]
            total_disk += node["maxdisk"]
            used_disk += node["disk"]
        
        cpu_usage = used_cpu / total_cpu if total_cpu > 0 else 0
        mem_usage = used_mem / total_mem if total_mem > 0 else 0
        disk_usage = used_disk / total_disk if total_disk > 0 else 0
        
        return cpu_usage, mem_usage, disk_usage

    def check_resources_available(self, cpu: int, memory: int, disk: int) -> bool:
        """Check if there are enough resources available for a new VM."""
        cpu_usage, mem_usage, disk_usage = self.get_cluster_usage()
        
        # Define thresholds (can be moved to settings)
        cpu_threshold = 0.8  # 80%
        mem_threshold = 0.8  # 80%
        disk_threshold = 0.85  # 85%
        
        # Check if current usage + new VM resources would exceed thresholds
        resources = self.proxmox.cluster.resources.get(type="node")
        total_cpu = sum(node["maxcpu"] for node in resources)
        total_mem = sum(node["maxmem"] for node in resources)
        total_disk = sum(node["maxdisk"] for node in resources)
        
        new_cpu_usage = (cpu_usage * total_cpu + cpu) / total_cpu
        new_mem_usage = (mem_usage * total_mem + memory * 1024 * 1024) / total_mem
        new_disk_usage = (disk_usage * total_disk + disk * 1024 * 1024 * 1024) / total_disk
        
        return (
            new_cpu_usage <= cpu_threshold
            and new_mem_usage <= mem_threshold
            and new_disk_usage <= disk_threshold
        )

    def clone_template(self, node: str, template_id: str, name: str, description: str = "") -> str:
        """Clone a template to create a new VM."""
        # Find the next available VMID
        cluster_vms = self.get_cluster_resources(resource_type="vm")
        existing_ids = [vm["vmid"] for vm in cluster_vms]
        next_id = max(existing_ids) + 1
        
        # Clone the template
        clone_params = {
            "newid": next_id,
            "name": name,
            "description": description,
            "full": 1,  # Full clone
        }
        
        self.proxmox.nodes(node).qemu(template_id).clone.post(**clone_params)
        
        return str(next_id)

    def start_vm(self, node: str, vm_id: str):
        """Start a VM."""
        return self.proxmox.nodes(node).qemu(vm_id).status.start.post()

    def stop_vm(self, node: str, vm_id: str):
        """Stop a VM."""
        return self.proxmox.nodes(node).qemu(vm_id).status.stop.post()

    def shutdown_vm(self, node: str, vm_id: str):
        """Shutdown a VM gracefully."""
        return self.proxmox.nodes(node).qemu(vm_id).status.shutdown.post()

    def delete_vm(self, node: str, vm_id: str):
        """Delete a VM."""
        return self.proxmox.nodes(node).qemu(vm_id).delete()

    def get_vm_status(self, node: str, vm_id: str):
        """Get the status of a VM."""
        return self.proxmox.nodes(node).qemu(vm_id).status.current.get()

    def get_vnc_proxy(self, node: str, vm_id: str) -> Dict:
        """Create a VNC proxy for a VM."""
        try:
            # Request a VNC proxy
            vnc_proxy = self.proxmox.nodes(node).qemu(vm_id).vncproxy.post()
            
            # VNC proxy info
            return {
                "port": vnc_proxy["port"],
                "ticket": vnc_proxy["ticket"],
                "host": settings.PROXMOX_HOST.split("://")[1].split(":")[0],
            }
        except Exception as e:
            raise Exception(f"Failed to create VNC proxy: {str(e)}")


# Singleton instance
proxmox_service = ProxmoxService()