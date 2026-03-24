import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { allowRoles } from "../middleware/rbac.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  attendanceByClass,
  enterMarks,
  markAttendance,
  marksByClass,
  myClasses,
  studentProgress,
  uploadAssignment
} from "../controllers/teacher.controller.js";

const router = Router();

router.use(requireAuth, allowRoles("TEACHER", "ADMIN"));

router.get("/classes", asyncHandler(myClasses));
router.post("/attendance", asyncHandler(markAttendance));
router.get("/attendance", asyncHandler(attendanceByClass));
router.post("/marks", asyncHandler(enterMarks));
router.get("/marks", asyncHandler(marksByClass));
router.post("/assignments", asyncHandler(uploadAssignment));
router.get("/student/:student_id/progress", asyncHandler(studentProgress));

export default router;
