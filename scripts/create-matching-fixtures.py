from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
for suffix,lab,date,name,value,unit,ref in [('january','Fictional Lab A','15/01/2026','Haemoglobin','12.5','g/dL','12-16'),('july','Fictional Lab B','15/07/2026','Blood haemoglobin level','132','g/L','120-160')]:
    c=canvas.Canvas('tests/fixtures/matching-sample-'+suffix+'.pdf',pagesize=A4)
    c.setFont('Helvetica',12)
    for y,text in [(790,lab+' - FICTIONAL TEST ONLY'),(765,'Patient Name: Fictional Matching Patient'),(740,'Report Date: '+date),(715,'Age: 32 years    Gender: Female')]:c.drawString(40,y,text)
    for x,text in [(40,'Test'),(270,'Result'),(355,'Unit'),(440,'Reference Range')]:c.drawString(x,665,text)
    for x,text in [(40,name),(270,value),(355,unit),(440,ref)]:c.drawString(x,630,text)
    c.save()
