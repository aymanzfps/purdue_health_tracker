import type { DayMenu, Profile, Recommendation } from "../types";
import type { CourtComparison } from "../recommend";

export type MenuResponse = DayMenu & { currentMeal: string | null };

async function request<T>(url: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, {
    method: body === undefined ? "GET" : "POST",
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? "Something went wrong. Try again.");
  return data as T;
}

export const api = {
  menu: (location: string, signal?: AbortSignal) =>
    request<MenuResponse>(`/api/menu?location=${encodeURIComponent(location)}`, undefined, signal),
  recommend: (
    body: { profile: Profile; location: string; meal?: string; exclude?: string[]; lock?: string[] },
    signal?: AbortSignal,
  ) => request<Recommendation>("/api/recommend", body, signal),
  compare: (body: { profile: Profile; meal: string }, signal?: AbortSignal) =>
    request<{ date: string; meal: string; courts: CourtComparison[] }>("/api/compare", body, signal),
};
