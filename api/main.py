from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes.auth import router as auth_router
from routes.admin import router as admin_router
from routes.teacher import router as teacher_router
from routes.student_parent import router as sp_router
from routes.exports import router as exports_router
from routes.agent import router as agent_router
from services.db import connect_db, disconnect_db

app = FastAPI(title="School OS API")

# CORS for local dev (Next.js on 3000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(teacher_router)
app.include_router(sp_router)
app.include_router(exports_router)
app.include_router(agent_router)

@app.on_event("startup")
async def startup():
    await connect_db()


@app.on_event("shutdown")
async def shutdown():
    await disconnect_db()


@app.get("/")
def root():
    return {"status": "ok", "message": "School OS API running"}
