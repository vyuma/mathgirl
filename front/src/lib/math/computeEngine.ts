"use client";

import { ComputeEngine } from "@cortex-js/compute-engine";

// Singleton Compute Engine instance
let _ce: ComputeEngine | null = null;

export function getComputeEngine(): ComputeEngine {
  if (!_ce) {
    _ce = new ComputeEngine();
  }
  return _ce;
}

export type MathOperation =
  | "expand"
  | "factor"
  | "simplify"
  | "derivative"
  | "integrate";

export function performOperation(
  latex: string,
  operation: MathOperation
): string | null {
  const ce = getComputeEngine();

  try {
    const expr = ce.parse(latex);

    let result;
    switch (operation) {
      case "expand":
        result = ce.box(["Expand", expr]).evaluate();
        break;
      case "factor":
        result = ce.box(["Factor", expr]).evaluate();
        break;
      case "simplify":
        result = expr.simplify();
        break;
      case "derivative":
        result = ce.box(["D", expr, "x"]).evaluate();
        break;
      case "integrate":
        result = ce.box(["Integrate", expr, "x"]).evaluate();
        break;
    }

    if (result) {
      return result.latex;
    }
    return null;
  } catch (e) {
    console.error("Compute Engine error:", e);
    return null;
  }
}
