import { handle, readJson } from "@/lib/http";
import { dailyTargets, mealShare, tdee, bmr } from "@/lib/targets";
import { parseProfile } from "@/lib/validate";

// POST /api/targets { profile }
export async function POST(req: Request) {
  return handle(async () => {
    const profile = parseProfile((await readJson(req)).profile);
    const daily = dailyTargets(profile);
    return {
      bmr: Math.round(bmr(profile)),
      maintenance: Math.round(tdee(profile)),
      daily,
      mealShares: Object.fromEntries(profile.diningMeals.map((m) => [m, mealShare(m, profile)])),
    };
  });
}
