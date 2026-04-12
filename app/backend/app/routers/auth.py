"""
Authentication Router
Handles user registration, login, and profile endpoints
"""
from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from typing import Optional
from loguru import logger

from app.services.auth_service import auth_service, UserCreate, UserLogin, UserResponse


router = APIRouter(prefix="/auth", tags=["Authentication"])
security = HTTPBearer(auto_error=False)


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    display_name: Optional[str] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    success: bool
    message: str
    user: Optional[UserResponse] = None
    custom_token: Optional[str] = None


class UserProfileResponse(BaseModel):
    success: bool
    user: Optional[UserResponse] = None


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Optional[str]:
    """
    Dependency to get current user from Bearer token
    Returns user_id if authenticated, None otherwise
    """
    if not credentials:
        return None
    
    try:
        token = credentials.credentials
        user_data = await auth_service.verify_token(token)
        if user_data:
            return user_data.get("uid")
        return None
    except Exception as e:
        logger.warning(f"Token verification failed: {e}")
        return None


async def require_auth(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    """
    Dependency that requires authentication
    Raises 401 if not authenticated
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    try:
        token = credentials.credentials
        user_data = await auth_service.verify_token(token)
        if user_data:
            return user_data.get("uid")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"}
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Auth error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed",
            headers={"WWW-Authenticate": "Bearer"}
        )


@router.post("/register", response_model=LoginResponse)
async def register(request: RegisterRequest):
    """
    Register a new user
    
    - **email**: User's email address
    - **password**: Password (min 6 characters)
    - **display_name**: Optional display name
    """
    try:
        user_data = UserCreate(
            email=request.email,
            password=request.password,
            display_name=request.display_name
        )
        
        result = await auth_service.create_user(user_data)
        
        if result and result.get("success"):
            user_info = result.get("user", {})
            user_response = UserResponse(
                uid=user_info.get("uid", ""),
                email=user_info.get("email", ""),
                display_name=user_info.get("display_name"),
                created_at=user_info.get("created_at")
            )
            
            return LoginResponse(
                success=True,
                message="Registration successful",
                user=user_response,
                custom_token=result.get("token")
            )
        else:
            error_msg = result.get("error", "Registration failed") if result else "Registration failed"
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error_msg
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Registration error: {e}")
        error_msg = str(e)
        if "EMAIL_EXISTS" in error_msg or "already exists" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Registration error: {str(e)}"
        )


@router.post("/login", response_model=LoginResponse)
async def login(request: LoginRequest):
    """
    Login with email and password
    
    Note: This endpoint returns a custom token for Firebase Auth.
    The frontend should exchange this for an ID token using Firebase SDK.
    """
    try:
        login_data = UserLogin(
            email=request.email,
            password=request.password
        )
        
        result = await auth_service.login_user(login_data)
        
        if result:
            user_response = UserResponse(
                uid=result["uid"],
                email=result["email"],
                display_name=result.get("display_name"),
                created_at=result.get("created_at")
            )
            
            return LoginResponse(
                success=True,
                message="Login successful",
                user=user_response,
                custom_token=result.get("custom_token")
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )


@router.get("/me", response_model=UserProfileResponse)
async def get_me(user_id: str = Depends(require_auth)):
    """
    Get current user's profile
    
    Requires Bearer token authentication
    """
    try:
        user_data = await auth_service.get_user(user_id)
        
        if user_data:
            user_response = UserResponse(
                uid=user_data["uid"],
                email=user_data["email"],
                display_name=user_data.get("display_name"),
                created_at=user_data.get("created_at")
            )
            
            return UserProfileResponse(
                success=True,
                user=user_response
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get profile error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get user profile"
        )


@router.post("/logout")
async def logout(user_id: str = Depends(require_auth)):
    """
    Logout (server-side token revocation)
    
    Note: Client should also clear local tokens
    """
    try:
        # Revoke all refresh tokens for the user
        from firebase_admin import auth
        auth.revoke_refresh_tokens(user_id)
        
        return {
            "success": True,
            "message": "Logged out successfully"
        }
    except Exception as e:
        logger.error(f"Logout error: {e}")
        return {
            "success": True,
            "message": "Logged out"
        }


@router.delete("/account")
async def delete_account(user_id: str = Depends(require_auth)):
    """
    Delete user account and all associated data
    
    WARNING: This action is irreversible
    """
    try:
        result = await auth_service.delete_user(user_id)
        
        if result:
            return {
                "success": True,
                "message": "Account deleted successfully"
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete account"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete account error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete account"
        )
