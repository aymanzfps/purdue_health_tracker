import type { DayMenu, Profile, Recommendation } from "../types";
import type { CourtComparison } from "../recommend";

export type MenuResponse = DayMenu & { currentMeal: string | null };

/** `code` is "not_released" when Purdue hasn't posted that day's menu yet. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly code?: string,
  ) {
    super(message);
  }
}

export const isNotReleased = (e: unknown) => e instanceof ApiError && e.code === "not_released";

async function request<T>(url: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, {
    method: body === undefined ? "GET" : "POST",
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const { error, code } = data as { error?: string; code?: string };
    throw new ApiError(error ?? "Something went wrong. Try again.", code);
  }
  return data as T;
}

export const api = {
  menu: (location: string, date: string, signal?: AbortSignal) =>
    request<MenuResponse>(`/api/menu?location=${encodeURIComponent(location)}&date=${date}`, undefined, signal),
  recommend: (
    body: { profile: Profile; location: string; date: string; meal?: string; exclude?: string[]; lock?: string[] },
    signal?: AbortSignal,
  ) => request<Recommendation>("/api/recommend", body, signal),
  compare: (body: { profile: Profile; meal: string; date: string }, signal?: AbortSignal) =>
    request<{ date: string; meal: string; courts: CourtComparison[] }>("/api/compare", body, signal),
};
