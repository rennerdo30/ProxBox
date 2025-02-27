from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field

from app.models.vm import DiscardType, VMStatus
from app.schemas.user import UserResponse


class VMBase(BaseModel):
    name: str
    description: Optional[str] = None
    cpu_cores: int
    memory_mb: int
    disk_gb: int
    discard_type: DiscardType = DiscardType.NONE
    discard_enabled: bool = True


class VMCreate(VMBase):
    template_id: int
    proxmox_node: str
    discard_at: Optional[datetime] = None


class VMUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    discard_type: Optional[DiscardType] = None
    discard_at: Optional[datetime] = None
    discard_enabled: Optional[bool] = None


class VMAdminUpdate(VMUpdate):
    cpu_cores: Optional[int] = None
    memory_mb: Optional[int] = None
    disk_gb: Optional[int] = None
    status: Optional[VMStatus] = None


class VMInDB(VMBase):
    id: int
    proxmox_id: int
    proxmox_node: str
    template_id: int
    status: VMStatus
    owner_id: int
    discard_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class VMResponse(VMInDB):
    pass


class VMDetailResponse(VMResponse):
    owner: UserResponse
    shared_with_users: List[UserResponse] = []


class VMShare(BaseModel):
    user_ids: List[int] = Field(..., min_items=1)