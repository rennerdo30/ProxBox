from datetime import timedelta
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.session import get_db
from app.models.user import AuthProvider, User, UserRole
from app.schemas.user import Token, UserCreate, UserResponse
from app.services.user import user_service

router = APIRouter()


@router.post("/login", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
) -> Any:
    """Login with username and password."""
    # Try local authentication first
    user = await user_service.authenticate_user(db, form_data.username, form_data.password)
    
    # If local auth fails and LDAP is enabled, try LDAP
    if user is None and settings.LDAP_ENABLED:
        user = await user_service.authenticate_ldap(db, form_data.username, form_data.password)
    
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Create access and refresh tokens
    access_token = user_service.create_access_token(user.id, user.role)
    refresh_token = user_service.create_refresh_token(user.id, user.role)
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
    }


@router.post("/refresh", response_model=Token)
async def refresh_token(
    token: str,
    db: AsyncSession = Depends(get_db),
) -> Any:
    """Refresh access token using a valid refresh token."""
    try:
        # Verify the refresh token
        user = await user_service.get_current_user(token, db)
        
        # Create new access and refresh tokens
        access_token = user_service.create_access_token(user.id, user.role)
        refresh_token = user_service.create_refresh_token(user.id, user.role)
        
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
        }
        
    except HTTPException:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
            headers={"WWW-Authenticate": "Bearer"},
        )


@router.post("/register", response_model=UserResponse)
async def register(
    user_data: UserCreate,
    db: AsyncSession = Depends(get_db),
) -> Any:
    """Register a new user."""
    # Force the role to be a regular user and auth provider to be local
    user_data.role = UserRole.USER
    user_data.auth_provider = AuthProvider.LOCAL
    
    # Create the user
    user = await user_service.create_user(db, user_data)
    
    return user


@router.get("/me", response_model=UserResponse)
async def get_current_user(
    current_user: User = Depends(user_service.get_current_active_user),
) -> Any:
    """Get the current user."""
    return current_user