"use client";

import { useState } from "react";
import { useLedger } from "./useLedger";
import Modals from "./Modals";
import type { SortKey, StockItem, TxLogEntry } from "./types";
import type { Role } from "../lib/api";
import { fmtNum, formatPacking } from "./utils";

export type LedgerApi = ReturnType<typeof useLedger>;

export default function Ledger({ role }: { role: Role }) {
  const ledger = useLedger();
  const canEdit = role === "editor";

  if (!ledger.loaded) {
    return <div style={{ padding: 60, textAlign: "center", color: "var(--ink-soft)" }}>Loading ledger…</div>;
  }

  const occ = ledger.occupiedLocationCodes;
  const totalMaterials = ledger.distinctMaterials.length;
  const occupiedCount = occ.size;
  const freeCount = ledger.locations.filter((l) => !occ.has(l.code)).length;

  return (
    <>
      <Header totalMaterials={totalMaterials} occupiedCount={occupiedCount} freeCount={freeCount} />
      <Tabs ledger={ledger} />
      {ledger.tab === "stock" && <StockTab ledger={ledger} canEdit={canEdit} />}
      {ledger.tab === "locations" && <LocationsTab ledger={ledger} canEdit={canEdit} />}
      {ledger.tab === "log" && <LogTab ledger={ledger} canEdit={canEdit} />}
      {canEdit && <Modals ledger={ledger} />}
      {ledger.toast && <div className="toast">{ledger.toast}</div>}
    </>
  );
}

function Header({ totalMaterials, occupiedCount, freeCount }: { totalMaterials: number; occupiedCount: number; freeCount: number }) {
  return (
    <div className="app-header">
      <div className="brand-mark">
        <div>
          <h1>Stock &amp; Location Ledger</h1>
          <div className="sub">Rawji Fine Fragrances — aroma chemical inventory, by warehouse bin</div>
        </div>
      </div>
      <div className="header-stats">
        <Stat n={totalMaterials} l="Materials" />
        <Stat n={occupiedCount} l="Occupied bins" />
        <Stat n={freeCount} l="Free bins" />
      </div>
    </div>
  );
}

function Stat({ n, l }: { n: number; l: string }) {
  return (
    <div className="stat">
      <div className="n">{n}</div>
      <div className="l">{l}</div>
    </div>
  );
}

function Tabs({ ledger }: { ledger: LedgerApi }) {
  const tabs: Array<{ id: "stock" | "locations" | "log"; label: string; count: number }> = [
    { id: "stock", label: "Stock", count: ledger.items.length },
    { id: "locations", label: "Locations", count: ledger.locations.length },
    { id: "log", label: "Activity", count: ledger.txLog.length },
  ];
  return (
    <div className="tabs">
      {tabs.map((t) => (
        <button
          key={t.id}
          className={"tab-btn " + (ledger.tab === t.id ? "active" : "")}
          onClick={() => {
            ledger.setTab(t.id);
            ledger.setPage(1);
          }}
        >
          {t.label}
          <span className="count">{t.count}</span>
        </button>
      ))}
    </div>
  );
}

function SortArrow({ ledger, sortKey }: { ledger: LedgerApi; sortKey: SortKey }) {
  if (ledger.sortKey !== sortKey) return null;
  return <span className="arrow">{ledger.sortDir === "asc" ? "↑" : "↓"}</span>;
}

function StockTab({ ledger, canEdit }: { ledger: LedgerApi; canEdit: boolean }) {
  const all = ledger.filteredItems;
  const total = all.length;
  const start = (ledger.page - 1) * ledger.pageSize;
  const pageItems = all.slice(start, start + ledger.pageSize);
  const maxPage = Math.max(1, Math.ceil(total / ledger.pageSize));

  const columns: Array<{ key: SortKey; label: string }> = [
    { key: "material", label: "Material" },
    { key: "packing", label: "Packing" },
    { key: "batchNo", label: "Batch" },
    { key: "mfg", label: "Mfg" },
    { key: "exp", label: "Exp" },
    { key: "totalStock", label: "Stock" },
    { key: "location", label: "Bin" },
    { key: "reservedType", label: "Reserved" },
  ];

  return (
    <>
      <div className="toolbar">
        <div className="search-wrap">
          <svg className="search-icon" width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M10.5 10.5l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            placeholder="Search material, brand, batch no, or bin…"
            value={ledger.search}
            onChange={(e) => {
              ledger.setSearch(e.target.value);
              ledger.setPage(1);
            }}
          />
        </div>
        <select
          value={ledger.locFilter}
          onChange={(e) => {
            ledger.setLocFilter(e.target.value as typeof ledger.locFilter);
            ledger.setPage(1);
          }}
        >
          <option value="all">All stock</option>
          <option value="assigned">Assigned to a bin</option>
          <option value="unassigned">Unassigned</option>
        </select>
        <select
          value={ledger.resFilter}
          onChange={(e) => {
            ledger.setResFilter(e.target.value as typeof ledger.resFilter);
            ledger.setPage(1);
          }}
        >
          <option value="all">All reservations</option>
          <option value="PSS">PSS only</option>
          <option value="Reservation">Reservation only</option>
          <option value="unreserved">Unreserved only</option>
        </select>
        {canEdit && (
          <button className="btn btn-primary" onClick={() => ledger.openInModal()}>
            + New Stock IN
          </button>
        )}
        {canEdit && (
          <button className="btn btn-produce" onClick={() => ledger.openProduceModal()}>
            + Produce Compound
          </button>
        )}
        {canEdit && (
          <button className="btn btn-ghost" disabled={!ledger.canUndo} onClick={ledger.undoLast}>
            ↺ Undo last action
          </button>
        )}
        <select
          value={ledger.floorFilter}
          onChange={(e) => {
            ledger.setFloorFilter(e.target.value);
            ledger.setPage(1);
          }}
        >
          <option value="all">All floors</option>
          {ledger.floors.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
        <button className="btn btn-ghost" onClick={ledger.exportToExcel}>
          Export to Excel
        </button>
      </div>
      <div className="table-card">
        <table>
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.key} onClick={() => ledger.toggleSort(c.key)}>
                  {c.label} <SortArrow ledger={ledger} sortKey={c.key} />
                </th>
              ))}
              <th>Activity</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {pageItems.length === 0 && (
              <tr>
                <td colSpan={10}>
                  <div className="empty-state">
                    <div className="glyph">∅</div>
                    No stock rows match this search.
                  </div>
                </td>
              </tr>
            )}
            {pageItems.map((it) => (
              <StockRow key={it.id} it={it} ledger={ledger} canEdit={canEdit} />
            ))}
          </tbody>
        </table>
        <div className="pager">
          <div className="info">
            Showing {total === 0 ? 0 : start + 1}–{Math.min(start + ledger.pageSize, total)} of {total}
          </div>
          <div className="controls">
            <button className="btn btn-sm" disabled={ledger.page <= 1} onClick={() => ledger.setPage(Math.max(1, ledger.page - 1))}>
              ← Prev
            </button>
            <button className="btn btn-sm" disabled={ledger.page >= maxPage} onClick={() => ledger.setPage(ledger.page + 1)}>
              Next →
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function latestActivityFor(it: StockItem, txLog: TxLogEntry[]): TxLogEntry | null {
  const batch = it.batchNo != null ? String(it.batchNo) : "";
  return txLog.find((tx) => tx.material === it.material && String(tx.batchNo ?? "") === batch) || null;
}

function StockRow({ it, ledger, canEdit }: { it: StockItem; ledger: LedgerApi; canEdit: boolean }) {
  const isOccupied = !!it.location;
  const lastTx = latestActivityFor(it, ledger.txLog);
  return (
    <tr>
      <td>
        <div className="mat-name">{it.material}</div>
        <div className="mat-brand">{it.brand || "—"}</div>
      </td>
      <td>
        <span className="code">{formatPacking(it)}</span>
      </td>
      <td>
        <span className="code">{it.batchNo || "—"}</span>
      </td>
      <td>{it.mfg || "—"}</td>
      <td>{it.exp || "—"}</td>
      <td className="qty">{fmtNum(it.totalStock)} kg</td>
      <td>
        {isOccupied ? <span className="loc-pill occupied">{it.location}</span> : <span className="loc-pill none">unassigned</span>}
      </td>
      <td>
        <ReservationCell it={it} ledger={ledger} canEdit={canEdit} />
      </td>
      <td>
        {lastTx ? (
          <>
            <span className={"log-badge " + lastTx.type} style={{ fontSize: 10 }}>
              {lastTx.type === "ORDER" ? "IN ORDER" : lastTx.type === "UNORDER" ? "ORDER CLEARED" : lastTx.type}
            </span>
            <div className="mat-brand">{new Date(lastTx.ts).toLocaleString()}</div>
          </>
        ) : (
          "—"
        )}
      </td>
      <td>
        {canEdit && (
          <div className="row-actions">
            {isOccupied && (
              <button className="btn btn-transfer btn-sm" onClick={() => ledger.openTransferModal(it)}>
                Transfer
              </button>
            )}
            {isOccupied && (
              <button className="btn btn-out btn-sm" onClick={() => ledger.openOutModal(it)}>
                Move OUT
              </button>
            )}
            {isOccupied && (
              <button
                className="btn btn-produce btn-sm"
                title="Use this stock as an ingredient to produce a compound"
                onClick={() => ledger.openProduceModal(it)}
              >
                Produce
              </button>
            )}
            {!isOccupied && (
              <button
                className="btn btn-in btn-sm"
                onClick={() => ledger.openInModal({ material: it.material, brand: it.brand || "", batchNo: it.batchNo != null ? String(it.batchNo) : "" })}
              >
                Assign IN
              </button>
            )}
            <button className="btn btn-ghost btn-sm" title="Edit this row" onClick={() => ledger.openEditModal(it)}>
              Edit
            </button>
            <button className="btn btn-ghost btn-sm" title="Delete this row" style={{ color: "var(--rust)" }} onClick={() => ledger.deleteItem(it)}>
              Delete
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}

function ReservationCell({ it, ledger, canEdit }: { it: StockItem; ledger: LedgerApi; canEdit: boolean }) {
  const [types, setTypes] = useState<string[]>([]);
  const [qtyStr, setQtyStr] = useState("");

  function toggleType(t: string, checked: boolean) {
    setTypes((prev) => (checked ? [...prev, t] : prev.filter((x) => x !== t)));
  }

  let reservationPart;
  if (it.reservation) {
    reservationPart = (
      <div className="res-inline">
        <span className="loc-pill occupied">
          {it.reservation.type.join(", ")} · {fmtNum(it.reservation.qty)} kg
        </span>
        {canEdit && (
          <button className="btn btn-ghost btn-sm" onClick={() => ledger.unreserveItem(it)}>
            Unreserve
          </button>
        )}
      </div>
    );
  } else if (!canEdit) {
    reservationPart = <span className="loc-pill none">unreserved</span>;
  } else {
    reservationPart = (
      <div className="res-inline">
        <label className="res-type-chip">
          <input type="checkbox" checked={types.includes("PSS")} onChange={(e) => toggleType("PSS", e.target.checked)} /> PSS
        </label>
        <label className="res-type-chip">
          <input type="checkbox" checked={types.includes("Reservation")} onChange={(e) => toggleType("Reservation", e.target.checked)} /> Resv.
        </label>
        <input type="text" className="res-qty" placeholder="Qty" min="0" step="0.001" value={qtyStr} onChange={(e) => setQtyStr(e.target.value)} />
        <button className="btn btn-in btn-sm" onClick={() => ledger.reserveItem(it, types, parseFloat(qtyStr))}>
          Reserve
        </button>
      </div>
    );
  }

  return (
    <>
      {reservationPart}
      <InOrderControl it={it} ledger={ledger} canEdit={canEdit} />
    </>
  );
}

function InOrderControl({ it, ledger, canEdit }: { it: StockItem; ledger: LedgerApi; canEdit: boolean }) {
  const [qtyStr, setQtyStr] = useState("");

  if (it.inOrder) {
    return (
      <div className="res-inline">
        <span className="loc-pill occupied">In Order · {fmtNum(it.inOrder.qty)} kg</span>
        {canEdit && (
          <button className="btn btn-ghost btn-sm" onClick={() => ledger.unorderItem(it)}>
            Clear
          </button>
        )}
      </div>
    );
  }

  if (!canEdit) return null;

  return (
    <div className="res-inline">
      <input type="text" className="res-qty" placeholder="Qty" min="0" step="0.001" value={qtyStr} onChange={(e) => setQtyStr(e.target.value)} />
      <button className="btn btn-transfer btn-sm" onClick={() => ledger.orderItem(it, parseFloat(qtyStr))}>
        In Order
      </button>
    </div>
  );
}

function LocationsTab({ ledger, canEdit }: { ledger: LedgerApi; canEdit: boolean }) {
  const [search, setSearch] = useState("");
  const occ = ledger.occupiedLocationCodes;
  const q = search.trim().toLowerCase();

  const filteredLocations = ledger.locations
    .slice()
    .sort((a, b) => a.code.localeCompare(b.code))
    .filter((l) => {
      if (!q) return true;
      if (l.code.toLowerCase().includes(q)) return true;
      return ledger.locationOccupants(l.code).some((o) => String(o.material).toLowerCase().includes(q));
    });

  return (
    <>
      <div className="assumption-note">
        <b>How bins work here:</b> a bin is &quot;Occupied&quot; whenever any stock row currently points to it, and
        &quot;Free&quot; the moment its last stock is moved OUT. New stock can be assigned IN to any bin, occupied or not.
      </div>
      <div className="toolbar">
        <div className="search-wrap" style={{ flex: "none", width: 280 }}>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--ink-soft)", pointerEvents: "none" }}
          >
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search bin code or material…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: 32 }}
          />
        </div>
      </div>
      {filteredLocations.length === 0 && (
        <div className="table-card">
          <div className="empty-state">
            <div className="glyph">∅</div>
            No bins match this search.
          </div>
        </div>
      )}
      <div className="loc-grid">
        {filteredLocations.map((l) => {
          const occupants = ledger.locationOccupants(l.code);
          const isOcc = occ.has(l.code);
          const fillText = isOcc
            ? occupants.map((o) => o.material).slice(0, 2).join(", ") + (occupants.length > 2 ? " +" + (occupants.length - 2) + " more" : "")
            : "Ready for new stock";
          return (
            <div className={"loc-card " + (isOcc ? "occupied" : "free")} key={l.code}>
              <div className="badge">{isOcc ? "Occupied" : "Free"}</div>
              <div className="code-lg">{l.code}</div>
              <div className="fill">{fillText}</div>
              {canEdit && (
                <button className="btn btn-in btn-sm" onClick={() => ledger.openInModal({ location: l.code })}>
                  Assign stock IN
                </button>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

function LogTab({ ledger, canEdit }: { ledger: LedgerApi; canEdit: boolean }) {
  const filteredLog = ledger.txLog;
  const total = filteredLog.length;
  const start = (ledger.page - 1) * ledger.pageSize;
  const pageLog = filteredLog.slice(start, start + ledger.pageSize);
  const maxPage = Math.max(1, Math.ceil(total / ledger.pageSize));

  function exportLogToExcel() {
    const csvEscape = (v: unknown) => {
      const s = v === null || v === undefined ? "" : String(v);
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    const headers = ["Type", "Material", "Brand", "Batch", "Bin", "From", "To", "Qty (kg)", "Detail", "When"];
    const lines = [headers.map(csvEscape).join(",")];
    filteredLog.forEach((tx) => {
      lines.push(
        [
          tx.type,
          tx.material,
          tx.brand || "",
          tx.batchNo || "",
          tx.location || "",
          tx.fromLocation || "",
          tx.toLocation || "",
          fmtNum(tx.qty),
          tx.recipe || tx.note || tx.packingDetail || "",
          tx.ts,
        ]
          .map(csvEscape)
          .join(","),
      );
    });
    const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "activity_log_" + new Date().toISOString().slice(0, 10) + ".csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <div className="toolbar">
        <div className="search-wrap" style={{ flex: "none", width: 320 }}>
          <svg className="search-icon" width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M10.5 10.5l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            placeholder="Search activity…"
            value={ledger.logSearch}
            onChange={(e) => {
              ledger.setLogSearch(e.target.value);
              ledger.setPage(1);
            }}
          />
        </div>
        <div style={{ flex: 1, color: "var(--ink-soft)", fontSize: 12 }}>
          Undo steps back through the most recent mutating actions, most recent first.
        </div>
        {canEdit && (
          <button className="btn btn-ghost" disabled={!ledger.canUndo} onClick={ledger.undoLast}>
            ↺ Undo last action
          </button>
        )}
        <button className="btn btn-ghost" onClick={exportLogToExcel}>
          Export to Excel
        </button>
      </div>
      {filteredLog.length === 0 ? (
        <div className="table-card">
          <div className="empty-state">
            <div className="glyph">∅</div>
            {ledger.logSearch.trim() ? "No activity matches this search." : "No IN/OUT activity recorded yet in this app."}
          </div>
        </div>
      ) : (
        <div className="table-card">
          {pageLog.map((tx) => {
            const d = new Date(tx.ts);
            const when = isNaN(d.getTime()) ? "" : d.toLocaleString();
            const locPart =
              tx.type === "TRANSFER" ? (
                <>
                  {" "}
                  — bin <b>{tx.fromLocation || "—"}</b> → <b>{tx.toLocation || "—"}</b>
                </>
              ) : tx.location ? (
                <>
                  {" "}
                  — bin <b>{tx.location}</b>
                </>
              ) : null;
            const packingPart = tx.type === "TRANSFER" && tx.packingDetail ? " · packing " + tx.packingDetail : "";
            const extraPart = tx.type === "PRODUCE" && tx.recipe ? " · from " + tx.recipe : tx.note ? " · " + tx.note : "";
            const badgeLabel = tx.type === "ORDER" ? "IN ORDER" : tx.type === "UNORDER" ? "ORDER CLEARED" : tx.type;
            return (
              <div className="log-item" key={tx.id}>
                <div className={"log-badge " + tx.type}>{badgeLabel}</div>
                <div className="log-body">
                  {tx.material} {tx.batchNo && <span className="code">{tx.batchNo}</span>}
                  {locPart}
                  <div className="log-meta">
                    {fmtNum(tx.qty)} kg{packingPart}
                    {extraPart} · {when}
                  </div>
                </div>
              </div>
            );
          })}
          <div className="pager">
            <div className="info">
              Showing {total === 0 ? 0 : start + 1}–{Math.min(start + ledger.pageSize, total)} of {total}
            </div>
            <div className="controls">
              <button className="btn btn-sm" disabled={ledger.page <= 1} onClick={() => ledger.setPage(Math.max(1, ledger.page - 1))}>
                ← Prev
              </button>
              <button className="btn btn-sm" disabled={ledger.page >= maxPage} onClick={() => ledger.setPage(ledger.page + 1)}>
                Next →
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
