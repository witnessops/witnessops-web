"use client";

import { useState } from "react";
import { InlineArrow } from "@/components/marketing/inline-arrow";
import styles from "./support-start.module.css";

export function SupportStart() {
  const [question, setQuestion] = useState("");
  const [unavailable, setUnavailable] = useState(false);

  return (
    <section className={styles.panel} aria-labelledby="support-ai-title">
      <p className={styles.eyebrow}>Product questions</p>
      <h2 id="support-ai-title">What can we help with?</h2>
      <p>The assistant on this page is not available. A question typed here is not sent.</p>
      <form onSubmit={(event) => {
        event.preventDefault();
        const request = new CustomEvent("witnessops:ask-support", { detail: question.trim(), cancelable: true });
        window.dispatchEvent(request);
        setUnavailable(!request.defaultPrevented);
      }}>
        <label htmlFor="support-ai-question">Your question</label>
        <textarea id="support-ai-question" value={question} onChange={(event) => setQuestion(event.target.value)} maxLength={2_000} required rows={3} placeholder="How do I sign in with the Linux CLI?" aria-describedby="support-ai-boundary" />
        <p id="support-ai-boundary" className={styles.note}>Nothing is sent. Do not include passwords, tokens, private evidence or account details.</p>
        <button type="submit" disabled={!question.trim()} aria-disabled={!question.trim()}>Check <InlineArrow direction="up-right" /></button>
        {unavailable && <p role="alert">Chat is unavailable or busy. Try again, or contact support using the form.</p>}
      </form>
      <a href="#support-request">Prefer a person? Contact support <InlineArrow /></a>
    </section>
  );
}
