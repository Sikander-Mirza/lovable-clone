// "lovable-ui": a small, dependable kit of motion and interaction pieces that generated sites import,
// so they feel alive instead of like a static brochure. Models write scroll animations, carousels and
// lightboxes by hand all the time and get them subtly wrong, so these are written once and tested.
//
// The source is plain JavaScript (no JSX, no extra packages): the preview loads it as a module through
// the import map, and the exported project gets it as src/lovable-ui.js (see lib/exportProject.ts).
// Everything respects prefers-reduced-motion. Tailwind classes used inside are picked up by the Play CDN
// in the preview and by the "src/**/*.js" content glob in the export.

/** Every name the kit exports, used by the validator to catch typos in generated imports. */
export const UI_KIT_EXPORTS = [
  "Reveal",
  "Stagger",
  "Counter",
  "Marquee",
  "Parallax",
  "Tilt",
  "Carousel",
  "Accordion",
  "Lightbox",
  "Typewriter",
  "ScrollProgress",
  "useInView",
  "useScrolled",
] as const;

export const UI_KIT_SOURCE = String.raw`import React from "react";
var h = React.createElement;
var useState = React.useState, useEffect = React.useEffect, useRef = React.useRef, useCallback = React.useCallback;

function reduced() {
  return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}

var cssDone = false;
function css() {
  if (cssDone || typeof document === "undefined") return;
  cssDone = true;
  var s = document.createElement("style");
  s.setAttribute("data-lovable-ui", "");
  s.textContent =
    "@keyframes lui-marquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}" +
    ".lui-marquee{display:flex;width:max-content;animation:lui-marquee var(--lui-speed,30s) linear infinite}" +
    ".lui-marquee-wrap:hover .lui-marquee{animation-play-state:paused}" +
    "@keyframes lui-blink{50%{opacity:0}}" +
    ".lui-caret{display:inline-block;width:.09em;height:1em;margin-left:.06em;vertical-align:-.12em;background:currentColor;animation:lui-blink 1s steps(1) infinite}" +
    ".lui-scroll{scrollbar-width:none}.lui-scroll::-webkit-scrollbar{display:none}" +
    "@media (prefers-reduced-motion: reduce){.lui-marquee{animation:none}.lui-caret{animation:none}}";
  document.head.appendChild(s);
}

/* The builder asks every animated piece to jump to its final state before it takes a screenshot. */
var REVEAL_ALL = "lovable-ui:reveal-all";
function onRevealAll(fn) {
  if (typeof addEventListener !== "function") return function () {};
  addEventListener(REVEAL_ALL, fn);
  return function () { removeEventListener(REVEAL_ALL, fn); };
}

/** [ref, seen]: seen turns true once the element has scrolled into view (and stays true unless once:false). */
export function useInView(opts) {
  var o = opts || {};
  var ref = useRef(null);
  var st = useState(false), seen = st[0], setSeen = st[1];
  useEffect(function () {
    var el = ref.current;
    var off = onRevealAll(function () { setSeen(true); });
    if (!el) return off;
    if (typeof IntersectionObserver === "undefined" || reduced()) { setSeen(true); return off; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { setSeen(true); if (o.once !== false) io.disconnect(); }
        else if (o.once === false) setSeen(false);
      });
    }, { rootMargin: o.margin || "0px 0px -8% 0px", threshold: o.threshold || 0.05 });
    io.observe(el);
    return function () { io.disconnect(); off(); };
  }, []);
  return [ref, seen];
}

/** true once the page has scrolled more than "threshold" pixels (default 24): for a navbar that changes on scroll. */
export function useScrolled(threshold) {
  var t = threshold == null ? 24 : threshold;
  var st = useState(false), s = st[0], set = st[1];
  useEffect(function () {
    function on() { set(window.scrollY > t); }
    on();
    addEventListener("scroll", on, { passive: true });
    return function () { removeEventListener("scroll", on); };
  }, [t]);
  return s;
}

/** Fades and slides its children in when they scroll into view. from: up (default), down, left, right, zoom, none. */
export function Reveal(props) {
  var iv = useInView({ margin: props.margin });
  var ref = iv[0], seen = iv[1];
  var d = props.distance == null ? 28 : props.distance;
  var from = props.from || "up";
  var hidden = {
    up: "translate3d(0," + d + "px,0)", down: "translate3d(0," + (-d) + "px,0)",
    left: "translate3d(" + d + "px,0,0)", right: "translate3d(" + (-d) + "px,0,0)",
    zoom: "scale(.94)", none: "none"
  }[from] || "none";
  var dur = props.duration || 700, delay = props.delay || 0;
  var ease = "cubic-bezier(.22,1,.36,1)";
  var style = Object.assign({
    opacity: seen ? 1 : 0,
    transform: seen ? "none" : hidden,
    transition: "opacity " + dur + "ms " + ease + " " + delay + "ms, transform " + dur + "ms " + ease + " " + delay + "ms"
  }, props.style);
  return h(props.as || "div", { ref: ref, className: props.className, style: style }, props.children);
}

/** Reveals each child one after the other (step in ms, default 90). itemClassName styles each wrapper. */
export function Stagger(props) {
  var kids = React.Children.toArray(props.children);
  return h(props.as || "div", { className: props.className, style: props.style },
    kids.map(function (k, i) {
      return h(Reveal, { key: i, delay: i * (props.step || 90), from: props.from, className: props.itemClassName }, k);
    }));
}

/** Counts up to "to" when it scrolls into view: <Counter to={1200} suffix="+" />. */
export function Counter(props) {
  var iv = useInView();
  var ref = iv[0], seen = iv[1];
  var to = Number(props.to) || 0;
  var st = useState(0), n = st[0], setN = st[1];
  useEffect(function () {
    var off = onRevealAll(function () { setN(to); });
    if (!seen) return off;
    if (reduced()) { setN(to); return off; }
    var dur = props.duration || 1600, raf = 0, t0 = 0;
    function step(t) {
      if (!t0) t0 = t;
      var p = Math.min(1, (t - t0) / dur);
      setN(to * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(step);
    }
    raf = requestAnimationFrame(step);
    return function () { cancelAnimationFrame(raf); off(); };
  }, [seen, to]);
  var dec = props.decimals || 0;
  var text = Number(n.toFixed(dec)).toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec });
  return h("span", { ref: ref, className: props.className }, (props.prefix || "") + text + (props.suffix || ""));
}

/** An endless strip that scrolls sideways (logos, quotes, tags). speed = seconds per loop, gap in px. */
export function Marquee(props) {
  css();
  var kids = React.Children.toArray(props.children);
  var gap = props.gap == null ? 48 : props.gap;
  function row(key) {
    return h("div", { key: key, "aria-hidden": key === "b" ? "true" : undefined,
      style: { display: "flex", alignItems: "center", gap: gap, paddingRight: gap, flexShrink: 0 } }, kids);
  }
  var mask = "linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent)";
  return h("div", { className: "lui-marquee-wrap " + (props.className || ""),
    style: { overflow: "hidden", WebkitMaskImage: mask, maskImage: mask } },
    h("div", { className: "lui-marquee",
      style: { "--lui-speed": (props.speed || 30) + "s", animationDirection: props.reverse ? "reverse" : "normal" } },
      row("a"), row("b")));
}

/** Moves its children a little slower or faster than the scroll (speed -0.3 to 0.3, default 0.15). Wrap an image in overflow-hidden. */
export function Parallax(props) {
  var ref = useRef(null);
  useEffect(function () {
    var el = ref.current;
    if (!el || reduced()) return;
    var raf = 0, k = props.speed == null ? 0.15 : props.speed;
    function update() {
      raf = 0;
      var r = el.getBoundingClientRect(), vh = window.innerHeight || 800;
      var p = (r.top + r.height / 2 - vh / 2) / vh;
      el.style.transform = "translate3d(0," + (-p * k * 100).toFixed(1) + "px,0)";
    }
    function on() { if (!raf) raf = requestAnimationFrame(update); }
    addEventListener("scroll", on, { passive: true });
    addEventListener("resize", on);
    update();
    return function () { removeEventListener("scroll", on); removeEventListener("resize", on); cancelAnimationFrame(raf); };
  }, []);
  return h(props.as || "div", { ref: ref, className: props.className, style: Object.assign({ willChange: "transform" }, props.style) }, props.children);
}

/** A card that tilts towards the pointer (max degrees, default 8). */
export function Tilt(props) {
  var ref = useRef(null);
  var max = props.max == null ? 8 : props.max;
  function move(e) {
    if (reduced() || !ref.current) return;
    var r = ref.current.getBoundingClientRect();
    var x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
    ref.current.style.transform = "perspective(900px) rotateX(" + (-y * max).toFixed(2) + "deg) rotateY(" + (x * max).toFixed(2) + "deg)";
  }
  function leave() { if (ref.current) ref.current.style.transform = ""; }
  return h(props.as || "div", { ref: ref, className: props.className, onMouseMove: move, onMouseLeave: leave,
    style: Object.assign({ transition: "transform .25s ease-out", willChange: "transform" }, props.style) }, props.children);
}

/** A thin bar at the top that fills as the page scrolls. className colors the bar (default bg-brand-600). */
export function ScrollProgress(props) {
  var st = useState(0), p = st[0], set = st[1];
  useEffect(function () {
    function on() {
      var d = document.documentElement, max = d.scrollHeight - window.innerHeight;
      set(max > 0 ? window.scrollY / max : 0);
    }
    on();
    addEventListener("scroll", on, { passive: true });
    addEventListener("resize", on);
    return function () { removeEventListener("scroll", on); removeEventListener("resize", on); };
  }, []);
  return h("div", { "aria-hidden": "true", style: { position: "fixed", top: 0, left: 0, right: 0, height: props.height || 3, zIndex: 60, pointerEvents: "none" } },
    h("div", { className: props.className || "bg-brand-600", style: { height: "100%", width: (p * 100).toFixed(2) + "%" } }));
}

/** Types words[] one after the other: <Typewriter words={["design", "build", "ship"]} />. */
export function Typewriter(props) {
  css();
  var words = props.words || [];
  var st = useState(reduced() ? (words[0] || "") : ""), txt = st[0], setTxt = st[1];
  useEffect(function () {
    if (!words.length || reduced()) return;
    var del = false, n = 0, w = 0, id = 0;
    function tick() {
      var word = words[w % words.length], wait = del ? 40 : 80;
      n += del ? -1 : 1;
      setTxt(word.slice(0, n));
      if (!del && n >= word.length) { del = true; wait = props.hold || 1400; }
      else if (del && n <= 0) { del = false; w++; wait = 300; }
      id = setTimeout(tick, wait);
    }
    id = setTimeout(tick, 400);
    return function () { clearTimeout(id); };
  }, [words.join("|")]);
  return h("span", { className: props.className }, txt, h("span", { className: "lui-caret", "aria-hidden": "true" }));
}

/** A horizontal scroller with snapping, arrows and dots. itemWidth is any CSS width (default min(85%,340px)). */
export function Carousel(props) {
  css();
  var ref = useRef(null);
  var kids = React.Children.toArray(props.children);
  var gap = props.gap == null ? 16 : props.gap;
  var s1 = useState(0), idx = s1[0], setIdx = s1[1];
  var s2 = useState({ start: true, end: false }), edge = s2[0], setEdge = s2[1];
  function stepSize() {
    var el = ref.current, first = el && el.children[0];
    return first ? first.getBoundingClientRect().width + gap : (el ? el.clientWidth : 300);
  }
  var update = useCallback(function () {
    var el = ref.current;
    if (!el) return;
    setEdge({ start: el.scrollLeft < 4, end: el.scrollLeft >= el.scrollWidth - el.clientWidth - 4 });
    setIdx(Math.round(el.scrollLeft / stepSize()));
  }, [gap]);
  useEffect(function () {
    var el = ref.current;
    if (!el) return;
    update();
    el.addEventListener("scroll", update, { passive: true });
    addEventListener("resize", update);
    return function () { el.removeEventListener("scroll", update); removeEventListener("resize", update); };
  }, [kids.length, update]);
  function go(dir) {
    if (ref.current) ref.current.scrollBy({ left: dir * stepSize(), behavior: reduced() ? "auto" : "smooth" });
  }
  function jump(i) {
    if (ref.current) ref.current.scrollTo({ left: i * stepSize(), behavior: reduced() ? "auto" : "smooth" });
  }
  function arrow(dir, label, disabled) {
    return h("button", { type: "button", "aria-label": label, disabled: disabled, onClick: function () { go(dir); },
      className: props.buttonClassName,
      style: Object.assign({ position: "absolute", top: "50%", [dir < 0 ? "left" : "right"]: 8, transform: "translateY(-50%)", zIndex: 2,
        width: 40, height: 40, borderRadius: 999, border: "1px solid rgba(0,0,0,.08)", background: "rgba(255,255,255,.95)", color: "#111",
        boxShadow: "0 4px 16px rgba(0,0,0,.15)", cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.35 : 1, transition: "opacity .2s",
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, lineHeight: 1 }, props.buttonStyle) },
      dir < 0 ? "‹" : "›");
  }
  return h("div", { className: props.className, style: { position: "relative" } },
    arrow(-1, "Previous", edge.start),
    h("div", { ref: ref, className: "lui-scroll", style: { display: "flex", gap: gap, overflowX: "auto", scrollSnapType: "x mandatory", scrollBehavior: "smooth", padding: "4px 2px" } },
      kids.map(function (k, i) {
        return h("div", { key: i, style: { flex: "0 0 auto", width: props.itemWidth || "min(85%,340px)", scrollSnapAlign: "start" } }, k);
      })),
    arrow(1, "Next", edge.end),
    props.dots === false ? null : h("div", { style: { display: "flex", justifyContent: "center", gap: 8, marginTop: 14 } },
      kids.map(function (k, i) {
        return h("button", { key: i, type: "button", "aria-label": "Go to slide " + (i + 1), onClick: function () { jump(i); },
          style: { width: i === idx ? 22 : 8, height: 8, borderRadius: 999, border: 0, padding: 0, cursor: "pointer",
            background: "currentColor", opacity: i === idx ? 0.8 : 0.25, transition: "all .25s" } });
      })));
}

/** FAQ-style list: <Accordion items={[{ q: "Question", a: "Answer" }]} />. One open at a time, smooth height. */
export function Accordion(props) {
  var items = props.items || [];
  var st = useState(props.defaultOpen == null ? 0 : props.defaultOpen), open = st[0], setOpen = st[1];
  return h("div", { className: props.className },
    items.map(function (it, i) {
      var on = open === i;
      return h("div", { key: i, className: props.itemClassName || "border-b border-gray-200" },
        h("button", { type: "button", "aria-expanded": on, onClick: function () { setOpen(on ? -1 : i); },
          className: "flex w-full items-center justify-between gap-4 py-5 text-left font-medium" },
          h("span", null, it.q),
          h("span", { "aria-hidden": "true", style: { transition: "transform .3s", transform: on ? "rotate(45deg)" : "none", fontSize: "1.5em", lineHeight: 1 } }, "+")),
        h("div", { style: { display: "grid", gridTemplateRows: on ? "1fr" : "0fr", transition: "grid-template-rows .35s ease" } },
          h("div", { style: { overflow: "hidden" } }, h("div", { className: "pb-5 opacity-80" }, it.a))));
    }));
}

/** Full-screen image viewer: <Lightbox images={[{ src, alt, caption }]} index={i} onClose={...} onChange={setI} /> (index null = closed). */
export function Lightbox(props) {
  var imgs = props.images || [], i = props.index;
  useEffect(function () {
    if (i == null) return;
    function on(e) {
      if (e.key === "Escape" && props.onClose) props.onClose();
      if (e.key === "ArrowRight" && props.onChange) props.onChange((i + 1) % imgs.length);
      if (e.key === "ArrowLeft" && props.onChange) props.onChange((i - 1 + imgs.length) % imgs.length);
    }
    var prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    addEventListener("keydown", on);
    return function () { removeEventListener("keydown", on); document.body.style.overflow = prev; };
  }, [i, imgs.length]);
  if (i == null || !imgs[i]) return null;
  var im = imgs[i];
  function btn(label, text, pos, fn) {
    return h("button", { type: "button", "aria-label": label, onClick: function (e) { e.stopPropagation(); fn(); },
      style: Object.assign({ position: "absolute", width: 44, height: 44, borderRadius: 999, border: 0, cursor: "pointer",
        background: "rgba(255,255,255,.14)", color: "#fff", fontSize: 24, lineHeight: 1 }, pos) }, text);
  }
  return h("div", { role: "dialog", "aria-modal": "true", "aria-label": im.alt || "Image viewer", onClick: props.onClose,
    style: { position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,.9)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 } },
    h("img", { src: im.src, alt: im.alt || "", onClick: function (e) { e.stopPropagation(); },
      style: { maxWidth: "100%", maxHeight: "80vh", borderRadius: 8, boxShadow: "0 24px 80px rgba(0,0,0,.6)" } }),
    im.caption ? h("p", { style: { color: "#fff", marginTop: 14, fontSize: 14, opacity: 0.85 } }, im.caption) : null,
    btn("Close", "×", { top: 16, right: 16 }, function () { if (props.onClose) props.onClose(); }),
    imgs.length > 1 ? btn("Previous image", "‹", { left: 16, top: "50%" }, function () { if (props.onChange) props.onChange((i - 1 + imgs.length) % imgs.length); }) : null,
    imgs.length > 1 ? btn("Next image", "›", { right: 16, top: "50%" }, function () { if (props.onChange) props.onChange((i + 1) % imgs.length); }) : null);
}

export default { Reveal: Reveal, Stagger: Stagger, Counter: Counter, Marquee: Marquee, Parallax: Parallax, Tilt: Tilt, Carousel: Carousel, Accordion: Accordion, Lightbox: Lightbox, Typewriter: Typewriter, ScrollProgress: ScrollProgress, useInView: useInView, useScrolled: useScrolled };
`;
