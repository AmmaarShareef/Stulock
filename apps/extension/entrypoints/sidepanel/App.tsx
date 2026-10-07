import { useEffect, useState } from "react";
import { browser } from "wxt/browser";
import "../popup/style.css";
type Contract = { task: string; durationMinutes: number; tier: string };
export function App() { const [contract, setContract] = useState<Contract | null>(null); useEffect(() => { browser.runtime.sendMessage({ type: "phase1:get-status" }).then((status: { contract: Contract | null }) => setContract(status.contract)); }, []); return <main className="popup"><p className="eyebrow">StuLock</p><h1>Session panel</h1>{contract ? <><p><strong>{contract.task}</strong></p><p className="intro">{contract.durationMinutes} minutes · {contract.tier}</p><p className="privacy">This contract is saved locally. Phase 2 will add the live session HUD.</p></> : <p className="intro">Open the popup to create your first study contract.</p>}<button onClick={() => browser.runtime.openOptionsPage()}>Privacy & settings</button></main>; }
