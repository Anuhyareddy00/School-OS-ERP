import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { allowRoles } from "../middleware/rbac.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { childOverview, childReportCard, notifications } from "../controllers/parent.controller.js";

const router = Router();

router.use(requireAuth, allowRoles("PARENT", "ADMIN"));
router.get("/children", asyncHandler(childOverview));
router.get("/notifications", asyncHandler(notifications));
router.get("/report-card/:student_id", asyncHandler(childReportCard));

export default router;
