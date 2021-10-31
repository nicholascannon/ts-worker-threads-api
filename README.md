# How not to block the damn event-loop

A simple multi-threaded Fibonacci API using [Threads.js](https://threads.js.org/).

## The API

```
http://localhost:8080/fibonacci/<no | simple | pool>-threads/<n>
```

Where `n` is the nth Fibonacci number.

## How can I run the server?

Pretty easily:

1. clone repo
1. `npm i`
1. `npm run dev` or `npm run build && node dist/index.js`
1. run some of the example curls in this readme with 2 terminals

## A blocking example

Curling the `no-threads` endpoint with a large fibonacci job **blocks all other requests**:

Term 1 (a very long job)

```bash
$ time curl http://localhost:8080/fibonacci/no-threads/99
...
```

Term 2 (very short job)

```bash
$ time curl http://localhost:8080/fibonacci/no-threads/1
...
```

Blocked waiting for Term1 request to finish

## A non-blocking example

Utilise multiple threads with the `simple-threads` endpoint, this endpoint spawns a worker in the handler, completes the work and then terminates the worker.

Term 1 (a very long job)

```bash
$ time curl http://localhost:8080/fibonacci/simple-threads/99
...
```

Term 2 (very short job)

```bash
$ time curl http://localhost:8080/fibonacci/simple-threads/1
  {"value":1}
  curl http://localhost:8080/fibonacci/simple-threads/1  0.00s user 0.01s system 3% cpu 0.299 total
```

_Important_: the short job took 0.299ms to complete, this is because the endpoint has all the overhead of creating a worker and terminating it before returning to the client, running the same request with the `no-threads` endpoint completes in 0.033ms!

The worker lifecycle is managed in the endpoint, don't forget to terminate the worker in a `finally` block!

## A non-blocking example (but with a pool of workers)

The previous example did not block the event loop, but it did incur increased latency due to the overhead of creating and terminating a worker thread.

The `pool-threads` endpoint utilises an already existing worker from a pool of workers, removing the overhead in `simple-threads`.

Term 1 (a very long job)

```bash
$ time curl http://localhost:8080/fibonacci/pool-threads/99
...
```

Term 2 (very short job)

```bash
$ time curl http://localhost:8080/fibonacci/pool-threads/1
  {"value":1}
  curl http://localhost:8080/fibonacci/pool-threads/1  0.00s user 0.01s system 46% cpu 0.025 total
```

The overhead is gone!
I didn't average these results or do a rigorous statistical analysis, so it's just chance that it ran faster this time then with the `no-threads` endpoint (0.033ms).

### Downsides to the pool:

- No easy way (from what I've seen) to cancel a running worker in the pool (see this excerpt from the docs):

  > If the pool has already started to execute the task, you cannot cancel it anymore, though.

  This means if our pool accepts a really large job, if the request times out, the pool will still be working on that job.
  You might be able to put a timeout in the worker though but any time spent working on a job after the client has ended the request is a waste (this also goes for any work submitted in the `simple-threads` endpoint, see the TODO at the end of this readme).

- You need to set the pool size upfront.

  If you hit your worker limit, new requests will have to block waiting on an available worker.
  Without a way to easily kill running workers, an attacker could submit n large jobs, where n = your pool size and suddenly it's like your api never even used worker threads.

But remember, you also get to horizontally scale this service too!!

## Errors in workers

If any of the workers error, Threads.js bubbles this error up to the main thread where we can catch it and deal with it (see the `asyncErrorHandler` in the `error-handler.ts` file).

I've set the API to immediately error when `n=100`:

```bash
time curl http://localhost:8080/fibonacci/pool-threads/100
  {"message":"Something went wrong"}
  curl http://localhost:8080/fibonacci/pool-threads/100  0.00s user 0.01s system 55% cpu 0.022 total
```

The behaviour is identical to just `awaiting` an async function.

## TODO stuff

- Add in a worker timeout to kill long running jobs
- Figure out how to kill running jobs in the pool after client termination
- Figure out how to kill worker in `simple-threads` when client closes connection
