import { Router } from "express";
import { loginJanasevaUser } from "../controllers/janasevaAuthController";

const router = Router();

router.post("/login", loginJanasevaUser);

export default router;