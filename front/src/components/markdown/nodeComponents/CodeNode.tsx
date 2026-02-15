import type { Code } from "mdast";

export default function CodeNode({ node }: { node: Code }) {
  return (
    <pre className="bg-gray-50 border rounded-lg p-3 my-2 overflow-x-auto">
      <code className="text-sm font-mono">{node.value}</code>
    </pre>
  );
}
