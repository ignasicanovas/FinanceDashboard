from fastapi import APIRouter, HTTPException, status

from app.core import auth as auth_module
from app.deps import CurrentUser
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse, UserOut

router = APIRouter()


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(body: RegisterRequest):
    user_id = auth_module.register_user(body.email, body.password, body.full_name)
    if user_id is None:
        raise HTTPException(status_code=400, detail="El email ya está registrado")
    token = auth_module.create_access_token(user_id, body.email)
    return TokenResponse(access_token=token)


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest):
    user = auth_module.authenticate_user(body.email, body.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email o contraseña incorrectos",
        )
    token = auth_module.create_access_token(user["id"], user["email"])
    return TokenResponse(access_token=token)


@router.get("/me", response_model=UserOut)
def me(current_user: CurrentUser):
    return UserOut(**current_user)
