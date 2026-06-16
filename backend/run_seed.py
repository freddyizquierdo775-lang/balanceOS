"""Ejecuta el seed desde raíz sin importar como módulo app."""
import asyncio
import sys
import os

# Asegurar que backend/ esté en el path para que 'import app' funcione
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from seed import seed

if __name__ == "__main__":
    ok = asyncio.run(seed())
    sys.exit(0 if ok else 0)  # seed exitoso o ya ejecutado = OK
