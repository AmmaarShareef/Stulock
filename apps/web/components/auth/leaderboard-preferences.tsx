"use client";
import { useState } from "react";

export function LeaderboardPreferences({ initialOptIn, initialName }: { initialOptIn: boolean; initialName: string }) {
  const [optedIn, setOptedIn] = useState(initialOptIn); const [name, setName] = useState(initialName); const [message, setMessage] = useState("");
  async function save(event: React.FormEvent) { event.preventDefault(); const response = await fetch("/api/leaderboard/preferences", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ optedIn, displayName: name }) }); setMessage(response.ok ? (optedIn ? "Leaderboard participation saved." : "You are no longer listed on the leaderboard.") : "We could not save that preference."); }
  return <section className="withdraw"><h2>Optional leaderboard</h2><p>Participation is off by default. If you opt in, only your chosen display name and 30-day focused-minute total are shown.</p><form className="onboarding-form" onSubmit={save}><label className="check"><input type="checkbox" checked={optedIn} onChange={(event) => setOptedIn(event.target.checked)} />Join the public, opt-in focus leaderboard</label><label>Display name<input value={name} onChange={(event) => setName(event.target.value)} minLength={optedIn ? 2 : undefined} maxLength={32} placeholder="Anonymous learner" /></label><button className="button">Save preference</button></form>{message && <p className="form-message">{message}</p>}</section>;
}
