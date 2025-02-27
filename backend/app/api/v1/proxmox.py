from typing import Any, Dict, List

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.models.user import User
from app.services.proxmox import proxmox_service
from app.services.user import user_service

router = APIRouter()


class ClusterUsage(BaseModel):
    cpu_usage: float
    memory_usage: float
    disk_usage: float


class ProxmoxNode(BaseModel):
    name: str
    status: str
    cpu_usage: float
    memory_usage: float
    disk_usage: float


@router.get("/usage", response_model=ClusterUsage)
async def get_cluster_usage(
    current_user: User = Depends(user_service.get_current_active_user),
) -> Any:
    """Get current CPU, memory, and disk usage of the cluster."""
    try:
        cpu_usage, mem_usage, disk_usage = proxmox_service.get_cluster_usage()
        return ClusterUsage(
            cpu_usage=cpu_usage,
            memory_usage=mem_usage,
            disk_usage=disk_usage,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch cluster usage: {str(e)}",
        )


@router.get("/nodes", response_model=List[ProxmoxNode])
async def get_nodes(
    current_user: User = Depends(user_service.get_current_active_user),
) -> Any:
    """Get all nodes in the cluster."""
    try:
        nodes_data = []
        nodes = proxmox_service.get_nodes()
        
        for node in nodes:
            node_name = node["node"]
            node_status = proxmox_service.get_node_status(node_name)
            
            # Calculate usage
            cpu_usage = node_status["cpu"] if "cpu" in node_status else 0
            memory_total = node_status["memory"]["total"] if "memory" in node_status else 1
            memory_used = node_status["memory"]["used"] if "memory" in node_status else 0
            memory_usage = memory_used / memory_total if memory_total > 0 else 0
            
            root_total = node_status["rootfs"]["total"] if "rootfs" in node_status else 1
            root_used = node_status["rootfs"]["used"] if "rootfs" in node_status else 0
            disk_usage = root_used / root_total if root_total > 0 else 0
            
            nodes_data.append(
                ProxmoxNode(
                    name=node_name,
                    status=node["status"],
                    cpu_usage=cpu_usage,
                    memory_usage=memory_usage,
                    disk_usage=disk_usage,
                )
            )
        
        return nodes_data
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch nodes: {str(e)}",
        )


@router.get("/check-resources/{cpu}/{memory}/{disk}", response_model=Dict[str, bool])
async def check_resources(
    cpu: int,
    memory: int,
    disk: int,
    current_user: User = Depends(user_service.get_current_active_user),
) -> Any:
    """Check if there are enough resources available for a new VM."""
    try:
        available = proxmox_service.check_resources_available(cpu, memory, disk)
        return {"available": available}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to check resources: {str(e)}",
        )