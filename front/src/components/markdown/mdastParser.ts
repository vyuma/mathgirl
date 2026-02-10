import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkMath from "remark-math";
import remarkGfm from "remark-gfm";
import type { Root } from "mdast";

const processor = unified()
  .use(remarkParse)
  .use(remarkMath) // $...$ → inlineMath, $$...$$ → math
  .use(remarkGfm);

export function parseMarkdown(markdown: string): Root {
  const parsed = processor.parse(markdown);
  const mdast = processor.runSync(parsed) as Root;
  return mdast;
}
