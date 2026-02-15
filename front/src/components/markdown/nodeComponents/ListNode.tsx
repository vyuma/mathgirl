import type { List } from "mdast";
import { NodesRenderer } from "../NodesRenderer";

export default function ListNode({ node }: { node: List }) {
  const Tag = node.ordered ? "ol" : "ul";
  const className = node.ordered
    ? "list-decimal pl-6 my-2 space-y-1"
    : "list-disc pl-6 my-2 space-y-1";

  return (
    <Tag className={className}>
      <NodesRenderer nodes={node.children} />
    </Tag>
  );
}
