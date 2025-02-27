from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel


class VMTemplateBase(BaseModel):
    name: str
    description: Optional[str] = None
    proxmox_template_id: str
    proxmox_node: str
    default_cpu_cores: int
    default_memory_mb: int
    default_disk_gb: int
    enabled: bool = True


class VMTemplateCreate(VMTemplateBase):
    pass


class VMTemplateUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    default_cpu_cores: Optional[int] = None
    default_memory_mb: Optional[int] = None
    default_disk_gb: Optional[int] = None
    enabled: Optional[bool] = None


class VMTemplateInDB(VMTemplateBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class VMTemplateResponse(VMTemplateInDB):
    pass


class ProxmoxTemplate(BaseModel):
    id: str
    name: str
    node: str
    description: Optional[str] = None