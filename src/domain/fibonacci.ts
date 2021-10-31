/**
 * This is a slow implementation for example.
 */
export const fibonacci = (n: number): number => {
  if (n === 100) throw new Error("Are you crazy?! 100 is way too large!!");
  else if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
};
