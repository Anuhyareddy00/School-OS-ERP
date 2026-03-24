import { Router } from "express";
import { allowRoles } from "../middleware/rbac.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  analytics,
  createAnnouncement,
  createClass,
  createParent,
  createStudent,
  createSubject,
  createTeacher,
  createTimetable,
  deleteClass,
  deleteStudent,
  deleteSubject,
  deleteTimetable,
  linkParentStudent,
  listAnnouncements,
  listClasses,
  listStudents,
  listSubjects,
  listTimetable,
  updateClass,
  updateStudent,
  updateSubject,
  updateTimetable
} from "../controllers/admin.controller.js";

const router = Router();

router.use(requireAuth, allowRoles("ADMIN"));

router.post("/teachers", asyncHandler(createTeacher));
router.post("/parents", asyncHandler(createParent));
router.post("/parent-student/link", asyncHandler(linkParentStudent));

router.post("/classes", asyncHandler(createClass));
router.get("/classes", asyncHandler(listClasses));
router.patch("/classes/:id", asyncHandler(updateClass));
router.delete("/classes/:id", asyncHandler(deleteClass));

router.post("/students", asyncHandler(createStudent));
router.get("/students", asyncHandler(listStudents));
router.patch("/students/:id", asyncHandler(updateStudent));
router.delete("/students/:id", asyncHandler(deleteStudent));

router.post("/subjects", asyncHandler(createSubject));
router.get("/subjects", asyncHandler(listSubjects));
router.patch("/subjects/:id", asyncHandler(updateSubject));
router.delete("/subjects/:id", asyncHandler(deleteSubject));

router.post("/timetable", asyncHandler(createTimetable));
router.get("/timetable", asyncHandler(listTimetable));
router.patch("/timetable/:id", asyncHandler(updateTimetable));
router.delete("/timetable/:id", asyncHandler(deleteTimetable));

router.post("/announcements", asyncHandler(createAnnouncement));
router.get("/announcements", asyncHandler(listAnnouncements));

router.get("/analytics", asyncHandler(analytics));

export default router;
