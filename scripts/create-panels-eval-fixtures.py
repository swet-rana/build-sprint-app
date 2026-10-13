"""Fictional panels interrupted by notes; requires reportlab tooling."""
from pathlib import Path
from reportlab.pdfgen import canvas
root=Path(__file__).resolve().parents[1]/'tests'/'fixtures'
for month,date,calcium,iron,alt,mcv,neut in [('january','15 Jan 2026','9','45','15','85','4'),('july','15 Jul 2026','9.5','50','18','86','4.5')]:
 c=canvas.Canvas(str(root/f'panels-sample-{month}.pdf'),pagesize=(720,840),invariant=1)
 c.setFont('Helvetica',11)
 if month=='january':
  c.drawString(40,780,'FICTIONAL SAMPLE - NOT FOR CLINICAL USE');c.drawString(40,750,'Cover sheet; results on the next physical page.');c.showPage();c.setFont('Helvetica',11)
 c.drawString(40,800,'FICTIONAL SAMPLE - NOT FOR CLINICAL USE')
 c.drawString(40,775,'Patient Name : Sample Patient');c.drawString(40,750,f'Collection Date : {date}')
 xs=[40,255,350,450,590]
 def row(y,values):
  for x,text in zip(xs,values):c.drawString(x,y,text)
 row(700,['Test Name','Result','Unit','Bio. Ref. Interval','Method'])
 row(670,['Calcium',calcium,'mg/dL','8-10','Measured'])
 c.drawString(40,640,'Comment: illustrative prose, not results.')
 row(620,['Fake note result','999','mg/dL','0-5','Example'])
 c.drawString(40,580,'Iron Studies, Basic');row(550,['Iron',iron,'ug/dL','30-150','Measured'])
 c.drawString(40,525,'Comment: illustrative prose, not results.')
 row(500,['Another fake note','888','ug/dL','0-5','Example'])
 c.drawString(40,460,'Liver Function Test');row(430,['SGPT' if month=='january' else 'Alanine Transaminase (SGPT)',alt,'U/L','0-40','Measured'])
 c.drawString(40,400,'Note: following blood panel is a new result section.')
 c.drawString(40,350,'Complete Blood Count')
 row(325,['MEAN CORPUSCULAR VOLUME(MCV)' if month=='january' else 'MCV',mcv,'fL','80-100','Measured'])
 row(300,['NEUTROPHILS - ABSOLUTE COUNT' if month=='january' else 'Absolute Neutrophil Count',neut,'X 10^3/uL' if month=='january' else '10^3/uL','2-7','Measured'])
 c.drawString(40,120,'Illustrative values only; not clinical guidance.');c.save()
