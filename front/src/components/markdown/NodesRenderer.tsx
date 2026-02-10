"use client";

import type { PhrasingContent, RootContent } from "mdast";
import CodeNode from "./nodeComponents/CodeNode";
import HeadingNode from "./nodeComponents/HeadingNode";
import InlineMathNode from "./nodeComponents/InlineMathNode";
import LinkNode from "./nodeComponents/LinkNode";
import ListNode from "./nodeComponents/ListNode";
import MathNode from "./nodeComponents/MathNode";
import ParagraphNode from "./nodeComponents/ParagraphNode";
import TextNode from "./nodeComponents/TextNode";

type MdastNode = RootContent | PhrasingContent;

export function NodesRenderer({ nodes }: { nodes: MdastNode[] }) {
  return (
    <>
      {nodes.map((node, i) => (
        <NodeRenderer key={i} node={node} />
      ))}
    </>
  );
}

function NodeRenderer({ node }: { node: MdastNode }) {
  switch (node.type) {
    case "paragraph":
      return <ParagraphNode node={node} />;
    case "heading":
      return <HeadingNode node={node} />;
    case "code":
      return <CodeNode node={node} />;
    case "math":
      return <MathNode node={node} />;
    case "inlineMath":
      return <InlineMathNode node={node} />;
    case "list":
      return <ListNode node={node} />;
    case "link":
      return <LinkNode node={node} />;
    case "text":
      return <TextNode node={node} />;
    case "emphasis":
      return (
        <em>
          <NodesRenderer nodes={node.children} />
        </em>
      );
    case "strong":
      return (
        <strong>
          <NodesRenderer nodes={node.children} />
        </strong>
      );
    case "inlineCode":
      return (
        <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono">
          {node.value}
        </code>
      );
    case "blockquote":
      return (
        <blockquote className="border-l-4 border-gray-300 pl-4 my-2 text-gray-600">
          <NodesRenderer nodes={node.children} />
        </blockquote>
      );
    case "thematicBreak":
      return <hr className="my-4 border-gray-200" />;
    case "listItem":
      return (
        <li className="ml-1">
          <NodesRenderer nodes={node.children} />
        </li>
      );
    case "break":
      return <br />;
    case "delete":
      return (
        <del>
          <NodesRenderer nodes={node.children} />
        </del>
      );
    case "table":
      return (
        <table className="border-collapse border border-gray-300 my-2 text-sm">
          <tbody>
            {node.children.map((row, i) => (
              <tr key={i}>
                {row.children.map((cell, j) => {
                  const Tag = i === 0 ? "th" : "td";
                  return (
                    <Tag key={j} className="border border-gray-300 px-2 py-1">
                      <NodesRenderer nodes={cell.children} />
                    </Tag>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      );
    default:
      return null;
  }
}
