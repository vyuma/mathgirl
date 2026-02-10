import type { Paragraph } from "mdast";
import { NodesRenderer } from "../NodesRenderer";

export default function ParagraphNode({ node }: { node: Paragraph }) {
  return (
    <p className="my-2 leading-relaxed">
      <NodesRenderer nodes={node.children} />
    </p>
  );
}
