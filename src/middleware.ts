import { RequestHandler } from "express";

export const validateFibonacciArgs: RequestHandler = (req, res, next) => {
  const n = Number(req.params.n);

  if (Number.isNaN(n) || !Number.isSafeInteger(n)) return res.sendStatus(400);
  next();
};
