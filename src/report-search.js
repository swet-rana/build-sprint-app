import { shortTestType } from './report-details.js';

const normalize = value => String(value || '').normalize('NFKC').toLowerCase()
  .replace(/\b(?:photos?|images?|pictures?)\b/g, 'image')
  .replace(/\b(?:jpg|jpeg)\b/g, 'jpeg')
  .replace(/\btests\b/g, 'test')
  .replace(/\breports\b/g, 'report')
  .replace(/[^a-z0-9#]+/g, ' ').trim();

export function matchesReportSearch(report, query) {
  const details = report.details || {};
  const type = report.contentType || '';
  const documentType = type === 'application/pdf' ? 'pdf document' : type.startsWith('image/') ? `image ${type.slice(6)}` : '';
  const fields = normalize([
    'report', report.name, details.labName, details.patientName, details.testType,
    shortTestType(details.testType), details.testDate, `#${report.serial}`, documentType,
  ].join(' '));
  const compact = fields.replaceAll(' ', '');
  return normalize(query).split(' ').filter(Boolean).every(word => compact.includes(word));
}
