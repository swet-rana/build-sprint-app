"""Create fictional PDF fixtures only. Requires reportlab in a tooling environment."""
from pathlib import Path
from reportlab.pdfgen import canvas
ROOT = Path(__file__).resolve().parents[1] / 'tests' / 'fixtures'

def report(kind, month, date, rows, cover=False, lab=None):
    c = canvas.Canvas(str(ROOT / f'{kind}-sample-{month}.pdf'), pagesize=(720, 840), invariant=1)
    c.setTitle(f'Fictional {kind} report for software tests')
    if cover:
        c.setFont('Helvetica-Bold', 16)
        c.drawString(40, 770, 'FICTIONAL SAMPLE - NOT FOR CLINICAL USE')
        c.setFont('Helvetica', 12)
        c.drawString(40, 730, 'Cover page only. Results are on the next physical PDF page.')
        c.showPage()
    c.setFont('Helvetica-Bold', 16)
    c.drawString(40, 800, 'SEMEN ANALYSIS' if kind == 'semen' else 'BLOOD TEST REPORT')
    c.setFont('Helvetica', 11)
    if lab: c.drawString(430, 800, lab)
    c.drawString(40, 775, 'FICTIONAL SAMPLE - NOT FOR CLINICAL USE')
    c.drawString(40, 745, 'Patient Name : Sample Patient')
    c.drawString(40, 720, f'Collection Date : {date}')
    xs = [40, 255, 325, 460, 580]
    for x, value in zip(xs, ['Test Name', 'Result', 'Unit', 'Bio. Ref. Interval', 'Method']):
        c.drawString(x, 660, value)
    for i, row in enumerate(rows):
        for x, value in zip(xs, row): c.drawString(x, 620-i*40, str(value))
    c.drawString(40, 120, 'Illustrative values and ranges only; no real patient data.')
    c.drawString(40, 95, 'For software verification, not medical guidance.')
    c.save()

report('blood', 'january', '15/Jan/2026', [
    ['Hemoglobin', '12.5', 'g/dL', '12-15', 'Measured'],
    ['CRP', '6', 'mg/L', '0-5', 'Measured'],
], cover=True)
report('blood', 'july', '15/Jul/2026', [
    ['Hemoglobin', '13.2', 'g/dL', '12-15', 'Measured'],
    ['CRP', '3', 'mg/L', '0-5', 'Measured'],
    ['Vitamin D', '24', 'ng/mL', '20-50', 'Measured'],
])
for month, date, concentration, total, motility in [
    ('january', '15/Jan/2026', 12, 30, 45),
    ('july', '15/Jul/2026', 24, 60, 38),
]:
    report('semen', month, date, [
        ['Semen volume', '2.5', 'mL', '1.4-6', 'Measured'],
        ['Sperm concentration', concentration, 'million/mL', '16-200', 'Counting'],
        ['Total sperm count', total, 'million/ejaculate', '39-500', 'Calculated'],
        ['Total motility', motility, '%', '42-100', 'Microscopy'],
        ['Progressive motility', '31', '%', '30-100', 'Microscopy'],
        ['Normal forms', '5', '%', '4-100', 'Strict'],
    ])

# Different lab branding and aliases; illustrative software fixtures only.
report('crosslab', 'january', '15/Jan/2026', [
    ['HGB', '12.5', 'g/dL', '12-15', 'Measured'],
    ['CRP', '6', 'mg/L', '0-5', 'Measured'],
], cover=True, lab='Tata 1mg')
report('crosslab', 'july', '15/Jul/2026', [
    ['HAEMOGLOBIN', '13.2', 'g/dL', '12-15', 'Measured'],
    ['C-reactive protein', '3', 'mg/L', '0-5', 'Measured'],
], lab='Apollo Diagnostics')
