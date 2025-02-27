from datetime import datetime
from enum import Enum

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Table
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class UserRole(str, Enum):
    ADMIN = "admin"
    USER = "user"


class AuthProvider(str, Enum):
    LOCAL = "local"
    LDAP = "ldap"
    GITLAB = "gitlab"


# Association table for user vm sharing
vm_user_association = Table(
    "vm_user_association",
    Base.metadata,
    Column("vm_id", Integer, ForeignKey("vms.id", ondelete="CASCADE"), primary_key=True),
    Column("user_id", Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
)


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    username: Mapped[str] = mapped_column(String, unique=True, index=True)
    email: Mapped[str] = mapped_column(String, unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String, nullable=True)
    first_name: Mapped[str] = mapped_column(String, nullable=True)
    last_name: Mapped[str] = mapped_column(String, nullable=True)
    role: Mapped[UserRole] = mapped_column(String, default=UserRole.USER)
    auth_provider: Mapped[AuthProvider] = mapped_column(String, default=AuthProvider.LOCAL)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    vms = relationship("VM", back_populates="owner")
    shared_vms = relationship(
        "VM", secondary=vm_user_association, back_populates="shared_with_users"
    )