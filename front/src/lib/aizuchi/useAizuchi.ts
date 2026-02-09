"use client";

import { useRef, useCallback, useEffect } from "react";

const KANA_FILES = [
  "/aizuti/001_KANA（のーまる）_うん.wav",
  "/aizuti/002_KANA（のーまる）_そぉだなぁ.wav",
  "/aizuti/003_KANA（のーまる）_そっか.wav",
  "/aizuti/004_KANA（のーまる）_うんうん.wav",
  "/aizuti/005_KANA（のーまる）_へぇ.wav",
  "/aizuti/006_KANA（のーまる）_なるほど.wav",
  "/aizuti/007_KANA（のーまる）_そうなんだ.wav",
  "/aizuti/008_KANA（のーまる）_ふむふむ.wav",
];

const MANA_FILES = [
  "/aizuti/009_MANA（のーまる）_うん.wav",
  "/aizuti/010_MANA（のーまる）_そぉだなぁ.wav",
  "/aizuti/011_MANA（のーまる）_そっか.wav",
  "/aizuti/012_MANA（のーまる）_うんうん.wav",
  "/aizuti/013_MANA（のーまる）_へぇ.wav",
  "/aizuti/014_MANA（のーまる）_なるほど.wav",
  "/aizuti/015_MANA（のーまる）_そうなんだ.wav",
];

const ALL_FILES = [...KANA_FILES, ...MANA_FILES];
const AIZUCHI_DELAY_MS = 1500;

function getFilesForSpeaker(speakerName?: string): string[] {
  if (!speakerName) return ALL_FILES;
  const upper = speakerName.toUpperCase();
  if (upper.includes("KANA")) return KANA_FILES;
  if (upper.includes("MANA")) return MANA_FILES;
  return ALL_FILES;
}

export function useAizuchi() {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isScheduledRef = useRef(false);

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    isScheduledRef.current = false;
  }, []);

  const scheduleAizuchi = useCallback(
    (speakerName?: string) => {
      if (isScheduledRef.current) return;
      isScheduledRef.current = true;

      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        const files = getFilesForSpeaker(speakerName);
        const file = files[Math.floor(Math.random() * files.length)];
        const audio = new Audio(file);
        audioRef.current = audio;

        audio.onended = () => {
          audioRef.current = null;
          isScheduledRef.current = false;
        };
        audio.onerror = () => {
          audioRef.current = null;
          isScheduledRef.current = false;
        };

        audio.play().catch(() => {
          audioRef.current = null;
          isScheduledRef.current = false;
        });
      }, AIZUCHI_DELAY_MS);
    },
    []
  );

  useEffect(() => {
    return () => {
      cancel();
    };
  }, [cancel]);

  return { scheduleAizuchi, cancel };
}
