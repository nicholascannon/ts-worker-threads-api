import { expose } from "threads";
import { fibonacci } from "../domain/fibonacci";

export type FibonacciFunction = typeof fibonacci;
expose(fibonacci);
