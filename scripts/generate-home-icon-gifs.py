"""Draw the decorative homepage GIFs. Offline tool; requires Pillow only."""
from pathlib import Path
import math
from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parents[1] / 'public/images'
SCALE = 4
SIZE = 96
PURPLE = '#4432ae'

def ease(value):
    value = max(0, min(1, value))
    return value * value * (3 - 2 * value)

def draw_icon(kind, progress):
    im = Image.new('RGBA', (SIZE*SCALE, SIZE*SCALE), (255,255,255,0))
    d = ImageDraw.Draw(im)
    def line(points, colour=PURPLE, width=5, reveal=1):
        lengths = [math.dist(a,b) for a,b in zip(points, points[1:])]
        remaining = sum(lengths) * reveal
        shown = [points[0]]
        for a,b,length in zip(points,points[1:],lengths):
            if remaining <= 0: break
            fraction = min(1, remaining/length)
            shown.append((a[0]+(b[0]-a[0])*fraction,a[1]+(b[1]-a[1])*fraction))
            remaining -= length
        if len(shown)<2: return
        d.line([(round(x*SCALE),round(y*SCALE)) for x,y in shown],fill=colour,width=width*SCALE,joint='curve')
        for x,y in shown:
            r=width/2
            d.ellipse(((x-r)*SCALE,(y-r)*SCALE,(x+r)*SCALE,(y+r)*SCALE),fill=colour)
    def rect(box, radius=4, fill=None, outline=PURPLE, width=4):
        d.rounded_rectangle(tuple(v*SCALE for v in box),radius=radius*SCALE,fill=fill,outline=outline,width=width*SCALE)
    if kind=='storage':
        # Two sheets descend behind the open storage tray.
        for index in range(2):
            p=ease((progress-index*.18)/.45)
            if progress<index*.18: continue
            x=29+index*10; y=7+index*5+p*30
            rect((x,y,x+29,y+36),fill='white',width=3)
            line([(x+7,y+12),(x+22,y+12)],width=2)
            line([(x+7,y+20),(x+18,y+20)],width=2)
        rect((18,57,78,83),fill='#eee9ff')
        line([(18,57),(32,57),(38,64),(58,64),(64,57),(78,57)],width=4)
        line([(42,74),(54,74)],width=3)
    elif kind=='tick':
        line([(22,50),(40,68),(76,29)],width=7,reveal=ease(progress/.55))
    elif kind=='trend':
        points=[(17,67),(47,40),(78,26)]
        line(points,width=4,reveal=ease(progress/.55))
        for index,((x,y),colour) in enumerate(zip(points,['#b42332',PURPLE,'#239b58'])):
            p=ease((progress-(.16+index*.19))/.14)
            if p<=0: continue
            r=6*p
            d.ellipse(((x-r)*SCALE,(y-r)*SCALE,(x+r)*SCALE,(y+r)*SCALE),fill=colour)
            d.ellipse(((x-r*.5)*SCALE,(y-r*.6)*SCALE,(x-r*.05)*SCALE,(y-r*.2)*SCALE),fill='#ffffff')
    elif kind=='thumb':
        line([(33,77),(33,43),(44,32),(47,16),(53,16),(58,22),(58,40),(75,40),(81,47),(75,73),(68,79),(33,77)],width=4,reveal=ease(progress/.65))
        line([(33,43),(18,43),(18,77),(33,77)],width=4,reveal=ease((progress-.35)/.3))
    return im.resize((SIZE,SIZE),Image.Resampling.LANCZOS)

posters=[]
for kind in ['storage','tick','trend','thumb']:
    frames=[draw_icon(kind,min(1,i/38)) for i in range(56)]
    poster=draw_icon(kind,1)
    poster.save(OUT/f'home-{kind}-still.png')
    posters.append(poster)
    sheet=Image.new('RGB',(SIZE*len(frames),SIZE),'white')
    for i,frame in enumerate(frames): sheet.paste(frame,(i*SIZE,0),frame)
    palette=sheet.quantize(colors=255)
    indexed=[]
    for frame in frames:
        rgb=Image.new('RGB',frame.size,'white');rgb.paste(frame,mask=frame.getchannel('A'))
        result=rgb.quantize(palette=palette,dither=Image.Dither.NONE)
        pixels=result.load();alpha=frame.getchannel('A').load()
        for y in range(SIZE):
            for x in range(SIZE):
                if alpha[x,y]<128: pixels[x,y]=255
        result.info['transparency']=255
        indexed.append(result)
    indexed[0].save(OUT/f'home-{kind}.gif',save_all=True,append_images=indexed[1:],duration=60,loop=0,transparency=255,disposal=2,optimize=False)
    print(f'{kind}: {(OUT/f"home-{kind}.gif").stat().st_size:,} bytes')

preview=Image.new('RGB',(SIZE*4,SIZE),'#f8f7ff')
for i,poster in enumerate(posters): preview.paste(poster,(SIZE*i,0),poster)
preview.save('/tmp/healthstats-home-icon-posters.png')
