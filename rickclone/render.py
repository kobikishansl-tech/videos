import cv2, numpy as np, os, matplotlib, glob
from PIL import Image, ImageDraw, ImageFont

W, H, FPS = 720, 1280, 24
fpath = glob.glob(matplotlib.get_data_path() + '/fonts/ttf/DejaVuSans-Bold.ttf')[0]
FONT = ImageFont.truetype(fpath, 48)

SHOTS = [
    ('shots/shot1.jpg', [(0.0, 4.5, 'IN 1810, NAPOLEON WAS THE MOST|FEARED MAN IN EUROPE')], dict(z0=1.02, z1=1.14, dx=-0.3, dy=0.0)),
    ('shots/shot2.jpg', [(4.5, 9.5, 'THAT JULY, HE THREW A HUGE|CELEBRATION... WITH A RABBIT HUNT')], dict(z0=1.14, z1=1.02, dx=0.4, dy=0.1)),
    ('shots/shot3.jpg', [(9.5, 11.7, 'THOUSANDS OF RABBITS WERE|RELEASED FOR THE CHASE'), (11.7, 13.9, 'BUT NOBODY CHECKED|WHAT KIND THEY WERE')], dict(z0=1.02, z1=1.18, dx=0.1, dy=0.3)),
    ('shots/shot4.jpg', [(13.9, 18.1, 'THEY WERENT WILD. THEY WERE|~TAME~, FARM-RAISED RABBITS')], dict(z0=1.06, z1=1.22, dx=-0.2, dy=0.0)),
    ('shots/shot5.jpg', [(18.1, 20.1, 'SO THEY DIDNT RUN.')], dict(z0=1.02, z1=1.10, dx=0.0, dy=-0.2)),
    ('shots/shot6.jpg', [(20.1, 22.5, 'THEY ~CHARGED~.')], dict(z0=1.02, z1=1.30, dx=0.0, dy=0.0)),
    ('shots/shot7.jpg', [(22.5, 27.0, 'THOUSANDS OF THEM. SPRINTING|STRAIGHT AT THE ~EMPEROR~')], dict(z0=1.04, z1=1.20, dx=-0.25, dy=0.15)),
    ('shots/shot8.jpg', [(27.0, 31.4, 'NAPOLEON SCRAMBLED INTO HIS|CARRIAGE. AND SHUT THE DOOR'), (31.4, 36.5, 'THE MOST FEARED MAN IN EUROPE|WAS DEFEATED BY ~RABBITS~')], dict(z0=1.16, z1=1.02, dx=0.3, dy=0.0)),
]

def ease(t):
    t = min(max(t, 0.0), 1.0)
    return t * t * (3 - 2 * t)

def parse_caption(s):
    out = []
    for ln in s.split('|'):
        row = [(t.strip('~'), t.startswith('~')) for t in ln.strip().split()]
        out.append(row)
    return out

def render_caption_overlay(parsed):
    ov = Image.new('RGBA', (W, 300), (0, 0, 0, 0))
    d = ImageDraw.Draw(ov)
    lh = 66
    y = 300 - lh * len(parsed) - 20
    for row in parsed:
        total = d.textlength('  '.join(t for t, _ in row), font=FONT)
        x = (W - total) / 2
        for t, punch in row:
            fill = (255, 224, 64, 255) if punch else (255, 255, 255, 255)
            d.text((x, y), t, font=FONT, fill=fill, stroke_width=7, stroke_fill=(0, 0, 0, 255))
            x += d.textlength(t + '  ', font=FONT)
        y += lh
    return np.array(ov).astype(np.float32)

def prep(path):
    im = cv2.imread(path)
    hp, wp = im.shape[:2]
    s = 1600 / wp
    b = cv2.resize(im, (int(wp * s), int(hp * s)), interpolation=cv2.INTER_CUBIC)
    blur = cv2.GaussianBlur(b, (0, 0), 1.2)
    return cv2.addWeighted(b, 1.25, blur, -0.25, 0)

SRC, BEATS = {}, []
for i, (path, beats, kb) in enumerate(SHOTS):
    SRC[i] = prep(path)
    for t0, t1, cap in beats:
        BEATS.append((t0, t1, i, render_caption_overlay(parse_caption(cap)), kb))
TOTAL = SHOTS[-1][1][-1][1]
N = int(TOTAL * FPS)

vw = cv2.VideoWriter('napoleon_rabbits_short.mp4', cv2.VideoWriter_fourcc(*'mp4v'), FPS, (W, H))
for fi in range(N):
    tt = fi / FPS
    seg = None
    for b in BEATS:
        if b[0] <= tt < b[1]:
            seg = b
            break
    if seg is None:
        seg = BEATS[-1]
    t0, t1, idx, capn, kb = seg
    lt = (tt - t0) / (t1 - t0)
    e = ease(lt)
    im = SRC[idx]
    hh, ww = im.shape[:2]
    z = kb['z0'] + (kb['z1'] - kb['z0']) * e
    ch, cw = H / z, W / z
    sc = min(hh / ch, ww / cw)
    ch, cw = ch * sc, cw * sc
    px = (ww - cw) * (0.5 + kb['dx'] * (e - 0.5))
    py = (hh - ch) * (0.5 + kb['dy'] * (e - 0.5))
    px = max(0, min(ww - cw, px))
    py = max(0, min(hh - ch, py))
    crop = im[int(py):int(py) + int(ch), int(px):int(px) + int(cw)]
    f = cv2.resize(crop, (W, H), interpolation=cv2.INTER_LINEAR)
    alpha = capn[:, :, 3:4] / 255.0
    hcap = capn.shape[0]
    yoff = H - hcap - 120
    f[yoff:yoff + hcap] = (f[yoff:yoff + hcap] * (1 - alpha) + capn[:, :, :3] * alpha).astype(np.uint8)
    vw.write(f)
vw.release()
print('rendered', os.path.getsize('napoleon_rabbits_short.mp4'), 'bytes,', N, 'frames,', round(N / FPS, 1), 's')
