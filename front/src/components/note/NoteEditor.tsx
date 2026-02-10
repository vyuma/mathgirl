"use client";

import { useCallback } from "react";
import { useNoteStore, generateBlockId, type NoteBlock } from "@/stores/noteStore";
import MarkdownBlock from "./MarkdownBlock";
import MathBlock from "./MathBlock";

export default function NoteEditor() {
  const {
    blocks,
    focusedBlockId,
    addBlock,
    updateBlock,
    removeBlock,
    setFocusedBlock,
  } = useNoteStore();

  const handleAddMarkdownBlock = useCallback(
    (afterId?: string) => {
      const newBlock: NoteBlock = {
        blockId: generateBlockId(),
        type: "markdown",
        content: "",
      };
      addBlock(newBlock, afterId);
      setFocusedBlock(newBlock.blockId);
    },
    [addBlock, setFocusedBlock]
  );

  const handleAddMathBlock = useCallback(
    (afterId?: string) => {
      const newBlock: NoteBlock = {
        blockId: generateBlockId(),
        type: "mathlive",
        latex: "",
      };
      addBlock(newBlock, afterId);
    },
    [addBlock]
  );

  const handleInsertResult = useCallback(
    (afterBlockId: string, resultLatex: string) => {
      const newBlock: NoteBlock = {
        blockId: generateBlockId(),
        type: "mathlive",
        latex: resultLatex,
      };
      addBlock(newBlock, afterBlockId);
    },
    [addBlock]
  );

  const handleBackspace = useCallback(
    (blockId: string) => {
      const block = blocks.find((b) => b.blockId === blockId);
      if (!block) return;
      const isEmpty =
        block.type === "markdown" ? !block.content : !block.latex;
      if (isEmpty && blocks.length > 1) {
        removeBlock(blockId);
        // Focus previous block
        const idx = blocks.findIndex((b) => b.blockId === blockId);
        if (idx > 0) {
          setFocusedBlock(blocks[idx - 1].blockId);
        }
      }
    },
    [blocks, removeBlock, setFocusedBlock]
  );

  return (
    <div className="space-y-1">
      {blocks.length === 0 && (
        <div className="text-center py-4">
          <button
            onClick={() => handleAddMarkdownBlock()}
            className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition mr-2"
          >
            + テキスト
          </button>
          <button
            onClick={() => handleAddMathBlock()}
            className="px-3 py-1.5 text-sm bg-amber-50 hover:bg-amber-100 rounded-lg transition"
          >
            + 数式
          </button>
        </div>
      )}

      {blocks.map((block) => (
        <div key={block.blockId} className="group relative">
          {block.type === "markdown" ? (
            <MarkdownBlock
              blockId={block.blockId}
              content={block.content}
              isFocused={focusedBlockId === block.blockId}
              onFocus={() => setFocusedBlock(block.blockId)}
              onBlur={() => setFocusedBlock(null)}
              onChange={(content) =>
                updateBlock(block.blockId, { content })
              }
              onEnter={() => handleAddMarkdownBlock(block.blockId)}
              onBackspace={() => handleBackspace(block.blockId)}
            />
          ) : (
            <MathBlock
              blockId={block.blockId}
              latex={block.latex}
              onChange={(latex, mathjson) =>
                updateBlock(block.blockId, { latex, mathjson })
              }
              onInsertResult={(resultLatex) =>
                handleInsertResult(block.blockId, resultLatex)
              }
            />
          )}

          {/* Block type buttons (visible on hover) */}
          <div className="absolute -left-8 top-1 opacity-0 group-hover:opacity-100 transition flex flex-col gap-0.5">
            <button
              onClick={() => handleAddMarkdownBlock(block.blockId)}
              className="w-6 h-6 text-xs bg-gray-100 hover:bg-gray-200 rounded"
              title="テキストを追加"
            >
              T
            </button>
            <button
              onClick={() => handleAddMathBlock(block.blockId)}
              className="w-6 h-6 text-xs bg-amber-50 hover:bg-amber-100 rounded"
              title="数式を追加"
            >
              fx
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
