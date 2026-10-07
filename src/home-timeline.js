export const HOME_PHASES = [
  { id: 'intro', duration: 1200 },
  { id: 'upload', duration: 1300 },
  { id: 'select', duration: 1500 },
  { id: 'prepare', duration: 1300 },
  { id: 'ready', duration: 1200 },
  { id: 'settled', duration: 500 },
];
export const HOME_DURATION = HOME_PHASES.reduce((total, phase) => total + phase.duration, 0);
export function homePhaseAt(elapsed) {
  let start = 0;
  for (const phase of HOME_PHASES) {
    if (elapsed < start + phase.duration) return { id: phase.id, elapsed: Math.max(0, elapsed - start) };
    start += phase.duration;
  }
  return { id: 'settled', elapsed: elapsed - (HOME_DURATION - 500) };
}
