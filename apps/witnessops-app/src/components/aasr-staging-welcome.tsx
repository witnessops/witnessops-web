import React, { type ReactNode } from "react";
import Link from "next/link";
import { WitnessOpsMark } from "@witnessops/ui/witnessops-mark";
import styles from "./aasr-fixture.module.css";

/** Presentation only: native server authentication decides which state is shown. */
export function AasrStagingWelcome({ signedIn, sessionActions, sessionRejected = false }: {
  signedIn: boolean; sessionActions?: ReactNode; sessionRejected?: boolean;
}) {
  return <div className="product-app">
    <a className="skip-link" href="#main-content">Skip to content</a>
    <header className="app-header"><div className={`header-inner ${styles.header}`}>
      <Link className="wordmark" href="/" aria-label="WitnessOps staging home"><WitnessOpsMark size="sm" decorative /> WitnessOps</Link>
      <span className={styles.badge}>Synthetic fixture · staging</span>
      {sessionActions}
    </div></header>
    <main id="main-content" className={`main-content ${styles.main}`}>
      <div className="page-heading"><div><p className="eyebrow">Agent Action Security Review</p><h1>{signedIn ? "Staging access pending" : "Sign in to AASR staging"}</h1></div></div>
      <aside className={styles.boundary} aria-label="Fixture boundary">
        <strong>Staging simulation — no customer review or external action.</strong>
        <p>Only fictional evidence is available. Nothing is collected, sent or published. This is not a production service.</p>
        <p>One server process holds the engagement. Refresh reloads its current revision; restarting the process loses the engagement.</p>
      </aside>
      <section className={styles.panel} aria-label="Staging access">
        {signedIn ? <>
          <p role="status">You are signed in, but access is pending a valid operator-reviewed assignment and current workspace membership.</p>
          <p>Sign-in alone does not assign an Owner or reviewer role. Contact the staging operator, then refresh this page after your assignment is ready.</p>
          <form action="/" method="get"><button className="button secondary">Refresh access</button></form>
        </> : <>
          {sessionRejected ? <p role="alert">This app session is no longer valid. Sign out, then sign in again with your assigned account.</p> : null}
          <p>Sign in with your assigned test account using the native secure sign-in flow. The separate staging access gate does not identify you or grant a workspace role.</p>
          {/* Full navigation starts the native provider redirect and cookie flow. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a className="button" href="/login">Sign in</a>
        </>}
        <p className="quiet">Use separate browser profiles for the assigned Owner and reviewer. Native sign-out ends the app session; the browser’s separate staging access credentials remain.</p>
      </section>
    </main>
    <footer className="workspace-footer"><span>WitnessOps · Synthetic fixture</span><span>No external delivery</span></footer>
  </div>;
}
