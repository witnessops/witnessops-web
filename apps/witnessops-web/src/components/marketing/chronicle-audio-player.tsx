"use client";

import { useCallback, useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { LoaderCircle, Pause, Play } from "lucide-react";

import styles from "./chronicle-audio-player.module.css";

type ChronicleAudioPlayerProps = {
  src: string;
  title: string;
  durationSeconds?: number;
};

const SIGNAL_BAR_COUNT = 44;
const SIGNAL_FLOOR = 3;
const timeDomainSamples = () => new Float32Array(2048);

type AudioGraph = {
  context: AudioContext;
  source: MediaElementAudioSourceNode;
  analyser: AnalyserNode;
  samples: ReturnType<typeof timeDomainSamples>;
};

function audioTime(seconds: number) {
  const total = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  const minutes = Math.floor(total / 60);
  const remainder = String(total % 60).padStart(2, "0");
  return `${minutes}:${remainder}`;
}

/** A new source gets a fresh transport and disposes the previous audio load. */
export function ChronicleAudioPlayer(props: ChronicleAudioPlayerProps) {
  return <ChronicleAudioControls key={props.src} {...props} />;
}

function ChronicleAudioControls({ src, title, durationSeconds }: ChronicleAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const waveformRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<AudioGraph | null>(null);
  const frameRef = useRef<number | null>(null);
  const lastFrameRef = useRef(0);
  const reducedMotionRef = useRef(false);
  const requestRef = useRef(0);
  const mountedRef = useRef(true);
  const speedId = useId();
  const seekId = useId();
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const knownDuration = Number.isFinite(durationSeconds) && (durationSeconds ?? 0) > 0 ? durationSeconds! : 0;
  const [duration, setDuration] = useState(knownDuration);
  const [position, setPosition] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [error, setError] = useState("");

  const stopWaveform = useCallback(() => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    for (const bar of waveformRef.current?.children ?? []) {
      (bar as HTMLElement).style.setProperty("--bar-height", `${SIGNAL_FLOOR}%`);
    }
  }, []);

  const drawWaveform = useCallback(function draw(now: number) {
    frameRef.current = null;
    const graph = graphRef.current;
    const audio = audioRef.current;
    if (!graph || !audio || audio.paused || audio.ended || document.hidden) return;
    if (now - lastFrameRef.current >= (reducedMotionRef.current ? 250 : 33)) {
      lastFrameRef.current = now;
      graph.analyser.getFloatTimeDomainData(graph.samples);
      const bars = waveformRef.current?.children;
      if (bars) {
        for (let index = 0; index < bars.length; index += 1) {
          const start = Math.floor(index * graph.samples.length / bars.length);
          const end = Math.floor((index + 1) * graph.samples.length / bars.length);
          let sum = 0;
          for (let sample = start; sample < end; sample += 1) sum += (graph.samples[sample] ?? 0) ** 2;
          // Each bar is the measured RMS amplitude of one part of the current audio window.
          const rms = Math.sqrt(sum / (end - start));
          // Compress the display range so quiet speech remains visible without inventing a signal.
          const height = Math.max(SIGNAL_FLOOR, Math.min(100, Math.sqrt(rms) * 200));
          (bars[index] as HTMLElement).style.setProperty("--bar-height", `${height.toFixed(2)}%`);
        }
      }
    }
    frameRef.current = requestAnimationFrame(draw);
  }, []);

  const startWaveform = useCallback(() => {
    if (!graphRef.current || frameRef.current !== null || document.hidden) return;
    lastFrameRef.current = 0;
    frameRef.current = requestAnimationFrame(drawWaveform);
  }, [drawWaveform]);

  async function prepareWaveform(audio: HTMLAudioElement) {
    if (!graphRef.current) {
      const AudioContextClass = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      // Audio playback remains available when this browser has no Web Audio support.
      if (!AudioContextClass) return;
      const context = new AudioContextClass();
      const analyser = context.createAnalyser();
      analyser.fftSize = 2048;
      const source = context.createMediaElementSource(audio);
      source.connect(analyser);
      analyser.connect(context.destination);
      graphRef.current = { context, source, analyser, samples: timeDomainSamples() };
    }
    // Create and resume during the Listen gesture, including Safari's suspended contexts.
    if (graphRef.current.context.state === "suspended") await graphRef.current.context.resume();
  }

  useEffect(() => {
    mountedRef.current = true;
    const audio = audioRef.current;
    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => { reducedMotionRef.current = preference.matches; };
    updatePreference();
    preference.addEventListener("change", updatePreference);
    // React's development effect replay must restore the source disposed below.
    if (audio && audio.getAttribute("src") !== src) audio.setAttribute("src", src);
    const pause = () => {
      requestRef.current += 1;
      audio?.pause();
      stopWaveform();
    };
    const onVisibilityChange = () => {
      if (document.hidden) stopWaveform();
      else if (audio && !audio.paused) startWaveform();
    };
    window.addEventListener("pagehide", pause);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      mountedRef.current = false;
      window.removeEventListener("pagehide", pause);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      preference.removeEventListener("change", updatePreference);
      pause();
      if (audio) {
        audio.removeAttribute("src");
        audio.load();
      }
      const graph = graphRef.current;
      if (graph) {
        // Strict Mode can replay an effect while retaining the same media element.
        // Its source may only be created once, so dispose after a real unmount.
        queueMicrotask(() => {
          if (mountedRef.current || graphRef.current !== graph) return;
          graphRef.current = null;
          graph.source.disconnect();
          graph.analyser.disconnect();
          void graph.context.close().catch(() => {});
        });
      }
    };
  }, [src, startWaveform, stopWaveform]);

  async function togglePlayback() {
    const audio = audioRef.current;
    if (!audio) return;
    if (!audio.paused || loading) {
      requestRef.current += 1;
      audio.pause();
      stopWaveform();
      setLoading(false);
      return;
    }
    const request = ++requestRef.current;
    setError("");
    setLoading(true);
    if (audio.error) audio.load();
    try {
      await prepareWaveform(audio);
      if (!mountedRef.current || request !== requestRef.current) return;
      await audio.play();
    } catch (cause) {
      if (!mountedRef.current || request !== requestRef.current) return;
      if (!(cause instanceof DOMException && cause.name === "AbortError")) {
        setError("We couldn’t play this narration. Try again.");
      }
    } finally {
      if (mountedRef.current && request === requestRef.current) setLoading(false);
    }
  }

  function seek(seconds: number) {
    const audio = audioRef.current;
    if (!audio || duration <= 0) return;
    audio.currentTime = Math.min(duration, Math.max(0, seconds));
    setPosition(audio.currentTime);
  }

  function updateDuration() {
    const value = audioRef.current?.duration ?? 0;
    setDuration(Number.isFinite(value) && value > 0 ? value : knownDuration);
  }

  const active = playing || loading;
  const progress = duration > 0 ? Math.min(100, Math.max(0, position / duration * 100)) : 0;
  const status = error ? "Error" : loading ? "Loading" : playing ? "Playing" : position > 0 ? position >= duration ? "Finished" : "Paused" : "Ready";
  return (
    <section
      className={styles.player}
      aria-label={`Listen to ${title}`}
      data-chronicle-audio
      data-playback-state={status.toLowerCase()}
      style={{ "--audio-progress": `${progress}%` } as CSSProperties}
    >
      <audio
        ref={audioRef}
        src={src}
        preload="none"
        hidden
        onLoadedMetadata={updateDuration}
        onDurationChange={updateDuration}
        onTimeUpdate={() => setPosition(audioRef.current?.currentTime ?? 0)}
        onPlay={() => setPlaying(true)}
        onPlaying={() => { setLoading(false); startWaveform(); }}
        onPause={() => { setPlaying(false); setLoading(false); stopWaveform(); }}
        onWaiting={() => { if (!audioRef.current?.paused) setLoading(true); stopWaveform(); }}
        onEnded={() => { setPlaying(false); setLoading(false); stopWaveform(); }}
        onError={() => {
          setPlaying(false);
          setLoading(false);
          stopWaveform();
          setError("We couldn’t load this narration. Try again.");
        }}
      />
      <div className={styles.controls}>
        <button
          type="button"
          className={styles.play}
          onClick={() => void togglePlayback()}
          aria-label={active ? "Pause narration" : "Play narration"}
        >
          {loading ? <LoaderCircle aria-hidden="true" size={18} className={styles.spinner} /> : active ? <Pause aria-hidden="true" size={18} /> : <Play aria-hidden="true" size={18} />}
        </button>
        <div className={styles.track}>
          <div className={styles.seekTrack}>
            <div ref={waveformRef} className={styles.waveform} data-audio-waveform aria-hidden="true">
              {Array.from({ length: SIGNAL_BAR_COUNT }, (_, index) => <span
                key={index}
                data-elapsed={index / SIGNAL_BAR_COUNT * 100 < progress ? "true" : undefined}
                style={{ "--bar-height": `${SIGNAL_FLOOR}%` } as CSSProperties}
              />)}
            </div>
            <label htmlFor={seekId} className={styles.srOnly}>Narration position</label>
            <input
              id={seekId}
              type="range"
              min={0}
              max={duration || 1}
              step={1}
              value={Math.min(position, duration || 1)}
              disabled={duration <= 0}
              onChange={(event) => seek(Number(event.target.value))}
              aria-valuetext={`${audioTime(position)} of ${audioTime(duration)}`}
            />
          </div>
          <div className={styles.meta}>
            <span>AI narration</span>
            <span className={styles.time} aria-hidden="true">{audioTime(position)} / {duration ? audioTime(duration) : "—:——"}</span>
          </div>
        </div>
        <label className={styles.speed} htmlFor={speedId}>
          <span className={styles.srOnly}>Playback speed</span>
          <select id={speedId} value={speed} onChange={(event) => {
            const rate = Number(event.target.value);
            setSpeed(rate);
            if (audioRef.current) {
              audioRef.current.defaultPlaybackRate = rate;
              audioRef.current.playbackRate = rate;
            }
          }}>
            {[0.75, 1, 1.25, 1.5, 2].map((rate) => <option key={rate} value={rate}>{rate}×</option>)}
          </select>
        </label>
      </div>
      <span className={styles.feedback} role="status">{error}</span>
    </section>
  );
}
