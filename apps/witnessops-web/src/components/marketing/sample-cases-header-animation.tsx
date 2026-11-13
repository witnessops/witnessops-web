"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import { Pause, Play } from "lucide-react";

const MEDIA_ROOT = "/brand/ascii-header";
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeToMotionPreference(onChange: () => void) {
  const preference = window.matchMedia(REDUCED_MOTION_QUERY);
  preference.addEventListener("change", onChange);
  return () => preference.removeEventListener("change", onChange);
}

function prefersReducedMotion() {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

/** Decorative background; it occupies no space in the content flow. */
export function SampleCasesHeaderAnimation() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [requestedMotion, setRequestedMotion] = useState(false);
  const reducedMotion = useSyncExternalStore(subscribeToMotionPreference, prefersReducedMotion, () => true);
  const showVideo = !reducedMotion || requestedMotion;

  useEffect(() => {
    if (reducedMotion) setRequestedMotion(false);
  }, [reducedMotion]);

  useEffect(() => {
    const video = videoRef.current;
    if (!showVideo || !video) return;
    let active = true;
    void video.play().catch(() => { if (active) setPlaying(false); });
    return () => {
      active = false;
      video.pause();
    };
  }, [showVideo]);

  const motionActive = showVideo && playing;
  const controlLabel = motionActive ? "Pause background animation" : "Play background animation";
  return (
    <>
      <div
        aria-hidden="true"
        data-testid="sample-cases-header-artwork"
        className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[min(52rem,100svh)] overflow-hidden opacity-60 [html[data-theme=light]_&]:opacity-[0.06]"
        style={{ maskImage: "radial-gradient(ellipse at 75% 25%, black 5%, transparent 72%)" }}
      >
        {showVideo ? <video
          ref={videoRef}
          width={1920}
          height={1080}
          poster={`${MEDIA_ROOT}/witnessops-background-still.png`}
          preload="none"
          muted
          loop
          playsInline
          aria-hidden="true"
          className="h-full w-full object-cover md:translate-x-[22%]"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onError={() => setPlaying(false)}
        >
          <source src={`${MEDIA_ROOT}/witnessops-background.webm`} type="video/webm" />
          <source src={`${MEDIA_ROOT}/witnessops-background.mp4`} type="video/mp4" />
        </video> : <Image
          src={`${MEDIA_ROOT}/witnessops-background-still.png`}
          alt=""
          fill
          sizes="100vw"
          unoptimized
          priority
          className="object-cover md:translate-x-[22%]"
        />}
      </div>
      <button
        type="button"
        aria-label={controlLabel}
        title={controlLabel}
        onClick={() => {
          const video = videoRef.current;
          if (!video) { setRequestedMotion(true); return; }
          if (video.paused) void video.play().catch(() => setPlaying(false));
          else video.pause();
        }}
        className="absolute right-4 top-4 z-20 flex size-11 items-center justify-center border border-white/30 bg-black/70 text-white transition-colors hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        {motionActive ? <Pause size={16} aria-hidden="true" /> : <Play size={16} aria-hidden="true" />}
      </button>
    </>
  );
}
