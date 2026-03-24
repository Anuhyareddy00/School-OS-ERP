import { Router } from "express";
import authRoutes from "./auth.routes.js";
import adminRoutes from "./admin.routes.js";
import teacherRoutes from "./teacher.routes.js";
import studentRoutes from "./student.routes.js";
import parentRoutes from "./parent.routes.js";
import aiRoutes from "./ai.routes.js";
import portalRoutes from "./portal.routes.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/admin", adminRoutes);
router.use("/teacher", teacherRoutes);
router.use("/student", studentRoutes);
router.use("/parent", parentRoutes);
router.use("/ai", aiRoutes);
router.use("/portal", portalRoutes);

export default router;
