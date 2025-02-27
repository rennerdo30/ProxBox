from typing import Any, List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.user import User
from app.schemas.user import UserAdminUpdate, UserCreate, UserResponse, UserUpdate
from app.services.user import user_service

router = APIRouter()


@router.get("/", response_model=List[UserResponse])
async def list_users(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(user_service.get_current_admin_user),
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """List all users. Admin only."""
    result = await db.execute(select(User).offset(skip).limit(limit))
    users = result.scalars().all()
    return users


@router.post("/", response_model=UserResponse)
async def create_user(
    user_data: UserCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(user_service.get_current_admin_user),
) -> Any:
    """Create a new user. Admin only."""
    user = await user_service.create_user(db, user_data)
    return user


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(user_service.get_current_active_user),
) -> Any:
    """Get a specific user by ID."""
    # Only admins can view other users, regular users can only view themselves
    if current_user.id != user_id and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions",
        )
    
    user = await user_service.get_user_by_id(db, user_id)
    
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    
    return user


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    user_data: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(user_service.get_current_active_user),
) -> Any:
    """Update a user."""
    # Only users can update themselves, unless they're an admin
    if current_user.id != user_id and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions",
        )
    
    user = await user_service.get_user_by_id(db, user_id)
    
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    
    # Update user data
    if user_data.email is not None:
        user.email = user_data.email
    if user_data.first_name is not None:
        user.first_name = user_data.first_name
    if user_data.last_name is not None:
        user.last_name = user_data.last_name
    if user_data.is_active is not None and current_user.role == "admin":
        user.is_active = user_data.is_active
    if user_data.password is not None:
        user.password_hash = user_service.get_password_hash(user_data.password)
    
    await db.commit()
    await db.refresh(user)
    
    return user


@router.put("/admin/{user_id}", response_model=UserResponse)
async def admin_update_user(
    user_id: int,
    user_data: UserAdminUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(user_service.get_current_admin_user),
) -> Any:
    """Admin update a user. Admin only."""
    user = await user_service.get_user_by_id(db, user_id)
    
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    
    # Update user data
    if user_data.email is not None:
        user.email = user_data.email
    if user_data.first_name is not None:
        user.first_name = user_data.first_name
    if user_data.last_name is not None:
        user.last_name = user_data.last_name
    if user_data.is_active is not None:
        user.is_active = user_data.is_active
    if user_data.role is not None:
        user.role = user_data.role
    if user_data.password is not None:
        user.password_hash = user_service.get_password_hash(user_data.password)
    
    await db.commit()
    await db.refresh(user)
    
    return user


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(user_service.get_current_admin_user),
) -> Any:
    """Delete a user. Admin only."""
    user = await user_service.get_user_by_id(db, user_id)
    
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    
    # Prevent deletion of the last admin user
    if user.role == "admin":
        admin_count_result = await db.execute(select(User).where(User.role == "admin"))
        admin_users = admin_count_result.scalars().all()
        if len(admin_users) <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete the last admin user",
            )
    
    await db.delete(user)
    await db.commit()
    
    return None