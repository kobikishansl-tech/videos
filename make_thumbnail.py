import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H = 1280, 720
SS = 2
CW, CH = W*SS, H*SS
FDIR = "/home/appuser/.local/lib/python3.12/site-packages/matplotlib/mpl-data/fonts/ttf"
F_T = ImageFont.truetype(f"{FDIR}/DejaVuSans-Bold.ttf", 120*SS)
F_S = ImageFont.truetype(f"{FDIR}/DejaVuSans-Bold.ttf", 64*SS)
F_N = ImageFont.truetype(f"{FDIR}/DejaVuSans-Bold.ttf", 88*SS)

img = Image.new("RGB", (CW, CH), (10, 12, 17))
d = ImageDraw.Draw(img)

def glow(base, pos, rad, color, inten):
    cx, cy = pos
    g = Image.new("RGB", (base.shape[1], base.shape[0]), (0,0,0))
    gd = ImageDraw.Draw(g)
    for i in range(6, 0, -1):
        a = inten*(1-i/7)**2
        c = tuple(int(v*a) for v in color)
        r = rad*i/6
        gd.ellipse([cx-r, cy-r, cx+r, cy+r], fill=c)
    g = g.filter(ImageFilter.GaussianBlur(rad*0.22))
    return np.clip(np.asarray(base, np.int16) + np.asarray(g, np.int16), 0, 255).astype(np.uint8)

img_np = np.asarray(img).astype(np.int16)

floor_y = int(CH*0.86)
d = ImageDraw.Draw(img)
d.rectangle([0, floor_y, CW, CH], fill=(14, 16, 22))

u = 66*SS
x, y = int(CW*0.42), floor_y
lw = int(0.55*u)
col = (6, 8, 12)
rim = (90, 200, 130)
def limb(p0, p1, w=lw):
    d.line([p0, p1], fill=col, width=w)
    d.line([(p0[0]+4, p0[1]), (p1[0]+4, p1[1])], fill=tuple(int(c*0.5) for c in rim), width=max(3, int(w*0.4)))
hip = (x, y-3.2*u); sho = (x, y-6.0*u)
limb((x-1.15*u, y), (hip[0]-0.15*u, hip[1]+0.1*u), int(lw*1.3))
limb((x+1.15*u, y), (hip[0]+0.15*u, hip[1]+0.1*u), int(lw*1.3))
limb(hip, sho, int(lw*1.9))
limb((sho[0]-0.2*u, sho[1]+0.2*u), (sho[0]-1.5*u, sho[1]-0.6*u), int(lw*1.5))
limb((sho[0]+0.2*u, sho[1]+0.2*u), (sho[0]+1.6*u, sho[1]+1.4*u), int(lw*1.5))
hr = 0.54*u
d.ellipse([x-hr, sho[1]-1.5*u-hr, x+hr, sho[1]-1.5*u+hr], fill=col)
d.ellipse([x-hr+4, sho[1]-1.5*u-hr, x+hr+4, sho[1]-1.5*u+hr], outline=(60,140,95), width=5)

arr = glow(np.asarray(img).astype(np.int16), (x, int(sho[1]-1.5*u)), 300, (80,255,140), 0.55)
img = Image.fromarray(arr.astype(np.uint8))
d = ImageDraw.Draw(img)

d.text((x, sho[1]-1.5*u-1.6*u), "+1%", font=F_N, fill=(140,255,170), anchor="mm",
       stroke_width=8, stroke_fill=(0,0,0))

d.text((int(CW*0.80), int(CH*0.30)), "×38", font=F_T, fill=(255,225,140), anchor="mm",
       stroke_width=10, stroke_fill=(0,0,0))
d.text((int(CW*0.80), int(CH*0.30)+int(120*SS)), "IN 365 DAYS", font=F_S, fill=(235,238,245), anchor="mm",
       stroke_width=8, stroke_fill=(0,0,0))

d.text((int(CW*0.5), int(52*SS)), "WHAT IF YOU GOT 1% STRONGER", font=F_S, fill=(255,255,255), anchor="mm",
       stroke_width=9, stroke_fill=(0,0,0))
d.text((int(CW*0.5), int(130*SS)), "EVERY DAY?", font=F_S, fill=(255,120,110), anchor="mm",
       stroke_width=9, stroke_fill=(0,0,0))

arr = np.asarray(img).astype(np.float32)
rng = np.random.default_rng(5)
arr += rng.normal(0, 2.2, arr.shape)
yy, xx = np.mgrid[0:CH, 0:CW]
dd = np.sqrt(((xx-CW/2)/(CW*0.60))**2 + ((yy-CH/2)/(CH*0.60))**2)
vig = np.clip(1.0 - 0.5*np.clip(dd-0.45, 0, 1)**1.6, 0.3, 1.0)[..., None]
arr *= vig
img = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8)).resize((W, H), Image.LANCZOS)
img.save("build/thumbnail.jpg", quality=92)
print("THUMB_DONE")
