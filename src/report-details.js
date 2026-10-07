import { HEALTH_CATEGORIES, categoriesForTest } from './health-categories.js';
export const emptyDetails = () => ({ labName:'', testType:'', patientName:'', testDate:'' });
const descriptions = {
  heart:'Cholesterol blood test panel', liver:'Liver function blood tests', kidney:'Kidney function blood tests',
  sugar:'Blood sugar level tests', thyroid:'Thyroid function blood tests', blood:'Complete blood count tests',
  inflammation:'Infection and inflammation tests', iron:'Iron level blood tests', vitamins:'Vitamin level blood tests',
  bone:'Bone and mineral tests', electrolytes:'Blood electrolyte level tests', hormones:'Reproductive hormone blood tests',
  digestion:'Pancreatic enzyme blood tests', clotting:'Blood clotting function tests', allergy:'Allergy marker blood tests',
};
function describeTypes(types) {
  return types.length >= 3 ? 'Comprehensive blood tests' : types.length === 2 ? 'Combined blood test panel' : descriptions[types[0]?.id] || 'Routine blood test report';
}
export function shortTestType(value) {
  if (!value?.startsWith('Blood tests: ')) return value === 'Blood tests' ? 'Routine blood test report' : value;
  const labels = value.slice('Blood tests: '.length).split(', ').map(s => s.trim());
  return describeTypes(HEALTH_CATEGORIES.filter(c => labels.includes(c.label) && c.id !== 'other'));
}
export function detailsFromReport(report) {
  const groups = new Set(report.markers.flatMap(categoriesForTest));
  const types = HEALTH_CATEGORIES.filter(c => groups.has(c.id) && c.id !== 'other');
  return {
    labName: report.labName || '',
    testType: describeTypes(types),
    patientName: report.patientName || '', testDate: report.date || '',
  };
}
export function testDateLabel(date) {
  return date ? new Date(`${date}T00:00:00`).toLocaleDateString('en-IN',{ day:'numeric', month:'short', year:'numeric' }) : 'Not added';
}
// Recheck the current list after each file so uploads arriving mid-read are included.
export async function fillMissingDetails({getReports, attempted, readDetails, saveDetails, onFailure}) {
  let report;
  while ((report = getReports().find(r => !r.details && !attempted.has(r.id)))) {
    attempted.add(report.id);
    try { await saveDetails(report, await readDetails(report)); }
    catch { onFailure(report); }
  }
}
