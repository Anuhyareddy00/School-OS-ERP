import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { allowRoles } from "../middleware/rbac.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { portalDashboard, portalData } from "../controllers/portal.controller.js";

const router = Router();

router.use(requireAuth, allowRoles("ADMIN", "TEACHER", "STUDENT", "PARENT"));
router.get("/dashboard", asyncHandler(portalDashboard));
router.get("/data", asyncHandler(portalData));

export default router;
