export function numberReports(reports) {
  const oldest=[...reports].sort((a,b)=>a.uploadedAt-b.uploadedAt || a.id.localeCompare(b.id));
  const numbers=new Map(oldest.map((r,i)=>[r.id,r.serial || i+1]));
  const originals=new Map();
  for(const r of oldest)if(r.contentHash&&!originals.has(r.contentHash))originals.set(r.contentHash,r.id);
  return reports.map(r=>({...r,serial:numbers.get(r.id),duplicateOf:r.contentHash&&originals.get(r.contentHash)!==r.id?numbers.get(originals.get(r.contentHash)):null}));
}
export async function fileFingerprint(blob) {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer())),n=>n.toString(16).padStart(2,'0')).join('');
}

export function sortReports(reports, order = 'upload-newest') {
  const byReportDate = order.startsWith('report-');
  const direction = order.endsWith('oldest') ? 1 : -1;
  const dateValue = report => {
    if (!byReportDate) return Number.isFinite(report.uploadedAt) ? report.uploadedAt : null;
    const date = report.details?.testDate;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) return null;
    const value = Date.parse(`${date}T00:00:00Z`);
    return Number.isFinite(value) && new Date(value).toISOString().slice(0, 10) === date ? value : null;
  };
  return [...reports].sort((a, b) => {
    const left = dateValue(a), right = dateValue(b);
    if (left === null && right !== null) return 1;
    if (right === null && left !== null) return -1;
    return (left !== null && right !== null ? direction * (left - right) : 0)
      || b.uploadedAt - a.uploadedAt || a.id.localeCompare(b.id);
  });
}
