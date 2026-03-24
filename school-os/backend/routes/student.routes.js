import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { allowRoles } from "../middleware/rbac.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { downloadReportCard, myDashboard } from "../controllers/student.controller.js";

const router = Router();

router.use(requireAuth, allowRoles("STUDENT"));
router.get("/dashboard", asyncHandler(myDashboard));
router.get("/report-card", asyncHandler(downloadReportCard));

export default router;
