"use client";

import { useCallback, useEffect, useState } from "react";
import type { Profile } from "../types";

const KEY = "boilerplate.profile.v1";
const CHANGE_EVENT = "boilerplate:profile";

export const DEFAULT_PROFILE: Profile = {
  weightKg: 77,
  heightCm: 178,
  age: 20,
  sex: "male",
  activity: "moderate",
  goal: "lean_bulk",
  diningMeals: ["Breakfast", "Lunch", "Dinner"],
  snacksPerDay: 0,
  isTrainingDay: true,
  vegetarian: false,
  vegan: false,
  avoidAllergens: [],
  dislikes: [],
  allowDessert: false,
};

function load(): Profile | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as Partial<Profile> & { mealsPerDay?: number };
    // Profiles saved before meal choices existed had a meals-per-day count instead.
    if (!saved.diningMeals && saved.mealsPerDay !== undefined) {
      if (saved.mealsPerDay <= 2) saved.diningMeals = ["Lunch", "Dinner"];
      saved.snacksPerDay = Math.max(0, saved.mealsPerDay - 3);
    }
    delete saved.mealsPerDay;
    return { ...DEFAULT_PROFILE, ...saved };
  } catch {
    return null;
  }
}

/** The saved profile lives in this browser only. `ready` is false until it has been read. */
export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sync = () => setProfile(load());
    sync();
    setReady(true);
    window.addEventListener(CHANGE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const save = useCallback((next: Profile) => {
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      // Private mode or blocked storage: keep it for this page view at least.
    }
    setProfile(next);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  return { profile, ready, save };
}
