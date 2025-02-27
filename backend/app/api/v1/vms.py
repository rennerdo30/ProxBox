from datetime import datetime, timedelta
from typing import Any, Dict, List

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.db.session import get_db
from app.models.template import VMTemplate
from app.models.user import User
from app.models.vm import DiscardType, VM, VMStatus
from app.schemas.vm import (
    VMAdminUpdate,
    VMCreate,
    VMDetailResponse,
    VMResponse,
    VMShare,
    VMUpdate,
)
from app.services.proxmox import proxmox_service
from app.services.user import user_service

router = APIRouter()


async def create_vm_in_proxmox(
    db: AsyncSession, 
    vm_id: int,
    proxmox_node: str,
    template_id: int,
    owner_id: int,
    name: str,
    description: str,
    cpu_cores: int,
    memory_mb: int,
    disk_gb: int,
    discard_type: DiscardType,
    discard_at: datetime = None,
    discard_enabled: bool = True,
):
    """Background task to create a VM in Proxmox."""
    try:
        # Get VM from DB
        result = await db.execute(
            select(VM)
            .where(VM.id == vm_id)
            .options(joinedload(VM.template))
        )
        vm = result.scalars().first()
        
        if not vm:
            # This should not happen
            return
        
        # Get the template
        result = await db.execute(select(VMTemplate).where(VMTemplate.id == template_id))
        template = result.scalars().first()
        
        if not template:
            vm.status = VMStatus.FAILED
            await db.commit()
            return
        
        # Create VM in Proxmox
        try:
            proxmox_vm_id = proxmox_service.clone_template(
                proxmox_node,
                template.proxmox_template_id,
                name,
                description,
            )
            
            # Update VM with Proxmox ID
            vm.proxmox_id = int(proxmox_vm_id)
            vm.status = VMStatus.STOPPED
            
            # Start the VM
            proxmox_service.start_vm(proxmox_node, proxmox_vm_id)
            vm.status = VMStatus.RUNNING
            
            await db.commit()
            
        except Exception as e:
            vm.status = VMStatus.FAILED
            await db.commit()
            raise e
            
    except Exception as e:
        # Log the error
        print(f"Error creating VM: {str(e)}")


@router.get("/", response_model=List[VMResponse])
async def list_vms(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(user_service.get_current_active_user),
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """List all VMs for the current user."""
    # Admins can see all VMs, users can only see their own and shared
    if current_user.role == "admin":
        result = await db.execute(select(VM).offset(skip).limit(limit))
    else:
        # Get user's VMs and VMs shared with them
        result = await db.execute(
            select(VM).where(
                (VM.owner_id == current_user.id) | 
                (VM.id.in_(select(VM.id).join(VM.shared_with_users).where(User.id == current_user.id)))
            ).offset(skip).limit(limit)
        )
    
    vms = result.scalars().all()
    return vms


@router.post("/", response_model=VMResponse)
async def create_vm(
    vm_data: VMCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(user_service.get_current_active_user),
) -> Any:
    """Create a new VM."""
    # Check if template exists and is enabled
    result = await db.execute(select(VMTemplate).where(VMTemplate.id == vm_data.template_id))
    template = result.scalars().first()
    
    if template is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found",
        )
    
    # Regular users can only use enabled templates
    if current_user.role != "admin" and not template.enabled:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Template not available",
        )
    
    # Check if there are enough resources available
    if not proxmox_service.check_resources_available(
        vm_data.cpu_cores, vm_data.memory_mb, vm_data.disk_gb
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Not enough resources available",
        )
    
    # Create the VM record
    db_vm = VM(
        name=vm_data.name,
        description=vm_data.description,
        proxmox_node=vm_data.proxmox_node,
        proxmox_id=0,  # Will be updated after creation
        status=VMStatus.PENDING,
        cpu_cores=vm_data.cpu_cores,
        memory_mb=vm_data.memory_mb,
        disk_gb=vm_data.disk_gb,
        discard_type=vm_data.discard_type,
        discard_at=vm_data.discard_at,
        discard_enabled=vm_data.discard_enabled,
        template_id=vm_data.template_id,
        owner_id=current_user.id,
    )
    
    # If discard type is timer and no discard_at is provided, set default (24h)
    if db_vm.discard_type == DiscardType.TIMER and not db_vm.discard_at:
        db_vm.discard_at = datetime.utcnow() + timedelta(hours=24)
    
    db.add(db_vm)
    await db.commit()
    await db.refresh(db_vm)
    
    # Create VM in Proxmox as a background task
    background_tasks.add_task(
        create_vm_in_proxmox,
        db=db,
        vm_id=db_vm.id,
        proxmox_node=db_vm.proxmox_node,
        template_id=db_vm.template_id,
        owner_id=db_vm.owner_id,
        name=db_vm.name,
        description=db_vm.description or "",
        cpu_cores=db_vm.cpu_cores,
        memory_mb=db_vm.memory_mb,
        disk_gb=db_vm.disk_gb,
        discard_type=db_vm.discard_type,
        discard_at=db_vm.discard_at,
        discard_enabled=db_vm.discard_enabled,
    )
    
    return db_vm


@router.get("/{vm_id}", response_model=VMDetailResponse)
async def get_vm(
    vm_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(user_service.get_current_active_user),
) -> Any:
    """Get a specific VM."""
    result = await db.execute(
        select(VM)
        .where(VM.id == vm_id)
        .options(
            joinedload(VM.owner),
            joinedload(VM.shared_with_users),
        )
    )
    vm = result.scalars().first()
    
    if vm is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="VM not found",
        )
    
    # Check if user has access to this VM
    if current_user.role != "admin" and current_user.id != vm.owner_id:
        # Check if VM is shared with the user
        if current_user.id not in [user.id for user in vm.shared_with_users]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions",
            )
    
    return vm


@router.put("/{vm_id}", response_model=VMResponse)
async def update_vm(
    vm_id: int,
    vm_data: VMUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(user_service.get_current_active_user),
) -> Any:
    """Update a VM."""
    result = await db.execute(select(VM).where(VM.id == vm_id))
    vm = result.scalars().first()
    
    if vm is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="VM not found",
        )
    
    # Check if user has access to this VM
    if current_user.role != "admin" and current_user.id != vm.owner_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions",
        )
    
    # Update VM data
    update_data = vm_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(vm, field, value)
    
    # If discard type was changed to timer and no discard_at is provided, set default (24h)
    if vm.discard_type == DiscardType.TIMER and not vm.discard_at:
        vm.discard_at = datetime.utcnow() + timedelta(hours=24)
    
    await db.commit()
    await db.refresh(vm)
    
    return vm


@router.put("/admin/{vm_id}", response_model=VMResponse)
async def admin_update_vm(
    vm_id: int,
    vm_data: VMAdminUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(user_service.get_current_admin_user),
) -> Any:
    """Admin update a VM. Admin only."""
    result = await db.execute(select(VM).where(VM.id == vm_id))
    vm = result.scalars().first()
    
    if vm is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="VM not found",
        )
    
    # Update VM data
    update_data = vm_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(vm, field, value)
    
    # If discard type was changed to timer and no discard_at is provided, set default (24h)
    if vm.discard_type == DiscardType.TIMER and not vm.discard_at:
        vm.discard_at = datetime.utcnow() + timedelta(hours=24)
    
    await db.commit()
    await db.refresh(vm)
    
    return vm


@router.delete("/{vm_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_vm(
    vm_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(user_service.get_current_active_user),
) -> Any:
    """Delete a VM."""
    result = await db.execute(select(VM).where(VM.id == vm_id))
    vm = result.scalars().first()
    
    if vm is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="VM not found",
        )
    
    # Check if user has access to this VM
    if current_user.role != "admin" and current_user.id != vm.owner_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions",
        )
    
    # Delete VM from Proxmox
    try:
        if vm.proxmox_id and vm.proxmox_id > 0:
            # Try to shutdown first
            try:
                proxmox_service.shutdown_vm(vm.proxmox_node, str(vm.proxmox_id))
            except:
                # If shutdown fails, force stop
                try:
                    proxmox_service.stop_vm(vm.proxmox_node, str(vm.proxmox_id))
                except:
                    pass
            
            # Delete from Proxmox
            proxmox_service.delete_vm(vm.proxmox_node, str(vm.proxmox_id))
    except Exception as e:
        # Log error but continue with DB deletion
        print(f"Error deleting VM from Proxmox: {str(e)}")
    
    # Delete from database
    await db.delete(vm)
    await db.commit()
    
    return None


@router.post("/{vm_id}/start", response_model=Dict[str, str])
async def start_vm(
    vm_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(user_service.get_current_active_user),
) -> Any:
    """Start a VM."""
    result = await db.execute(select(VM).where(VM.id == vm_id))
    vm = result.scalars().first()
    
    if vm is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="VM not found",
        )
    
    # Check if user has access to this VM
    if current_user.role != "admin" and current_user.id != vm.owner_id:
        # Check if VM is shared with the user
        shared_users_result = await db.execute(
            select(User).join(User.shared_vms).where(VM.id == vm_id, User.id == current_user.id)
        )
        shared_user = shared_users_result.scalars().first()
        
        if not shared_user:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions",
            )
    
    # Start VM in Proxmox
    try:
        if vm.proxmox_id and vm.proxmox_id > 0:
            proxmox_service.start_vm(vm.proxmox_node, str(vm.proxmox_id))
            
            # Update status
            vm.status = VMStatus.RUNNING
            await db.commit()
            
            return {"status": "started"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to start VM: {str(e)}",
        )


@router.post("/{vm_id}/stop", response_model=Dict[str, str])
async def stop_vm(
    vm_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(user_service.get_current_active_user),
) -> Any:
    """Stop a VM."""
    result = await db.execute(select(VM).where(VM.id == vm_id))
    vm = result.scalars().first()
    
    if vm is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="VM not found",
        )
    
    # Check if user has access to this VM
    if current_user.role != "admin" and current_user.id != vm.owner_id:
        # Check if VM is shared with the user
        shared_users_result = await db.execute(
            select(User).join(User.shared_vms).where(VM.id == vm_id, User.id == current_user.id)
        )
        shared_user = shared_users_result.scalars().first()
        
        if not shared_user:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions",
            )
    
    # Stop VM in Proxmox
    try:
        if vm.proxmox_id and vm.proxmox_id > 0:
            proxmox_service.stop_vm(vm.proxmox_node, str(vm.proxmox_id))
            
            # Update status
            vm.status = VMStatus.STOPPED
            await db.commit()
            
            # Check if VM should be discarded on shutdown
            if vm.discard_enabled and vm.discard_type == DiscardType.SHUTDOWN:
                await db.delete(vm)
                await db.commit()
                
                # Delete from Proxmox
                proxmox_service.delete_vm(vm.proxmox_node, str(vm.proxmox_id))
                
                return {"status": "stopped and discarded"}
            
            return {"status": "stopped"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to stop VM: {str(e)}",
        )


@router.post("/{vm_id}/shutdown", response_model=Dict[str, str])
async def shutdown_vm(
    vm_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(user_service.get_current_active_user),
) -> Any:
    """Shutdown a VM gracefully."""
    result = await db.execute(select(VM).where(VM.id == vm_id))
    vm = result.scalars().first()
    
    if vm is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="VM not found",
        )
    
    # Check if user has access to this VM
    if current_user.role != "admin" and current_user.id != vm.owner_id:
        # Check if VM is shared with the user
        shared_users_result = await db.execute(
            select(User).join(User.shared_vms).where(VM.id == vm_id, User.id == current_user.id)
        )
        shared_user = shared_users_result.scalars().first()
        
        if not shared_user:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions",
            )
    
    # Shutdown VM in Proxmox
    try:
        if vm.proxmox_id and vm.proxmox_id > 0:
            proxmox_service.shutdown_vm(vm.proxmox_node, str(vm.proxmox_id))
            
            # Update status
            vm.status = VMStatus.STOPPED
            await db.commit()
            
            # Check if VM should be discarded on shutdown
            if vm.discard_enabled and vm.discard_type == DiscardType.SHUTDOWN:
                await db.delete(vm)
                await db.commit()
                
                # Delete from Proxmox
                proxmox_service.delete_vm(vm.proxmox_node, str(vm.proxmox_id))
                
                return {"status": "shutdown and discarded"}
            
            return {"status": "shutdown"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to shutdown VM: {str(e)}",
        )


@router.get("/{vm_id}/console", response_model=Dict[str, str])
async def get_vm_console(
    vm_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(user_service.get_current_active_user),
) -> Any:
    """Get VNC console URL for a VM."""
    result = await db.execute(select(VM).where(VM.id == vm_id))
    vm = result.scalars().first()
    
    if vm is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="VM not found",
        )
    
    # Check if user has access to this VM
    if current_user.role != "admin" and current_user.id != vm.owner_id:
        # Check if VM is shared with the user
        shared_users_result = await db.execute(
            select(User).join(User.shared_vms).where(VM.id == vm_id, User.id == current_user.id)
        )
        shared_user = shared_users_result.scalars().first()
        
        if not shared_user:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions",
            )
    
    # Get VNC proxy URL
    try:
        if vm.proxmox_id and vm.proxmox_id > 0:
            vnc_proxy = proxmox_service.get_vnc_proxy(vm.proxmox_node, str(vm.proxmox_id))
            
            # Create VNC URL for the frontend
            vnc_url = f"vnc://{vnc_proxy['host']}:{vnc_proxy['port']}?password={vnc_proxy['ticket']}"
            
            return {"console_url": vnc_url}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get console URL: {str(e)}",
        )


@router.post("/{vm_id}/share", status_code=status.HTTP_200_OK)
async def share_vm(
    vm_id: int,
    share_data: VMShare,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(user_service.get_current_active_user),
) -> Any:
    """Share a VM with other users."""
    result = await db.execute(select(VM).where(VM.id == vm_id))
    vm = result.scalars().first()
    
    if vm is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="VM not found",
        )
    
    # Check if user is the owner or admin
    if current_user.role != "admin" and current_user.id != vm.owner_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions",
        )
    
    # Get users to share with
    users_result = await db.execute(select(User).where(User.id.in_(share_data.user_ids)))
    users = users_result.scalars().all()
    
    if len(users) != len(share_data.user_ids):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="One or more users not found",
        )
    
    # Share VM with users
    vm.shared_with_users = users
    await db.commit()
    
    return {"status": "shared"}


@router.post("/{vm_id}/unshare/{user_id}", status_code=status.HTTP_200_OK)
async def unshare_vm(
    vm_id: int,
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(user_service.get_current_active_user),
) -> Any:
    """Remove sharing of a VM with a user."""
    result = await db.execute(
        select(VM)
        .where(VM.id == vm_id)
        .options(joinedload(VM.shared_with_users))
    )
    vm = result.scalars().first()
    
    if vm is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="VM not found",
        )
    
    # Check if user is the owner or admin
    if current_user.role != "admin" and current_user.id != vm.owner_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions",
        )
    
    # Remove user from shared list
    vm.shared_with_users = [user for user in vm.shared_with_users if user.id != user_id]
    await db.commit()
    
    return {"status": "unshared"}