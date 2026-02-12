import type { Text } from "mdast";

export default function TextNode({ node }: { node: Text }) {
  return <>{node.value}</>;
}
