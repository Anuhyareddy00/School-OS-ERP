import os

try:
    from prisma import Prisma
except Exception:  # pragma: no cover - handled at runtime
    Prisma = None

db = Prisma() if Prisma else None


def is_db_enabled() -> bool:
    return bool(os.getenv("DATABASE_URL"))


async def connect_db():
    if not is_db_enabled():
        return
    if not db:
        raise RuntimeError("DATABASE_URL is set, but prisma client is not installed/generated.")
    await db.connect()


async def disconnect_db():
    if db and db.is_connected():
        await db.disconnect()
