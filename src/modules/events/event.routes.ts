import { Router } from "express";
import { asyncHandler } from "../../asyncHandler";
import * as eventController from "./event.controller";

const router = Router();

router.post("/", asyncHandler(eventController.createEvent));

export default router;
