export type InterventionObservation = Readonly<{ intervention: string; observedSeconds: number; falseAlarms: number }>;
export type ReleaseMetric = Readonly<{ intervention: string; observedHours: number; falseAlarms: number; falseAlarmsPerHour: number }>;

export function evaluateReleaseMetrics(observations: readonly InterventionObservation[]): ReleaseMetric[] {
  return observations.map((observation) => {
    const observedHours = observation.observedSeconds / 3600;
    return { intervention: observation.intervention, observedHours, falseAlarms: observation.falseAlarms, falseAlarmsPerHour: observedHours > 0 ? observation.falseAlarms / observedHours : Number.POSITIVE_INFINITY };
  });
}
/** Release stays blocked at one false alarm/hour — the threshold is strict. */
export function assertReleaseMetrics(metrics: readonly ReleaseMetric[]): void {
  if (!metrics.length) throw new Error("Release evidence is required for every shipped intervention.");
  const failing = metrics.filter((metric) => !Number.isFinite(metric.falseAlarmsPerHour) || metric.falseAlarmsPerHour >= 1);
  if (failing.length) throw new Error(`False alarms exceed the release threshold: ${failing.map((metric) => `${metric.intervention}=${metric.falseAlarmsPerHour.toFixed(2)}/hr`).join(", ")}`);
}
