"use client";

import { computePackingTotal, fmtNum } from "./utils";
import type { PackingRowInput } from "./types";

export default function PackingRows({
  rows,
  onChange,
  required = false,
}: {
  rows: PackingRowInput[];
  onChange: (rows: PackingRowInput[]) => void;
  required?: boolean;
}) {
  function update(idx: number, patch: Partial<PackingRowInput>) {
    onChange(rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }
  function remove(idx: number) {
    const next = rows.filter((_, i) => i !== idx);
    onChange(next.length ? next : [{ size: "", count: "1" }]);
  }
  function add() {
    onChange([...rows, { size: "", count: "1" }]);
  }

  return (
    <>
      {rows.map((r, idx) => (
        <div key={idx} style={{ display: "flex", gap: 8, alignItems: "flex-end", marginBottom: 8 }}>
          <div className="field" style={{ flex: 1, marginBottom: 0 }}>
            <label>Size (kg)</label>
            <input
              type="number"
              step="0.001"
              min="0"
              required={required}
              className="pack-size"
              value={r.size}
              onChange={(e) => update(idx, { size: e.target.value })}
            />
          </div>
          <div className="field" style={{ flex: 1, marginBottom: 0 }}>
            <label>No. of units</label>
            <input
              type="number"
              step="1"
              min="1"
              required={required}
              className="pack-count"
              value={r.count}
              onChange={(e) => update(idx, { count: e.target.value })}
            />
          </div>
          {rows.length > 1 && (
            <button type="button" className="btn btn-ghost btn-sm" title="Remove this size" onClick={() => remove(idx)}>
              ✕
            </button>
          )}
        </div>
      ))}
      <button type="button" className="btn btn-ghost btn-sm" onClick={add}>
        + Add another packing size
      </button>
      <div className="hint">
        Total: <b>{fmtNum(Math.round(computePackingTotal(rows) * 1000) / 1000)} kg</b>
      </div>
    </>
  );
}
