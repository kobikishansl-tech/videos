"""chrome_libs.py — rebuild the headless-Chromium shared-library set WITHOUT apt/sudo
(the sandbox user cannot install packages; hyperframes' bundled Chrome needs these .so files).

Method (proven in earlier sessions): fetch the Debian trixie Packages index, pick the library
packages Chrome links against, download the .debs and extract them into one directory which
is prepended to LD_LIBRARY_PATH (see env.sh).

    python3 chrome_libs.py [--out /home/appuser/chrome-libs]      # ~2-5 min on this network

Then source chrome_env.sh (written next to --out) before hyperframes snapshot/render/check.
"""
import argparse, base64, lzma, os, subprocess, sys, urllib.request

BASE = "https://deb.debian.org/debian/dists/trixie/"
IDX = "main/binary-amd64/Packages.xz"
LIB_PKGS = [
    "libnss3", "libnspr4", "libatk1.0-0t64", "libatk1.0-0", "libatk-bridge2.0-0t64", "libatk-bridge2.0-0",
    "libatspi2.0-0t64", "libatspi2.0-0",
    "libcups2t64", "libcups2", "libdrm2", "libxkbcommon0", "libxcomposite1",
    "libxdamage1", "libxfixes3", "libxrandr2", "libgbm1", "libasound2t64", "libasound2",
    "libpango-1.0-0", "libcairo2", "libglib2.0-0t64", "libglib2.0-0", "libgtk-3-0t64", "libgtk-3-0", "libgtk-3-common",
    "libexpat1", "libx11-6", "libxcb1", "libxext6", "libxshmfence1", "libxtst6",
    "libxrender1", "libxau6", "libxdmcp6", "libxi6", "libxss1", "libwayland-client0",
    "libfontconfig1", "libdbus-1-3", "libpangocairo-1.0-0", "libcairo-gobject2",
    "libadwaita-1-0", "libgtk-4-common", "libgtk-4-1", "libgdk-pixbuf-2.0-0",
]


def fetch(url, out=None, tries=3):
    last = None
    for i in range(tries):
        try:
            with urllib.request.urlopen(url, timeout=120) as r:
                data = r.read()
            if out:
                open(out, "wb").write(data)
            return data
        except Exception as e:  # noqa: PERF203
            last = e
    raise RuntimeError(f"fetch failed: {url} ({last})")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="/home/appuser/chrome-libs")
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)
    raw = fetch(BASE + IDX)
    pkgs = lzma.decompress(raw).decode("utf-8", "replace")
    files = {}
    for blk in pkgs.split("\n\n"):
        name = fn = None
        for ln in blk.splitlines():
            if ln.startswith("Package: "):
                name = ln[9:].strip()
            elif ln.startswith("Filename: "):
                fn = ln[10:].strip()
        if name and fn and name in LIB_PKGS:
            files.setdefault(name, "https://deb.debian.org/debian/" + fn)
    have = sorted(files)
    missing = set(p for p in LIB_PKGS if p not in files)
    print(f"index: {len(files)} of {len(LIB_PKGS)} library packages found; missing: {sorted(missing)}")
    ok = []
    for name, url in sorted(files.items()):
        deb = os.path.join("/tmp", os.path.basename(url))
        print("  get", name)
        try:
            fetch(url, deb)
            subprocess.run(["ar", "x", deb], cwd="/tmp", check=False) if False else None
            # kernel-independent: use `dpkg -x` if present, else ar+tar
            if subprocess.run(["dpkg", "-x", deb, a.out], check=False).returncode == 0:
                pass
            else:
                subprocess.run(["tar", "-xf", deb, "-C", a.out,
                                "--wildcards", "./usr/lib/*", "./lib/*"], check=False)
            ok.append(name)
        except Exception as e:
            print("   !! failed", name, e)
    libsdir = os.path.join(a.out, "usr", "lib", "x86_64-linux-gnu")
    nlibs = len([f for f in os.listdir(libsdir) if ".so" in f]) if os.path.isdir(libsdir) else 0
    envsh = os.path.join(a.out, "chrome_env.sh")
    ffmpeg = "/home/appuser/.local/lib/python3.12/site-packages/static_ffmpeg/bin/linux"
    open(envsh, "w").write(
        f"export LD_LIBRARY_PATH={libsdir}"
        + (f":{ffmpeg}" if os.path.isdir(ffmpeg) else "")
        + (":$LD_LIBRARY_PATH" if os.environ.get("LD_LIBRARY_PATH") else "") + "\n"
        + (f"export PATH={ffmpeg}:$PATH\n" if os.path.isdir(ffmpeg) else ""))
    print(f"extracted: {len(ok)} packages, {nlibs} shared objects in {libsdir}")
    print(f"source {envsh} before hyperframes")


if __name__ == "__main__":
    main()
