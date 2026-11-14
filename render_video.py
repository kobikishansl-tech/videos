import json, math, random, subprocess
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

random.seed(7); np.random.seed(7)
W, H = 1280, 720
SS = 2
CW, CH = W*SS, H*SS
CANW, CANH = CW+256, CH+256
OFFX, OFFY = 128, 128
FPS = 30
FDIR = "/home/appuser/.local/lib/python3.12/site-packages/matplotlib/mpl-data/fonts/ttf"
F_BOLD = ImageFont.truetype(f"{FDIR}/DejaVuSans-Bold.ttf", 44*SS)
F_BIG  = ImageFont.truetype(f"{FDIR}/DejaVuSans-Bold.ttf", 110*SS)
F_HUGE = ImageFont.truetype(f"{FDIR}/DejaVuSans-Bold.ttf", 200*SS)
F_CAP  = ImageFont.truetype(f"{FDIR}/DejaVuSans-Bold.ttf", 34*SS)
F_NOTE = ImageFont.truetype(f"{FDIR}/DejaVuSans-Oblique.ttf", 52*SS)
F_SMALL= ImageFont.truetype(f"{FDIR}/DejaVuSans.ttf", 28*SS)

durs = json.load(open("tts/durs.json"))

SCENES = [
 dict(id="s1",  lines=["s1"], cam=(1.0,1.10), grade="cool", flash=False),
 dict(id="s2",  lines=["s2","s3"], cam=(1.05,1.0), grade="warm", flash=True),
 dict(id="s4",  lines=["s4"], cam=(1.0,1.12), grade="cool", flash=False),
 dict(id="s5",  lines=["s5"], cam=(1.0,1.08), grade="cool", flash=True),
 dict(id="s6",  lines=["s6"], cam=(1.08,1.0), grade="cool", flash=True),
 dict(id="s7",  lines=["s7"], cam=(1.0,1.10), grade="warm", flash=True),
 dict(id="s8",  lines=["s8"], cam=(1.06,1.0), grade="cool", flash=False),
 dict(id="s9",  lines=["s9"], cam=(1.0,1.14), grade="warm", flash=True),
 dict(id="s10", lines=["s10"], cam=(1.10,1.0), grade="cool", flash=False),
 dict(id="s11", lines=["s11"], cam=(1.0,1.08), grade="warm", flash=False),
 dict(id="s12", lines=["s12"], cam=(1.0,1.15), grade="cool", flash=False),
 dict(id="s13", lines=["s13"], cam=(1.0,1.0), grade="cool", flash=False),
 dict(id="s14", lines=["s14"], cam=(1.0,1.0), grade="cool", flash=False),
]

GAP = 0.55
t = 0.0
line_times = {}
for sc in SCENES:
    sc["start"] = t
    d = 0.0
    for lid in sc["lines"]:
        line_times[lid] = (t + d + 0.15, durs[lid]["dur"])
        d += durs[lid]["dur"] + 0.35
    sc["dur"] = max(d + GAP, 3.2)
    t += sc["dur"]
TOTAL = t + 2.0
NF = int(TOTAL*FPS)
print("total", round(TOTAL,1), "s,", NF, "frames", flush=True)

VIG = None
def vignette(img):
    global VIG
    if VIG is None:
        y, x = np.mgrid[0:H, 0:W]
        cx, cy = W/2, H/2
        d = np.sqrt(((x-cx)/(W*0.62))**2 + ((y-cy)/(H*0.62))**2)
        VIG = np.clip(1.0 - 0.55*np.clip(d-0.45,0,1)**1.6, 0.25, 1.0)[...,None].astype(np.float32)
    return (img.astype(np.float32)*VIG).astype(np.uint8)

def add_glow(base, cx, cy, rad, color, inten):
    cx, cy, rad = cx*SS+OFFX, cy*SS+OFFY, rad*SS
    g = Image.new("RGB", (CANW, CANH), (0,0,0))
    gd = ImageDraw.Draw(g)
    steps = 6
    for i in range(steps, 0, -1):
        a = inten * (1 - i/(steps+1))**2
        c = tuple(int(v*a) for v in color)
        r = rad * i/steps
        gd.ellipse([cx-r, cy-r*0.9, cx+r, cy+r*0.9], fill=c)
    g = g.filter(ImageFilter.GaussianBlur(rad*0.25))
    return np.clip(base + np.asarray(g, dtype=np.int16), 0, 255).astype(np.uint8)

def txt(d, xy, s, font, fill, anchor="mm", outline=None, alpha=255):
    col = tuple(list(fill)+[alpha]) if len(fill)==3 else fill
    if outline:
        d.text(xy, s, font=font, fill=tuple(list(outline)+[alpha]), anchor=anchor,
               stroke_width=6*SS, stroke_fill=tuple(list(outline)+[alpha]))
    d.text(xy, s, font=font, fill=col, anchor=anchor,
           stroke_width=3*SS if outline else 0, stroke_fill=(0,0,0,alpha) if outline else None)

def rgba_canvas():
    return Image.new("RGBA", (CANW, CANH), (11,13,18,255))

def grade_apply(arr, mode):
    arr = arr.copy()
    if mode == "warm":
        arr[...,2] = (arr[...,2]*0.88).astype(np.uint8)
        arr[...,0] = np.clip(arr[...,0]*1.06, 0, 255).astype(np.uint8)
    elif mode == "cool":
        arr[...,0] = (arr[...,0]*0.88).astype(np.uint8)
        arr[...,2] = np.clip(arr[...,2]*1.10, 0, 255).astype(np.uint8)
    return arr

def character(d, x, y, h, pose="stand", rim=(70,90,120), t=0.0):
    u = h/8.0
    lw = int(0.55*u)
    col = (8,10,14,255)
    rimcol = tuple(list(rim)+[140])
    def limb(p0, p1, w=None):
        w = w or lw
        d.line([p0, p1], fill=col, width=w)
        d.line([(p0[0]+3*SS, p0[1]), (p1[0]+3*SS, p1[1])], fill=rimcol, width=max(2,int(w*0.35)))
    head_r = 0.52*u
    if pose == "stand":
        hip = (x, y-3.2*u); sho = (x, y-6.0*u)
        sw = math.sin(t*2.2)*0.25*u
        limb((x-1.1*u, y), (hip[0]-0.15*u, hip[1]+0.1*u)); limb((x+1.1*u, y), (hip[0]+0.15*u, hip[1]+0.1*u))
        limb(hip, sho, int(lw*1.5))
        limb((sho[0]-0.1*u, sho[1]+0.3*u), (sho[0]-1.3*u+sw, sho[1]+2.6*u))
        limb((sho[0]+0.1*u, sho[1]+0.3*u), (sho[0]+1.3*u-sw, sho[1]+2.6*u))
        d.ellipse([x-head_r, y-7.4*u-head_r, x+head_r, y-7.4*u+head_r], fill=col)
        d.ellipse([x-head_r+3*SS, y-7.4*u-head_r, x+head_r+3*SS, y-7.4*u+head_r], outline=rimcol, width=2*SS)
    elif pose == "sit":
        hip = (x, y-2.2*u)
        limb((x-1.3*u, y), (x-1.3*u, y-2.4*u))
        limb((hip[0]-0.2*u, hip[1]), (x+1.2*u, y-2.6*u))
        limb((x+1.2*u, y-2.6*u), (x+1.3*u, y))
        sho = (hip[0]-0.1*u, hip[1]-2.8*u)
        limb(hip, sho, int(lw*1.5))
        limb((sho[0]-0.1*u, sho[1]+0.4*u), (sho[0]-1.0*u, sho[1]+2.2*u))
        limb((sho[0]+0.1*u, sho[1]+0.4*u), (sho[0]+1.0*u, sho[1]+2.2*u))
        d.ellipse([sho[0]-head_r, sho[1]-0.6*u-head_r, sho[0]+head_r, sho[1]-0.6*u+head_r], fill=col)
    elif pose == "bench":
        bx = x; by = y-2.0*u
        limb((bx-2.6*u, by+0.5*u), (bx+2.6*u, by+0.5*u), int(lw*1.2))
        limb((bx-2.2*u, by+0.5*u), (bx-2.2*u, y), int(lw*1.4))
        limb((bx+2.2*u, by+0.5*u), (bx+2.2*u, y), int(lw*1.4))
        limb((bx-2.0*u, by), (bx+2.0*u, by), int(lw*1.6))
        limb((bx-1.8*u, by), (bx-2.3*u, by-1.8*u))
        limb((bx+1.8*u, by), (bx+2.3*u, by-1.8*u))
        d.ellipse([bx-2.9*u-head_r*0.8, by-head_r*0.8, bx-2.9*u+head_r*0.8, by+head_r*0.8], fill=col)
        bar_y = by-2.1*u
        d.line([(bx-3.4*u, bar_y), (bx+3.4*u, bar_y)], fill=(20,22,28,255), width=int(0.3*u))
        for sgn in (-1, 1):
            px = bx + sgn*3.1*u
            d.ellipse([px-0.75*u, bar_y-0.75*u, px+0.75*u, bar_y+0.75*u], fill=(14,16,20,255))
        return bar_y
    elif pose == "run":
        ph = t*9
        hip = (x, y-3.4*u); sho = (x+0.3*u, y-6.2*u)
        a1 = math.sin(ph)*1.2*u; a2 = math.sin(ph+math.pi)*1.2*u
        limb((x-0.2*u, y), (hip[0]+a1*0.4, hip[1]+0.2*u))
        limb((x+0.4*u, y-0.1*u), (hip[0]+a2*0.4, hip[1]+0.2*u))
        limb(hip, sho, int(lw*1.5))
        limb((sho[0], sho[1]+0.3*u), (sho[0]+a2*0.8, sho[1]+2.0*u))
        limb((sho[0], sho[1]+0.3*u), (sho[0]+a1*0.8, sho[1]+2.0*u))
        d.ellipse([sho[0]-head_r, sho[1]-0.5*u-head_r, sho[0]+head_r, sho[1]-0.5*u+head_r], fill=col)

def wrap(s, font, maxw, d):
    words = s.split(); lines=[]; cur=""
    for w_ in words:
        cand = (cur+" "+w_).strip()
        if d.textlength(cand, font=font) <= maxw: cur = cand
        else: lines.append(cur); cur = w_
    if cur: lines.append(cur)
    return lines

def caption(overlay, lid, a):
    if a <= 0: return
    text = durs[lid]["text"].upper()
    d = ImageDraw.Draw(overlay)
    lines = wrap(text, F_CAP, 1000*SS, d)
    y = H*SS - 120*SS - (len(lines)-1)*44*SS
    for ln in lines:
        d.text((W*SS/2, y), ln, font=F_CAP, fill=(255,255,255,int(230*a)),
               anchor="mm", stroke_width=5*SS, stroke_fill=(0,0,0,int(230*a)))
        y += 44*SS

def speed_lines(d, cx, cy, n, t, alpha):
    for i in range(n):
        ang = (i/n)*2*math.pi + 0.13
        r0 = (2.2 + 2.2*((t*2+i*0.37)%1))*SS*40
        r1 = r0 + 1.6*SS*40
        x0, y0 = cx + math.cos(ang)*r0*1.6, cy + math.sin(ang)*r0
        x1, y1 = cx + math.cos(ang)*r1*1.6, cy + math.sin(ang)*r1
        d.line([x0,y0,x1,y1], fill=(200,215,235,int(alpha)), width=2*SS)

def draw_scene(sc, tl, arr):
    img = rgba_canvas()
    d = ImageDraw.Draw(img)
    sid = sc["id"]
    if sid == "s1":
        d.rectangle([OFFX+0, OFFY+CH-160*SS, OFFX+CW, OFFY+CH], fill=(14,16,22,255))
        win = (OFFX+CW-460*SS, OFFY+120*SS, OFFX+CW-100*SS, OFFY+460*SS)
        d.rectangle(win, fill=(24,32,48,255))
        arr = add_glow(arr, (win[0]+win[2])/2/(2*SS), (win[1]+win[3])/2/(2*SS), 190, (120,150,210), 0.55)
        d = ImageDraw.Draw(img)
        d.rectangle([OFFX+180*SS, OFFY+CH-300*SS, OFFX+760*SS, OFFY+CH-160*SS], fill=(16,18,25,255))
        d.rectangle([OFFX+180*SS, OFFY+CH-330*SS, OFFX+760*SS, OFFY+CH-300*SS], fill=(22,24,32,255))
        character(d, OFFX/SS+330, H-150, 170, "sit", t=tl)
        a = min(1.0, tl/1.2)
        arr = add_glow(arr, 330, H-150-170*0.95, 120, (80,255,140), 0.5*a)
        d = ImageDraw.Draw(img)
        txt(d, (330*SS+OFFX, (H-150-170*0.95)*SS+OFFY), "+1%", F_BIG, (140,255,170,255), outline=(0,0,0))
    elif sid == "s2":
        d.rectangle([OFFX+0, OFFY+CH-160*SS, OFFX+CW, OFFY+CH], fill=(13,15,20,255))
        lamp_x, lamp_y = 980, 300
        d.line([(lamp_x*SS+OFFX, (lamp_y+60)*SS+OFFY), (lamp_x*SS+OFFX, (H-160)*SS+OFFY)], fill=(20,22,28,255), width=8*SS)
        d.polygon([(lamp_x-60, lamp_y+60), (lamp_x+60, lamp_y+60), (lamp_x+30, lamp_y)], fill=(30,32,40,255))
        arr = add_glow(arr, lamp_x, lamp_y+80, 260, (255,170,80), 0.85)
        d = ImageDraw.Draw(img)
        character(d, 400, H-150, 190, "stand", rim=(120,90,60), t=tl)
        words = ["SPEED", "MEMORY", "NERVE"]
        for i, wd in enumerate(words):
            a = np.clip((tl - (0.8+i*0.9))/0.4, 0, 1)
            if a > 0:
                txt(d, ((560+i*30)*SS+OFFX, (240+i*95)*SS+OFFY), wd, F_BOLD, (255,205,140,int(235*a)), anchor="lm")
        a = min(1.0, max(0.0, (tl-0.4)/0.8))
        arr = add_glow(arr, 400, H-150-190*0.95, 110, (80,255,140), 0.4*a)
        d = ImageDraw.Draw(img)
        txt(d, (400*SS+OFFX, (H-150-190*0.95)*SS+OFFY), "+1%", F_BOLD, (140,255,170,int(255*a)), outline=(0,0,0))
    elif sid == "s4":
        pulse = 0.75 + 0.25*math.sin(tl*3)
        arr = add_glow(arr, W/2, H/2-40, 300*pulse, (90,140,255), 0.35)
        d = ImageDraw.Draw(img)
        txt(d, (W/2*SS+OFFX, (H/2-60)*SS+OFFY), "1%", F_HUGE, (150,190,255,int(255*pulse)), outline=(0,0,0))
        a = np.clip((tl-1.2)/0.5, 0, 1)
        if a > 0:
            txt(d, (W/2*SS+OFFX, (H/2+120)*SS+OFFY), "FEELS LIKE NOTHING.", F_BOLD, (235,235,245,int(235*a)), outline=(0,0,0))
        a2 = np.clip((tl-2.2)/0.5, 0, 1)
        if a2 > 0:
            txt(d, (W/2*SS+OFFX, (H/2+200)*SS+OFFY), "THAT'S THE TRAP.", F_BOLD, (255,120,110,int(245*a2)), outline=(0,0,0))
    elif sid == "s5":
        d.rectangle([OFFX+0, OFFY+CH-140*SS, OFFX+CW, OFFY+CH], fill=(15,17,22,255))
        for i in range(6):
            x0 = 200+i*180
            d.line([(x0*SS+OFFX, (H-140)*SS+OFFY), (x0*SS+OFFX, 150*SS+OFFY)], fill=(19,22,30,255), width=10*SS)
        bar_y = character(d, W/2, H-130, 200, "bench", t=tl)
        arr = add_glow(arr, W/2, H-130-200*0.62-105, 170, (120,170,255), 0.6)
        d = ImageDraw.Draw(img)
        txt(d, (W/2*SS+OFFX, (H-130-200*0.62-170)*SS+OFFY), "135 LB", F_BIG, (170,205,255,255), outline=(0,0,0))
    elif sid == "s6":
        d.rectangle([OFFX+0, OFFY+CH-140*SS, OFFX+CW, OFFY+CH], fill=(15,17,22,255))
        for i in range(6):
            x0 = 200+i*180
            d.line([(x0*SS+OFFX, (H-140)*SS+OFFY), (x0*SS+OFFX, 150*SS+OFFY)], fill=(19,22,30,255), width=10*SS)
        bar_y = character(d, W/2, H-130, 200, "bench", t=tl)
        label = "180 LB" if tl < 2.6 else "360 LB"
        if 2.35 < tl < 2.55: arr = np.clip(arr.astype(np.int32)+170, 0, 255).astype(np.uint8)
        arr = add_glow(arr, W/2, H-130-200*0.62-105, 190, (120,170,255), 0.75)
        d = ImageDraw.Draw(img)
        txt(d, (W/2*SS+OFFX, (H-130-200*0.62-170)*SS+OFFY), label, F_BIG, (170,205,255,255), outline=(0,0,0))
    elif sid == "s7":
        cx, cy = W/2, H/2+40
        bend = min(1.0, tl/2.6)*70
        pts = [(cx-260, cy), (cx-130, cy-10-bend*0.2), (cx, cy-20-bend), (cx+130, cy-10-bend*0.2), (cx+260, cy)]
        d.line(pts, fill=(60,40,30,255), width=26*SS, joint="curve")
        arr = add_glow(arr, cx, cy-20-bend, 150, (255,120,40), 0.7*min(1,tl/1.5))
        d = ImageDraw.Draw(img)
        rng = random.Random(3)
        for i in range(26):
            sp_t = (tl*1.4 + i*0.13) % 1.6
            if sp_t < 1.0:
                sx = cx + rng.uniform(-1,1)*160*sp_t
                sy = cy - 20 - bend + rng.uniform(-1,1)*40 - 120*sp_t
                r = 3*SS*(1-sp_t)
                d.ellipse([sx*SS+OFFX-r, sy*SS+OFFY-r, sx*SS+OFFX+r, sy*SS+OFFY+r], fill=(255,190,90,int(255*(1-sp_t))))
        a = np.clip((tl-2.8)/0.5, 0, 1)
        if a > 0:
            txt(d, (W/2*SS+OFFX, 110*SS+OFFY), "STILL STEEL.", F_BOLD, (255,200,150,int(235*a)), outline=(0,0,0))
    elif sid == "s8":
        d.rectangle([OFFX+0, OFFY+CH-150*SS, OFFX+CW, OFFY+CH], fill=(13,15,21,255))
        for i, wx in enumerate([180, 620, 1060]):
            d.rectangle([wx*SS+OFFX, 200*SS+OFFY, (wx+130)*SS+OFFY*0+ (wx+130)*SS+OFFX*0 + OFFX + 130*SS, 500*SS+OFFY], fill=(16,19,27,255))
            lit = (i == int(tl*1.2) % 3)
            if lit:
                arr = add_glow(arr, wx+65, 350, 130, (140,180,255), 0.4)
        d = ImageDraw.Draw(img)
        character(d, W/2, H-140, 200, "stand", rim=(60,80,110), t=tl)
        flick = 0.65 + 0.35*((math.sin(tl*17) > -0.4) * (math.sin(tl*7.3) > -0.6))
        txt(d, (W/2*SS+OFFX, 120*SS+OFFY), "THE MATH", F_BIG, (120,170,255,int(255*flick)), outline=(0,0,0))
        txt(d, (W/2*SS+OFFX, 240*SS+OFFY), "DOESN'T STOP.", F_BIG, (120,170,255,int(255*flick)), outline=(0,0,0))
    elif sid == "s9":
        pulse = 0.8 + 0.2*math.sin(tl*4)
        arr = add_glow(arr, W/2, H/2, 380*pulse, (120,255,160), 0.5)
        d = ImageDraw.Draw(img)
        txt(d, (W/2*SS+OFFX, 150*SS+OFFY), "DAY 365", F_HUGE, (200,255,220,255), outline=(0,0,0))
        txt(d, (W/2*SS+OFFX, (H/2+40)*SS+OFFY), "×38", F_HUGE, (255,230,150,255), outline=(0,0,0))
        a = np.clip((tl-2.2)/0.5, 0, 1)
        if a > 0:
            txt(d, (W/2*SS+OFFX, (H-140)*SS+OFFY), "STRONGER. FASTER. SHARPER.", F_BOLD, (220,235,225,int(235*a)), outline=(0,0,0))
    elif sid == "s10":
        d.rectangle([OFFX+0, OFFY+CH-150*SS, OFFX+CW, OFFY+CH], fill=(12,14,19,255))
        d.rectangle([OFFX+0, OFFY+CH-150*SS, OFFX+CW, OFFY+CH-146*SS], fill=(40,44,52,255))
        car_x = -300 + ((tl*900) % 2000)
        d.rectangle([car_x*SS+OFFX, (H-260)*SS+OFFY, (car_x+260)*SS+OFFX, (H-170)*SS+OFFY], fill=(18,20,26,255))
        arr = add_glow(arr, car_x+30, H-215, 130, (255,240,190), 0.8)
        arr = add_glow(arr, car_x+230, H-215, 90, (255,80,60), 0.5)
        d = ImageDraw.Draw(img)
        speed_lines(d, W/2*SS+OFFX, (H/2)*SS+OFFY, 22, tl, 120)
        character(d, W/2 - 200 + tl*60, H-140, 200, "run", rim=(80,110,150), t=tl)
    elif sid == "s11":
        d.rectangle([OFFX+0, OFFY+CH-150*SS, OFFX+CW, OFFY+CH], fill=(15,14,13,255))
        dx = W/2-110
        d.rectangle([dx*SS+OFFX, 120*SS+OFFY, (dx+220)*SS+OFFX, (H-150)*SS+OFFY], fill=(26,22,18,255))
        arr = add_glow(arr, dx+260, 200, 200, (255,180,90), 0.75)
        d = ImageDraw.Draw(img)
        d.ellipse([(dx+220-18)*SS+OFFX, 330*SS+OFFY, (dx+220+18)*SS+OFFX, 366*SS+OFFY], fill=(180,150,90,255))
        note_w, note_h = 120, 80
        nx, ny = dx+110, 400
        d.rectangle([(nx-note_w/2)*SS+OFFX, (ny-note_h/2)*SS+OFFY, (nx+note_w/2)*SS+OFFX, (ny+note_h/2)*SS+OFFY], fill=(235,230,215,255))
        for i in range(3):
            d.line([((nx-40)+i*4)*SS+OFFX, (ny-18+i*16)*SS+OFFY, (nx+40)*SS+OFFX, (ny-18+i*16)*SS+OFFY], fill=(90,85,75,255), width=3*SS)
        character(d, dx-260, H-150, 190, "stand", rim=(120,90,60), t=tl)
    elif sid == "s12":
        nx, ny = W/2, H/2+20
        pw, ph = 420, 260
        d.rectangle([(nx-pw/2)*SS+OFFX, (ny-ph/2)*SS+OFFY, (nx+pw/2)*SS+OFFX, (ny+ph/2)*SS+OFFY], fill=(238,233,218,255))
        d = ImageDraw.Draw(img)
        txt(d, (nx*SS+OFFX, (ny-50)*SS+OFFY), "YOU'RE NOT", F_NOTE, (40,38,34,255))
        txt(d, (nx*SS+OFFX, (ny+10)*SS+OFFY), "THE ONLY ONE.", F_NOTE, (40,38,34,255))
        txt(d, (nx*SS+OFFX, (ny+85)*SS+OFFY), "— DAY 3,650", F_SMALL, (120,60,50,255))
        beat = 0.5 + 0.5*max(0, math.sin(tl*5.5))
        arr = add_glow(arr, nx, ny, 300+40*beat, (255,220,170), 0.25+0.2*beat)
    elif sid in ("s13", "s14"):
        if sid == "s13":
            a = np.clip(tl/0.8, 0, 1)
            txt(d, (W/2*SS+OFFX, (H/2-40)*SS+OFFY), "TEN YEARS OF 1%", F_BIG, (220,225,235,int(245*a)), outline=(0,0,0))
            a2 = np.clip((tl-1.2)/0.5, 0, 1)
            if a2 > 0:
                txt(d, (W/2*SS+OFFX, (H/2+80)*SS+OFFY), "= 5,700,000,000,000,000%", F_BOLD, (255,210,120,int(245*a2)), outline=(0,0,0))
        else:
            a = np.clip(tl/0.8, 0, 1)
            pulse = 0.8+0.2*math.sin(tl*3)
            arr = add_glow(arr, W/2, H/2-30, 320*pulse, (120,255,160), 0.3)
            d = ImageDraw.Draw(img)
            txt(d, (W/2*SS+OFFX, (H/2-30)*SS+OFFY), "PART TWO", F_HUGE, (200,255,220,int(255*a)), outline=(0,0,0))
            a2 = np.clip((tl-1.0)/0.5, 0, 1)
            if a2 > 0:
                txt(d, (W/2*SS+OFFX, (H/2+100)*SS+OFFY), "IS COMING", F_BIG, (200,255,220,int(235*a2)), outline=(0,0,0))
            a3 = np.clip((tl-1.8)/0.5, 0, 1)
            if a3 > 0:
                txt(d, (W/2*SS+OFFX, (H-90)*SS+OFFY), "WHAT WOULD YOU DO? COMMENT BELOW", F_SMALL, (170,180,190,int(220*a3)), outline=(0,0,0))
    img_arr = np.asarray(img.convert("RGB"))
    return grade_apply(np.maximum(arr, img_arr) if False else img_arr, sc["grade"])

enc = subprocess.Popen(
    ["ffmpeg","-y","-f","rawvideo","-pix_fmt","rgb24","-s",f"{W}x{H}","-r",str(FPS),
     "-i","-","-c:v","libx264","-preset","medium","-crf","19","-pix_fmt","yuv420p","build/video.mp4"],
    stdin=subprocess.PIPE, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

scene_idx = 0
for f in range(NF):
    tnow = f/FPS
    while scene_idx < len(SCENES)-1 and tnow >= SCENES[scene_idx]["start"]+SCENES[scene_idx]["dur"]:
        scene_idx += 1
    sc = SCENES[scene_idx]
    tl = tnow - sc["start"]
    z0, z1 = sc["cam"]
    zoom = z0 + (z1-z0)*min(1.0, tl/sc["dur"])
    arr = np.zeros((CANH, CANW, 3), np.uint8)
    arr = draw_scene(sc, tl, arr)
    zw, zh = int(CW/zoom), int(CH/zoom)
    cx = CANW/2 + (0.5 - tl/sc["dur"])*40
    cy = CANH/2
    x0 = int(min(max(cx - zw/2, 0), CANW-zw)); y0 = int(min(max(cy - zh/2, 0), CANH-zh))
    frame = Image.fromarray(arr[y0:y0+zh, x0:x0+zw]).resize((CW, CH), Image.LANCZOS).resize((W, H), Image.LANCZOS)
    if sc["flash"] and tl < 0.07:
        frame = Image.blend(frame, Image.new("RGB",(W,H),(255,255,255)), 0.55)
    fa = np.asarray(frame).astype(np.float32)
    fa += np.random.normal(0, 2.6, fa.shape)
    frame = Image.fromarray(vignette(np.clip(fa,0,255).astype(np.uint8)))
    ov = Image.new("RGBA", (W*SS, H*SS), (0,0,0,0))
    for lid in line_times:
        lt0, ldur = line_times[lid]
        if lt0 <= tnow < lt0+ldur+0.4:
            a = min(1.0, (tnow-lt0)/0.25, (lt0+ldur+0.4-tnow)/0.3)
            caption(ov, lid, max(0.0, a))
    frame = Image.alpha_composite(frame.convert("RGBA"), ov.resize((W,H), Image.LANCZOS)).convert("RGB")
    enc.stdin.write(np.asarray(frame).tobytes())
    if f % 300 == 0: print("frame", f, flush=True)
enc.stdin.close(); enc.wait()
print("VIDEO_DONE rc=", enc.returncode, flush=True)
