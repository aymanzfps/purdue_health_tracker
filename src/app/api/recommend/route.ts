import { handle, readJson } from "@/lib/http";
import { todayInWestLafayette } from "@/lib/purdue";
import { ALL_COURTS, recommend, recommendAcrossCourts } from "@/lib/recommend";
import { parseDate, parseIdList, parseProfile, ValidationError } from "@/lib/validate";

// POST /api/recommend { profile, location, date?, meal?, exclude?, lock? }
// location "all" pools every dining court's menu for that meal.
export async function POST(req: Request) {
  return handle(async () => {
    const body = await readJson(req);
    const profile = parseProfile(body.profile);
    if (typeof body.location !== "string" || !body.location) throw new ValidationError("location is required");
    const date = parseDate(body.date, todayInWestLafayette());
    const meal = typeof body.meal === "string" && body.meal ? body.meal : undefined;
    const opts = { exclude: parseIdList(body.exclude, "exclude"), lock: parseIdList(body.lock, "lock") };
    if (body.location === ALL_COURTS) {
      if (!meal) throw new ValidationError("meal is required for the best across all courts");
      return recommendAcrossCourts(profile, date, meal, opts);
    }
    return recommend(profile, body.location, date, meal, opts);
  });
}
