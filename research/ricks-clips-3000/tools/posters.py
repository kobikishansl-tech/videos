import urllib.request, ssl, csv, os, sys
ctx = ssl.create_default_context(); ctx.check_hostname=False; ctx.verify_mode=ssl.CERT_NONE
rows = list(csv.DictReader(open("data/channel_index.tsv"), delimiter="\t"))
ok=fail=0
for r in rows:
    vid = r["id"]
    out = f"thumbs/{vid}.jpg"
    if os.path.exists(out) and os.path.getsize(out) > 5000: ok+=1; continue
    got = False
    for name in ["maxresdefault", "hq720", "hqdefault"]:
        try:
            u = f"https://i.ytimg.com/vi/{vid}/{name}.jpg"
            d = urllib.request.urlopen(urllib.request.Request(u, headers={"User-Agent":"Mozilla/5.0"}), timeout=10, context=ctx).read()
            if len(d) > 5000:
                open(out,"wb").write(d); ok+=1; got=True; break
        except Exception: pass
    if not got: fail+=1
print("posters ok:", ok, "fail:", fail, file=sys.stderr)
