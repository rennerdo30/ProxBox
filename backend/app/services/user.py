from datetime import datetime, timedelta
from typing import Optional

import ldap
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.session import get_db
from app.models.user import AuthProvider, User, UserRole
from app.schemas.user import TokenPayload, UserCreate

# Define OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class UserService:
    def __init__(self):
        self.pwd_context = pwd_context
        self.oauth2_scheme = oauth2_scheme

    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Verify if the plain password matches the hashed password."""
        return self.pwd_context.verify(plain_password, hashed_password)

    def get_password_hash(self, password: str) -> str:
        """Hash a password."""
        return self.pwd_context.hash(password)

    async def get_user_by_username(self, db: AsyncSession, username: str) -> Optional[User]:
        """Get a user by username."""
        result = await db.execute(select(User).where(User.username == username))
        return result.scalars().first()
    
    async def get_user_by_id(self, db: AsyncSession, user_id: int) -> Optional[User]:
        """Get a user by ID."""
        result = await db.execute(select(User).where(User.id == user_id))
        return result.scalars().first()

    async def create_user(self, db: AsyncSession, user_data: UserCreate) -> User:
        """Create a new user."""
        # Check if username or email already exists
        username_result = await db.execute(select(User).where(User.username == user_data.username))
        if username_result.scalars().first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already registered",
            )
        
        email_result = await db.execute(select(User).where(User.email == user_data.email))
        if email_result.scalars().first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered",
            )
        
        # Create the user object
        hashed_password = self.get_password_hash(user_data.password)
        db_user = User(
            username=user_data.username,
            email=user_data.email,
            password_hash=hashed_password,
            first_name=user_data.first_name,
            last_name=user_data.last_name,
            role=user_data.role,
            auth_provider=user_data.auth_provider,
        )
        
        db.add(db_user)
        await db.commit()
        await db.refresh(db_user)
        
        return db_user
    
    async def authenticate_user(
        self, db: AsyncSession, username: str, password: str
    ) -> Optional[User]:
        """Authenticate a user."""
        user = await self.get_user_by_username(db, username)
        
        if not user or not user.is_active:
            return None
        
        # Handle different authentication providers
        if user.auth_provider == AuthProvider.LOCAL:
            if not self.verify_password(password, user.password_hash):
                return None
        else:
            # Non-local auth providers should not use password verification via this method
            return None
        
        return user
    
    async def authenticate_ldap(
        self, db: AsyncSession, username: str, password: str
    ) -> Optional[User]:
        """Authenticate a user via LDAP."""
        if not settings.LDAP_ENABLED or not settings.LDAP_SERVER:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="LDAP authentication is not enabled",
            )
        
        # Try to bind to LDAP
        try:
            conn = ldap.initialize(settings.LDAP_SERVER)
            user_dn = f"uid={username},{settings.LDAP_USER_DN},{settings.LDAP_BASE_DN}"
            conn.simple_bind_s(user_dn, password)
            
            # Get user data from LDAP
            result = conn.search_s(
                user_dn, ldap.SCOPE_BASE, "(objectClass=*)", ['cn', 'mail', 'uid']
            )
            
            if not result:
                return None
                
            ldap_user = result[0][1]
            email = ldap_user.get('mail', [b''])[0].decode('utf-8')
            name_parts = ldap_user.get('cn', [b''])[0].decode('utf-8').split()
            first_name = name_parts[0] if name_parts else ""
            last_name = name_parts[1] if len(name_parts) > 1 else ""
            
            # Check if user already exists in database
            user = await self.get_user_by_username(db, username)
            
            if user:
                # Update existing user
                user.email = email
                user.first_name = first_name
                user.last_name = last_name
                user.auth_provider = AuthProvider.LDAP
                
                # Check if user is an admin in LDAP
                if settings.LDAP_ADMIN_GROUP:
                    admin_result = conn.search_s(
                        settings.LDAP_ADMIN_GROUP, 
                        ldap.SCOPE_BASE, 
                        f"(memberUid={username})", 
                        ['memberUid']
                    )
                    if admin_result:
                        user.role = UserRole.ADMIN
            else:
                # Create new user
                user = User(
                    username=username,
                    email=email,
                    first_name=first_name,
                    last_name=last_name,
                    auth_provider=AuthProvider.LDAP,
                    role=UserRole.USER,
                )
                
                # Check if user is an admin in LDAP
                if settings.LDAP_ADMIN_GROUP:
                    admin_result = conn.search_s(
                        settings.LDAP_ADMIN_GROUP, 
                        ldap.SCOPE_BASE, 
                        f"(memberUid={username})", 
                        ['memberUid']
                    )
                    if admin_result:
                        user.role = UserRole.ADMIN
                
                db.add(user)
            
            await db.commit()
            await db.refresh(user)
            
            return user
            
        except ldap.INVALID_CREDENTIALS:
            return None
        except Exception as e:
            # Log the error
            print(f"LDAP error: {str(e)}")
            return None
    
    def create_access_token(
        self, user_id: int, role: UserRole, expires_delta: Optional[timedelta] = None
    ) -> str:
        """Create a JWT access token."""
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        
        to_encode = {"sub": str(user_id), "exp": expire, "role": role}
        encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
        
        return encoded_jwt
    
    def create_refresh_token(self, user_id: int, role: UserRole) -> str:
        """Create a JWT refresh token."""
        expire = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        
        to_encode = {"sub": str(user_id), "exp": expire, "role": role}
        encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
        
        return encoded_jwt
    
    async def get_current_user(
        self, token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)
    ) -> User:
        """Get the current user from the JWT token."""
        credentials_exception = HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
        try:
            # Decode the JWT token
            payload = jwt.decode(
                token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
            )
            user_id: str = payload.get("sub")
            
            if user_id is None:
                raise credentials_exception
            
            token_data = TokenPayload(**payload)
            
            if datetime.fromtimestamp(token_data.exp) < datetime.now():
                raise credentials_exception
                
        except JWTError:
            raise credentials_exception
        
        # Get the user from the database
        user = await self.get_user_by_id(db, int(user_id))
        
        if user is None or not user.is_active:
            raise credentials_exception
            
        return user
    
    async def get_current_active_user(
        self, current_user: User = Depends(get_current_user)
    ) -> User:
        """Get the current active user."""
        if not current_user.is_active:
            raise HTTPException(status_code=400, detail="Inactive user")
            
        return current_user
    
    async def get_current_admin_user(
        self, current_user: User = Depends(get_current_active_user)
    ) -> User:
        """Get the current admin user."""
        if current_user.role != UserRole.ADMIN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions",
            )
            
        return current_user


# Singleton instance
user_service = UserService()