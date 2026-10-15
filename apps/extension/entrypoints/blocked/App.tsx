import { useEffect, useState } from "react";
import { browser } from "wxt/browser";

type Context = { event: { category: string; reason: string; contestPath: string } | null };
export function App() {
  const [tabId, setTabId] = useState<number | null>(null); const [context, setContext] = useState<Context>({ event: null }); const [done, setDone] = useState(false);
  useEffect(() => { void browser.tabs.getCurrent().then(async (tab) => { if (typeof tab?.id !== "number") return; setTabId(tab.id); setContext(await browser.runtime.sendMessage({ type: "phase4:get-blocked-context", tabId: tab.id }) as Context); }); }, []);
  async function contest() { if (tabId === null) return; await browser.runtime.sendMessage({ type: "phase4:contest", tabId }); setDone(true); }
  return <main className="popup"><p className="eyebrow">Self-imposed relevance check</p><h1>Pause before leaving your study task.</h1><p className="intro">StuLock recognized this as a <strong>{context.event?.category ?? "potentially distracting"}</strong> category while your locked session is active. The original page address was not stored.</p><section className="camera-settings"><h2>Why this happened</h2><p className="privacy">Derived signal: local category match · Policy reason: {context.event?.reason?.replaceAll("_", " ") ?? "session policy"}.</p><p className="privacy">This is not a judgment about you. It is a setting you selected for this session.</p></section>{done ? <p className="message">Contest recorded. Returning to the previous page now.</p> : <div className="actions"><button onClick={() => void contest()}>This is relevant — continue</button><button className="secondary" onClick={() => window.close()}>Stay with my session</button></div>}<p className="privacy">Choosing “continue” records a local contest and bypasses this check once. Your report contains the reason and contest path, never the page address or title.</p></main>;
}
