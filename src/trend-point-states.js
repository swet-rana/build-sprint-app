import { summaryRangeStatus as rangeStatus } from './summary-range.js';

// Compare each result with the range printed in its own source report.
export function trendPointStates(observations) {
  const statuses = observations.map(result => result ? rangeStatus(result.value, result.referenceText) : null);
  const hasOutOfRange = statuses.some(status => status === 'above' || status === 'below');
  return statuses.map(status => status === null ? null
    : status === 'above' || status === 'below' ? 'out-of-range'
    : status === 'within' && hasOutOfRange ? 'normal-transition' : 'neutral');
}
