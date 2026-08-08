"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseISO(value: string): Date | null {
  if (!value) return null;
  const d = new Date(value + "T00:00:00");
  return isNaN(d.getTime()) ? null : d;
}

function Calendar({
  selected,
  onSelect,
  style,
}: {
  selected: Date | null;
  onSelect: (d: Date) => void;
  style?: React.CSSProperties;
}) {
  const base = selected || new Date();
  const [viewYear, setViewYear] = useState(base.getFullYear());
  const [viewMonth, setViewMonth] = useState(base.getMonth());
  const today = new Date();

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11); } else setViewMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0); } else setViewMonth((m) => m + 1);
  };

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (Date | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(viewYear, viewMonth, i + 1)),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="date-calendar" style={style}>
      <div className="date-calendar-head">
        <button type="button" onClick={prevMonth}>‹</button>
        <span>{MONTHS[viewMonth]} {viewYear}</span>
        <button type="button" onClick={nextMonth}>›</button>
      </div>
      <div className="date-calendar-grid date-calendar-dow">
        {DAYS.map((d) => <span key={d}>{d}</span>)}
      </div>
      <div className="date-calendar-grid">
        {cells.map((d, i) => {
          if (!d) return <span key={i} />;
          const iso = isoDate(d);
          const isSelected = selected ? iso === isoDate(selected) : false;
          const isToday = iso === isoDate(today);
          return (
            <button
              type="button"
              key={i}
              onClick={() => onSelect(d)}
              className={`date-cell${isSelected ? " is-selected" : ""}${isToday ? " is-today" : ""}`}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const POPUP_WIDTH = 230;

export default function DateField({
  value,
  onChange,
  required,
  disabled,
  placeholder = "Select date",
}: {
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useLayoutEffect(() => {
    if (!open || !inputRef.current) return;
    const rect = inputRef.current.getBoundingClientRect();
    const left = Math.min(rect.left, window.innerWidth - POPUP_WIDTH - 8);
    setPos({ top: rect.bottom + 4, left: Math.max(8, left) });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDocPointer = (e: MouseEvent) => {
      const target = e.target as Node;
      if (wrapRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDocPointer);
    return () => document.removeEventListener("mousedown", onDocPointer);
  }, [open]);

  return (
    <div className="date-field" ref={wrapRef}>
      <input
        ref={inputRef}
        type="text"
        readOnly
        required={required}
        disabled={disabled}
        placeholder={placeholder}
        value={value}
        onClick={() => !disabled && setOpen((o) => !o)}
      />
      {open &&
        !disabled &&
        createPortal(
          <Calendar
            selected={parseISO(value)}
            onSelect={(d) => {
              onChange(isoDate(d));
              setOpen(false);
            }}
            style={{ position: "fixed", top: pos.top, left: pos.left, width: POPUP_WIDTH, zIndex: 200 }}
          />,
          document.body,
        )}
    </div>
  );
}
