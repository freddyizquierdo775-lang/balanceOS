# Balance OS Backend — Configuración
import os
import secrets

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./balance_os.db")
SECRET_KEY = os.getenv("SECRET_KEY", secrets.token_hex(32))
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "480"))  # 8 horas
