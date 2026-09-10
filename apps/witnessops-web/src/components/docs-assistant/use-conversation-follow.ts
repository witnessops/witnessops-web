"use client";
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';

/** Both Ask surfaces scroll only their history. Layout growth never re-enables following. */
export function useConversationFollow(container: RefObject<HTMLDivElement | null>, revision: unknown) {
  const following = useRef(true);
  const newest = useRef<HTMLElement | null>(null);
  const frame = useRef<number | null>(null);
  const [newReply, setNewReply] = useState(false);
  const reveal = useCallback((element: HTMLElement) => {
    newest.current = element;
    if (!following.current) { setNewReply(true); return; }
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const region = container.current;
      if (!region || !following.current || !element.isConnected) return;
      const box = element.getBoundingClientRect(), bounds = region.getBoundingClientRect();
      // Short steps fit completely; long answers start at the beginning, never at their end.
      const top = box.height > region.clientHeight - 24
        ? region.scrollTop + box.top - bounds.top - 12
        : region.scrollTop + Math.max(0, box.bottom - bounds.bottom + 12);
      region.scrollTo({ top: Math.max(0, top), behavior: 'auto' });
    });
  }, [container]);
  useEffect(() => {
    const region = container.current;
    if (!region) return;
    let previous = region.scrollTop;
    const onScroll = () => {
      const top = region.scrollTop;
      if (top < previous - 1) following.current = false;
      if (region.scrollHeight - region.clientHeight - top < 120) {
        following.current = true; setNewReply(false);
      }
      previous = top;
    };
    region.addEventListener('scroll', onScroll, { passive: true });
    return () => region.removeEventListener('scroll', onScroll);
  }, [container, revision]);
  useEffect(() => {
    const region = container.current;
    if (!region) return;
    const reply = region.querySelector<HTMLElement>('[data-ask-latest]');
    const step = region.querySelector<HTMLElement>('[data-ask-active-step]');
    const longReply = (reply?.querySelector('p')?.getBoundingClientRect().height ?? 0) > region.clientHeight - 24;
    const target = longReply ? reply : step ?? reply;
    if (target) reveal(target);
    // Observe content growth (including viewport/keyboard resizing), not the scroll offset.
    const resize = new ResizeObserver(() => {
      if (newest.current && following.current) reveal(newest.current);
    });
    for (const child of Array.from(region.children)) resize.observe(child);
    return () => { resize.disconnect(); if (frame.current !== null) cancelAnimationFrame(frame.current); };
  }, [container, revision, reveal]);
  const resume = useCallback(() => {
    following.current = true; setNewReply(false);
    if (newest.current) reveal(newest.current);
  }, [reveal]);
  return { reveal, resume, newReply };
}
