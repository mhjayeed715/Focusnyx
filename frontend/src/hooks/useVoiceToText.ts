"use client";

import { useRef, useState } from "react";

export default function useVoiceToText() {
  const finalRef = useRef("");
  const [transcript, setTranscriptState] = useState("");
  const [isListening, setIsListening] = useState(false);
  const recRef = useRef<any>(null);
  const activeRef = useRef(false);
  const langRef = useRef("en-US");

  function spawn() {
    const SR =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    try { recRef.current?.abort(); } catch {}

    const r: any = new SR();
    recRef.current = r;
    r.lang = langRef.current;
    r.continuous = true;
    r.interimResults = true;
    r.maxAlternatives = 1;

    r.onresult = (e: any) => {
      let interim = "";
      const resultIndex = e.resultIndex ?? 0;
      for (let i = resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) {
          finalRef.current = (finalRef.current + " " + t.trim()).trim();
        } else {
          interim = t;
        }
      }
      setTranscriptState(
        interim ? (finalRef.current + " " + interim).trim() : finalRef.current
      );
    };

    r.onerror = (e: any) => {
      const code = e.error;
      if (code === "no-speech" || code === "aborted") return;
      activeRef.current = false;
      setIsListening(false);
    };

    r.onend = () => {
      if (activeRef.current) setTimeout(spawn, 100);
      else setIsListening(false);
    };

    r.start();
  }

  function start(lang = "en-US") {
    const SR =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return false;
    finalRef.current = "";
    setTranscriptState("");
    langRef.current = lang;
    activeRef.current = true;
    setIsListening(true);
    spawn();
    return true;
  }

  function stop() {
    activeRef.current = false;
    try { recRef.current?.stop(); } catch {}
    setIsListening(false);
  }

  function reset() {
    finalRef.current = "";
    setTranscriptState("");
  }

  return { transcript, isListening, start, stop, reset };
}
