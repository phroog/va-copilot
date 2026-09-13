// "Tree of Masters" — a Path-of-Exile style passive tree.
// Deterministic pure function so the SAME graph is generated on server
// (for validation) and client (for rendering). ~265 nodes, no emoji.
//
// Structure: a central Master Seal, 6 job-category branches radiating
// outward, plus bridge nodes between neighbouring branches so the whole
// tree is one connected web. You activate nodes adjacent to your own
// activated frontier — building your own path through the tree.

export interface TreeNode {
  id: string;
  title: string;
  sector: string | null; // sector key, or null for center/bridge
  kind: "center" | "skill" | "growth" | "bridge";
  x: number;
  y: number;
  connections: string[];
}

export interface TreeGraph {
  nodes: TreeNode[];
  byId: Map<string, TreeNode>;
  center: string;
}

export const SPINE_DEPTH = 22;
export const R_SPACING = 36;
export const CENTER_ID = "c";
export const XP_PER_POINT = 50;

const SECTORS: { key: string; title: string; skills: string[]; capstone: string }[] = [
  {
    key: "general-va",
    title: "The All-Rounder",
    skills: ["VA Foundations", "Email & Admin", "Data & Documents", "Research & Sourcing", "Client Communication", "Deep Research", "Vendor Sourcing", "Scope & Boundaries", "Difficult Clients"],
    capstone: "All-Rounder Master",
  },
  {
    key: "social-media-va",
    title: "The Storyteller",
    skills: ["Social Foundations", "Content Creation", "Platform Mastery", "Growth & Analytics", "Community Management", "Content Calendars", "Client Reporting", "Comments & DMs", "Crisis Handling"],
    capstone: "Growth Alchemist",
  },
  {
    key: "executive-assistant",
    title: "The Right Hand",
    skills: ["Executive Foundations", "Inbox Zero", "Calendar Mastery", "Travel & Logistics", "Meeting & Reporting", "Itinerary Building", "Booking Support", "Meeting Notes", "Client Dashboards"],
    capstone: "The Right Hand",
  },
  {
    key: "ecommerce-va",
    title: "The Storekeeper",
    skills: ["Store Foundations", "Product Listings", "Order Fulfilment", "Customer Support", "Store Analytics", "Returns & Refunds", "Reviews & Ratings", "Sales Dashboards", "Inventory Alerts"],
    capstone: "Store Sovereign",
  },
  {
    key: "real-estate-va",
    title: "The Deal Maker",
    skills: ["Property Foundations", "Listing Management", "Lead Follow-Up", "Transaction Coordination", "Marketing for Agents", "Closing Checklists", "Document Packing", "Agent Content", "Email Campaigns"],
    capstone: "Deal Closer",
  },
  {
    key: "bookkeeping-va",
    title: "The Keeper of Numbers",
    skills: ["Finance Foundations", "Invoicing & Payments", "Expense Tracking", "Reconciliation", "Reporting & Taxes", "Bank Reconciliations", "Card Reconciliations", "P&L Reports", "Tax Prep Support"],
    capstone: "Numbers Master",
  },
];

const GROWTH = [
  "Discipline", "Patience", "Focus", "Balance", "Breath", "Flow", "Stillness", "Clarity",
  "Precision", "Grace", "Rooted", "Serenity", "Dedication", "Harmony", "Courage", "Humility",
  "Wisdom", "Strength", "Resolve", "Insight", "Temperance", "Endurance",
];

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function jitter(id: string): { dx: number; dy: number } {
  const h = hash(id);
  return { dx: ((h % 13) - 6) * 0.9, dy: (((h >> 4) % 13) - 6) * 0.9 };
}

let cached: TreeGraph | null = null;

export function getTreeGraph(): TreeGraph {
  if (cached) return cached;

  const nodes: TreeNode[] = [];
  const byId = new Map<string, TreeNode>();
  const edgeSet = new Set<string>();

  const add = (n: TreeNode) => {
    nodes.push(n);
    byId.set(n.id, n);
  };
  const link = (a: string, b: string) => {
    const key = a < b ? `${a}|${b}` : `${b}|${a}`;
    if (edgeSet.has(key)) return;
    edgeSet.add(key);
    byId.get(a)?.connections.push(b);
    byId.get(b)?.connections.push(a);
  };

  // Center
  add({ id: CENTER_ID, title: "Master Seal", sector: null, kind: "center", x: 0, y: 0, connections: [] });

  const sectorCount = SECTORS.length;
  const angleFor = (i: number) => ((i * (360 / sectorCount)) - 90) * (Math.PI / 180);

  // Spine + bridge nodes
  for (let s = 0; s < sectorCount; s++) {
    const sector = SECTORS[s];
    const baseAngle = angleFor(s);
    const bridgeAngle = baseAngle + (Math.PI / sectorCount);
    const next = (s + 1) % sectorCount;

    for (let d = 1; d <= SPINE_DEPTH; d++) {
      const r = d * R_SPACING;

      // spine node
      const sid = `${sector.key}:${d}`;
      const j = jitter(sid);
      const kind: TreeNode["kind"] = d <= sector.skills.length ? "skill" : d === SPINE_DEPTH ? "skill" : "growth";
      const title =
        d <= sector.skills.length ? sector.skills[d - 1] : d === SPINE_DEPTH ? sector.capstone : GROWTH[(hash(sid) % GROWTH.length)];
      add({
        id: sid,
        title,
        sector: sector.key,
        kind,
        x: Math.cos(baseAngle) * r + j.dx,
        y: Math.sin(baseAngle) * r + j.dy,
        connections: [],
      });

      // bridge node between this sector and the next
      const bid = `${sector.key}~${SECTORS[next].key}:${d}`;
      const jb = jitter(bid);
      add({
        id: bid,
        title: "",
        sector: null,
        kind: "bridge",
        x: Math.cos(bridgeAngle) * r + jb.dx,
        y: Math.sin(bridgeAngle) * r + jb.dy,
        connections: [],
      });
    }
  }

  // Edges
  for (let s = 0; s < sectorCount; s++) {
    const sector = SECTORS[s];
    const next = (s + 1) % sectorCount;
    for (let d = 1; d <= SPINE_DEPTH; d++) {
      const sid = `${sector.key}:${d}`;
      const bid = `${sector.key}~${SECTORS[next].key}:${d}`;
      const nextSid = `${SECTORS[next].key}:${d}`;

      if (d < SPINE_DEPTH) {
        link(sid, `${sector.key}:${d + 1}`);
        link(bid, `${sector.key}~${SECTORS[next].key}:${d + 1}`);
      }
      if (d === 1) link(CENTER_ID, sid);
      // ring connections through the bridge
      link(sid, bid);
      link(nextSid, bid);
      // diagonal web links for richness
      if (d < SPINE_DEPTH) {
        link(sid, `${sector.key}~${SECTORS[next].key}:${d + 1}`);
        link(nextSid, `${sector.key}~${SECTORS[next].key}:${d + 1}`);
      }
    }
  }

  cached = { nodes, byId, center: CENTER_ID };
  return cached;
}

// Nodes adjacent to the activated set that are not yet activated.
export function computeFrontier(graph: TreeGraph, activated: Set<string>): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  activated.forEach((id) => {
    const n = graph.byId.get(id);
    if (!n) return;
    for (const c of n.connections) {
      if (activated.has(c) || seen.has(c)) continue;
      seen.add(c);
      out.push(c);
    }
  });
  return out;
}

// The nearest few frontier nodes — these light up as your suggested next steps.
export function suggestedSteps(graph: TreeGraph, activated: Set<string>, count = 4): string[] {
  const frontier = computeFrontier(graph, activated);
  if (frontier.length <= count) return frontier;
  const act = Array.from(activated).map((id) => graph.byId.get(id)).filter((n): n is TreeNode => !!n);
  if (act.length === 0) return frontier.slice(0, count);
  const cx = act.reduce((s, n) => s + n.x, 0) / act.length;
  const cy = act.reduce((s, n) => s + n.y, 0) / act.length;
  const dist = (id: string) => {
    const n = graph.byId.get(id)!;
    return (n.x - cx) ** 2 + (n.y - cy) ** 2;
  };
  return [...frontier].sort((a, b) => dist(a) - dist(b)).slice(0, count);
}

export const TREE_SECTORS = SECTORS;