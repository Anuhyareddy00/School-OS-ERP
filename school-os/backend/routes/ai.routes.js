import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { allowRoles } from "../middleware/rbac.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { aiAnalysis, aiCircular, aiRemark, aiTeacherSuggestions } from "../controllers/ai.controller.js";

const router = Router();

router.use(requireAuth, allowRoles("ADMIN", "TEACHER"));
router.post("/remark/:student_id", asyncHandler(aiRemark));
router.post("/analysis/:student_id", asyncHandler(aiAnalysis));
router.post("/circular", asyncHandler(aiCircular));
router.post("/teacher-suggestions", asyncHandler(aiTeacherSuggestions));

export default router;
