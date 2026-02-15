"use client";

import { useCallback } from "react";
import { authFetch } from "@/lib/api/authFetch";
import { useNoteStore } from "@/stores/noteStore";

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function useOcr() {
  const {
    content,
    setContent,
    setOcrProcessing,
    setOcrError,
    addImagePreview,
  } = useNoteStore();

  const processImage = useCallback(
    async (file: File) => {
      // バリデーション
      if (!ALLOWED_TYPES.includes(file.type)) {
        setOcrError("対応していない画像形式です。PNG, JPEG, WebP, GIF が使えます。");
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        setOcrError("画像サイズが大きすぎます（上限: 10MB）");
        return;
      }

      setOcrError(null);
      setOcrProcessing(true);

      // プレビュー用blob URL作成
      const blobUrl = URL.createObjectURL(file);
      addImagePreview(blobUrl);

      try {
        // base64変換
        const base64 = await fileToBase64(file);

        // APIコール
        const res = await authFetch("/api/backend/ocr/image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            image_base64: base64,
            mime_type: file.type,
          }),
        });

        if (!res.ok) {
          throw new Error(`OCR API error: ${res.status}`);
        }

        const data = await res.json();

        if (!data.success) {
          throw new Error(data.error || "OCR処理に失敗しました");
        }

        // ノート末尾に挿入
        const separator = content.trim() ? "\n\n---\n\n" : "";
        setContent(content + separator + data.markdown);
      } catch (e) {
        const message = e instanceof Error ? e.message : "OCR処理に失敗しました";
        setOcrError(message);
      } finally {
        setOcrProcessing(false);
      }
    },
    [content, setContent, setOcrProcessing, setOcrError, addImagePreview],
  );

  return { processImage };
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // "data:image/png;base64,..." → base64部分のみ
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
