import test from 'node:test';
import assert from 'node:assert/strict';
import { matchesReportSearch } from '../src/report-search.js';

const pdf = { name: 'results.pdf', serial: 2, contentType: 'application/pdf', details: { labName: 'Tata 1mg', testType: 'Comprehensive blood tests', patientName: 'Sample Person', testDate: '2026-05-27' } };
const photo = { name: 'upload.jpg', serial: 3, contentType: 'image/jpeg', details: { labName: 'Apollo', testType: 'Thyroid tests' } };

test('report search combines report type, lab and document type in any order', () => {
  for (const query of ['blood', 'BLOOD TEST', 'Tata1mg', 'tata 1mg pdf', 'pdf blood tata', 'blood reports']) {
    assert.equal(matchesReportSearch(pdf, query), true, query);
  }
  assert.equal(matchesReportSearch(pdf, 'Apollo pdf'), false);
  assert.equal(matchesReportSearch(pdf, 'thyroid'), false);
});

test('report search recognizes photo and image words and JPG/JPEG', () => {
  for (const query of ['photo', 'photos', 'image', 'images', 'picture', 'jpg', 'jpeg', 'Apollo thyroid photo']) {
    assert.equal(matchesReportSearch(photo, query), true, query);
  }
  assert.equal(matchesReportSearch(pdf, 'photo'), false);
  assert.equal(matchesReportSearch(photo, 'pdf'), false);
});

test('report search preserves filename, patient, date, serial and empty searches', () => {
  for (const query of ['results.pdf', 'Sample Person', '2026-05-27', '#2', '']) assert.equal(matchesReportSearch(pdf, query), true, query);
  assert.equal(matchesReportSearch({ name: 'blank.pdf', contentType: 'application/pdf' }, 'pdf'), true);
});
