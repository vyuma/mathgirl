import type { Link } from "mdast";
import { NodesRenderer } from "../NodesRenderer";

export default function LinkNode({ node }: { node: Link }) {
  return (
    <a
      href={node.url}
      title={node.title || undefined}
      className="text-blue-600 underline hover:text-blue-800"
      target="_blank"
      rel="noopener noreferrer"
    >
      <NodesRenderer nodes={node.children} />
    </a>
  );
}
