"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ApiError, ledgerApi } from "../lib/api";
import type { IngredientRowInput, LocationRow, LocFilter, Modal, PackingRowInput, ResFilter, SortKey, StockItem, Tab, TxLogEntry } from "./types";
import { fmtNum, floorOf, formatPacking } from "./utils";

export function useLedger() {
  const [loaded, setLoaded] = useState(false);
  const [items, setItems] = useState<StockItem[]>([]);
  const [locations, setLocations] = useState<LocationRow[]>([]);
  const [txLog, setTxLog] = useState<TxLogEntry[]>([]);
  const [canUndo, setCanUndo] = useState(false);

  const [tab, setTab] = useState<Tab>("stock");
  const [search, setSearch] = useState("");
  const [logSearch, setLogSearch] = useState("");
  const [locFilter, setLocFilter] = useState<LocFilter>("all");
  const [floorFilter, setFloorFilter] = useState<string>("all");
  const [resFilter, setResFilter] = useState<ResFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("material");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const pageSize = 50;
  const [modal, setModal] = useState<Modal | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchRef = useRef(search);
  searchRef.current = search;
  const logSearchRef = useRef(logSearch);
  logSearchRef.current = logSearch;

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 2600);
  }, []);

  const refresh = useCallback(async () => {
    const data = await ledgerApi.get(searchRef.current, logSearchRef.current);
    setItems(data.items as StockItem[]);
    setLocations(data.locations as LocationRow[]);
    setTxLog(data.txLog as TxLogEntry[]);
    setCanUndo(Boolean((data as unknown as { canUndo?: boolean }).canUndo));
  }, []);

  // Fetch ledger state from the API on mount, then re-fetch (debounced) whenever search/logSearch changes.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const t = setTimeout(
      () => {
        refresh()
          .catch(() => showToast("Could not load the ledger from the server."))
          .finally(() => setLoaded(true));
      },
      loaded ? 300 : 0,
    );
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, logSearch]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const runAction = useCallback(
    async (fn: () => Promise<unknown>, successMsg?: string) => {
      try {
        await fn();
        await refresh();
        if (successMsg) showToast(successMsg);
        return true;
      } catch (e) {
        showToast(e instanceof ApiError ? e.message : "Something went wrong. Please try again.");
        return false;
      }
    },
    [refresh, showToast],
  );

  const occupiedLocationCodes = useMemo(() => {
    const set = new Set<string>();
    items.forEach((it) => {
      if (
        it.location &&
        (it.totalStock === null || it.totalStock === undefined || Number(it.totalStock) > 0 || (it.totalStock as unknown) === "")
      ) {
        set.add(it.location);
      }
    });
    return set;
  }, [items]);

  const locationOccupants = useCallback((code: string) => items.filter((it) => it.location === code), [items]);

  const allLocations = useMemo(() => {
    return locations.map((l) => l.code).sort();
  }, [locations]);

  const floors = useMemo(() => {
    return Array.from(new Set(locations.map((l) => floorOf(l.code)))).sort();
  }, [locations]);

  const distinctMaterials = useMemo(() => {
    const m = new Map<string, StockItem>();
    items.forEach((it) => {
      if (it.material && !m.has(it.material)) m.set(it.material, it);
    });
    return Array.from(m.values()).sort((a, b) => String(a.material).localeCompare(String(b.material)));
  }, [items]);

  const filteredItems = useMemo(() => {
    let list = items;
    if (locFilter === "assigned") list = list.filter((it) => !!it.location);
    if (locFilter === "unassigned") list = list.filter((it) => !it.location);
    if (floorFilter !== "all") list = list.filter((it) => !!it.location && floorOf(it.location) === floorFilter);
    if (resFilter === "PSS" || resFilter === "Reservation")
      list = list.filter((it) => it.reservation && it.reservation.type.includes(resFilter));
    if (resFilter === "unreserved") list = list.filter((it) => !it.reservation);

    const key = sortKey;
    const dir = sortDir === "asc" ? 1 : -1;
    list = list.slice().sort((a, b) => {
      let av: unknown = a[key as keyof StockItem];
      let bv: unknown = b[key as keyof StockItem];
      if (key === "reservedType") {
        av = (a.reservation && a.reservation.type.join(", ")) || "";
        bv = (b.reservation && b.reservation.type.join(", ")) || "";
      }
      if (key === "totalStock" || key === "packing") {
        const an = Number(av) || 0;
        const bn = Number(bv) || 0;
        return (an - bn) * dir;
      }
      const as = av === null || av === undefined ? "" : String(av).toLowerCase();
      const bs = bv === null || bv === undefined ? "" : String(bv).toLowerCase();
      if (as < bs) return -1 * dir;
      if (as > bs) return 1 * dir;
      return 0;
    });
    return list;
  }, [items, locFilter, floorFilter, resFilter, sortKey, sortDir]);

  const toggleSort = useCallback((key: SortKey) => {
    setSortKey((prevKey) => {
      if (prevKey === key) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        return prevKey;
      }
      setSortDir("asc");
      return key;
    });
  }, []);

  const openOutModal = useCallback((item: StockItem) => setModal({ type: "out", item }), []);
  const openInModal = useCallback(
    (prefill?: Partial<{ material: string; brand: string; batchNo: string; location: string }>) => {
      setModal({
        type: "in",
        form: { material: "", brand: "", batchNo: "", mfg: "", exp: "", location: "", packingRows: [{ size: "", count: "1" }], ...prefill },
      });
    },
    [],
  );
  const openTransferModal = useCallback(
    (item: StockItem) =>
      setModal({
        type: "transfer",
        item,
        form: {
          material: item.material || "",
          brand: item.brand || "",
          batchNo: item.batchNo !== null && item.batchNo !== undefined ? String(item.batchNo) : "",
          mfg: item.mfg || "",
          exp: item.exp || "",
          location: "",
          packingRows: [{ size: item.packing !== null && item.packing !== undefined ? String(item.packing) : "", count: "1" }],
        },
      }),
    [],
  );
  const openEditModal = useCallback(
    (item: StockItem) =>
      setModal({
        type: "edit",
        item,
        form: {
          material: item.material || "",
          brand: item.brand || "",
          batchNo: item.batchNo !== null && item.batchNo !== undefined ? String(item.batchNo) : "",
          mfg: item.mfg || "",
          exp: item.exp || "",
          packing: item.packing !== null && item.packing !== undefined ? String(item.packing) : "",
          packingDetail: item.packingDetail || "",
          totalStock: item.totalStock !== null && item.totalStock !== undefined ? String(item.totalStock) : "",
          location: item.location || "",
        },
      }),
    [],
  );
  const openProduceModal = useCallback((item?: StockItem) => {
    setModal({
      type: "produce",
      form: {
        outputMaterial: "",
        outputBrand: "",
        outputBatchNo: "",
        outputMfg: "",
        outputExp: "",
        outputLocation: "",
        ingredients: [{ itemId: item ? item.id : "", qty: "" }],
      },
    });
  }, []);

  const closeModal = useCallback(() => setModal(null), []);

  const reserveItem = useCallback(
    (item: StockItem, types: string[], qty: number) =>
      runAction(() => ledgerApi.reserve(item.id, types, qty), "Reservation saved."),
    [runAction],
  );

  const unreserveItem = useCallback((item: StockItem) => runAction(() => ledgerApi.unreserve(item.id), "Reservation cleared."), [runAction]);

  const orderItem = useCallback(
    (item: StockItem, qty: number) => runAction(() => ledgerApi.order(item.id, qty), "Marked in order."),
    [runAction],
  );

  const unorderItem = useCallback((item: StockItem) => runAction(() => ledgerApi.unorder(item.id), "In-order cleared."), [runAction]);

  const confirmOut = useCallback(
    async (qty: number) => {
      if (!modal || modal.type !== "out") return;
      const ok = await runAction(() => ledgerApi.stockOut(modal.item.id, qty), "Stock moved OUT.");
      if (ok) closeModal();
    },
    [modal, runAction, closeModal],
  );

  const confirmIn = useCallback(
    async (form: { material: string; brand: string; batchNo: string; mfg: string; exp: string; location: string }, packingRows: PackingRowInput[]) => {
      if (!modal || modal.type !== "in") return;
      const ok = await runAction(() => ledgerApi.stockIn({ ...form, packingRows }), "New stock recorded.");
      if (ok) closeModal();
    },
    [modal, runAction, closeModal],
  );

  const confirmProduce = useCallback(
    async (
      form: {
        outputMaterial: string;
        outputBrand: string;
        outputBatchNo: string;
        outputMfg: string;
        outputExp: string;
        outputLocation: string;
      },
      ingredients: IngredientRowInput[],
    ) => {
      if (!modal || modal.type !== "produce") return;
      const ok = await runAction(() => ledgerApi.produce({ ...form, ingredients }), "Compound produced.");
      if (ok) closeModal();
    },
    [modal, runAction, closeModal],
  );

  const confirmTransfer = useCallback(
    async (form: { material: string; brand: string; batchNo: string; mfg: string; exp: string; location: string }, packingRows: PackingRowInput[]) => {
      if (!modal || modal.type !== "transfer") return;
      const ok = await runAction(() => ledgerApi.transfer(modal.item.id, { ...form, packingRows }), "Stock transferred.");
      if (ok) closeModal();
    },
    [modal, runAction, closeModal],
  );

  const confirmEdit = useCallback(
    async (form: {
      material: string;
      brand: string;
      batchNo: string;
      mfg: string;
      exp: string;
      packing: string;
      packingDetail: string;
      totalStock: string;
      location: string;
    }) => {
      if (!modal || modal.type !== "edit") return;
      const ok = await runAction(() => ledgerApi.edit(modal.item.id, form), "Row updated.");
      if (ok) closeModal();
    },
    [modal, runAction, closeModal],
  );

  const deleteItem = useCallback(
    (item: StockItem) => {
      if (!confirm('Delete this stock row for "' + item.material + '"? This cannot be undone except with the Undo button.')) return;
      runAction(() => ledgerApi.remove(item.id), "Row deleted.");
    },
    [runAction],
  );

  const undoLast = useCallback(() => runAction(() => ledgerApi.undo(), "Last action undone."), [runAction]);

  const exportToExcel = useCallback(() => {
    const csvEscape = (v: unknown) => {
      const s = v === null || v === undefined ? "" : String(v);
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    const rows = filteredItems;
    const headers = ["Material", "Brand", "Packing", "Batch", "Mfg", "Exp", "Stock (kg)", "Bin", "Reservation Type", "Reserved Qty (kg)"];
    const lines = [headers.map(csvEscape).join(",")];
    rows.forEach((it) => {
      lines.push(
        [
          it.material,
          it.brand || "",
          formatPacking(it),
          it.batchNo || "",
          it.mfg || "",
          it.exp || "",
          fmtNum(it.totalStock),
          it.location || "",
          (it.reservation && it.reservation.type.join(", ")) || "",
          it.reservation ? fmtNum(it.reservation.qty) : "",
        ]
          .map(csvEscape)
          .join(","),
      );
    });
    const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "stock_location_ledger_" + new Date().toISOString().slice(0, 10) + ".csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [filteredItems]);

  return {
    loaded,
    items,
    locations,
    txLog,
    tab,
    setTab,
    search,
    setSearch,
    logSearch,
    setLogSearch,
    locFilter,
    setLocFilter,
    floorFilter,
    setFloorFilter,
    floors,
    resFilter,
    setResFilter,
    sortKey,
    sortDir,
    toggleSort,
    page,
    setPage,
    pageSize,
    modal,
    setModal,
    toast,
    canUndo,
    occupiedLocationCodes,
    locationOccupants,
    allLocations,
    distinctMaterials,
    filteredItems,
    openOutModal,
    openInModal,
    openTransferModal,
    openEditModal,
    openProduceModal,
    closeModal,
    reserveItem,
    unreserveItem,
    orderItem,
    unorderItem,
    confirmOut,
    confirmIn,
    confirmTransfer,
    confirmEdit,
    confirmProduce,
    deleteItem,
    exportToExcel,
    undoLast,
  };
}
