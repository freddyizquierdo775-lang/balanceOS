# Balance OS Backend — Configuración
import os
import secrets

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./balance_os.db")

# Railway provee DATABASE_URL en formato postgres:// o postgresql://
# asyncpg requiere postgresql+asyncpg://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+asyncpg://", 1)
elif DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)

SECRET_KEY = os.getenv("SECRET_KEY", secrets.token_hex(32))
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "480"))

# Stripe
STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY", "")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "")
STRIPE_PRICE_STARTER = os.getenv("STRIPE_PRICE_STARTER", "price_starter_id")
STRIPE_PRICE_PRO = os.getenv("STRIPE_PRICE_PRO", "price_pro_id")
STRIPE_PRICE_ENTERPRISE = os.getenv("STRIPE_PRICE_ENTERPRISE", "price_enterprise_id")

# Email SMTP
SMTP_HOST = os.getenv("SMTP_HOST", "smtp.sendgrid.net")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "apikey")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM = os.getenv("SMTP_FROM", "hola@balanceos.com")
SMTP_FROM_NAME = os.getenv("SMTP_FROM_NAME", "Balance OS")
