import type { StockItem, PackingRowInput } from "./types";

export function uid(prefix: string) {
  return prefix + "_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export function fmtNum(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  const n = typeof v === "number" ? v : parseFloat(String(v));
  if (isNaN(n)) return String(v);
  let s = n.toFixed(3);
  s = s.replace(/\.?0+$/, "");
  return s;
}

export function formatPacking(it: StockItem): string {
  if (it.packingDetail) return it.packingDetail;
  if (it.packing !== null && it.packing !== undefined && (it.packing as unknown) !== "")
    return fmtNum(it.packing) + " kg";
  return "—";
}

export function computePackingTotal(rows: PackingRowInput[]): number {
  return rows.reduce((sum, r) => {
    const s = parseFloat(r.size);
    const c = parseFloat(r.count);
    if (!isNaN(s) && !isNaN(c)) return sum + s * c;
    return sum;
  }, 0);
}

export function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function floorOf(code: string): string {
  const m = code.match(/^(GF|F\d+)/i);
  return m ? m[1].toUpperCase() : "Other";
}
