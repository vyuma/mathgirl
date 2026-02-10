"use client";

import NoteEditor from "@/components/note/NoteEditor";
import { useNoteStore } from "@/stores/noteStore";
import { useAutoSave } from "@/hooks/useAutoSave";

export default function NotePanel() {
  useAutoSave();
  const { isDirty } = useNoteStore();

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-400">
          {isDirty ? "未保存の変更あり" : "保存済み"}
        </span>
      </div>
      <NoteEditor />
    </div>
  );
}
