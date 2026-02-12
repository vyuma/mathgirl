import type { Heading } from "mdast";
import { NodesRenderer } from "../NodesRenderer";

const headingClasses: Record<number, string> = {
  1: "text-2xl font-bold mt-6 mb-3",
  2: "text-xl font-bold mt-5 mb-2",
  3: "text-lg font-semibold mt-4 mb-2",
  4: "text-base font-semibold mt-3 mb-1",
  5: "text-sm font-semibold mt-2 mb-1",
  6: "text-sm font-medium mt-2 mb-1",
};

export default function HeadingNode({ node }: { node: Heading }) {
  const className = headingClasses[node.depth] || headingClasses[3];
  const children = <NodesRenderer nodes={node.children} />;

  switch (node.depth) {
    case 1:
      return <h1 className={className}>{children}</h1>;
    case 2:
      return <h2 className={className}>{children}</h2>;
    case 3:
      return <h3 className={className}>{children}</h3>;
    case 4:
      return <h4 className={className}>{children}</h4>;
    case 5:
      return <h5 className={className}>{children}</h5>;
    case 6:
      return <h6 className={className}>{children}</h6>;
    default:
      return <h3 className={className}>{children}</h3>;
  }
}
