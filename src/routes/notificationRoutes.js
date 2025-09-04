import { Router } from "express";
import { notificar, consultarStatus } from "../controllers/notificationController.js";

const router = Router();

router.get("/", (req, res) => {
    res.send("Serviço de Notificações!");
});
router.post("/notificar", notificar);
router.get("/status/:id", consultarStatus);
router.get("/health", (req, res) => {
    res.send("Olá tester!");
});

export default router;
