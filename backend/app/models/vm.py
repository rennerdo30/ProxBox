from datetime import datetime
from enum import Enum

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.models.user import vm_user_association


class VMStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    STOPPED = "stopped"
    FAILED = "failed"
    EXPIRED = "expired"


class DiscardType(str, Enum):
    NONE = "none"
    TIMER = "timer"
    SHUTDOWN = "shutdown"


class VM(Base):
    __tablename__ = "vms"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String, index=True)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    proxmox_id: Mapped[int] = mapped_column(Integer, unique=True)
    proxmox_node: Mapped[str] = mapped_column(String)
    status: Mapped[VMStatus] = mapped_column(String, default=VMStatus.PENDING)
    
    # VM configuration
    cpu_cores: Mapped[int] = mapped_column(Integer)
    memory_mb: Mapped[int] = mapped_column(Integer)
    disk_gb: Mapped[int] = mapped_column(Integer)
    
    # Discard settings
    discard_type: Mapped[DiscardType] = mapped_column(String, default=DiscardType.NONE)
    discard_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    discard_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    
    # Template info
    template_id: Mapped[int] = mapped_column(Integer, ForeignKey("vm_templates.id"))
    
    # Owner and creation info
    owner_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )
    
    # Relationships
    owner = relationship("User", back_populates="vms")
    template = relationship("VMTemplate", back_populates="vms")
    shared_with_users = relationship(
        "User", secondary=vm_user_association, back_populates="shared_vms"
    )