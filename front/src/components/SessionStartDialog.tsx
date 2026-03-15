"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSessionManager } from "@/hooks/useSessionManager";
import { useSessionStore } from "@/stores/sessionStore";
import { useSpeakerStore } from "@/stores/speakerStore";
import { useCoeiroink } from "@/lib/tts/useCoeiroink";
import { authFetch } from "@/lib/api/authFetch";

type DialogStep = "choose" | "premade" | "custom";

interface MaterialListItem {
  id: string;
  title: string;
  description: string;
  difficulty: number | null;
  tags: string[];
}

interface MaterialDetail extends MaterialListItem {
  content: string;
}

/* ---------- Spinner ---------- */
function Spinner() {
  return (
    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
        fill="none"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

/* ---------- Difficulty dots ---------- */
function DifficultyDots({ level }: { level: number | null }) {
  if (level === null) return null;
  return (
    <span className="flex gap-0.5 items-center" title={`難易度 ${level}`}>
      {[1, 2, 3].map((i) => (
        <span
          key={i}
          className={`inline-block w-2 h-2 rounded-full ${
            i <= level ? "bg-pink-400" : "bg-amber-200"
          }`}
        />
      ))}
    </span>
  );
}

/* ========== Main Component ========== */
export default function SessionStartDialog({
  onStarted,
}: {
  onStarted?: () => void;
}) {
  const { status } = useSessionStore();
  const { startSession } = useSessionManager();
  const { selectedSpeaker, selectedStyleIndex, setSpeaker, setStyleIndex } = useSpeakerStore();
  const { speakers, getSpeakers } = useCoeiroink();

  useEffect(() => {
    getSpeakers();
  }, [getSpeakers]);

  const [step, setStep] = useState<DialogStep>("choose");
  const [isLoading, setIsLoading] = useState(false);

  // premade
  const [materials, setMaterials] = useState<MaterialListItem[]>([]);
  const [materialsLoading, setMaterialsLoading] = useState(false);
  const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>(
    null,
  );

  // custom
  const [textContent, setTextContent] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // fetch materials when entering premade step
  const fetchMaterials = useCallback(async () => {
    setMaterialsLoading(true);
    try {
      const res = await authFetch("/api/backend/materials");
      if (res.ok) {
        const data: MaterialListItem[] = await res.json();
        setMaterials(data);
      }
    } catch (e) {
      console.error("Failed to fetch materials:", e);
    } finally {
      setMaterialsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (step === "premade" && materials.length === 0) {
      fetchMaterials();
    }
  }, [step, materials.length, fetchMaterials]);

  if (status !== "idle") return null;

  /* --- handlers --- */
  const handleStartWithMaterial = async () => {
    if (!selectedMaterialId) return;
    setIsLoading(true);
    try {
      const res = await authFetch(
        `/api/backend/materials/${selectedMaterialId}`,
      );
      if (!res.ok) throw new Error("Failed to fetch material detail");
      const detail: MaterialDetail = await res.json();
      const sessionId = await startSession(detail.content);
      if (sessionId) onStarted?.();
    } catch (e) {
      console.error("Failed to start session with material:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartWithCustom = async () => {
    if (!textContent.trim()) return;
    setIsLoading(true);
    const sessionId = await startSession(textContent);
    setIsLoading(false);
    if (sessionId) onStarted?.();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result;
      if (typeof result === "string") setTextContent(result);
    };
    reader.readAsText(file);
  };

  /* --- shared classes --- */
  const cardBase =
    "bg-gradient-to-b from-orange-50/95 to-white/95 backdrop-blur-sm rounded-t-3xl sm:rounded-3xl p-6 pb-8 sm:pb-6 w-full sm:max-w-md mx-0 sm:mx-4 shadow-2xl shadow-amber-900/10 border border-amber-100/60 animate-slide-up";

  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-gradient-to-t from-amber-900/30 to-transparent sm:bg-amber-950/20 sm:backdrop-blur-xs">
      {/* ==================== Step: choose ==================== */}
      {step === "choose" && (
        <div className={cardBase}>
          <div className="text-center mb-6">
            <div className="w-20 h-20 mx-auto mb-3 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center shadow-md shadow-amber-200/40 border border-amber-200/50">
              <span className="text-3xl">&#x1F4D6;</span>
            </div>
            <h2 className="text-2xl font-bold text-amber-900 mb-1">
              さあ、はじめよう
            </h2>
            <p className="text-amber-700/70 text-sm font-medium">
              教材を選んでね
            </p>
          </div>

          {/* ボイス選択 */}
          {speakers.length > 0 && (
            <div className="mb-5 p-3 rounded-2xl bg-amber-50/80 border border-amber-200/60">
              <p className="text-xs font-semibold text-amber-700 mb-2">ボイス</p>
              <div className="flex flex-col gap-2">
                <select
                  value={selectedSpeaker?.speaker_uuid ?? ""}
                  onChange={(e) => {
                    const s = speakers.find((sp) => sp.speaker_uuid === e.target.value);
                    if (s) setSpeaker(s, 0);
                  }}
                  className="w-full text-sm rounded-xl border border-amber-200 bg-white px-3 py-2 text-amber-900 focus:outline-none focus:ring-2 focus:ring-pink-300"
                >
                  {speakers.map((sp) => (
                    <option key={sp.speaker_uuid} value={sp.speaker_uuid}>
                      {sp.name}
                    </option>
                  ))}
                </select>
                {selectedSpeaker && selectedSpeaker.styles.length > 1 && (
                  <select
                    value={selectedStyleIndex}
                    onChange={(e) => setStyleIndex(Number(e.target.value))}
                    className="w-full text-sm rounded-xl border border-amber-200 bg-white px-3 py-2 text-amber-900 focus:outline-none focus:ring-2 focus:ring-pink-300"
                  >
                    {selectedSpeaker.styles.map((style, i) => (
                      <option key={style.id} value={i}>
                        {style.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3">
            <button
              onClick={() => setStep("premade")}
              className="w-full py-4 bg-gradient-to-r from-pink-400 to-fuchsia-400 text-white rounded-2xl font-bold text-lg shadow-lg shadow-pink-300/30 hover:shadow-pink-300/50 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
            >
              用意された教材を使う
            </button>
            <button
              onClick={() => setStep("custom")}
              className="w-full py-4 bg-white text-amber-800 rounded-2xl font-bold text-lg shadow-md border border-amber-200 hover:bg-amber-50 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
            >
              自分の教材を使う
            </button>
          </div>
        </div>
      )}

      {/* ==================== Step: premade ==================== */}
      {step === "premade" && (
        <div className={cardBase}>
          {/* Back button */}
          <button
            onClick={() => {
              setStep("choose");
              setSelectedMaterialId(null);
            }}
            className="flex items-center gap-1 text-amber-600 text-sm mb-4 hover:text-amber-800 transition"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            もどる
          </button>

          <h3 className="text-lg font-bold text-amber-900 mb-4">
            教材を選んでね
          </h3>

          {materialsLoading ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : (
            <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1">
              {materials.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setSelectedMaterialId(m.id)}
                  className={`text-left p-3 rounded-xl border transition-all ${
                    selectedMaterialId === m.id
                      ? "border-pink-400 bg-pink-50 shadow-sm"
                      : "border-amber-200/60 bg-white hover:border-amber-300 hover:bg-amber-50/50"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-amber-900 text-sm">
                      {m.title}
                    </span>
                    <DifficultyDots level={m.difficulty} />
                  </div>
                  <p className="text-xs text-amber-600/70">{m.description}</p>
                  {m.tags.length > 0 && (
                    <div className="flex gap-1 mt-1.5">
                      {m.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}

          <button
            onClick={handleStartWithMaterial}
            disabled={!selectedMaterialId || isLoading}
            className="w-full mt-4 py-4 bg-gradient-to-r from-pink-400 to-fuchsia-400 text-white rounded-2xl font-bold text-lg shadow-lg shadow-pink-300/30 hover:shadow-pink-300/50 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:transform-none"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <Spinner />
                準備中...
              </span>
            ) : (
              "はじめる"
            )}
          </button>
        </div>
      )}

      {/* ==================== Step: custom ==================== */}
      {step === "custom" && (
        <div className={cardBase}>
          {/* Back button */}
          <button
            onClick={() => setStep("choose")}
            className="flex items-center gap-1 text-amber-600 text-sm mb-4 hover:text-amber-800 transition"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            もどる
          </button>

          <h3 className="text-lg font-bold text-amber-900 mb-4">
            教材を入力してね
          </h3>

          <textarea
            value={textContent}
            onChange={(e) => setTextContent(e.target.value)}
            placeholder={
              "学習したい内容のテキストを貼り付けてください\n（例: 教科書の一節、問題文など）"
            }
            className="w-full h-36 p-3 border border-amber-200/60 rounded-2xl text-sm resize-none focus:ring-2 focus:ring-pink-300 focus:border-transparent bg-amber-50/50 placeholder:text-amber-300"
          />

          <div className="flex items-center gap-2 mt-2 mb-4">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 text-sm text-amber-600 hover:text-amber-800 transition px-3 py-1.5 rounded-lg border border-amber-200 hover:bg-amber-50"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                />
              </svg>
              ファイルを読み込む
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.md"
              onChange={handleFileUpload}
              className="hidden"
            />
            <span className="text-xs text-amber-400">
              .txt / .md に対応
            </span>
          </div>

          <button
            onClick={handleStartWithCustom}
            disabled={!textContent.trim() || isLoading}
            className="w-full py-4 bg-gradient-to-r from-pink-400 to-fuchsia-400 text-white rounded-2xl font-bold text-lg shadow-lg shadow-pink-300/30 hover:shadow-pink-300/50 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:transform-none"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <Spinner />
                準備中...
              </span>
            ) : (
              "はじめる"
            )}
          </button>
        </div>
      )}
    </div>
  );
}
