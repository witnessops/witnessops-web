"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/* ── Types ── */

interface DocAudioPlayerProps {
  title: string;
  audioSrc?: string;
  content: string;
}

type Speed = 0.75 | 1 | 1.25 | 1.5 | 2 | 3;

const SPEEDS: Speed[] = [0.75, 1, 1.25, 1.5, 2, 3];

const PREFERRED_VOICES = [
  "microsoft ana online",
  "microsoft eva online",
  "ana",
  "eva",
  "samantha",
  "karen",
  "google us english",
];

/* ── Helpers ── */

function getAudioSrc(baseSrc: string | undefined): string | undefined {
  if (!baseSrc) return undefined;
  return baseSrc.replace("/audio/docs/", "/audio/docs/ana/");
}

function stripMarkdown(md: string): string {
  return md
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, "$1")
    .replace(/^#+\s+/gm, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\[([^\]]+)\]:\s+.+$/gm, "")
    .replace(/^---+$/gm, "")
    .replace(/^[\s]*[-*+]\s+/gm, "- ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function pickVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | undefined {
  const english = voices.filter((v) => v.lang.startsWith("en"));
  if (english.length === 0) return voices[0];

  for (const pref of PREFERRED_VOICES) {
    const match = english.find((v) => v.name.toLowerCase().includes(pref));
    if (match) return match;
  }

  return english[0];
}

/* ── Wave animation bars ── */

function AudioWave({ paused }: { paused: boolean }) {
  const delays = [0, 150, 300, 100, 250];
  return (
    <div
      className={`flex items-center gap-[2px] h-[14px] ${paused ? "[&_span]:![animation-play-state:paused]" : ""}`}
      aria-hidden="true"
    >
      {delays.map((d, i) => (
        <span
          key={i}
          className="inline-block w-[2.5px] rounded-full"
          style={{
            backgroundColor: "#ff6b35",
            animation: "audioWaveBar 0.8s ease-in-out infinite alternate",
            animationDelay: `${d}ms`,
          }}
        />
      ))}
      <style>{`
        @keyframes audioWaveBar {
          0% { height: 3px; }
          100% { height: 14px; }
        }
      `}</style>
    </div>
  );
}

/* ── Main component ── */

export function DocAudioPlayer({ title, audioSrc, content }: DocAudioPlayerProps) {
  const [playing, setPlaying] = useState(false);
  const [paused, setPaused] = useState(false);
  const [speed, setSpeed] = useState<Speed>(1);
  const [visible, setVisible] = useState(false);
  const [hasAudio, setHasAudio] = useState(false);
  const [useFallback, setUseFallback] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const cancelledRef = useRef(false);

  /* ── Probe for pre-generated MP3 ── */
  useEffect(() => {
    const src = getAudioSrc(audioSrc);
    if (!src) {
      setUseFallback(true);
      return;
    }

    const audio = new Audio();
    audio.preload = "none";
    audio.src = src;

    audio.addEventListener(
      "canplaythrough",
      () => {
        setHasAudio(true);
        audioRef.current = audio;
      },
      { once: true },
    );

    audio.addEventListener(
      "error",
      () => {
        setUseFallback(true);
      },
      { once: true },
    );

    audio.preload = "metadata";
    audio.load();

    return () => {
      audio.pause();
      audio.src = "";
    };
  }, [audioSrc]);

  /* ── Init SpeechSynthesis ── */
  useEffect(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      synthRef.current = window.speechSynthesis;
    }
  }, []);

  /* ── Cleanup ── */
  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      cancelledRef.current = true;
      synthRef.current?.cancel();
    };
  }, []);

  /* ── Sync playback rate ── */
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  }, [speed]);

  /* ── MP3 controls ── */
  const playAudio = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    audio.playbackRate = speed;
    audio.play();
    setPlaying(true);
    setPaused(false);
    setVisible(true);
    audio.onended = () => {
      setPlaying(false);
      setPaused(false);
    };
  }, [speed]);

  const pauseAudio = useCallback(() => {
    audioRef.current?.pause();
    setPaused(true);
  }, []);

  const resumeAudio = useCallback(() => {
    audioRef.current?.play();
    setPaused(false);
  }, []);

  const stopAudio = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    setPlaying(false);
    setPaused(false);
  }, []);

  /* ── SpeechSynthesis fallback ── */
  const playSpeech = useCallback(() => {
    const synth = synthRef.current;
    if (!synth) return;
    synth.cancel();
    cancelledRef.current = false;
    const text = stripMarkdown(content);
    const paragraphs = text.split(/\n\n+/).filter((p) => p.trim().length > 0);
    let index = 0;

    function speakNext() {
      if (cancelledRef.current || index >= paragraphs.length) {
        setPlaying(false);
        setPaused(false);
        return;
      }
      const utterance = new SpeechSynthesisUtterance(paragraphs[index].trim());
      utterance.rate = speed;
      utterance.lang = "en-US";

      const voices = synth!.getVoices();
      const voice = pickVoice(voices);
      if (voice) utterance.voice = voice;

      utterance.onend = () => {
        if (cancelledRef.current) return;
        index++;
        speakNext();
      };
      utterance.onerror = () => {
        setPlaying(false);
        setPaused(false);
      };
      synth!.speak(utterance);
    }

    setPlaying(true);
    setPaused(false);
    setVisible(true);
    speakNext();
  }, [content, speed]);

  const pauseSpeech = useCallback(() => {
    synthRef.current?.pause();
    setPaused(true);
  }, []);

  const resumeSpeech = useCallback(() => {
    synthRef.current?.resume();
    setPaused(false);
  }, []);

  const stopSpeech = useCallback(() => {
    cancelledRef.current = true;
    synthRef.current?.cancel();
    setPlaying(false);
    setPaused(false);
  }, []);

  /* ── Dispatch ── */
  const useMP3 = hasAudio && !useFallback;
  const handlePlay = useMP3 ? playAudio : playSpeech;
  const handlePause = useMP3 ? pauseAudio : pauseSpeech;
  const handleResume = useMP3 ? resumeAudio : resumeSpeech;
  const handleStop = useMP3 ? stopAudio : stopSpeech;

  const cycleSpeed = () => {
    const idx = SPEEDS.indexOf(speed);
    setSpeed(SPEEDS[(idx + 1) % SPEEDS.length]);
  };

  const handleClose = () => {
    handleStop();
    setVisible(false);
  };

  /* ── No synthesis available ── */
  if (useFallback && typeof window !== "undefined" && !window.speechSynthesis) {
    return null;
  }

  return (
    <>
      {/* ── Inline trigger button ── */}
      {!visible && (
        <button
          onClick={handlePlay}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-mono transition-colors"
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            color: "#f0f2f8",
            backgroundColor: "transparent",
            border: "1px solid #232738",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "#ff6b35";
            e.currentTarget.style.color = "#ff6b35";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "#232738";
            e.currentTarget.style.color = "#f0f2f8";
          }}
          aria-label="Listen to this page"
        >
          {/* Play icon */}
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M3 2.5L11.5 7L3 11.5V2.5Z" fill="currentColor" />
          </svg>
          <span>Listen</span>
          <span style={{ color: "#8088a4" }}>Ana</span>
        </button>
      )}

      {/* ── Bottom fixed mini player bar ── */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between px-4"
        style={{
          height: 48,
          backgroundColor: "#080a10",
          borderTop: "1px solid #232738",
          fontFamily: "'IBM Plex Mono', monospace",
          transform: visible ? "translateY(0)" : "translateY(100%)",
          transition: "transform 200ms ease",
          pointerEvents: visible ? "auto" : "none",
        }}
        role="region"
        aria-label="Audio player"
      >
        {/* Left: wave animation */}
        <div className="flex items-center gap-3 min-w-0" style={{ flex: "0 0 auto" }}>
          <AudioWave paused={paused} />
        </div>

        {/* Center: title + play/pause + stop */}
        <div className="flex items-center gap-3 min-w-0 justify-center" style={{ flex: "1 1 auto" }}>
          <span
            className="truncate max-w-[200px] sm:max-w-[300px]"
            style={{ fontSize: 11, color: "#8088a4" }}
            title={title}
          >
            {title}
          </span>

          {/* Play / Pause */}
          {playing && !paused ? (
            <button
              onClick={handlePause}
              className="flex items-center justify-center rounded-sm transition-colors"
              style={{ color: "#f0f2f8", width: 28, height: 28 }}
              aria-label="Pause"
              title="Pause"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <rect x="2.5" y="2" width="3" height="10" rx="0.75" fill="currentColor" />
                <rect x="8.5" y="2" width="3" height="10" rx="0.75" fill="currentColor" />
              </svg>
            </button>
          ) : (
            <button
              onClick={paused ? handleResume : handlePlay}
              className="flex items-center justify-center rounded-sm transition-colors"
              style={{ color: "#f0f2f8", width: 28, height: 28 }}
              aria-label={paused ? "Resume" : "Play"}
              title={paused ? "Resume" : "Play"}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M3 2.5L11.5 7L3 11.5V2.5Z" fill="currentColor" />
              </svg>
            </button>
          )}

          {/* Stop */}
          <button
            onClick={handleStop}
            className="flex items-center justify-center rounded-sm transition-colors"
            style={{ color: "#8088a4", width: 28, height: 28 }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#f0f2f8")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#8088a4")}
            aria-label="Stop"
            title="Stop"
          >
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <rect x="2.5" y="2.5" width="9" height="9" rx="1" fill="currentColor" />
            </svg>
          </button>
        </div>

        {/* Right: speed + close */}
        <div className="flex items-center gap-2" style={{ flex: "0 0 auto" }}>
          <button
            onClick={cycleSpeed}
            className="rounded-sm px-1.5 py-0.5 transition-colors"
            style={{ fontSize: 11, color: "#8088a4", backgroundColor: "transparent" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#ff6b35")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#8088a4")}
            aria-label={`Speed: ${speed}x`}
            title={`Speed: ${speed}x`}
          >
            {speed}x
          </button>

          {/* Close */}
          <button
            onClick={handleClose}
            className="flex items-center justify-center rounded-sm transition-colors"
            style={{ color: "#8088a4", width: 28, height: 28 }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#f0f2f8")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#8088a4")}
            aria-label="Close player"
            title="Close"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M3 3L11 11M11 3L3 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>
    </>
  );
}
