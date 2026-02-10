import "mdast";

declare module "mdast" {
  interface MathNode extends Node {
    type: "math";
    value: string;
  }

  interface InlineMathNode extends Node {
    type: "inlineMath";
    value: string;
  }

  interface RootContentMap {
    math: MathNode;
  }

  interface PhrasingContentMap {
    inlineMath: InlineMathNode;
  }
}
