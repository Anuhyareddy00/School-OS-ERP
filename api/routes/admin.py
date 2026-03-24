from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from routes._deps import get_current_user
from services.permissions import require_role
from services import store
from services.db import db, is_db_enabled
from services.security import hash_password

router = APIRouter(prefix="/admin", tags=["Admin"])


class ClassIn(BaseModel):
    grade: str
    section: str


class SubjectIn(BaseModel):
    name: str


class StudentIn(BaseModel):
    admissionNo: str
    name: str
    classId: str
    rollNo: int | None = None
    studentUserEmail: str | None = None
    parentUserEmail: str | None = None


class TimeTableIn(BaseModel):
    classId: str
    dayOfWeek: str
    periodNo: int
    subjectId: str
    teacherName: str
    startTime: str
    endTime: str


class FeeStructureIn(BaseModel):
    classId: str
    academicYear: int
    feeType: str
    amount: float
    dueDate: str  # YYYY-MM-DD


class FeePaymentIn(BaseModel):
    studentId: str
    feeStructureId: str
    paidAmount: float
    paymentMode: str = "CASH"
    receiptNo: str | None = None


class AdminMessageIn(BaseModel):
    recipientRole: str
    studentId: str | None = None
    title: str
    body: str


class LinkByEmailIn(BaseModel):
    studentId: str
    studentUserEmail: str | None = None
    parentUserEmail: str | None = None


async def _link_student_and_parent(student_id: str, student_email: str | None, parent_email: str | None):
    linked = {"studentLinked": False, "parentLinked": False}
    if not is_db_enabled():
        if student_email:
            user = next((u for u in store.users.values() if u["email"] == student_email.lower()), None)
            if user:
                store.student_user_links[student_id] = user["id"]
                linked["studentLinked"] = True
        if parent_email:
            user = next((u for u in store.users.values() if u["email"] == parent_email.lower()), None)
            if user:
                pair = {"parentUserId": user["id"], "studentId": student_id}
                if pair not in store.parent_student_links:
                    store.parent_student_links.append(pair)
                linked["parentLinked"] = True
        return linked

    if student_email:
        su = await db.user.find_unique(where={"email": student_email.lower()})
        if su and su.role == "STUDENT":
            await db.student.update(where={"id": student_id}, data={"studentUserId": su.id})
            linked["studentLinked"] = True
    if parent_email:
        pu = await db.user.find_unique(where={"email": parent_email.lower()})
        if pu and pu.role == "PARENT":
            existing = await db.parentstudent.find_first(
                where={"parentUserId": pu.id, "studentId": student_id}
            )
            if not existing:
                await db.parentstudent.create(
                    data={"parentUserId": pu.id, "studentId": student_id}
                )
            linked["parentLinked"] = True
    return linked


@router.post("/classes")
async def create_class(body: ClassIn, user=Depends(get_current_user)):
    require_role(user, ["ADMIN"])
    if is_db_enabled():
        c = await db.classroom.create(data={"grade": body.grade, "section": body.section})
        return {"id": c.id, "grade": c.grade, "section": c.section}
    cid = store.new_id()
    store.classes[cid] = {"id": cid, "grade": body.grade, "section": body.section}
    return store.classes[cid]


@router.get("/classes")
async def list_classes(user=Depends(get_current_user)):
    require_role(user, ["ADMIN", "TEACHER"])
    if is_db_enabled():
        items = await db.classroom.find_many(order={"createdAt": "desc"})
        return [{"id": c.id, "grade": c.grade, "section": c.section} for c in items]
    return list(store.classes.values())


@router.post("/subjects")
async def create_subject(body: SubjectIn, user=Depends(get_current_user)):
    require_role(user, ["ADMIN"])
    if is_db_enabled():
        s = await db.subject.create(data={"name": body.name})
        return {"id": s.id, "name": s.name}
    sid = store.new_id()
    store.subjects[sid] = {"id": sid, "name": body.name}
    return store.subjects[sid]


@router.get("/subjects")
async def list_subjects(user=Depends(get_current_user)):
    require_role(user, ["ADMIN", "TEACHER"])
    if is_db_enabled():
        items = await db.subject.find_many(order={"name": "asc"})
        return [{"id": s.id, "name": s.name} for s in items]
    return list(store.subjects.values())


@router.post("/students")
async def create_student(body: StudentIn, user=Depends(get_current_user)):
    require_role(user, ["ADMIN"])
    normalized_admission = body.admissionNo.upper()
    if is_db_enabled():
        class_room = await db.classroom.find_unique(where={"id": body.classId})
        if not class_room:
            raise HTTPException(status_code=404, detail="Class not found")

        if body.rollNo is None:
            existing = await db.student.find_many(where={"classRoomId": body.classId})
            roll_no = (max([s.rollNo for s in existing]) + 1) if existing else 1
        else:
            roll_no = body.rollNo

        duplicate = await db.student.find_first(
            where={"classRoomId": body.classId, "rollNo": roll_no}
        )
        if duplicate:
            raise HTTPException(status_code=400, detail="Roll number already exists in this class")

        student = await db.student.create(
            data={
                "admissionNo": normalized_admission,
                "name": body.name,
                "rollNo": roll_no,
                "classRoomId": body.classId,
            }
        )
        links = await _link_student_and_parent(
            student.id, body.studentUserEmail, body.parentUserEmail
        )
        # Default student credentials: login id = admission number, password = admission number.
        if not body.studentUserEmail:
            default_email = f"{normalized_admission.lower()}@schoolos.local"
            su = await db.user.find_unique(where={"email": default_email})
            if not su:
                su = await db.user.create(
                    data={
                        "name": body.name,
                        "email": default_email,
                        "password": hash_password(normalized_admission),
                        "role": "STUDENT",
                    }
                )
            await db.student.update(where={"id": student.id}, data={"studentUserId": su.id})
            links["defaultStudentLoginId"] = normalized_admission
            links["defaultStudentPassword"] = normalized_admission

        return {
            "id": student.id,
            "admissionNo": student.admissionNo,
            "name": student.name,
            "rollNo": student.rollNo,
            "classId": student.classRoomId,
            **links,
        }

    if body.classId not in store.classes:
        raise HTTPException(status_code=404, detail="Class not found")

    if body.rollNo is None:
        existing_rolls = [
            s["rollNo"] for s in store.students.values() if s.get("classId") == body.classId
        ]
        roll_no = (max(existing_rolls) + 1) if existing_rolls else 1
    else:
        roll_no = body.rollNo

    for s in store.students.values():
        if s.get("classId") == body.classId and s.get("rollNo") == roll_no:
            raise HTTPException(status_code=400, detail="Roll number already exists in this class")

    stid = store.new_id()
    student = {
        "id": stid,
        "admissionNo": normalized_admission,
        "name": body.name,
        "rollNo": roll_no,
        "classId": body.classId,
    }
    store.students[stid] = student
    if not body.studentUserEmail:
        default_email = f"{normalized_admission.lower()}@schoolos.local"
        existing = next((u for u in store.users.values() if u["email"] == default_email), None)
        if not existing:
            uid = store.new_id()
            store.users[uid] = {
                "id": uid,
                "name": body.name,
                "email": default_email,
                "password": hash_password(normalized_admission),
                "role": "STUDENT",
            }
            store.student_user_links[stid] = uid
        else:
            store.student_user_links[stid] = existing["id"]
    links = await _link_student_and_parent(stid, body.studentUserEmail, body.parentUserEmail)
    if not body.studentUserEmail:
        links["defaultStudentLoginId"] = normalized_admission
        links["defaultStudentPassword"] = normalized_admission
    return student | links


@router.post("/students/link-by-email")
async def link_student_by_email(body: LinkByEmailIn, user=Depends(get_current_user)):
    require_role(user, ["ADMIN"])
    if is_db_enabled():
        student = await db.student.find_unique(where={"id": body.studentId})
        if not student:
            raise HTTPException(status_code=404, detail="Student not found")
    else:
        if body.studentId not in store.students:
            raise HTTPException(status_code=404, detail="Student not found")
    links = await _link_student_and_parent(
        body.studentId, body.studentUserEmail, body.parentUserEmail
    )
    return {"studentId": body.studentId, **links}


@router.get("/students")
async def list_students(user=Depends(get_current_user)):
    require_role(user, ["ADMIN", "TEACHER"])
    if is_db_enabled():
        items = await db.student.find_many(order={"createdAt": "desc"})
        return [
            {
                "id": s.id,
                "admissionNo": s.admissionNo,
                "name": s.name,
                "rollNo": s.rollNo,
                "classId": s.classRoomId,
                "studentUserId": s.studentUserId,
            }
            for s in items
        ]
    return list(store.students.values())


@router.post("/timetable")
async def create_timetable_entry(body: TimeTableIn, user=Depends(get_current_user)):
    require_role(user, ["ADMIN"])
    if is_db_enabled():
        class_room = await db.classroom.find_unique(where={"id": body.classId})
        if not class_room:
            raise HTTPException(status_code=404, detail="Class not found")
        subject = await db.subject.find_unique(where={"id": body.subjectId})
        if not subject:
            raise HTTPException(status_code=404, detail="Subject not found")

        teacher = await db.teacher.find_first(where={"employeeCode": body.teacherName})
        if not teacher:
            user_email = f"{body.teacherName.lower().replace(' ', '.')}.teacher@schoolos.local"
            teacher_user = await db.user.create(
                data={
                    "name": body.teacherName,
                    "email": user_email,
                    "password": hash_password("system-managed"),
                    "role": "TEACHER",
                }
            )
            teacher = await db.teacher.create(
                data={"userId": teacher_user.id, "employeeCode": body.teacherName}
            )

        entry = await db.timetable.create(
            data={
                "classRoomId": body.classId,
                "dayOfWeek": body.dayOfWeek,
                "periodNo": body.periodNo,
                "subjectId": body.subjectId,
                "teacherId": teacher.id,
                "startTime": body.startTime,
                "endTime": body.endTime,
            }
        )
        return {
            "id": entry.id,
            "classId": entry.classRoomId,
            "dayOfWeek": entry.dayOfWeek,
            "periodNo": entry.periodNo,
            "subjectId": entry.subjectId,
            "teacherName": body.teacherName,
            "startTime": entry.startTime,
            "endTime": entry.endTime,
        }

    if body.classId not in store.classes:
        raise HTTPException(status_code=404, detail="Class not found")
    if body.subjectId not in store.subjects:
        raise HTTPException(status_code=404, detail="Subject not found")
    entry = body.model_dump() | {"id": store.new_id()}
    store.timetables.append(entry)
    return entry


@router.get("/timetable")
async def list_timetable(classId: str | None = None, user=Depends(get_current_user)):
    require_role(user, ["ADMIN", "TEACHER", "STUDENT", "PARENT"])
    if is_db_enabled():
        where = {"classRoomId": classId} if classId else {}
        items = await db.timetable.find_many(
            where=where,
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
    if classId:
        return [t for t in store.timetables if t["classId"] == classId]
    return store.timetables


@router.post("/fees/structures")
async def create_fee_structure(body: FeeStructureIn, user=Depends(get_current_user)):
    require_role(user, ["ADMIN"])
    if is_db_enabled():
        class_room = await db.classroom.find_unique(where={"id": body.classId})
        if not class_room:
            raise HTTPException(status_code=404, detail="Class not found")
        fee = await db.feestructure.create(
            data={
                "classRoomId": body.classId,
                "academicYear": body.academicYear,
                "feeType": body.feeType,
                "amount": body.amount,
                "dueDate": datetime.fromisoformat(body.dueDate),
            }
        )
        return {
            "id": fee.id,
            "classId": fee.classRoomId,
            "academicYear": fee.academicYear,
            "feeType": fee.feeType,
            "amount": fee.amount,
            "dueDate": fee.dueDate.date().isoformat(),
        }

    if body.classId not in store.classes:
        raise HTTPException(status_code=404, detail="Class not found")
    fid = store.new_id()
    fee = body.model_dump() | {"id": fid}
    store.fee_structures[fid] = fee
    return fee


@router.get("/fees/structures")
async def list_fee_structures(classId: str | None = None, user=Depends(get_current_user)):
    require_role(user, ["ADMIN", "TEACHER", "PARENT", "STUDENT"])
    if is_db_enabled():
        where = {"classRoomId": classId} if classId else {}
        items = await db.feestructure.find_many(where=where, order={"academicYear": "desc"})
        return [
            {
                "id": f.id,
                "classId": f.classRoomId,
                "academicYear": f.academicYear,
                "feeType": f.feeType,
                "amount": f.amount,
                "dueDate": f.dueDate.date().isoformat(),
            }
            for f in items
        ]
    values = list(store.fee_structures.values())
    if classId:
        return [f for f in values if f["classId"] == classId]
    return values


@router.post("/fees/payments")
async def collect_fee_payment(body: FeePaymentIn, user=Depends(get_current_user)):
    require_role(user, ["ADMIN"])
    if is_db_enabled():
        student = await db.student.find_unique(where={"id": body.studentId})
        if not student:
            raise HTTPException(status_code=404, detail="Student not found")
        fee = await db.feestructure.find_unique(where={"id": body.feeStructureId})
        if not fee:
            raise HTTPException(status_code=404, detail="Fee structure not found")
        if body.paidAmount < 0:
            raise HTTPException(status_code=400, detail="Invalid paid amount")
        status = "PAID" if body.paidAmount >= fee.amount else "PARTIAL"
        existing_count = await db.feepayment.count()
        payment = await db.feepayment.create(
            data={
                "studentId": body.studentId,
                "feeStructureId": body.feeStructureId,
                "paidAmount": body.paidAmount,
                "status": status,
                "paymentDate": datetime.utcnow(),
                "receiptNo": body.receiptNo or f"RCPT-{existing_count + 1:04d}",
                "paymentMode": body.paymentMode,
            }
        )
        return {
            "id": payment.id,
            "studentId": payment.studentId,
            "feeStructureId": payment.feeStructureId,
            "paidAmount": payment.paidAmount,
            "status": payment.status,
            "paymentMode": payment.paymentMode,
            "receiptNo": payment.receiptNo,
        }

    student = store.students.get(body.studentId)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    fee = store.fee_structures.get(body.feeStructureId)
    if not fee:
        raise HTTPException(status_code=404, detail="Fee structure not found")
    if body.paidAmount < 0:
        raise HTTPException(status_code=400, detail="Invalid paid amount")
    status = "PAID" if body.paidAmount >= fee["amount"] else "PARTIAL"
    payment = {
        "id": store.new_id(),
        "studentId": body.studentId,
        "feeStructureId": body.feeStructureId,
        "paidAmount": body.paidAmount,
        "status": status,
        "paymentMode": body.paymentMode,
        "receiptNo": body.receiptNo or f"RCPT-{len(store.fee_payments) + 1:04d}",
        "processedBy": user["id"],
    }
    store.fee_payments.append(payment)
    return payment


@router.get("/fees/payments")
async def list_fee_payments(studentId: str | None = None, user=Depends(get_current_user)):
    require_role(user, ["ADMIN", "PARENT", "STUDENT"])
    if is_db_enabled():
        where = {"studentId": studentId} if studentId else {}
        items = await db.feepayment.find_many(where=where, order={"paymentDate": "desc"})
        return [
            {
                "id": p.id,
                "studentId": p.studentId,
                "feeStructureId": p.feeStructureId,
                "paidAmount": p.paidAmount,
                "status": p.status,
                "paymentMode": p.paymentMode,
                "receiptNo": p.receiptNo,
                "paymentDate": p.paymentDate.isoformat() if p.paymentDate else None,
            }
            for p in items
        ]
    if studentId:
        return [p for p in store.fee_payments if p["studentId"] == studentId]
    return store.fee_payments


@router.post("/messages")
async def send_admin_message(body: AdminMessageIn, user=Depends(get_current_user)):
    require_role(user, ["ADMIN", "TEACHER"])
    role = body.recipientRole.upper()
    if role not in ["PARENT", "STUDENT"]:
        raise HTTPException(status_code=400, detail="recipientRole must be PARENT/STUDENT")

    if is_db_enabled():
        if body.studentId:
            student = await db.student.find_unique(where={"id": body.studentId})
            if not student:
                raise HTTPException(status_code=404, detail="Student not found")
        message = await db.message.create(
            data={
                "senderRole": user["role"],
                "senderUserId": user["id"],
                "recipientRole": role,
                "studentId": body.studentId,
                "title": body.title,
                "body": body.body,
            }
        )
        return {
            "id": message.id,
            "senderRole": message.senderRole,
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
        "studentId": body.studentId,
        "title": body.title,
        "body": body.body,
        "createdAt": datetime.utcnow().isoformat(),
    }
    store.messages.append(message)
    return message


@router.get("/messages")
async def list_admin_messages(
    recipientRole: str | None = None,
    studentId: str | None = None,
    user=Depends(get_current_user),
):
    require_role(user, ["ADMIN", "TEACHER"])
    if is_db_enabled():
        where = {}
        if recipientRole:
            role = recipientRole.upper()
            where["recipientRole"] = role
        if studentId:
            where["studentId"] = studentId
        items = await db.message.find_many(where=where, order={"createdAt": "desc"})
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

    messages = store.messages
    if recipientRole:
        role = recipientRole.upper()
        messages = [m for m in messages if m["recipientRole"] == role]
    if studentId:
        messages = [m for m in messages if m.get("studentId") == studentId]
    return messages
