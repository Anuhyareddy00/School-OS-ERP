from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from services.csv_service import generate_csv
from routes._deps import get_current_user
from services.permissions import require_role
from services import store

router = APIRouter(prefix="/exports", tags=["Exports"])

@router.get("/student/{student_id}/full.csv")
def export_student_full(student_id: str, user=get_current_user):
    user = user()
    require_role(user, ["ADMIN", "TEACHER", "PARENT", "STUDENT"])
    st = store.students.get(student_id)
    if not st:
        raise HTTPException(status_code=404, detail="Student not found")

    # Attendance %
    total = 0
    present = 0
    for a in store.attendance:
        if a["studentId"] == student_id:
            total += 1
            if a["status"] == "PRESENT":
                present += 1
    attendance_pct = round((present/total)*100, 2) if total else 0

    # Marks total
    total_marks = 0
    for m in store.marks:
        if m["studentId"] == student_id:
            total_marks += m["score"]

    headers = ["student_id", "admissionNo", "name", "classId", "rollNo", "attendance_pct", "total_marks"]
    rows = [{
        "student_id": st["id"],
        "admissionNo": st["admissionNo"],
        "name": st["name"],
        "classId": st["classId"],
        "rollNo": st["rollNo"],
        "attendance_pct": attendance_pct,
        "total_marks": total_marks
    }]
    csv_bytes = generate_csv(headers, rows)
    return Response(content=csv_bytes, media_type="text/csv")

@router.get("/exam/{exam_id}/marks.csv")
def export_exam_marks(exam_id: str, user=get_current_user):
    user = user()
    require_role(user, ["ADMIN", "TEACHER"])
    ex = store.exams.get(exam_id)
    if not ex:
        raise HTTPException(status_code=404, detail="Exam not found")

    headers = ["studentId", "studentName", "subjectId", "subject", "score", "grade"]
    rows = []
    for m in store.marks:
        if m["examId"] == exam_id:
            st = store.students.get(m["studentId"], {})
            sub = store.subjects.get(m["subjectId"], {})
            rows.append({
                "studentId": m["studentId"],
                "studentName": st.get("name", ""),
                "subjectId": m["subjectId"],
                "subject": sub.get("name", ""),
                "score": m["score"],
                "grade": m["grade"]
            })

    csv_bytes = generate_csv(headers, rows)
    return Response(content=csv_bytes, media_type="text/csv")
