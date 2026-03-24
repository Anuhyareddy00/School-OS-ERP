from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from datetime import datetime
from routes._deps import get_current_user
from services.permissions import require_role
from services import store
from services.db import db, is_db_enabled

router = APIRouter(prefix="/teacher", tags=["Teacher"])

class AttendanceIn(BaseModel):
    classId: str
    date: str  # YYYY-MM-DD
    records: list[dict]  # {studentId, status}

class ExamIn(BaseModel):
    classId: str
    name: str
    term: str
    year: int
    maxMarks: int

class MarkIn(BaseModel):
    examId: str
    studentId: str
    subjectId: str
    score: float

def grade_from_score(score: float, max_marks: float):
    if max_marks <= 0:
        return "NA"
    pct = (score / max_marks) * 100
    if pct >= 90: return "A+"
    if pct >= 80: return "A"
    if pct >= 70: return "B"
    if pct >= 60: return "C"
    if pct >= 50: return "D"
    return "E"

@router.post("/attendance")
async def mark_attendance(body: AttendanceIn, user=get_current_user):
    user = user()
    require_role(user, ["TEACHER", "ADMIN"])
    if is_db_enabled():
        class_room = await db.classroom.find_unique(where={"id": body.classId})
        if not class_room:
            raise HTTPException(status_code=404, detail="Class not found")
        dt = datetime.fromisoformat(body.date)
        saved = 0
        for rec in body.records:
            student = await db.student.find_unique(where={"id": rec["studentId"]})
            if not student:
                continue
            existing = await db.attendance.find_first(
                where={"studentId": rec["studentId"], "date": dt}
            )
            if existing:
                await db.attendance.update(
                    where={"id": existing.id},
                    data={"status": rec["status"], "markedBy": user["id"]},
                )
            else:
                await db.attendance.create(
                    data={
                        "studentId": rec["studentId"],
                        "classRoomId": body.classId,
                        "date": dt,
                        "status": rec["status"],
                        "markedBy": user["id"],
                    }
                )
            saved += 1
        return {"saved": saved}

    if body.classId not in store.classes:
        raise HTTPException(status_code=404, detail="Class not found")

    dt = datetime.fromisoformat(body.date)
    saved = 0
    for rec in body.records:
        if rec["studentId"] not in store.students:
            continue
        store.attendance.append({
            "id": store.new_id(),
            "studentId": rec["studentId"],
            "classId": body.classId,
            "date": dt.date().isoformat(),
            "status": rec["status"],
            "markedBy": user["id"]
        })
        saved += 1
    return {"saved": saved}

@router.post("/exams")
async def create_exam(body: ExamIn, user=get_current_user):
    user = user()
    require_role(user, ["TEACHER", "ADMIN"])
    if is_db_enabled():
        class_room = await db.classroom.find_unique(where={"id": body.classId})
        if not class_room:
            raise HTTPException(status_code=404, detail="Class not found")
        exam = await db.exam.create(
            data={
                "classRoomId": body.classId,
                "name": body.name,
                "term": body.term,
                "year": body.year,
                "maxMarks": body.maxMarks,
            }
        )
        return {
            "id": exam.id,
            "classId": exam.classRoomId,
            "name": exam.name,
            "term": exam.term,
            "year": exam.year,
            "maxMarks": exam.maxMarks,
        }
    if body.classId not in store.classes:
        raise HTTPException(status_code=404, detail="Class not found")
    ex_id = store.new_id()
    store.exams[ex_id] = body.dict() | {"id": ex_id}
    return store.exams[ex_id]

@router.get("/exams")
async def list_exams(user=get_current_user):
    user = user()
    require_role(user, ["TEACHER", "ADMIN"])
    if is_db_enabled():
        exams = await db.exam.find_many(order={"year": "desc"})
        return [
            {
                "id": e.id,
                "classId": e.classRoomId,
                "name": e.name,
                "term": e.term,
                "year": e.year,
                "maxMarks": e.maxMarks,
            }
            for e in exams
        ]
    return list(store.exams.values())

@router.post("/marks")
async def upload_marks(body: MarkIn, user=get_current_user):
    user = user()
    require_role(user, ["TEACHER", "ADMIN"])
    if is_db_enabled():
        exam = await db.exam.find_unique(where={"id": body.examId})
        if not exam:
            raise HTTPException(status_code=404, detail="Exam not found")
        student = await db.student.find_unique(where={"id": body.studentId})
        if not student:
            raise HTTPException(status_code=404, detail="Student not found")
        subject = await db.subject.find_unique(where={"id": body.subjectId})
        if not subject:
            raise HTTPException(status_code=404, detail="Subject not found")
        g = grade_from_score(body.score, exam.maxMarks)
        existing = await db.mark.find_first(
            where={
                "examId": body.examId,
                "studentId": body.studentId,
                "subjectId": body.subjectId,
            }
        )
        if existing:
            await db.mark.update(
                where={"id": existing.id},
                data={"score": body.score, "grade": g, "uploadedBy": user["id"]},
            )
            return {"ok": True, "grade": g, "updated": True}
        await db.mark.create(
            data={
                "examId": body.examId,
                "studentId": body.studentId,
                "subjectId": body.subjectId,
                "score": body.score,
                "grade": g,
                "uploadedBy": user["id"],
            }
        )
        return {"ok": True, "grade": g, "updated": False}
    exam = store.exams.get(body.examId)
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    if body.studentId not in store.students:
        raise HTTPException(status_code=404, detail="Student not found")
    if body.subjectId not in store.subjects:
        raise HTTPException(status_code=404, detail="Subject not found")
    g = grade_from_score(body.score, exam["maxMarks"])
    store.marks.append({
        "id": store.new_id(),
        "examId": body.examId,
        "studentId": body.studentId,
        "subjectId": body.subjectId,
        "score": body.score,
        "grade": g,
        "uploadedBy": user["id"]
    })
    return {"ok": True, "grade": g}

@router.get("/marks")
async def list_marks(user=get_current_user):
    user = user()
    require_role(user, ["TEACHER", "ADMIN"])
    if is_db_enabled():
        marks = await db.mark.find_many(order={"id": "desc"})
        return [
            {
                "id": m.id,
                "examId": m.examId,
                "studentId": m.studentId,
                "subjectId": m.subjectId,
                "score": m.score,
                "grade": m.grade,
                "uploadedBy": m.uploadedBy,
            }
            for m in marks
        ]
    return store.marks
