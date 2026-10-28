"use client";

import { useCallback, useEffect, useState } from "react";
import { todayInWestLafayette } from "./meals";

const KEY = "boilerplate.date";
const CHANGE_EVENT = "boilerplate:date";

function load(): string {
  try {
    const saved = sessionStorage.getItem(KEY);
    if (saved && /^\d{4}-\d{2}-\d{2}$/.test(saved)) return saved;
  } catch {}
  return todayInWestLafayette();
}

/**
 * The day being planned, shared by every page for this browser tab so
 * switching pages keeps it. A new tab starts on today.
 */
export function useSelectedDate() {
  const [date, setDateState] = useState(todayInWestLafayette);

  useEffect(() => {
    const sync = () => setDateState(load());
    sync();
    window.addEventListener(CHANGE_EVENT, sync);
    return () => window.removeEventListener(CHANGE_EVENT, sync);
  }, []);

  const setDate = useCallback((next: string) => {
    try {
      if (next === todayInWestLafayette()) sessionStorage.removeItem(KEY);
      else sessionStorage.setItem(KEY, next);
    } catch {}
    setDateState(next);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  return { date, setDate, isToday: date === todayInWestLafayette() };
}

/** Adds days to a YYYY-MM-DD date. */
export function shiftDate(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}
