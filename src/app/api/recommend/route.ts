import { handle, readJson } from "@/lib/http";
import { todayInWestLafayette } from "@/lib/purdue";
import { recommend } from "@/lib/recommend";
import { parseDate, parseIdList, parseProfile, ValidationError } from "@/lib/validate";

// POST /api/recommend { profile, location, date?, meal?, exclude?, lock? }
export async function POST(req: Request) {
  return handle(async () => {
    const body = await readJson(req);
    const profile = parseProfile(body.profile);
    if (typeof body.location !== "string" || !body.location) throw new ValidationError("location is required");
    const date = parseDate(body.date, todayInWestLafayette());
    const meal = typeof body.meal === "string" && body.meal ? body.meal : undefined;
    return recommend(profile, body.location, date, meal, {
      exclude: parseIdList(body.exclude, "exclude"),
      lock: parseIdList(body.lock, "lock"),
    });
  });
}
