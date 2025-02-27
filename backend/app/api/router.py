from fastapi import APIRouter

from app.api.v1 import auth, proxmox, templates, users, vms

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(proxmox.router, prefix="/proxmox", tags=["proxmox"])
api_router.include_router(templates.router, prefix="/templates", tags=["templates"])
api_router.include_router(vms.router, prefix="/vms", tags=["vms"])