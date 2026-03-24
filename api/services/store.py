"""
In-memory store for MVP starter.
Replace with PostgreSQL/Prisma later without changing routes too much.
"""
from datetime import date
from uuid import uuid4

users = {}  # id -> dict
classes = {}  # id -> dict
students = {}  # id -> dict
teachers = {}  # id -> dict
subjects = {}  # id -> dict
assignments = []  # list dict
timetables = []  # list dict
attendance = []  # list dict
exams = {}  # id -> dict
marks = []  # list dict
fee_structures = {}  # id -> dict
fee_payments = []  # list dict
ai_reports = []  # list dict
ai_reminders = []  # list dict
messages = []  # list dict
student_user_links = {}  # studentId -> userId
parent_student_links = []  # list dict {parentUserId, studentId}

def new_id():
    return str(uuid4())

def seed_demo():
    if users:
        return
    # Admin
    admin_id = new_id()
    users[admin_id] = {"id": admin_id, "name": "Admin", "email": "admin@school.com", "password": None, "role": "ADMIN"}
