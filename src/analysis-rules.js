export const MAX_ANALYSIS_REPORTS = 10;
export function analysisCountError(count) {
  if(count < 2) return 'Tick at least two different blood reports in My reports.';
  if(count > MAX_ANALYSIS_REPORTS) return 'Select up to 10 reports at a time. Untick extra reports in My reports.';
  return null;
}
