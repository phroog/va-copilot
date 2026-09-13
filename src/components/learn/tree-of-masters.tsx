"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Minus, Maximize2 } from "lucide-react";
import {
  getTreeGraph,
  computeFrontier,
  suggestedSteps,
  TREE_SECTORS,
  CENTER_ID,
  SPINE_DEPTH,
  R_SPACING,
  type TreeNode,
} from "@/lib/learn/tree-graph";
import { cn } from "@/lib/utils";

const MIN_SCALE = 0.28;
const MAX_SCALE = 2.0;
const PAD = 180;

// Temple / kungfu palette
const GOLD = "#F5C451";
const GOLD_SOFT = "#E8C06A";
const AMBER = "#E8A33D";
const EMBER = "#C24E3A";
const PLUM_DIM = "#4A3560";

interface MapState {
  activated: Set<string>;
  points: number;
  earnedPoints: number;
  activatedCount: number;
  xp: number;
}

function sectorColor(sectorKey: string | null): string {
  const idx = TREE_SECTORS.findIndex((s) => s.key === sectorKey);
  const hues = ["#F5C451", "#E8A33D", "#D98E4A", "#C24E3A", "#B07C9E", "#9C8AD9"];
  return sectorKey ? hues[idx >= 0 ? idx % hues.length : 0] : GOLD;
}

export function TreeOfMasters() {
  const graph = useMemo(() => getTreeGraph(), []);
  const [state, setState] = useState<MapState | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.42);

  const bounds = useMemo(() => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const n of graph.nodes) {
      minX = Math.min(minX, n.x); maxX = Math.max(maxX, n.x);
      minY = Math.min(minY, n.y); maxY = Math.max(maxY, n.y);
    }
    const ox = -minX + PAD;
    const oy = -minY + PAD;
    return { ox, oy, width: maxX - minX + PAD * 2, height: maxY - minY + PAD * 2 };
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    const s = Math.min(el.clientWidth / bounds.width, el.clientHeight / bounds.height) * 0.94;
    return Math.max(MIN_SCALE, Math.min(MAX_SCALE, s));
  };

  const centerView = () => {
    const el = scrollRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2;
      el.scrollTop = (el.scrollHeight - el.clientHeight) / 2;
    });
  };

  useEffect(() => {
    if (loading) return;
    const s = fitScale();
    if (s) setScale(s);
    centerView();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, bounds]);

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
      showToast("No skill points left — finish a lesson to earn XP.");
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
    } catch {
      showToast("Something went wrong.");
    } finally {
      setBusy(null);
    }
  };

  const onNodeClick = (n: TreeNode) => {
    if (n.id === CENTER_ID) return;
    if (state?.activated.has(n.id)) {
      showToast(`${n.title} — mastered.`);
      return;
    }
    if (frontier.includes(n.id)) {
      activate(n.id);
    } else {
      showToast("Grow from your connected path to reach this node.");
    }
  };

  const cx = bounds.width / 2;
  const cy = bounds.height / 2;

  if (loading || !state) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <p className="text-amber-200/70 animate-pulse">Unrolling the scroll…</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* HUD */}
      <div className="flex items-center justify-between gap-2 mb-2 px-1">
        <div>
          <h1 className="text-xl font-extrabold text-amber-100 tracking-wide">The Tree of Masters</h1>
          <p className="text-[11px] text-amber-200/60">Choose your own path. Every node you light is a step you took.</p>
        </div>
        <div className="text-right shrink-0">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-500/20 to-amber-300/10 border border-amber-400/40">
            <span className="text-amber-300 font-extrabold text-lg leading-none">{state.points}</span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-200/80">skill<br />points</span>
          </div>
          <p className="text-[10px] text-amber-200/50 mt-1">{state.activatedCount} nodes lit · {state.xp} XP</p>
        </div>
      </div>

      {/* Canvas */}
      <div className="relative rounded-3xl overflow-hidden border border-amber-500/25 h-[72vh] touch-pan-x touch-pan-y select-none"
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
                {/* mandala rings */}
                {[0.33, 0.55, 0.78, 1.0].map((f) => (
                  <circle key={f} cx={cx} cy={cy} r={SPINE_DEPTH * R_SPACING * f} fill="none" stroke="rgba(245,196,81,0.07)" strokeWidth={1.5} />
                ))}
                {/* sector guide lines */}
                {TREE_SECTORS.map((s, i) => {
                  const a = ((i * 60) - 90) * (Math.PI / 180);
                  const R = SPINE_DEPTH * R_SPACING + 40;
                  return <line key={s.key} x1={cx} y1={cy} x2={cx + Math.cos(a) * R} y2={cy + Math.sin(a) * R} stroke="rgba(245,196,81,0.05)" strokeWidth={1} />;
                })}
                {/* threads */}
                {edges.map(({ a, b }) => {
                  const aOn = effective.has(a.id);
                  const bOn = effective.has(b.id);
                  const both = aOn && bOn;
                  const one = aOn || bOn;
                  return (
                    <line
                      key={`${a.id}|${b.id}`}
                      x1={a.x + bounds.ox}
                      y1={a.y + bounds.oy}
                      x2={b.x + bounds.ox}
                      y2={b.y + bounds.oy}
                      stroke={both ? GOLD : one ? "rgba(232,163,61,0.35)" : "rgba(120,90,150,0.16)"}
                      strokeWidth={both ? 2.2 : 1.2}
                      strokeLinecap="round"
                    />
                  );
                })}
              </svg>

              {/* sector labels */}
              {TREE_SECTORS.map((s, i) => {
                const a = ((i * 60) - 90) * (Math.PI / 180);
                const R = SPINE_DEPTH * R_SPACING + 90;
                return (
                  <span
                    key={s.key}
                    className="absolute text-[13px] font-extrabold uppercase tracking-widest whitespace-nowrap pointer-events-none"
                    style={{ left: cx + Math.cos(a) * R + bounds.ox, top: cy + Math.sin(a) * R + bounds.oy, transform: "translate(-50%,-50%)", color: sectorColor(s.key), opacity: 0.55 }}
                  >
                    {s.title}
                  </span>
                );
              })}

              {/* nodes */}
              {graph.nodes.map((n) => (
                <MasterNode
                  key={n.id}
                  node={n}
                  ox={bounds.ox}
                  oy={bounds.oy}
                  activated={effective.has(n.id)}
                  step={suggested.includes(n.id) ? suggested.indexOf(n.id) + 1 : undefined}
                  available={frontier.includes(n.id)}
                  busy={busy === n.id}
                  onClick={() => onNodeClick(n)}
                />
              ))}
            </div>
          </div>
        </div>

        {/* zoom controls */}
        <div className="absolute bottom-4 right-4 flex flex-col gap-2">
          {[
            { icon: <Plus className="w-5 h-5" />, fn: () => zoomAt(1.25) },
            { icon: <Minus className="w-5 h-5" />, fn: () => zoomAt(0.8) },
            { icon: <Maximize2 className="w-5 h-5" />, fn: () => { setScale(fitScale() ?? 0.42); centerView(); } },
          ].map((b, i) => (
            <button key={i} onClick={b.fn} className="w-10 h-10 rounded-full bg-black/40 border border-amber-400/40 text-amber-200 backdrop-blur flex items-center justify-center hover:bg-black/60 transition-colors">
              {b.icon}
            </button>
          ))}
        </div>

        {/* hint */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/40 border border-amber-400/25 text-[11px] font-bold text-amber-100/80 backdrop-blur-sm whitespace-nowrap">
          {suggested.length > 0 ? "Glowing nodes are your next steps — tap to grow" : "Master Seal is yours"}
        </div>

        {toast && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-2xl bg-black/70 border border-amber-400/30 text-amber-100 text-sm font-semibold backdrop-blur animate-fade-in">
            {toast}
          </div>
        )}
      </div>

      <p className="text-center text-[11px] text-amber-200/50 mt-2">
        Skill points come from XP — finish missions in <span className="font-bold text-amber-200/80">Learn</span> to keep growing.
      </p>
    </div>
  );
}

function MasterNode({
  node,
  ox,
  oy,
  activated,
  step,
  available,
  busy,
  onClick,
}: {
  node: TreeNode;
  ox: number;
  oy: number;
  activated: boolean;
  step?: number;
  available: boolean;
  busy: boolean;
  onClick: () => void;
}) {
  const isCenter = node.kind === "center";
  const r = isCenter ? 26 : node.kind === "skill" ? 14 : node.kind === "bridge" ? 7 : 10;
  const suggested = step !== undefined;

  let bg = "rgba(46,30,58,0.9)";
  let border = "rgba(120,90,150,0.4)";
  let glow = "none";
  if (activated) {
    bg = isCenter ? "radial-gradient(circle at 35% 30%, #FFF3C4, #F5C451 60%, #C98A22)" : sectorColor(node.sector);
    border = "#FFE9A8";
    glow = `0 0 ${isCenter ? 30 : 16}px rgba(245,196,81,0.75)`;
  } else if (suggested) {
    bg = "radial-gradient(circle at 35% 30%, #FFE9A8, #E8A33D)";
    border = "#FFF3C4";
    glow = "0 0 18px rgba(232,163,61,0.85)";
  } else if (available) {
    bg = "rgba(232,163,61,0.35)";
    border = "rgba(245,196,81,0.7)";
  }

  const label = node.kind === "bridge" ? null : node.title;
  const showLabel = label && (activated || suggested || isCenter || node.kind === "skill");

  return (
    <div
      className="absolute"
      style={{ left: node.x + ox, top: node.y + oy, transform: "translate(-50%,-50%)" }}
    >
      <button
        onClick={onClick}
        disabled={busy}
        title={label || undefined}
        className={cn("rounded-full border-2 transition-all", (suggested || available) && "cursor-pointer hover:scale-110", busy && "animate-pulse")}
        style={{ width: r * 2, height: r * 2, background: bg, borderColor: border, boxShadow: glow }}
      >
        {isCenter && <span className="text-[9px] font-extrabold text-amber-900/80">道</span>}
      </button>
      {step !== undefined && (
        <span className="absolute left-1/2 -translate-x-1/2 -top-3 w-5 h-5 rounded-full bg-amber-300 text-amber-900 text-[10px] font-extrabold flex items-center justify-center border border-amber-100 shadow">
          {step}
        </span>
      )}
      {showLabel && (
        <span
          className={cn(
            "absolute left-1/2 -translate-x-1/2 top-full mt-0.5 text-[10px] leading-tight text-center whitespace-nowrap font-bold",
            activated ? "text-amber-100" : suggested ? "text-amber-200" : "text-amber-200/45"
          )}
          style={{ textShadow: "0 1px 2px rgba(0,0,0,0.8)" }}
        >
          {label}
        </span>
      )}
    </div>
  );
}