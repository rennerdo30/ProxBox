from typing import Any, List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.template import VMTemplate
from app.models.user import User
from app.schemas.template import (
    ProxmoxTemplate,
    VMTemplateCreate,
    VMTemplateResponse,
    VMTemplateUpdate,
)
from app.services.proxmox import proxmox_service
from app.services.user import user_service

router = APIRouter()


@router.get("/proxmox", response_model=List[ProxmoxTemplate])
async def list_proxmox_templates(
    current_user: User = Depends(user_service.get_current_admin_user),
) -> Any:
    """List all templates available in Proxmox. Admin only."""
    try:
        templates = proxmox_service.get_templates()
        return templates
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch templates from Proxmox: {str(e)}",
        )


@router.get("/", response_model=List[VMTemplateResponse])
async def list_templates(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(user_service.get_current_active_user),
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """List all templates."""
    # Regular users can only see enabled templates
    if current_user.role != "admin":
        result = await db.execute(
            select(VMTemplate)
            .where(VMTemplate.enabled == True)
            .offset(skip)
            .limit(limit)
        )
    else:
        result = await db.execute(select(VMTemplate).offset(skip).limit(limit))
    
    templates = result.scalars().all()
    return templates


@router.post("/", response_model=VMTemplateResponse)
async def create_template(
    template_data: VMTemplateCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(user_service.get_current_admin_user),
) -> Any:
    """Create a new template. Admin only."""
    # Check if template exists in Proxmox
    try:
        proxmox_service.get_template_config(
            template_data.proxmox_node, template_data.proxmox_template_id
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Template not found in Proxmox: {str(e)}",
        )
    
    # Create template
    db_template = VMTemplate(**template_data.model_dump())
    db.add(db_template)
    await db.commit()
    await db.refresh(db_template)
    
    return db_template


@router.get("/{template_id}", response_model=VMTemplateResponse)
async def get_template(
    template_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(user_service.get_current_active_user),
) -> Any:
    """Get a specific template."""
    result = await db.execute(select(VMTemplate).where(VMTemplate.id == template_id))
    template = result.scalars().first()
    
    if template is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found",
        )
    
    # Regular users can only see enabled templates
    if current_user.role != "admin" and not template.enabled:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found",
        )
    
    return template


@router.put("/{template_id}", response_model=VMTemplateResponse)
async def update_template(
    template_id: int,
    template_data: VMTemplateUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(user_service.get_current_admin_user),
) -> Any:
    """Update a template. Admin only."""
    result = await db.execute(select(VMTemplate).where(VMTemplate.id == template_id))
    template = result.scalars().first()
    
    if template is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found",
        )
    
    # Update template data
    update_data = template_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(template, field, value)
    
    await db.commit()
    await db.refresh(template)
    
    return template


@router.delete("/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_template(
    template_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(user_service.get_current_admin_user),
) -> Any:
    """Delete a template. Admin only."""
    result = await db.execute(select(VMTemplate).where(VMTemplate.id == template_id))
    template = result.scalars().first()
    
    if template is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found",
        )
    
    await db.delete(template)
    await db.commit()
    
    return None