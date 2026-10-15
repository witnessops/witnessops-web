"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import {
  EXTERNAL_ATTACK_SURFACE_OFFER,
  PUBLIC_AGENT_ACTION_OFFER,
} from "@/lib/commercial-truth";
import styles from "./ask-sovereign-preview.module.css";

type Phase = "greet" | "idle" | "answering";
type Turn = { role: "you" | "sovereign"; text: string; simulated?: boolean; needsReview?: boolean };

const SUGGESTIONS = [
  "What does the Agent Action Security Review cover?",
  "What does the External Attack Surface Review include, and what does it cost?",
  "How do I start?",
  "Where do I write?",
] as const;

const REVIEW_TOPICS = ["Retention", "Data location", "AI provider", "AI disclosure", "Legal clauses"] as const;

const GREETING = "Hello. I can answer from the two published reviews. Ask about scope, price or how to start.";

function simulatedAnswer(question: string): { text: string; needsReview: boolean } {
  const q = question.toLowerCase();
  if (/retain|retention|data location|where (is|are) (the )?data|provider|openai|model|legal|disclosure|privacy law|gdpr/.test(q)) {
    return {
      text: "That topic is not in the published offer facts. A person has to confirm it.",
      needsReview: true,
    };
  }
  if (/external|attack surface|1,900|1900|retest/.test(q)) {
    return {
      text: `${EXTERNAL_ATTACK_SURFACE_OFFER.name.en} covers one authorised internet-facing system. The price is ${EXTERNAL_ATTACK_SURFACE_OFFER.price.en}. One focused retest of reported findings is included within 30 calendar days of initial report handover. ${EXTERNAL_ATTACK_SURFACE_OFFER.timing.en}. This is not a penetration test.`,
      needsReview: false,
    };
  }
  if (/agent action|2,500|2500|consequential/.test(q)) {
    return {
      text: `${PUBLIC_AGENT_ACTION_OFFER.name.en} reviews one named consequential action. The price is ${PUBLIC_AGENT_ACTION_OFFER.price.en}. ${PUBLIC_AGENT_ACTION_OFFER.timing.en}. Inspection and reconstruction only; the review does not execute the action or change production.`,
      needsReview: false,
    };
  }
  if (/start|write|email|contact|where/.test(q)) {
    return {
      text: `Write to engage@mail.witnessops.com or use the contact page. An enquiry does not authorise collection or start a review. ${PUBLIC_AGENT_ACTION_OFFER.timing.en}.`,
      needsReview: false,
    };
  }
  return {
    text: "I can only answer from the published offer facts, and this goes beyond them. A person can answer it.",
    needsReview: false,
  };
}

function Sprite({ phase }: { phase: Phase }) {
  const frame = phase === "answering" ? "answering" : phase === "greet" ? "greet" : "idle";
  return (
    <span className={styles.sprite} data-sovereign-phase={phase}>
      <img className={styles.light} src={`/ask-sovereign/${frame}-light.webp`} alt="" width={96} height={104} />
      <img className={styles.dark} src={`/ask-sovereign/${frame}-dark.webp`} alt="" width={96} height={104} />
    </span>
  );
}

export function AskSovereignPreview() {
  const [phase, setPhase] = useState<Phase>("greet");
  const [draft, setDraft] = useState("");
  const [share, setShare] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([{ role: "sovereign", text: GREETING }]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setPhase((current) => (current === "greet" ? "idle" : current));
    }, 1400);
    return () => window.clearTimeout(id);
  }, []);

  function ask(question: string) {
    const text = question.trim();
    if (!text) return;
    setDraft("");
    setPhase("answering");
    setTurns((current) => [...current, { role: "you", text }]);
    const answer = simulatedAnswer(text);
    window.setTimeout(() => {
      setTurns((current) => [...current, { role: "sovereign", text: answer.text, simulated: true, needsReview: answer.needsReview }]);
      setPhase("idle");
    }, 700);
  }

  return (
    <div className={styles.page}>
      <p className={styles.back}><Link href="/docs">Docs</Link></p>
      <p className={styles.kicker}>AI assistant</p>
      <h1>Ask Sovereign</h1>
      <p className={styles.lead}>Questions about the two WitnessOps reviews, answered from the published offer facts. Anything else goes to a person.</p>
      <div className={styles.layout}>
        <section className={styles.panel} aria-label="Ask Sovereign">
          <div className={styles.stripe} />
          <header className={styles.panelHead}>
            <Sprite phase={phase} />
            <div>
              <p className={styles.name}>Sovereign <span>AI assistant</span></p>
              <p className={styles.muted}>Answers from published offer facts only</p>
            </div>
            <p className={styles.status}>{phase === "answering" ? "Answering" : phase === "greet" ? "Greeting" : "Here"}</p>
          </header>
          <p className={styles.disclaimer}>You are chatting with an AI assistant. It answers only from published offer facts and can be wrong.</p>
          <ol className={styles.transcript}>
            {turns.map((turn, index) => (
              <li key={`${turn.role}-${index}`} className={turn.role === "you" ? styles.you : styles.sovereign}>
                <span>{turn.role === "you" ? "You" : "Sovereign"}</span>
                <p>{turn.text}</p>
                {turn.simulated ? <p className={styles.sim}>Simulated response · preview</p> : null}
                {turn.needsReview ? <p className={styles.tag}>Needs review</p> : null}
              </li>
            ))}
          </ol>
          <div className={styles.chips}>
            {SUGGESTIONS.map((suggestion) => (
              <button key={suggestion} type="button" onClick={() => ask(suggestion)}>{suggestion}</button>
            ))}
          </div>
          <form className={styles.composer} onSubmit={(event) => { event.preventDefault(); ask(draft); }}>
            <label htmlFor="ask-sovereign-draft">Ask about the two reviews</label>
            <textarea id="ask-sovereign-draft" value={draft} rows={3} onChange={(event) => setDraft(event.target.value)} />
            <button type="submit">Send</button>
          </form>
          <label className={styles.optin}>
            <input type="checkbox" checked={share} onChange={(event) => setShare(event.target.checked)} />
            Include this transcript when I contact a person
          </label>
          <p className={styles.muted}>{share ? "Selected on this screen only." : "Not selected."} This choice is not sent and is not stored.</p>
          <p className={styles.muted}><Link href="/contact">Contact a person</Link>. Nothing from this chat is attached.</p>
        </section>
        <aside className={styles.rail}>
          <h2>What Sovereign can answer</h2>
          <ul>
            <li>{PUBLIC_AGENT_ACTION_OFFER.name.en}: {PUBLIC_AGENT_ACTION_OFFER.price.en}</li>
            <li>{EXTERNAL_ATTACK_SURFACE_OFFER.name.en}: {EXTERNAL_ATTACK_SURFACE_OFFER.price.en}, with one focused retest</li>
            <li>How to start, and where to write</li>
          </ul>
          <h2>About this AI</h2>
          <p>Answers are generated from a fixed list of published offer facts for this preview. No transcript is kept.</p>
          <ul className={styles.review}>
            {REVIEW_TOPICS.map((topic) => <li key={topic}>{topic} <span>Needs review</span></li>)}
          </ul>
        </aside>
      </div>
    </div>
  );
}
