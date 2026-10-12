"""Fictional footer-date and separate-reference PDFs. Requires reportlab tooling."""
from pathlib import Path
from reportlab.pdfgen import canvas
root=Path(__file__).resolve().parents[1]/'tests'/'fixtures'
for month,date,hba1c,crp,hb in [('january','15 Jan 2026','5.6','6','12.2'),('july','15 Jul 2026','5.9','3','12.8')]:
 c=canvas.Canvas(str(root/f'footer-sample-{month}.pdf'),pagesize=(720,840),invariant=1)
 def line(y,entries):
  for x,text in entries:c.drawString(x,y,text)
 def identity():
  c.setFont('Helvetica',11)
  line(800,[(40,'FICTIONAL SAMPLE - NOT FOR CLINICAL USE')])
  line(775,[(40,'Practo / Thyrocare - illustrative layout only')])
  line(735,[(40,'NAME'),(130,':'),(140,'Sample Patient (30Y/F)')])
 def footer():
  line(130,[(40,'Sample Collected on (SCT)'),(220,':'),(230,date+' 07:00')])
  line(110,[(40,'Report Released on (RRT)'),(220,':'),(230,'20 Jul 2030 19:00')])
 identity()
 line(650,[(40,'TEST NAME'),(260,'TECHNOLOGY'),(400,'VALUE'),(480,'UNITS')])
 line(625,[(40,'HbA1c - (HPLC - NGSP Certified)')])
 line(610,[(260,'H.P.L.C'),(400,hba1c),(480,'%')])
 line(590,[(40,'Reference Range:'),(330,'Guidance For Known Diabetics')])
 line(570,[(40,'Below 5.7%: Normal'),(330,'Below 6.5%: Good Control')])
 line(555,[(40,'5.7%-6.4%: Prediabetic')])
 line(530,[(40,'Method: laboratory measurement')])
 line(480,[(40,'CRP'),(260,'Measured'),(400,crp),(480,'mg/L')])
 line(460,[(40,'Reference Range:')])
 line(440,[(40,'0-5')])
 line(420,[(40,'Method: laboratory measurement')])
 line(400,[(40,'Please correlate with clinical conditions.')])
 footer();c.showPage();identity()
 line(650,[(40,'TEST NAME'),(260,'TECHNOLOGY'),(400,'VALUE'),(480,'UNITS'),(555,'NORMAL RANGE')])
 line(620,[(40,'Hemoglobin'),(260,'Measured'),(400,hb),(480,'g/dL'),(555,'12-15')])
 line(590,[(40,'Comments: these are software test values.')])
 footer();c.save()
