export function cleanDetails(details) {
  const result = { labName:'', testType:'', patientName:'', testDate:'' };
  for (const [key, limit] of [['labName', 160], ['testType', 600], ['patientName', 160], ['testDate', 10]]) {
    if (typeof details[key] !== 'string') throw Error('Enter text for each report detail.');
    const value = details[key].replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
    if (value.length > limit) throw Error(`Keep ${key} within ${limit} characters.`);
    result[key] = value;
  }
  if (result.testDate) {
    const date = new Date(`${result.testDate}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(result.testDate) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0,10) !== result.testDate)
      throw Error('Choose a valid test date.');
  }
  return result;
}
