"""Assemble generated realistic image layers into homepage GIFs (Pillow)."""
from pathlib import Path
import math
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCES = ROOT / 'design/home-icon-sources'
OUT = ROOT / 'public/images'
SIZE = 192
COUNT = 80

def ease(x):
    x = max(0, min(1, x))
    return x*x*(3-2*x)

def source(name, cell=None):
    image = Image.open(SOURCES/f'{name}.png').convert('RGBA')
    if cell is not None:
        w,h=image.size
        col,row=cell
        image=image.crop((col*w//2,row*h//2,(col+1)*w//2,(row+1)*h//2))
    return image.crop(image.getbbox())

def fitted(image,w,h):
    image=image.copy()
    image.thumbnail((round(w),round(h)),Image.Resampling.LANCZOS)
    return image

def put(canvas,image,x,y,opacity=1):
    if opacity<1:
        image=image.copy();image.putalpha(image.getchannel('A').point(lambda a:round(a*opacity)))
    canvas.alpha_composite(image,(round(x),round(y)))

tray=fitted(source('storage',(0,0)),174,106)
sheet=fitted(source('storage',(1,0)),74,116)
left=fitted(source('compare',(0,0)),83,134)
right=fitted(source('compare',(1,0)),83,134)
lens=fitted(source('compare',(0,1)),65,65)
spheres=[source('orbit',cell) for cell in [(0,0),(1,0),(0,1)]]
hand=fitted(source('thumb'),145,168)

def frame(kind,t,poster=False):
    canvas=Image.new('RGBA',(SIZE,SIZE),(255,255,255,0))
    if kind=='storage':
        for index in range(2):
            p=1 if poster else ease((t-index*.12)/.55)
            y=(10-index*10)*(1-p)+(66-index*13)*p
            layer=Image.new('RGBA',canvas.size,(255,255,255,0))
            put(layer,sheet,58-index*21,y)
            # Paper cannot protrude below the inbox floor.
            layer.paste((255,255,255,0),(0,168,SIZE,SIZE))
            canvas.alpha_composite(layer)
        put(canvas,tray,(SIZE-tray.width)/2,168-tray.height)
    elif kind=='compare':
        put(canvas,left,9,28)
        put(canvas,right,100,28)
        # A real glass lens scans matching rows across both pages.
        phase=.25 if poster else t
        x=34+72*(.5-.5*math.cos(phase*math.tau))
        y=48+30*(.5-.5*math.cos(phase*math.tau*2))
        put(canvas,lens,x,y)
    elif kind=='orbit':
        objects=[]
        for index,sphere in enumerate(spheres):
            angle=(.15 if poster else t)*math.tau+index*math.tau/3
            depth=math.sin(angle)
            size=49+9*(depth+1)/2
            ball=fitted(sphere,size,size)
            objects.append((depth,ball,96+54*math.cos(angle)-ball.width/2,96+54*depth-ball.height/2))
        for _,ball,x,y in sorted(objects,key=lambda item:item[0]): put(canvas,ball,x,y)
    else:
        # A restrained approving lift, without changing the hand's anatomy.
        lift=0 if poster else 5*(.5-.5*math.cos(t*math.tau))
        tilt=0 if poster else 3*math.sin(t*math.tau)
        moved=hand.rotate(tilt,Image.Resampling.BICUBIC,expand=True)
        put(canvas,moved,(SIZE-moved.width)/2,(SIZE-moved.height)/2-lift)
    return canvas

for kind in ['storage','compare','orbit','thumb']:
    frames=[frame(kind,i/COUNT) for i in range(COUNT)]
    # Hold the stored documents before restarting their movement.
    if kind=='storage': frames=[frame(kind,min(1,(i/COUNT)*1.4)) for i in range(COUNT)]
    still=frame(kind,.25,poster=True)
    still.save(OUT/f'home-realistic-{kind}-still.png',optimize=True)
    sheet=Image.new('RGB',(SIZE*COUNT,SIZE),'#f8f7ff')
    for i,image in enumerate(frames): sheet.paste(image,(i*SIZE,0),image)
    palette=sheet.quantize(colors=255)
    indexed=[]
    for image in frames:
        rgb=Image.new('RGB',image.size,'#f8f7ff');rgb.paste(image,mask=image.getchannel('A'))
        result=rgb.quantize(palette=palette,dither=Image.Dither.NONE)
        transparent=image.getchannel('A').point(lambda a:255 if a<128 else 0)
        result.paste(255,mask=transparent)
        result.info['transparency']=255
        indexed.append(result)
    path=OUT/f'home-realistic-{kind}.gif'
    indexed[0].save(path,save_all=True,append_images=indexed[1:],duration=60,loop=0,transparency=255,disposal=2,optimize=False)
    print(f'{path.name}: {path.stat().st_size:,} bytes')
