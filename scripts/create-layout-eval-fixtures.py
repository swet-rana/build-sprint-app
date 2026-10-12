"""Fictional multi-page, reordered-column PDFs. Tooling only: reportlab."""
from pathlib import Path
from reportlab.pdfgen import canvas
root = Path(__file__).resolve().parents[1] / 'tests' / 'fixtures'
for month, date, haemoglobin, crp in [('january','15/Jan/2026','12.5','6'),('july','15/Jul/2026','13.2','3')]:
    c = canvas.Canvas(str(root / f'layout-sample-{month}.pdf'), pagesize=(720,840), invariant=1)
    c.setTitle('Fictional multi-page report for software verification')
    c.setFont('Helvetica-Bold',16)
    c.drawString(35,795,'FICTIONAL SAMPLE - NOT FOR CLINICAL USE')
    c.setFont('Helvetica',12)
    c.drawString(35,755,'Cover sheet. Results start on physical page 2.')
    c.showPage()
    for page, name, value, unit, reference in [(2,'Hemoglobin',haemoglobin,'g/dL','12-15'),(3,'C-reactive protein',crp,'mg/L','0-5')]:
        c.setFont('Helvetica-Bold',16)
        c.drawString(35,795,'LABORATORY RESULTS')
        c.setFont('Helvetica',11)
        c.drawString(35,765,'FICTIONAL SAMPLE - NOT FOR CLINICAL USE')
        c.drawString(35,725,'Patient Name : Sample Patient')
        c.drawString(35,700,f'Test date : {date}')
        if month == 'january':
            xs=[35,245,375,470,570]
            headings=['Investigation','Reference range','Value','Units','Method']
            cells=[name,reference,value,unit,'Measured']
        else:
            xs=[35,245,345,425,570]
            headings=['Parameter','Units','Value','Reference interval','Method']
            cells=[name,unit,value,reference,'Measured']
        for x,text in zip(xs,headings): c.drawString(x,640,text)
        for x,text in zip(xs,cells): c.drawString(x,595,text)
        c.drawString(35,100,'Illustrative values only; not medical guidance.')
        c.drawString(35,70,f'Physical PDF page {page} of 3')
        c.showPage()
    c.save()

# Supported aliases in the existing column sequence, across multiple result pages.
for month, date, haemoglobin, crp in [('january','15/Jan/2026','12.5','6'),('july','15/Jul/2026','13.2','3')]:
    c = canvas.Canvas(str(root / f'multipage-sample-{month}.pdf'), pagesize=(720,840), invariant=1)
    c.setFont('Helvetica',12)
    c.drawString(35,795,'FICTIONAL SAMPLE - NOT FOR CLINICAL USE')
    c.drawString(35,755,'Cover sheet. Results start on physical page 2.')
    c.showPage()
    for page,name,value,unit,reference in [(2,'Hemoglobin',haemoglobin,'g/dL','12-15'),(3,'C-reactive protein',crp,'mg/L','0-5')]:
        c.setFont('Helvetica',11)
        for y,text in [(795,'FICTIONAL SAMPLE - NOT FOR CLINICAL USE'),(725,'Patient Name : Sample Patient'),(700,f'Test date : {date}')]: c.drawString(35,y,text)
        xs=[35,255,335,440,590]
        for x,text in zip(xs,['Investigation','Value','Units','Reference interval','Method']): c.drawString(x,640,text)
        for x,text in zip(xs,[name,value,unit,reference,'Measured']): c.drawString(x,595,text)
        c.drawString(35,100,'Illustrative values only; not medical guidance.')
        c.drawString(35,70,f'Physical PDF page {page} of 3')
        c.showPage()
    c.save()
