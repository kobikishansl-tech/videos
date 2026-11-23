/* words.js: the words on screen, one at a time, as a pure function of time.
 *
 *   const words = SF.words(layerEl, [{ text: "My", at: 0.00, end: 0.40 }, ...], { y: 0.706 });
 *   stage.onFrame.push((t) => words.renderAt(t));      // or call words.renderAt(t) yourself
 *
 * Measured on the reference shorts (8 of 8, see RULEBOOK.md): one line centred at 70.6 % of the frame's height; a word
 * SWAPS IN IN ONE FRAME at full size (no pop, no fade) and typically lands one frame before its spoken word; it stays
 * until the next caption replaces it. `at`/`end` are the spoken word's start and end (seconds).
 * Options: y (share of height, default 0.706), fps (30), lead (frames early, default 1), pop (seconds of a scale-in,
 * default 0 = the reference's hard swap; > 0 brings back a 0.8 -> 1 eased scale for other uses).
 * Each word shows from frame round(at * fps) - lead, so it is on screen on a whole frame and never half a frame late.
 * The look (heavy rounded white letters, black outline, hard dark shadow down and right) is in words.css; the font
 * family must also be named in the scene's own <style> or the renderer falls back to another face.
 */
window.SF = window.SF || {};
SF.words = function (layer, list, opt) {
  "use strict";
  opt = opt || {};
  const y = opt.y == null ? 0.706 : opt.y, pop = opt.pop || 0, fps = opt.fps || 30, lead = opt.lead == null ? 1 : opt.lead;
  layer.classList.add("sf-words");
  const els = list.map((w) => { const e = document.createElement("div"); e.className = "sf-word"; e.textContent = w.text; e.style.top = (y * 100).toFixed(2) + "%"; e.style.visibility = "hidden"; layer.appendChild(e); return e; });
  const onF = (w) => Math.max(0, Math.round(w.at * fps) - lead), offF = (w) => Math.max(0, Math.round(w.end * fps) - lead);
  function renderAt(t) {
    const f = Math.round(t * fps + 1e-6);
    list.forEach((w, i) => {
      const e = els[i], on = f >= onF(w) && f < offF(w);
      if (!on) { e.style.visibility = "hidden"; return; }
      e.style.visibility = "visible";
      if (pop > 0) { const k = Math.min(1, (t - onF(w) / fps) / pop), s = 0.8 + 0.2 * (1 - Math.pow(1 - k, 3)); e.style.transform = `translate(-50%, -50%) scale(${s.toFixed(4)})`; }
      else e.style.transform = "translate(-50%, -50%)";
    });
  }
  return { els, renderAt };
};
