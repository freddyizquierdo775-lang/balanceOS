"""
Balance OS — Router de Autenticación
"""
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
import bcrypt as _bcrypt
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from pydantic import BaseModel

from app.database import get_db
from app.models import Usuario, Despacho
from app.schemas import LoginRequest, TokenResponse, UsuarioCreate, UsuarioResponse
from app.config import SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES
from app.services.email_service import send_email

router = APIRouter(prefix="/auth", tags=["auth"])
security = HTTPBearer()


def hash_password(password: str) -> str:
    return _bcrypt.hashpw(password.encode("utf-8"), _bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return _bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def create_token(data: dict) -> str:
    to_encode = data.copy()
    to_encode.update({"exp": datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


async def verificar_token(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        return {"id": int(payload.get("sub")), "rol": payload.get("rol")}
    except JWTError:
        raise HTTPException(status_code=401, detail="Token invalido o expirado")


async def verificar_usuario_actual(usuario: dict = Depends(verificar_token), db: AsyncSession = Depends(get_db)) -> Usuario:
    """Verifica token y retorna el objeto Usuario completo."""
    result = await db.execute(select(Usuario).where(Usuario.id == usuario["id"]))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="Usuario no encontrado")
    return user


@router.get("/check-usuarios")
async def check_usuarios(db: AsyncSession = Depends(get_db)):
    """Retorna si existe al menos un usuario registrado (para mostrar botón de registro inicial)."""
    result = await db.execute(select(Usuario).limit(1))
    existe = result.scalar_one_or_none() is not None
    return {"hay_usuarios": existe}


@router.post("/registro", response_model=UsuarioResponse)
async def registro(data: UsuarioCreate, db: AsyncSession = Depends(get_db)):
    # Validar longitud mínima de contraseña
    if len(data.password) < 6:
        raise HTTPException(status_code=400, detail="La contraseña debe tener al menos 6 caracteres")
    # Validar email básico
    if "@" not in data.email or "." not in data.email.split("@")[-1]:
        raise HTTPException(status_code=400, detail="Email invalido")
    result = await db.execute(select(Usuario).where(Usuario.email == data.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email ya registrado")

    # ── Multi-tenancy: asignar despacho ──
    # Determinar si es el primer usuario del sistema (para crear despacho default)
    result_count = await db.execute(select(Usuario).limit(1))
    primer_usuario = result_count.scalar_one_or_none() is None

    if primer_usuario:
        # Crear despacho default automáticamente
        despacho = Despacho(nombre="default", plan="enterprise")
        db.add(despacho)
        await db.flush()
    else:
        # Buscar un despacho existente (intentar por dominio del email)
        dominio = data.email.split("@")[-1] if "@" in data.email else None
        despacho = None
        if dominio:
            despacho_result = await db.execute(
                select(Despacho).where(Despacho.email.ilike(f"%@{dominio}"))
            )
            despacho = despacho_result.scalar_one_or_none()
        # Fallback: usar el despacho default
        if not despacho:
            despacho_result = await db.execute(
                select(Despacho).where(Despacho.nombre == "default")
            )
            despacho = despacho_result.scalar_one_or_none()
        if not despacho:
            raise HTTPException(status_code=500, detail="No se pudo asignar despacho. Contacte al administrador.")

    # El primer usuario registrado se convierte en admin automáticamente
    rol_final = "admin" if primer_usuario else data.rol

    usuario = Usuario(
        nombre=data.nombre,
        email=data.email,
        password_hash=hash_password(data.password),
        rol=rol_final,
        telefono=data.telefono,
        despacho_id=despacho.id,
    )
    db.add(usuario)
    await db.commit()
    await db.refresh(usuario)
    return usuario


@router.post("/login", response_model=TokenResponse)
async def login(data: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Usuario).where(Usuario.email == data.email))
    usuario = result.scalar_one_or_none()
    if not usuario or not verify_password(data.password, usuario.password_hash):
        raise HTTPException(status_code=401, detail="Credenciales invalidas")
    token = create_token({"sub": str(usuario.id), "rol": usuario.rol})
    return TokenResponse(
        access_token=token,
        usuario={"id": usuario.id, "nombre": usuario.nombre, "email": usuario.email, "rol": usuario.rol},
    )


@router.get("/me", response_model=UsuarioResponse)
async def perfil(usuario: dict = Depends(verificar_token), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Usuario).where(Usuario.id == usuario["id"]))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return user


# ─── Admin: gestión de usuarios ───────────────────

@router.get("/usuarios", response_model=List[UsuarioResponse])
async def listar_usuarios(
    usuario: Usuario = Depends(verificar_usuario_actual),
    db: AsyncSession = Depends(get_db),
):
    """Lista todos los usuarios (solo admin)."""
    if usuario.rol != "admin":
        raise HTTPException(status_code=403, detail="Se requiere rol admin")
    result = await db.execute(select(Usuario).order_by(Usuario.created_at.desc()))
    return result.scalars().all()


class UsuarioUpdateSchema(BaseModel):
    nombre: Optional[str] = None
    rol: Optional[str] = None
    activo: Optional[int] = None
    telefono: Optional[str] = None


@router.put("/usuarios/{user_id}", response_model=UsuarioResponse)
async def actualizar_usuario(
    user_id: int,
    data: UsuarioUpdateSchema,
    usuario: Usuario = Depends(verificar_usuario_actual),
    db: AsyncSession = Depends(get_db),
):
    """Actualiza datos de un usuario (solo admin)."""
    if usuario.rol != "admin":
        raise HTTPException(status_code=403, detail="Se requiere rol admin")

    result = await db.execute(select(Usuario).where(Usuario.id == user_id))
    target = result.scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    for campo, valor in data.model_dump(exclude_unset=True).items():
        setattr(target, campo, valor)
    await db.commit()
    await db.refresh(target)
    return target


# ─── Recuperación de contraseña ──────────────────

RESET_TOKEN_EXPIRE_MINUTES = 15


class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


@router.post("/forgot-password")
async def forgot_password(data: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)):
    """Envía email con link para restablecer contraseña."""
    result = await db.execute(select(Usuario).where(Usuario.email == data.email))
    usuario = result.scalar_one_or_none()

    # Siempre respondemos éxito para no revelar si el email existe
    if not usuario:
        return {"mensaje": "Si el email está registrado, recibirás un link para restablecer tu contraseña."}

    # Generar token de reset (15 min)
    reset_token = create_token({
        "sub": str(usuario.id),
        "tipo": "reset_password",
        "exp": datetime.utcnow() + timedelta(minutes=RESET_TOKEN_EXPIRE_MINUTES),
    })

    # Enviar email
    reset_link = f"https://balanceos.com/reset-password?token={reset_token}"
    try:
        await send_email(
            to_email=usuario.email,
            subject="Restablece tu contraseña — Balance OS",
            template_name="reset_password",
            context={
                "nombre": usuario.nombre,
                "reset_link": reset_link,
                "minutos": RESET_TOKEN_EXPIRE_MINUTES,
            },
        )
    except Exception:
        pass  # Email falló, pero el token es válido

    return {"mensaje": "Si el email está registrado, recibirás un link para restablecer tu contraseña."}


@router.post("/reset-password")
async def reset_password(data: ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    """Restablece contraseña usando token de reset."""
    try:
        payload = jwt.decode(data.token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("tipo") != "reset_password":
            raise HTTPException(status_code=400, detail="Token inválido")
        user_id = int(payload.get("sub"))
    except JWTError:
        raise HTTPException(status_code=400, detail="Token inválido o expirado")

    if len(data.new_password) < 6:
        raise HTTPException(status_code=400, detail="La contraseña debe tener al menos 6 caracteres")

    result = await db.execute(select(Usuario).where(Usuario.id == user_id))
    usuario = result.scalar_one_or_none()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    usuario.password_hash = hash_password(data.new_password)
    await db.commit()

    return {"mensaje": "Contraseña actualizada correctamente. Ya puedes iniciar sesión."}
