import type { Root } from "mdast";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkParse from "remark-parse";
import { unified } from "unified";

const processor = unified()
  .use(remarkParse)
  .use(remarkMath) // $...$ → inlineMath, $$...$$ → math
  .use(remarkGfm);

export function parseMarkdown(markdown: string): Root {
  const parsed = processor.parse(markdown);
  const mdast = processor.runSync(parsed) as Root;
  return mdast;
}
