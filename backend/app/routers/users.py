from fastapi import APIRouter

from app.deps import CurrentUser
from app.schemas.auth import UserOut

router = APIRouter()


@router.get("/me", response_model=UserOut)
def get_me(current_user: CurrentUser):
    return UserOut(**current_user)
