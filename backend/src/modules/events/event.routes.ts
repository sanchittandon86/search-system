import { Router } from "express";
import { asyncHandler } from "../../asyncHandler";
import * as eventController from "./event.controller";

const router = Router();

router.post("/", asyncHandler(eventController.createEvent));
router.get("/", asyncHandler(eventController.listEvents));

export default router;
