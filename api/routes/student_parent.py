from datetime import datetime
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from routes._deps import get_current_user
from services.permissions import require_role
from services import store
from services.db import db, is_db_enabled

router = APIRouter(prefix="/portal", tags=["Student/Parent Portal"])


class PortalMessageIn(BaseModel):
    recipientRole: str = "ADMIN"
    studentId: str | None = None
    title: str
    body: str


async def _resolve_students_for_user(user: dict):
    role = user["role"]
    if role in ["ADMIN", "TEACHER"]:
        if is_db_enabled():
            students = await db.student.find_many(order={"createdAt": "desc"})
            return [
                {"id": s.id, "name": s.name, "classId": s.classRoomId, "rollNo": s.rollNo}
                for s in students
            ]
        return list(store.students.values())

    if is_db_enabled():
        if role == "STUDENT":
            s = await db.student.find_first(where={"studentUserId": user["id"]})
            if not s:
                return []
            return [{"id": s.id, "name": s.name, "classId": s.classRoomId, "rollNo": s.rollNo}]
        if role == "PARENT":
            links = await db.parentstudent.find_many(
                where={"parentUserId": user["id"]},
                include={"student": True},
            )
            return [
                {
                    "id": l.student.id,
                    "name": l.student.name,
                    "classId": l.student.classRoomId,
                    "rollNo": l.student.rollNo,
                }
                for l in links
                if l.student
            ]
        return []

    if role == "STUDENT":
        student_id = next(
            (sid for sid, uid in store.student_user_links.items() if uid == user["id"]), None
        )
        return [store.students[student_id]] if student_id and student_id in store.students else []
    if role == "PARENT":
        ids = [l["studentId"] for l in store.parent_student_links if l["parentUserId"] == user["id"]]
        return [store.students[sid] for sid in ids if sid in store.students]
    return []


@router.get("/my/records")
async def my_records(user=get_current_user):
    user = user()
    require_role(user, ["STUDENT", "PARENT", "ADMIN", "TEACHER"])
    students = await _resolve_students_for_user(user)
    student_ids = {s["id"] for s in students}

    if is_db_enabled():
        attendance = []
        marks = []
        if student_ids:
            attendance = await db.attendance.find_many(
                where={"studentId": {"in": list(student_ids)}}
            )
            marks = await db.mark.find_many(
                where={"studentId": {"in": list(student_ids)}}
            )
        return {
            "students": students,
            "attendance": [
                {
                    "id": a.id,
                    "studentId": a.studentId,
                    "classId": a.classRoomId,
                    "date": a.date.date().isoformat(),
                    "status": a.status,
                }
                for a in attendance
            ],
            "marks": [
                {
                    "id": m.id,
                    "studentId": m.studentId,
                    "examId": m.examId,
                    "subjectId": m.subjectId,
                    "score": m.score,
                    "grade": m.grade,
                }
                for m in marks
            ],
        }

    attendance = [a for a in store.attendance if a["studentId"] in student_ids]
    marks = [m for m in store.marks if m["studentId"] in student_ids]
    return {"students": students, "attendance": attendance, "marks": marks}


@router.get("/my/timetable")
async def my_timetable(user=get_current_user):
    user = user()
    require_role(user, ["STUDENT", "PARENT", "ADMIN", "TEACHER"])
    students = await _resolve_students_for_user(user)
    class_ids = {s["classId"] for s in students}

    if is_db_enabled():
        if not class_ids:
            return []
        items = await db.timetable.find_many(
            where={"classRoomId": {"in": list(class_ids)}},
            include={"subject": True, "teacher": {"include": {"user": True}}},
            order=[{"dayOfWeek": "asc"}, {"periodNo": "asc"}],
        )
        return [
            {
                "id": t.id,
                "classId": t.classRoomId,
                "dayOfWeek": t.dayOfWeek,
                "periodNo": t.periodNo,
                "subjectId": t.subjectId,
                "subjectName": t.subject.name if t.subject else "",
                "teacherName": (t.teacher.user.name if t.teacher and t.teacher.user else ""),
                "startTime": t.startTime,
                "endTime": t.endTime,
            }
            for t in items
        ]

    return [t for t in store.timetables if t["classId"] in class_ids]


@router.get("/my/fees")
async def my_fees(user=get_current_user):
    user = user()
    require_role(user, ["STUDENT", "PARENT", "ADMIN", "TEACHER"])
    students = await _resolve_students_for_user(user)
    if not students:
        return {"students": [], "summary": [], "payments": []}

    if is_db_enabled():
        student_ids = [s["id"] for s in students]
        class_ids = list({s["classId"] for s in students})
        structures = await db.feestructure.find_many(where={"classRoomId": {"in": class_ids}})
        payments = await db.feepayment.find_many(where={"studentId": {"in": student_ids}})

        paid_map = {}
        for p in payments:
            key = (p.studentId, p.feeStructureId)
            paid_map[key] = paid_map.get(key, 0) + p.paidAmount

        summary = []
        for student in students:
            for fee in structures:
                if fee.classRoomId != student["classId"]:
                    continue
                paid_amount = paid_map.get((student["id"], fee.id), 0)
                due_amount = round(max(0, fee.amount - paid_amount), 2)
                summary.append(
                    {
                        "studentId": student["id"],
                        "studentName": student["name"],
                        "feeStructureId": fee.id,
                        "feeType": fee.feeType,
                        "amount": fee.amount,
                        "paidAmount": round(paid_amount, 2),
                        "dueAmount": due_amount,
                        "dueDate": fee.dueDate.date().isoformat(),
                        "status": "PAID" if due_amount == 0 else "DUE",
                    }
                )

        return {
            "students": students,
            "summary": summary,
            "payments": [
                {
                    "id": p.id,
                    "studentId": p.studentId,
                    "feeStructureId": p.feeStructureId,
                    "paidAmount": p.paidAmount,
                    "status": p.status,
                    "paymentMode": p.paymentMode,
                    "receiptNo": p.receiptNo,
                }
                for p in payments
            ],
        }

    student_ids = {s["id"] for s in students}
    class_ids = {s["classId"] for s in students}
    structures = [f for f in store.fee_structures.values() if f["classId"] in class_ids]
    payments = [p for p in store.fee_payments if p["studentId"] in student_ids]

    paid_map = {}
    for p in payments:
        key = (p["studentId"], p["feeStructureId"])
        paid_map[key] = paid_map.get(key, 0) + p["paidAmount"]

    summary = []
    for student in students:
        for fee in structures:
            if fee["classId"] != student["classId"]:
                continue
            paid_amount = paid_map.get((student["id"], fee["id"]), 0)
            due_amount = round(max(0, fee["amount"] - paid_amount), 2)
            summary.append(
                {
                    "studentId": student["id"],
                    "studentName": student["name"],
                    "feeStructureId": fee["id"],
                    "feeType": fee["feeType"],
                    "amount": fee["amount"],
                    "paidAmount": round(paid_amount, 2),
                    "dueAmount": due_amount,
                    "dueDate": fee["dueDate"],
                    "status": "PAID" if due_amount == 0 else "DUE",
                }
            )
    return {"students": students, "summary": summary, "payments": payments}


@router.post("/my/messages")
async def send_portal_message(body: PortalMessageIn, user=get_current_user):
    user = user()
    require_role(user, ["STUDENT", "PARENT"])
    role = body.recipientRole.upper()
    if role not in ["ADMIN", "TEACHER"]:
        raise HTTPException(status_code=400, detail="recipientRole must be ADMIN/TEACHER")

    student_id = body.studentId
    if not student_id:
        students = await _resolve_students_for_user(user)
        student_id = students[0]["id"] if students else None

    if is_db_enabled():
        message = await db.message.create(
            data={
                "senderRole": user["role"],
                "senderUserId": user["id"],
                "recipientRole": role,
                "studentId": student_id,
                "title": body.title,
                "body": body.body,
            }
        )
        return {
            "id": message.id,
            "senderRole": message.senderRole,
            "senderId": message.senderUserId,
            "recipientRole": message.recipientRole,
            "studentId": message.studentId,
            "title": message.title,
            "body": message.body,
            "createdAt": message.createdAt.isoformat(),
        }

    message = {
        "id": store.new_id(),
        "senderRole": user["role"],
        "senderId": user["id"],
        "recipientRole": role,
        "studentId": student_id,
        "title": body.title,
        "body": body.body,
        "createdAt": datetime.utcnow().isoformat(),
    }
    store.messages.append(message)
    return message


@router.get("/my/messages")
async def my_messages(user=get_current_user):
    user = user()
    require_role(user, ["STUDENT", "PARENT", "ADMIN", "TEACHER"])

    if is_db_enabled():
        if user["role"] in ["ADMIN", "TEACHER"]:
            items = await db.message.find_many(order={"createdAt": "desc"})
            return [
                {
                    "id": m.id,
                    "senderRole": m.senderRole,
                    "senderId": m.senderUserId,
                    "recipientRole": m.recipientRole,
                    "studentId": m.studentId,
                    "title": m.title,
                    "body": m.body,
                    "createdAt": m.createdAt.isoformat(),
                }
                for m in items
            ]
        students = await _resolve_students_for_user(user)
        student_ids = [s["id"] for s in students]
        items = await db.message.find_many(
            where={
                "OR": [
                    {"recipientRole": user["role"]},
                    {"senderRole": user["role"], "senderUserId": user["id"]},
                ]
            },
            order={"createdAt": "desc"},
        )
        return [
            {
                "id": m.id,
                "senderRole": m.senderRole,
                "senderId": m.senderUserId,
                "recipientRole": m.recipientRole,
                "studentId": m.studentId,
                "title": m.title,
                "body": m.body,
                "createdAt": m.createdAt.isoformat(),
            }
            for m in items
            if (m.studentId is None or m.studentId in student_ids)
        ]

    if user["role"] in ["ADMIN", "TEACHER"]:
        return store.messages

    students = await _resolve_students_for_user(user)
    student_ids = {s["id"] for s in students}
    role = user["role"]
    return [
        m
        for m in store.messages
        if (m["recipientRole"] == role or m["senderRole"] == role)
        and (m.get("studentId") is None or m.get("studentId") in student_ids)
    ]
