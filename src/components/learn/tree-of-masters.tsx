"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Plus, Minus, Maximize2, ChevronLeft } from "lucide-react";
import {
  getTreeGraph,
  computeFrontier,
  suggestedSteps,
  TREE_SECTORS,
  CENTER_ID,
  SPINE_DEPTH,
  R_SPACING,
  XP_PER_POINT,
  type TreeNode,
} from "@/lib/learn/tree-graph";
import { cn } from "@/lib/utils";

const MIN_SCALE = 0.24;
const MAX_SCALE = 2.0;
const PAD = 200;
const GOLD = "#F5C451";
const AMBER = "#E8A33D";

const SECTOR_HUES = ["#F5C451", "#E8A33D", "#D98E4A", "#C24E3A", "#B07C9E", "#9C8AD9"];

function sectorHue(sector: string | null): string {
  const i = TREE_SECTORS.findIndex((s) => s.key === sector);
  return sector ? SECTOR_HUES[i >= 0 ? i % SECTOR_HUES.length : 0] : GOLD;
}

interface MapState {
  activated: Set<string>;
  points: number;
  earnedPoints: number;
  activatedCount: number;
  xp: number;
}

export function TreeOfMasters() {
  const graph = useMemo(() => getTreeGraph(), []);
  const [state, setState] = useState<MapState | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [scale, setScale] = useState(0.95);
  const scrollRef = useRef<HTMLDivElement>(null);
  const firstFocus = useRef(false);

  const bounds = useMemo(() => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const n of graph.nodes) {
      minX = Math.min(minX, n.x); maxX = Math.max(maxX, n.x);
      minY = Math.min(minY, n.y); maxY = Math.max(maxY, n.y);
    }
    return { ox: -minX + PAD, oy: -minY + PAD, width: maxX - minX + PAD * 2, height: maxY - minY + PAD * 2 };
  }, [graph]);

  const edges = useMemo(() => {
    const seen = new Set<string>();
    const out: { a: TreeNode; b: TreeNode }[] = [];
    for (const n of graph.nodes) {
      for (const c of n.connections) {
        const key = n.id < c ? `${n.id}|${c}` : `${c}|${n.id}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const other = graph.byId.get(c);
        if (other) out.push({ a: n, b: other });
      }
    }
    return out;
  }, [graph]);

  const load = async () => {
    try {
      const res = await fetch("/api/learn/tree-map");
      if (res.status === 401) {
        window.location.href = "/auth/login?returnUrl=/learn/tree";
        return;
      }
      const d = await res.json();
      setState({ activated: new Set(d.activated ?? []), points: d.points ?? 0, earnedPoints: d.earnedPoints ?? 0, activatedCount: d.activatedCount ?? 0, xp: d.xp ?? 0 });
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const effective = useMemo(() => {
    const s = new Set(state?.activated ?? []);
    s.add(CENTER_ID);
    return s;
  }, [state]);

  const frontier = useMemo(() => computeFrontier(graph, effective), [graph, effective]);
  const suggested = useMemo(() => suggestedSteps(graph, effective, 4), [graph, effective]);

  const fitScale = () => {
    const el = scrollRef.current;
    if (!el) return;
    const s = Math.min(el.clientWidth / bounds.width, el.clientHeight / bounds.height) * 0.96;
    return Math.max(MIN_SCALE, Math.min(MAX_SCALE, s));
  };

  // Center the scroll view on a content point at a given scale.
  const centerAt = (x: number, y: number, s: number) => {
    const el = scrollRef.current;
    if (!el) return;
    const doScroll = () => {
      el.scrollLeft = (x + bounds.ox) * s - el.clientWidth / 2;
      el.scrollTop = (y + bounds.oy) * s - el.clientHeight / 2;
    };
    requestAnimationFrame(() => requestAnimationFrame(doScroll));
  };

  // Landing view: show the player's own neighborhood (activated path + next steps).
  const focusPlayer = () => {
    const ids = Array.from(effective);
    const pts = ids
      .map((id) => graph.byId.get(id))
      .concat(suggested.map((id) => graph.byId.get(id)))
      .filter((n): n is TreeNode => !!n);
    const cx = pts.reduce((s, n) => s + n.x, 0) / pts.length;
    const cy = pts.reduce((s, n) => s + n.y, 0) / pts.length;
    setScale(1.0);
    centerAt(cx, cy, 1.0);
  };

  const focusSector = (i: number) => {
    const d = Math.min(SPINE_DEPTH, 14);
    const n = graph.byId.get(`${TREE_SECTORS[i].key}:${d}`);
    if (!n) return;
    setScale(0.95);
    centerAt(n.x, n.y, 0.95);
  };

  const fullMap = () => {
    const s = fitScale() ?? 0.3;
    setScale(s);
    centerAt(0, 0, s);
  };

  useEffect(() => {
    if (loading || !state || firstFocus.current) return;
    firstFocus.current = true;
    requestAnimationFrame(() => focusPlayer());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, state]);

  const drag = useRef({ on: false, sx: 0, sy: 0, sl: 0, st: 0 });

  const zoomAt = (factor: number) => {
    const el = scrollRef.current;
    if (!el) return;
    const cx = (el.clientWidth / 2 + el.scrollLeft) / scale;
    const cy = (el.clientHeight / 2 + el.scrollTop) / scale;
    setScale((s) => {
      const ns = Math.max(MIN_SCALE, Math.min(MAX_SCALE, s * factor));
      requestAnimationFrame(() => {
        el.scrollLeft = cx * ns - el.clientWidth / 2;
        el.scrollTop = cy * ns - el.clientHeight / 2;
      });
      return ns;
    });
  };

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2600);
  };

  const activate = async (id: string) => {
    if (busy) return;
    if ((state?.points ?? 0) <= 0) {
      showToast("Out of skill points — finish a mission to earn XP.");
      return;
    }
    setBusy(id);
    try {
      const res = await fetch("/api/learn/tree-map/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ node_id: id }),
      });
      const d = await res.json();
      if (!res.ok) {
        showToast(d.error || "Could not grow here.");
        if (d.code === "NO_POINTS") setState((s) => (s ? { ...s, points: 0 } : s));
        return;
      }
      setState({ activated: new Set(d.activated ?? []), points: d.points ?? 0, earnedPoints: d.earnedPoints ?? 0, activatedCount: d.activatedCount ?? 0, xp: d.xp ?? 0 });
      requestAnimationFrame(() => focusPlayer());
    } catch {
      showToast("Something went wrong.");
    } finally {
      setBusy(null);
    }
  };

  const onNodeClick = (n: TreeNode) => {
    if (n.id === CENTER_ID) {
      showToast("Master Seal — the origin of your path.");
      return;
    }
    if (state?.activated.has(n.id)) {
      showToast(`${n.title} — mastered.`);
      return;
    }
    if (frontier.includes(n.id)) activate(n.id);
    else showToast("Grow from your connected path to reach this node.");
  };

  const nextXp = Math.floor((state?.xp ?? 0) / XP_PER_POINT) * XP_PER_POINT + XP_PER_POINT;
  const xpPct = Math.min(100, Math.round((((state?.xp ?? 0) % XP_PER_POINT) / XP_PER_POINT) * 100));
  const showLabels = scale >= 0.55;

  if (loading || !state) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <p className="text-amber-200/70 animate-pulse">Unrolling the scroll…</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* top bar */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Link href="/learn" className="w-8 h-8 rounded-full bg-black/30 border border-amber-400/30 text-amber-200 flex items-center justify-center shrink-0 hover:bg-black/50 transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </Link>
          <div className="min-w-0">
            <h1 className="text-lg font-extrabold text-amber-100 tracking-wide leading-tight truncate">The Tree of Masters</h1>
            <p className="text-[10px] text-amber-200/60 truncate">Choose your own way. Lit nodes are your path.</p>
          </div>
        </div>
        <div className="shrink-0 flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-500/25 to-amber-300/10 border border-amber-400/40 text-center">
            <p className="text-lg font-extrabold text-amber-300 leading-none">{state.points}</p>
            <p className="text-[8px] font-bold uppercase tracking-wider text-amber-200/70">points</p>
          </div>
          <div className="px-3 py-1.5 rounded-full bg-black/30 border border-amber-400/25 text-center">
            <p className="text-lg font-extrabold text-amber-100 leading-none">{state.activatedCount}</p>
            <p className="text-[8px] font-bold uppercase tracking-wider text-amber-200/60">lit</p>
          </div>
        </div>
      </div>

      {/* categories legend */}
      <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
        {TREE_SECTORS.map((s, i) => (
          <button
            key={s.key}
            onClick={() => focusSector(i)}
            className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border text-[11px] font-bold transition-all squishy"
            style={{ borderColor: `${sectorHue(s.key)}66`, color: sectorHue(s.key), background: `${sectorHue(s.key)}14` }}
          >
            <span className="w-2 h-2 rounded-full" style={{ background: sectorHue(s.key) }} />
            {s.title}
          </button>
        ))}
      </div>

      {/* earn XP banner */}
      {state.points <= 0 && (
        <div className="rounded-2xl border border-amber-400/40 bg-gradient-to-r from-amber-500/15 to-amber-300/5 p-3 flex items-center justify-between gap-3">
          <p className="text-xs text-amber-100/90 font-semibold">
            Out of skill points.<br className="sm:hidden" />
            <span className="text-amber-200/60 font-normal"> Finish a mission to earn more.</span>
          </p>
          <Link href="/learn" className="shrink-0 px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 text-amber-950 text-xs font-extrabold hover:brightness-110 transition-all">
            Earn XP →
          </Link>
        </div>
      )}

      {/* next steps */}
      {suggested.length > 0 && (
        <div className="rounded-2xl border border-amber-400/25 bg-black/25 p-2.5">
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-amber-200/60 mb-1.5 px-1">Suggested next steps</p>
          <div className="flex gap-1.5 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
            {suggested.map((id, i) => {
              const n = graph.byId.get(id)!;
              return (
                <button
                  key={id}
                  onClick={() => activate(id)}
                  disabled={busy !== null}
                  className="shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl border transition-all squishy"
                  style={{ borderColor: `${AMBER}55`, background: "rgba(232,163,61,0.12)" }}
                >
                  <span className="w-5 h-5 rounded-full bg-amber-300 text-amber-950 text-[10px] font-extrabold flex items-center justify-center">{i + 1}</span>
                  <span className="text-[11px] font-bold text-amber-100 max-w-[140px] truncate">{n.title || "Connector"}</span>
                  <span className="text-amber-300 font-extrabold">+</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* canvas */}
      <div
        className="relative rounded-3xl overflow-hidden border border-amber-500/25 h-[62vh] lg:h-[68vh] touch-pan-x touch-pan-y select-none"
        style={{ background: "radial-gradient(circle at 50% 50%, #3a2540 0%, #241531 55%, #160d20 100%)" }}
      >
        <div
          ref={scrollRef}
          className="absolute inset-0 overflow-auto cursor-grab active:cursor-grabbing"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          onPointerDown={(e) => {
            if (e.pointerType !== "mouse") return;
            const el = scrollRef.current;
            if (!el) return;
            drag.current = { on: true, sx: e.clientX, sy: e.clientY, sl: el.scrollLeft, st: el.scrollTop };
            el.setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            if (!drag.current.on || e.pointerType !== "mouse") return;
            const el = scrollRef.current;
            if (!el) return;
            el.scrollLeft = drag.current.sl - (e.clientX - drag.current.sx);
            el.scrollTop = drag.current.st - (e.clientY - drag.current.sy);
          }}
          onPointerUp={(e) => {
            drag.current.on = false;
            if (e.pointerType === "mouse") scrollRef.current?.releasePointerCapture(e.pointerId);
          }}
          onPointerCancel={() => (drag.current.on = false)}
        >
          <div className="relative" style={{ width: bounds.width * scale, height: bounds.height * scale }}>
            <div className="relative" style={{ width: bounds.width, height: bounds.height, transform: `scale(${scale})`, transformOrigin: "top left" }}>
              <svg className="absolute inset-0 pointer-events-none" width={bounds.width} height={bounds.height}>
                {[0.3, 0.55, 0.8, 1].map((f) => (
                  <circle key={f} cx={bounds.width / 2} cy={bounds.height / 2} r={SPINE_DEPTH * R_SPACING * f} fill="none" stroke="rgba(245,196,81,0.06)" strokeWidth={1.5} />
                ))}
                {TREE_SECTORS.map((s, i) => {
                  const a = ((i * 60) - 90) * (Math.PI / 180);
                  const R = SPINE_DEPTH * R_SPACING + 30;
                  return <line key={s.key} x1={bounds.width / 2} y1={bounds.height / 2} x2={bounds.width / 2 + Math.cos(a) * R} y2={bounds.height / 2 + Math.sin(a) * R} stroke="rgba(245,196,81,0.05)" strokeWidth={1} />;
                })}
                {edges.map(({ a, b }) => {
                  const es = edgeStroke(a, b, effective, suggested);
                  return (
                    <line
                      key={`${a.id}|${b.id}`}
                      x1={a.x + bounds.ox}
                      y1={a.y + bounds.oy}
                      x2={b.x + bounds.ox}
                      y2={b.y + bounds.oy}
                      stroke={es.stroke}
                      strokeWidth={es.width}
                      strokeLinecap="round"
                    />
                  );
                })}
              </svg>

              {TREE_SECTORS.map((s, i) => {
                const a = ((i * 60) - 90) * (Math.PI / 180);
                const R = SPINE_DEPTH * R_SPACING + 78;
                return (
                  <span
                    key={s.key}
                    className="absolute px-2 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-widest whitespace-nowrap pointer-events-none border"
                    style={{ left: bounds.width / 2 + Math.cos(a) * R + bounds.ox, top: bounds.height / 2 + Math.sin(a) * R + bounds.oy, transform: "translate(-50%,-50%)", color: sectorHue(s.key), borderColor: `${sectorHue(s.key)}55`, background: `${sectorHue(s.key)}12` }}
                  >
                    {s.title}
                  </span>
                );
              })}

              {graph.nodes.map((n) => (
                <MasterNode
                  key={n.id}
                  node={n}
                  ox={bounds.ox}
                  oy={bounds.oy}
                  activated={effective.has(n.id)}
                  step={suggested.includes(n.id) ? suggested.indexOf(n.id) + 1 : undefined}
                  available={frontier.includes(n.id)}
                  showLabels={showLabels}
                  busy={busy === n.id}
                  onClick={() => onNodeClick(n)}
                />
              ))}
            </div>
          </div>
        </div>

        {/* controls */}
        <div className="absolute bottom-4 right-3 flex flex-col gap-2">
          {[
            { icon: <Plus className="w-5 h-5" />, fn: () => zoomAt(1.25) },
            { icon: <Minus className="w-5 h-5" />, fn: () => zoomAt(0.8) },
            { icon: <Maximize2 className="w-5 h-5" />, fn: fullMap },
            { icon: <span className="text-[10px] font-extrabold">ME</span>, fn: focusPlayer },
          ].map((b, i) => (
            <button key={i} onClick={b.fn} title={i === 3 ? "Back to my path" : undefined} className="w-9 h-9 rounded-full bg-black/45 border border-amber-400/40 text-amber-200 backdrop-blur flex items-center justify-center hover:bg-black/60 transition-colors">
              {b.icon}
            </button>
          ))}
        </div>

        {toast && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-2xl bg-black/75 border border-amber-400/30 text-amber-100 text-sm font-semibold backdrop-blur animate-fade-in">
            {toast}
          </div>
        )}
      </div>

      {/* xp → next point */}
      <div className="rounded-2xl border border-amber-400/20 bg-black/25 p-3">
        <div className="flex items-center justify-between text-[11px] text-amber-200/70 mb-1">
          <span>Next skill point</span>
          <span>{state.xp % XP_PER_POINT}/{XP_PER_POINT} XP</span>
        </div>
        <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-300 transition-all" style={{ width: `${xpPct}%` }} />
        </div>
      </div>
    </div>
  );
}

function edgeStroke(a: TreeNode, b: TreeNode, effective: Set<string>, suggested: string[]): { stroke: string; width: number } {
  const aOn = effective.has(a.id);
  const bOn = effective.has(b.id);
  const aSug = suggested.includes(a.id);
  const bSug = suggested.includes(b.id);
  if (aOn && bOn) return { stroke: GOLD, width: 2.4 };
  if ((aOn && bSug) || (bOn && aSug)) return { stroke: AMBER, width: 2.4 };
  if (aOn || bOn) {
    const hue = sectorHue(aOn ? a.sector : b.sector);
    return { stroke: `${hue}66`, width: 1.6 };
  }
  if (a.sector && a.sector === b.sector) return { stroke: `${sectorHue(a.sector)}26`, width: 1.3 };
  return { stroke: "rgba(120,90,150,0.14)", width: 1.2 };
}

function MasterNode({
  node,
  ox,
  oy,
  activated,
  step,
  available,
  showLabels,
  busy,
  onClick,
}: {
  node: TreeNode;
  ox: number;
  oy: number;
  activated: boolean;
  step?: number;
  available: boolean;
  showLabels: boolean;
  busy: boolean;
  onClick: () => void;
}) {
  const isCenter = node.kind === "center";
  const suggested = step !== undefined;
  const r = isCenter ? 24 : node.kind === "skill" ? 13 : node.kind === "bridge" ? 6 : 9;

  let bg = "rgba(46,30,58,0.9)";
  let border = node.sector ? `${sectorHue(node.sector)}40` : "rgba(120,90,150,0.4)";
  let glow = "none";
  if (activated) {
    bg = isCenter ? "radial-gradient(circle at 35% 30%, #FFF3C4, #F5C451 60%, #C98A22)" : "#F5C451";
    border = "#FFE9A8";
    glow = `0 0 ${isCenter ? 26 : 14}px rgba(245,196,81,0.7)`;
  } else if (suggested) {
    bg = "radial-gradient(circle at 35% 30%, #FFE9A8, #E8A33D)";
    border = "#FFF3C4";
    glow = "0 0 16px rgba(232,163,61,0.85)";
  } else if (available) {
    bg = "rgba(232,163,61,0.3)";
    border = "rgba(245,196,81,0.6)";
  }

  const label = node.kind === "bridge" ? null : node.title;
  const showLabel = !!label && showLabels && (activated || suggested || isCenter || node.kind === "skill");

  return (
    <div className="absolute" style={{ left: node.x + ox, top: node.y + oy, transform: "translate(-50%,-50%)" }}>
      <button
        onClick={onClick}
        disabled={busy}
        title={label || undefined}
        className={cn("rounded-full border-2 transition-all", (suggested || available) && "cursor-pointer hover:scale-110", busy && "animate-pulse")}
        style={{ width: r * 2, height: r * 2, background: bg, borderColor: border, boxShadow: glow }}
      >
        {isCenter && <span className="text-[10px] font-extrabold text-amber-900/80">道</span>}
      </button>
      {step !== undefined && (
        <span className="absolute left-1/2 -translate-x-1/2 -top-3 w-5 h-5 rounded-full bg-amber-300 text-amber-950 text-[10px] font-extrabold flex items-center justify-center border border-amber-100 shadow">
          {step}
        </span>
      )}
      {showLabel && (
        <span
          className="absolute left-1/2 -translate-x-1/2 top-full mt-1 px-1.5 py-0.5 rounded-md text-[10px] leading-tight text-center whitespace-nowrap font-bold"
          style={{ background: "rgba(0,0,0,0.55)", color: activated ? "#FFE9A8" : suggested ? "#F5C451" : "rgba(245,196,81,0.55)" }}
        >
          {label}
        </span>
      )}
    </div>
  );
}