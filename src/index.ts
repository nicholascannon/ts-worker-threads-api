import express from "express";
import { spawn, Thread, Worker, Pool } from "threads";
import { asyncErrorHandler } from "./error-handler";
import { fibonacci } from "./domain/fibonacci";
import { validateFibonacciArgs } from "./middleware";
import { FibonacciFunction } from "./workers/fibonacci-worker";

const env = {
  port: 8080,
  workerPoolSize: 10,
};

const app = express();
const workerPool = Pool(() => spawn<FibonacciFunction>(new Worker("./workers/fibonacci-worker")), env.workerPoolSize);

app.get(
  "/fibonacci/no-threads/:n",
  validateFibonacciArgs,
  asyncErrorHandler(async (req, res) => {
    const { n } = req.params;
    const value = fibonacci(Number(n));
    return res.json({ value });
  })
);

app.get(
  "/fibonacci/simple-threads/:n",
  validateFibonacciArgs,
  asyncErrorHandler(async (req, res) => {
    const { n } = req.params;
    const fibonacci = await spawn<FibonacciFunction>(new Worker("./workers/fibonacci-worker"));

    try {
      const value = await fibonacci(Number(n));
      return res.json({ value });
      // we don't catch here, it bubbles up to the async error handler! awesome!!
    } finally {
      await Thread.terminate(fibonacci);
    }
  })
);

app.get(
  "/fibonacci/pool-threads/:n",
  validateFibonacciArgs,
  asyncErrorHandler(async (req, res) => {
    const { n } = req.params;

    // queue task, can await here but I wanted to log that it's queue'd
    const queuedTask = workerPool.queue((fibonacci) => fibonacci(Number(n)));
    console.log(`fibonacci(${n}) task queue'd`);

    const value = await queuedTask;
    return res.json({ value });
  })
);

process.on("SIGINT", () => {
  // gracefully close worker pool -> wait for requests to finish
  console.log("Closing worker pool...");
  workerPool.terminate();
  console.log("Worker pool closed!");

  console.log("Shutting server down...");
});

app.listen(env.port, () => console.log(`Listening on port ${env.port}...`));
