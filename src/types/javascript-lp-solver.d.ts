declare module "javascript-lp-solver" {
  interface Constraint {
    min?: number;
    max?: number;
    equal?: number;
  }

  export interface Model {
    optimize: string;
    opType: "min" | "max";
    constraints: Record<string, Constraint>;
    variables: Record<string, Record<string, number>>;
    ints?: Record<string, 1>;
    options?: { timeout?: number; tolerance?: number };
  }

  export interface Solution {
    feasible: boolean;
    bounded: boolean;
    result: number;
    [variable: string]: number | boolean;
  }

  const solver: { Solve(model: Model): Solution };
  export default solver;
}
