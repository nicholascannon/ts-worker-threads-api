import { RequestHandler } from "express";

export const asyncErrorHandler: (cb: RequestHandler) => RequestHandler = (cb) => async (req, res, next) => {
  try {
    await cb(req, res, next);
    next();
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
