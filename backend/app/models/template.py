from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class VMTemplate(Base):
    __tablename__ = "vm_templates"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String, index=True)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    
    # Proxmox template reference
    proxmox_template_id: Mapped[str] = mapped_column(String)
    proxmox_node: Mapped[str] = mapped_column(String)
    
    # Default VM configuration for this template
    default_cpu_cores: Mapped[int] = mapped_column(Integer)
    default_memory_mb: Mapped[int] = mapped_column(Integer)
    default_disk_gb: Mapped[int] = mapped_column(Integer)
    
    # Is this template available for users?
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    
    # When was this template created/updated?
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )
    
    # Relationship
    vms = relationship("VM", back_populates="template")