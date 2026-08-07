"use client";

import { useState } from "react";
import PackingRows from "./PackingRows";
import type { LedgerApi } from "./Ledger";
import type { Modal, StockItem } from "./types";
import { fmtNum } from "./utils";

export default function Modals({ ledger }: { ledger: LedgerApi }) {
  const { modal, closeModal, freeLocations, distinctMaterials } = ledger;
  if (!modal) return null;

  return (
    <div
      className="overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) closeModal();
      }}
    >
      {modal.type === "out" && <OutModal modal={modal} ledger={ledger} />}
      {modal.type === "edit" && <EditModal modal={modal} ledger={ledger} />}
      {modal.type === "transfer" && <TransferModal modal={modal} ledger={ledger} />}
      {modal.type === "in" && <InModal modal={modal} ledger={ledger} freeLocations={freeLocations} distinctMaterials={distinctMaterials} />}
    </div>
  );
}

function OutModal({ modal, ledger }: { modal: Extract<Modal, { type: "out" }>; ledger: LedgerApi }) {
  const it = modal.item;
  const [qty, setQty] = useState(String(it.totalStock || 0));

  return (
    <div className="modal">
      <h2>Move stock OUT</h2>
      <div className="modal-sub">
        {it.material} · {it.brand || "—"} · bin <b>{it.location}</b>
      </div>
      <div className="field">
        <label>Quantity to remove (kg)</label>
        <input
          type="number"
          value={qty}
          step="0.001"
          min="0"
          max={String(it.totalStock || 0)}
          onChange={(e) => setQty(e.target.value)}
        />
      </div>
      <div className="hint">
        Current stock: {fmtNum(it.totalStock)} kg. Removing all of it frees bin {it.location} for new stock.
      </div>
      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={ledger.closeModal}>
          Cancel
        </button>
        <button className="btn btn-out" onClick={() => ledger.confirmOut(parseFloat(qty))}>
          Confirm OUT
        </button>
      </div>
    </div>
  );
}

function EditModal({ modal, ledger }: { modal: Extract<Modal, { type: "edit" }>; ledger: LedgerApi }) {
  const [form, setForm] = useState(modal.form);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  return (
    <div className="modal">
      <h2>Edit stock row</h2>
      <div className="modal-sub">Directly correct this row&apos;s details. Material and Total Stock are required.</div>
      <div className="field">
        <label>
          Material <span className="required-mark">*</span>
        </label>
        <input type="text" value={form.material} onChange={set("material")} />
      </div>
      <div className="field-row">
        <div className="field">
          <label>Brand / Supplier</label>
          <input type="text" value={form.brand} onChange={set("brand")} />
        </div>
        <div className="field">
          <label>Batch No</label>
          <input type="text" value={form.batchNo} onChange={set("batchNo")} />
        </div>
      </div>
      <div className="field-row">
        <div className="field">
          <label>Mfg date</label>
          <input type="text" placeholder="DD.MM.YY" value={form.mfg} onChange={set("mfg")} />
        </div>
        <div className="field">
          <label>Exp date</label>
          <input type="text" placeholder="DD.MM.YY" value={form.exp} onChange={set("exp")} />
        </div>
      </div>
      <div className="field-row">
        <div className="field">
          <label>Packing size (kg)</label>
          <input type="number" step="0.001" min="0" value={form.packing} onChange={set("packing")} />
        </div>
        <div className="field">
          <label>
            Total stock (kg) <span className="required-mark">*</span>
          </label>
          <input type="number" step="0.001" min="0" value={form.totalStock} onChange={set("totalStock")} />
        </div>
      </div>
      <div className="field">
        <label>Packing detail (optional note)</label>
        <input type="text" value={form.packingDetail} onChange={set("packingDetail")} placeholder="e.g. 2×25kg, 1×30kg" />
      </div>
      <div className="field">
        <label>Bin / Location</label>
        <input type="text" list="edit-location-list" value={form.location} onChange={set("location")} placeholder="Leave blank to unassign" />
        <datalist id="edit-location-list">
          {ledger.locations.map((l) => (
            <option key={l.code} value={l.code} />
          ))}
        </datalist>
        <div className="hint">Type an existing bin code, a new one, or leave blank to mark this stock unassigned.</div>
      </div>
      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={ledger.closeModal}>
          Cancel
        </button>
        <button className="btn btn-primary" onClick={() => ledger.confirmEdit(form)}>
          Save changes
        </button>
      </div>
    </div>
  );
}

function TransferModal({ modal, ledger }: { modal: Extract<Modal, { type: "transfer" }>; ledger: LedgerApi }) {
  const source = modal.item;
  const [form, setForm] = useState(modal.form);
  const set = (k: "material" | "brand" | "location") => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm({ ...form, [k]: e.target.value });
  const free = ledger.freeLocations.filter((c) => c !== source.location);

  return (
    <div className="modal">
      <h2>Transfer stock</h2>
      <div className="modal-sub">
        Moving out of bin <b>{source.location}</b> · currently {fmtNum(source.totalStock)} kg available. Batch, mfg &amp; exp
        travel with this lot automatically.
      </div>
      <div className="field">
        <label>
          Material <span className="required-mark">*</span>
        </label>
        <input type="text" value={form.material} onChange={set("material")} />
      </div>
      <div className="field-row">
        <div className="field">
          <label>
            Brand / Supplier <span className="required-mark">*</span>
          </label>
          <input type="text" value={form.brand} onChange={set("brand")} />
        </div>
        <div className="field">
          <label>
            Batch No <span className="hint" style={{ textTransform: "none", letterSpacing: 0, fontWeight: 400 }}>(from source)</span>
          </label>
          <input type="text" value={form.batchNo} readOnly style={{ background: "var(--paper-2)", color: "var(--ink-soft)", cursor: "not-allowed" }} />
        </div>
      </div>
      <div className="field-row">
        <div className="field">
          <label>
            Mfg date <span className="hint" style={{ textTransform: "none", letterSpacing: 0, fontWeight: 400 }}>(from source)</span>
          </label>
          <input type="text" placeholder="—" value={form.mfg} readOnly style={{ background: "var(--paper-2)", color: "var(--ink-soft)", cursor: "not-allowed" }} />
        </div>
        <div className="field">
          <label>
            Exp date <span className="hint" style={{ textTransform: "none", letterSpacing: 0, fontWeight: 400 }}>(from source)</span>
          </label>
          <input type="text" placeholder="—" value={form.exp} readOnly style={{ background: "var(--paper-2)", color: "var(--ink-soft)", cursor: "not-allowed" }} />
        </div>
      </div>
      <div className="field">
        <label>
          Packing being moved out <span className="required-mark">*</span>
        </label>
        <PackingRows rows={form.packingRows} onChange={(packingRows) => setForm({ ...form, packingRows })} />
        <div className="hint">Specify exactly what is physically moving out of {source.location}.</div>
      </div>
      <div className="field">
        <label>
          Transfer to bin <span className="required-mark">*</span>
        </label>
        <select value={form.location} onChange={set("location")}>
          <option value="">Choose a free bin…</option>
          {free.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <div className="hint">
          If the whole quantity moves, {source.location} will be freed. If only part moves, the remainder stays in{" "}
          {source.location} and a new row is created at the destination.
        </div>
      </div>
      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={ledger.closeModal}>
          Cancel
        </button>
        <button className="btn btn-transfer" onClick={() => ledger.confirmTransfer(form, form.packingRows)}>
          Confirm Transfer
        </button>
      </div>
    </div>
  );
}

function InModal({
  modal,
  ledger,
  freeLocations,
  distinctMaterials,
}: {
  modal: Extract<Modal, { type: "in" }>;
  ledger: LedgerApi;
  freeLocations: string[];
  distinctMaterials: StockItem[];
}) {
  const [form, setForm] = useState(modal.form);
  const set = (k: "material" | "brand" | "batchNo" | "mfg" | "exp" | "location") => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => setForm({ ...form, [k]: e.target.value });

  return (
    <div className="modal">
      <h2>New stock IN</h2>
      <div className="modal-sub">Assign new or returning stock to a free bin.</div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          ledger.confirmIn(form, form.packingRows);
        }}
      >
      <div className="field">
        <label>
          Material <span className="required-mark">*</span>
        </label>
        <input type="text" required list="material-list" value={form.material} onChange={set("material")} placeholder="e.g. ACETOPHENONE" />
        <datalist id="material-list">
          {distinctMaterials.map((mm) => (
            <option key={mm.material} value={mm.material} />
          ))}
        </datalist>
      </div>
      <div className="field-row">
        <div className="field">
          <label>
            Brand / Supplier <span className="required-mark">*</span>
          </label>
          <input type="text" required value={form.brand} onChange={set("brand")} />
        </div>
        <div className="field">
          <label>
            Batch No <span className="required-mark">*</span>
          </label>
          <input type="text" required value={form.batchNo} onChange={set("batchNo")} />
        </div>
      </div>
      <div className="field-row">
        <div className="field">
          <label>
            Mfg date <span className="required-mark">*</span>
          </label>
          <input type="text" required placeholder="DD.MM.YY" value={form.mfg} onChange={set("mfg")} />
        </div>
        <div className="field">
          <label>
            Exp date <span className="required-mark">*</span>
          </label>
          <input type="text" required placeholder="DD.MM.YY" value={form.exp} onChange={set("exp")} />
        </div>
      </div>
      <div className="field">
        <label>
          Packing breakdown <span className="required-mark">*</span>
        </label>
        <PackingRows rows={form.packingRows} onChange={(packingRows) => setForm({ ...form, packingRows })} required />
      </div>
      <div className="field">
        <label>
          Bin / Location <span className="required-mark">*</span>
        </label>
        <select required value={form.location} onChange={set("location")}>
          <option value="">Choose a free bin…</option>
          {freeLocations.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <div className="hint">Only bins with no current stock are offered. {freeLocations.length} free right now.</div>
      </div>
      <div className="modal-actions">
        <button type="button" className="btn btn-ghost" onClick={ledger.closeModal}>
          Cancel
        </button>
        <button type="submit" className="btn btn-in">
          Confirm IN
        </button>
      </div>
      </form>
    </div>
  );
}
