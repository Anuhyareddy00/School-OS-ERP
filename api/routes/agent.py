from pathlib import Path
import csv
import io
from statistics import mean
from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from pydantic import BaseModel
from routes._deps import get_current_user
from services.permissions import require_role
from services import store
from services.db import db, is_db_enabled

router = APIRouter(prefix="/agent", tags=["OS Agent"])
PROMPTS_DIR = Path(__file__).resolve().parent.parent / "prompts"


class AnalyzeIn(BaseModel):
    studentId: str
    term: str | None = None
    attendancePct: float | None = None
    weakSubject: str | None = None


class ReminderIn(BaseModel):
    title: str
    dueDate: str  # YYYY-MM-DD
    studentId: str | None = None
    channel: str = "IN_APP"
    notes: str | None = None


class PromptRunIn(BaseModel):
    template: str
    studentId: str | None = None
    context: dict | None = None


class ReportCardSummaryIn(BaseModel):
    studentId: str
    term: str | None = None


async def _student_exists(student_id: str) -> bool:
    if not student_id:
        return False
    if is_db_enabled():
        s = await db.student.find_unique(where={"id": student_id})
        return bool(s)
    return student_id in store.students


async def _get_student_snapshot(student_id: str, term: str | None = None) -> dict | None:
    if is_db_enabled():
        student = await db.student.find_unique(
            where={"id": student_id},
            include={"classRoom": True},
        )
        if not student:
            return None

        marks = await db.mark.find_many(
            where={"studentId": student_id},
            include={"subject": True, "exam": True},
        )
        attendance = await db.attendance.find_many(
            where={"studentId": student_id},
            order={"date": "desc"},
        )
        return {
            "student": {
                "id": student.id,
                "name": student.name,
                "admissionNo": student.admissionNo,
                "rollNo": student.rollNo,
                "classId": student.classRoomId,
                "classLabel": (
                    f"{student.classRoom.grade} - {student.classRoom.section}"
                    if student.classRoom
                    else ""
                ),
            },
            "marks": [
                {
                    "subjectId": m.subjectId,
                    "subjectName": m.subject.name if m.subject else m.subjectId,
                    "examId": m.examId,
                    "examName": m.exam.name if m.exam else m.examId,
                    "term": m.exam.term if m.exam else None,
                    "year": m.exam.year if m.exam else None,
                    "score": m.score,
                    "maxMarks": m.exam.maxMarks if m.exam else None,
                    "grade": m.grade,
                }
                for m in marks
                if not term or (m.exam and m.exam.term == term)
            ],
            "attendance": [
                {
                    "date": a.date.date().isoformat(),
                    "status": a.status,
                }
                for a in attendance
            ],
        }

    student = store.students.get(student_id)
    if not student:
        return None

    class_info = store.classes.get(student.get("classId"))
    exam_map = store.exams
    subject_map = store.subjects
    marks = []
    for m in store.marks:
        if m["studentId"] != student_id:
            continue
        exam = exam_map.get(m["examId"], {})
        if term and exam.get("term") != term:
            continue
        subject = subject_map.get(m["subjectId"], {})
        marks.append(
            {
                "subjectId": m["subjectId"],
                "subjectName": subject.get("name", m["subjectId"]),
                "examId": m["examId"],
                "examName": exam.get("name", m["examId"]),
                "term": exam.get("term"),
                "year": exam.get("year"),
                "score": m["score"],
                "maxMarks": exam.get("maxMarks"),
                "grade": m.get("grade"),
            }
        )

    attendance = [
        {"date": a["date"], "status": a["status"]}
        for a in store.attendance
        if a["studentId"] == student_id
    ]
    attendance.sort(key=lambda item: item["date"], reverse=True)

    return {
        "student": {
            "id": student["id"],
            "name": student["name"],
            "admissionNo": student["admissionNo"],
            "rollNo": student["rollNo"],
            "classId": student["classId"],
            "classLabel": (
                f'{class_info.get("grade")} - {class_info.get("section")}'
                if class_info
                else ""
            ),
        },
        "marks": marks,
        "attendance": attendance,
    }


def _performance_band(score_pct: float) -> str:
    if score_pct >= 85:
        return "Excellent"
    if score_pct >= 70:
        return "Good"
    if score_pct >= 55:
        return "Developing"
    return "Needs urgent support"


def _attendance_band(attendance_pct: float) -> str:
    if attendance_pct >= 95:
        return "Excellent"
    if attendance_pct >= 85:
        return "Acceptable"
    if attendance_pct >= 75:
        return "At risk"
    return "Critical"


def _build_report_card_summary(snapshot: dict, term: str | None = None) -> dict:
    marks = snapshot["marks"]
    attendance = snapshot["attendance"]
    student = snapshot["student"]

    subject_buckets: dict[str, list[float]] = {}
    subject_exam_count: dict[str, int] = {}
    exam_buckets: dict[str, list[float]] = {}
    for mark in marks:
        max_marks = mark.get("maxMarks") or 0
        pct = round((mark["score"] / max_marks) * 100, 2) if max_marks > 0 else 0.0
        subject = mark["subjectName"]
        exam_label = mark["examName"]
        if mark.get("term"):
            exam_label = f'{exam_label} ({mark["term"]})'
        subject_buckets.setdefault(subject, []).append(pct)
        subject_exam_count[subject] = subject_exam_count.get(subject, 0) + 1
        exam_buckets.setdefault(exam_label, []).append(pct)

    subject_breakdown = []
    for subject, pcts in sorted(subject_buckets.items(), key=lambda item: mean(item[1]), reverse=True):
        avg_pct = round(mean(pcts), 2)
        subject_breakdown.append(
            {
                "subject": subject,
                "averagePct": avg_pct,
                "performance": _performance_band(avg_pct),
                "assessments": subject_exam_count[subject],
            }
        )

    overall_average = round(mean([item["averagePct"] for item in subject_breakdown]), 2) if subject_breakdown else 0.0
    top_subjects = [item["subject"] for item in subject_breakdown[:3]]
    focus_subjects = [item["subject"] for item in subject_breakdown if item["averagePct"] < 60][:3]

    total_attendance = len(attendance)
    present_attendance = sum(
        1 for item in attendance if str(item["status"]).upper() in {"PRESENT", "Present"}
    )
    attendance_pct = round((present_attendance / total_attendance) * 100, 2) if total_attendance else 0.0

    exam_trend = []
    for exam_name, pcts in exam_buckets.items():
        exam_trend.append({"exam": exam_name, "averagePct": round(mean(pcts), 2)})
    exam_trend.sort(key=lambda item: item["exam"])

    strengths = []
    if top_subjects:
        strengths.append(f"Best-performing subjects: {', '.join(top_subjects)}.")
    if overall_average >= 70:
        strengths.append("Overall academic profile is stable across assessed subjects.")
    if attendance_pct >= 90:
        strengths.append("Attendance supports consistent classroom participation.")

    risks = []
    if focus_subjects:
        risks.append(f"Priority intervention subjects: {', '.join(focus_subjects)}.")
    if attendance_pct < 85:
        risks.append("Attendance is likely affecting continuity and retention.")
    if overall_average < 55:
        risks.append("Current average indicates the student may struggle without targeted support.")
    if not risks:
        risks.append("No major academic risk is visible from the current report-card data.")

    actions = []
    if focus_subjects:
        actions.append(f"Set weekly remediation tasks for {', '.join(focus_subjects)}.")
    else:
        actions.append("Maintain current revision rhythm and monitor upcoming assessments.")
    actions.append("Review subject-wise trends after each exam cycle, not only term-end totals.")
    if attendance_pct < 90:
        actions.append("Track attendance weekly and escalate repeated absences early.")
    else:
        actions.append("Keep attendance above 90% to protect momentum.")

    summary = (
        f'{student["name"]} has an overall average of {overall_average}%'
        f' with attendance at {attendance_pct}%'
    )
    if term:
        summary += f" for {term}"
    summary += "."

    return {
        "student": student,
        "term": term,
        "overallAveragePct": overall_average,
        "overallPerformance": _performance_band(overall_average),
        "attendancePct": attendance_pct,
        "attendanceStatus": _attendance_band(attendance_pct),
        "subjectBreakdown": subject_breakdown,
        "examTrend": exam_trend,
        "strengths": strengths,
        "risks": risks,
        "recommendedActions": actions,
        "summary": summary,
    }


def _extract_preview(name: str, content: bytes) -> str:
    ext = Path(name).suffix.lower()
    if ext in [".txt", ".md", ".csv", ".json", ".log", ".py", ".js", ".ts"]:
        try:
            return content.decode("utf-8", errors="ignore")[:1200]
        except Exception:
            return ""
    return ""


def _extract_csv_summary(content: bytes) -> dict:
    text = content.decode("utf-8", errors="ignore")
    if not text.strip():
        return {"rows": 0, "columns": [], "sampleRows": [], "missingByColumn": {}}

    sample = text[:2000]
    try:
        dialect = csv.Sniffer().sniff(sample)
    except Exception:
        dialect = csv.excel

    reader = csv.DictReader(io.StringIO(text), dialect=dialect)
    columns = reader.fieldnames or []
    rows = []
    for r in reader:
        rows.append(r)

    missing = {c: 0 for c in columns}
    for r in rows:
        for c in columns:
            val = r.get(c)
            if val is None or str(val).strip() == "":
                missing[c] += 1

    return {
        "rows": len(rows),
        "columns": columns,
        "sampleRows": rows[:3],
        "missingByColumn": missing,
    }


@router.get("/prompts")
def list_prompt_templates(user=get_current_user):
    user = user()
    require_role(user, ["ADMIN", "TEACHER", "STUDENT", "PARENT"])
    templates = []
    for p in sorted(PROMPTS_DIR.glob("*.txt")):
        templates.append({"id": p.stem, "title": p.stem.replace("_", " ").title()})
    return templates


@router.post("/prompts/run")
async def run_prompt_template(body: PromptRunIn, user=get_current_user):
    user = user()
    require_role(user, ["ADMIN", "TEACHER"])
    prompt_file = PROMPTS_DIR / f"{body.template}.txt"
    if not prompt_file.exists():
        raise HTTPException(status_code=404, detail="Prompt template not found")
    prompt_text = prompt_file.read_text(encoding="utf-8").strip()

    if body.studentId and not await _student_exists(body.studentId):
        raise HTTPException(status_code=404, detail="Student not found")

    # Rule-based template execution stub; swap with LLM call later.
    output = {
        "template": body.template,
        "agent": "OS Agent",
        "studentId": body.studentId,
        "system_prompt": prompt_text,
        "result": {
            "summary": f"{body.template} generated successfully",
            "highlights": ["Trend stable", "Needs consistency in weak areas"],
            "actions": ["Schedule parent follow-up", "Assign weekly revision task"],
        },
    }
    return output


@router.post("/prompts/run-files")
async def run_prompt_with_files(
    template: str = Form(...),
    studentId: str | None = Form(default=None),
    files: list[UploadFile] = File(default=[]),
    user=get_current_user,
):
    user = user()
    require_role(user, ["ADMIN", "TEACHER"])
    prompt_file = PROMPTS_DIR / f"{template}.txt"
    if not prompt_file.exists():
        raise HTTPException(status_code=404, detail="Prompt template not found")
    if studentId and not await _student_exists(studentId):
        raise HTTPException(status_code=404, detail="Student not found")
    if len(files) > 8:
        raise HTTPException(status_code=400, detail="Maximum 8 files allowed")

    analyzed_files = []
    for f in files:
        content = await f.read()
        size = len(content)
        if size > 2 * 1024 * 1024:
            raise HTTPException(status_code=400, detail=f"{f.filename} exceeds 2MB limit")
        ext = Path(f.filename or "").suffix.lower()
        csv_summary = _extract_csv_summary(content) if ext == ".csv" else None
        analyzed_files.append(
            {
                "name": f.filename,
                "size": size,
                "contentType": f.content_type,
                "preview": _extract_preview(f.filename or "", content),
                "csvSummary": csv_summary,
            }
        )

    return {
        "template": template,
        "agent": "OS Agent",
        "studentId": studentId,
        "filesCount": len(analyzed_files),
        "files": analyzed_files,
        "result": {
            "summary": "File-assisted analysis generated successfully.",
            "highlights": [
                "Document context ingested",
                "Signals extracted from attached files",
            ],
            "actions": [
                "Review highlighted risk patterns in uploaded notes",
                "Apply recommended interventions in next weekly cycle",
            ],
        },
    }


@router.post("/remarks")
async def generate_remarks(body: AnalyzeIn, user=get_current_user):
    user = user()
    require_role(user, ["ADMIN", "TEACHER"])
    if not await _student_exists(body.studentId):
        raise HTTPException(status_code=404, detail="Student not found")

    weak_subject = body.weakSubject or "English"
    attendance_pct = body.attendancePct if body.attendancePct is not None else 82
    return {
        "studentId": body.studentId,
        "agent": "OS Agent",
        "overall_summary": "Steady academic growth with room to improve consistency and follow-through.",
        "strengths": ["Math", "Science"],
        "needs_focus": [weak_subject, "Daily revision discipline"],
        "attendance_signal": f"{attendance_pct}%",
        "action_plan": [
            f"Spend 20 minutes/day on {weak_subject} reinforcement tasks",
            "Run one short weekly revision test and track score trend",
            "Set parent-teacher check-in every Friday for progress closure",
        ],
    }


@router.post("/report-card-summary")
async def generate_report_card_summary(body: ReportCardSummaryIn, user=get_current_user):
    user = user()
    require_role(user, ["ADMIN", "TEACHER"])
    snapshot = await _get_student_snapshot(body.studentId, body.term)
    if not snapshot:
        raise HTTPException(status_code=404, detail="Student not found")

    if not snapshot["marks"]:
        raise HTTPException(
            status_code=400,
            detail="No marks available for this student"
            + (f" in {body.term}" if body.term else ""),
        )

    report = {
        "agent": "OS Agent",
        "reportType": "REPORT_CARD_SUMMARY",
        **_build_report_card_summary(snapshot, body.term),
    }

    if is_db_enabled():
        await db.aireport.create(
            data={
                "studentId": body.studentId,
                "reportType": "REPORT_CARD_SUMMARY",
                "jsonOutput": report,
            }
        )
    else:
        store.ai_reports.append(
            {
                "id": store.new_id(),
                "studentId": body.studentId,
                "reportType": "REPORT_CARD_SUMMARY",
                "output": report,
                "createdBy": user["id"],
            }
        )

    return report


@router.post("/reminders")
async def create_reminder(body: ReminderIn, user=get_current_user):
    user = user()
    require_role(user, ["ADMIN", "TEACHER"])
    if body.studentId and not await _student_exists(body.studentId):
        raise HTTPException(status_code=404, detail="Student not found")
    reminder = {
        "id": store.new_id(),
        "title": body.title,
        "dueDate": body.dueDate,
        "studentId": body.studentId,
        "channel": body.channel.upper(),
        "notes": body.notes,
        "createdBy": user["id"],
        "agent": "OS Agent",
    }
    store.ai_reminders.append(reminder)
    return reminder


@router.get("/reminders")
def list_reminders(studentId: str | None = None, user=get_current_user):
    user = user()
    require_role(user, ["ADMIN", "TEACHER"])
    if studentId:
        return [r for r in store.ai_reminders if r.get("studentId") == studentId]
    return store.ai_reminders
