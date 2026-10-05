"use client";
import { useState } from "react";
export function FlagAction({ flagId }: { flagId: string }) { const [done, setDone] = useState(false); async function resolve() { const response = await fetch(`/api/admin/flags/${flagId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "resolved" }) }); if (response.ok) setDone(true); } return done ? <span className="status resolved">resolved</span> : <button className="text-button" onClick={resolve}>Resolve</button>; }
