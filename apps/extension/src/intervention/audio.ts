export function playInterventionTone(level: 2 | 3 | 4): void {
  const Context = globalThis.AudioContext ?? (globalThis as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Context) return;
  const context = new Context();
  const oscillator = context.createOscillator(); const gain = context.createGain();
  oscillator.frequency.value = level === 4 ? 220 : level === 3 ? 392 : 523;
  gain.gain.setValueAtTime(0.0001, context.currentTime); gain.gain.exponentialRampToValueAtTime(0.08, context.currentTime + 0.02); gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.24);
  oscillator.connect(gain).connect(context.destination); oscillator.start(); oscillator.stop(context.currentTime + 0.25);
  oscillator.addEventListener("ended", () => void context.close());
}
