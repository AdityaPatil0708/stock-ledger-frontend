"use client";

import { useEffect, useRef, useState } from "react";
import { fmtNum } from "./utils";
import type { IngredientRowInput, StockItem } from "./types";

function lotLabel(it: StockItem): string {
  return `${it.material}${it.brand ? ` — ${it.brand}` : ""}${it.location ? ` — ${it.location}` : ""} (${fmtNum(it.totalStock)} kg avail.)`;
}

function LotPicker({ value, onChange, options }: { value: string; onChange: (id: string) => void; options: StockItem[] }) {
  const selected = options.find((o) => o.id === value) || null;
  const [query, setQuery] = useState(selected ? lotLabel(selected) : "");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(selected ? lotLabel(selected) : "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  useEffect(() => {
    if (!open) return;
    const onDocPointer = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocPointer);
    return () => document.removeEventListener("mousedown", onDocPointer);
  }, [open]);

  const q = query.trim().toLowerCase();
  const filtered = q ? options.filter((o) => lotLabel(o).toLowerCase().includes(q)) : options;

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <input
        type="text"
        placeholder="Search ingredient lot…"
        value={query}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          if (value) onChange("");
        }}
      />
      {open && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            zIndex: 50,
            maxHeight: 220,
            overflowY: "auto",
            background: "var(--card)",
            border: "1px solid var(--line-strong)",
            borderRadius: 6,
            marginTop: 4,
            boxShadow: "var(--shadow)",
          }}
        >
          {filtered.length === 0 && <div style={{ padding: "8px 10px", fontSize: 12.5, color: "var(--ink-soft)" }}>No matching lots.</div>}
          {filtered.map((o) => (
            <div
              key={o.id}
              onClick={() => {
                onChange(o.id);
                setQuery(lotLabel(o));
                setOpen(false);
              }}
              style={{ padding: "8px 10px", fontSize: 12.5, cursor: "pointer" }}
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--paper-2)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "")}
            >
              {lotLabel(o)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function IngredientRows({
  rows,
  onChange,
  items,
}: {
  rows: IngredientRowInput[];
  onChange: (rows: IngredientRowInput[]) => void;
  items: StockItem[];
}) {
  const available = items
    .filter((it) => Number(it.totalStock) > 0)
    .slice()
    .sort((a, b) => String(a.material).localeCompare(String(b.material)));

  function update(idx: number, patch: Partial<IngredientRowInput>) {
    onChange(rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }
  function remove(idx: number) {
    const next = rows.filter((_, i) => i !== idx);
    onChange(next.length ? next : [{ itemId: "", qty: "" }]);
  }
  function add() {
    onChange([...rows, { itemId: "", qty: "" }]);
  }

  const total = rows.reduce((sum, r) => {
    const q = parseFloat(r.qty);
    return !isNaN(q) ? sum + q : sum;
  }, 0);

  return (
    <>
      {rows.map((r, idx) => (
        <div key={idx} style={{ display: "flex", gap: 8, alignItems: "flex-end", marginBottom: 8 }}>
          <div className="field" style={{ flex: 2, marginBottom: 0 }}>
            <label>Ingredient lot</label>
            <LotPicker value={r.itemId} onChange={(itemId) => update(idx, { itemId })} options={available} />
          </div>
          <div className="field" style={{ flex: "0 0 80px", marginBottom: 0 }}>
            <label style={{fontSize: '9px'}}>Qty to consume (kg)</label>
            <input type="number" step="0.001" min="0" value={r.qty} onChange={(e) => update(idx, { qty: e.target.value })} />
          </div>
          {rows.length > 1 && (
            <button type="button" className="btn btn-ghost btn-sm" title="Remove this ingredient" onClick={() => remove(idx)}>
              ✕
            </button>
          )}
        </div>
      ))}
      <button type="button" className="btn btn-ghost btn-sm" onClick={add}>
        + Add another ingredient
      </button>
      <div className="hint">
        Total output: <b>{fmtNum(Math.round(total * 1000) / 1000)} kg</b> (sum of ingredient quantities).
      </div>
    </>
  );
}
