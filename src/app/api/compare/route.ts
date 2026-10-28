import { handle, readJson } from "@/lib/http";
import { todayInWestLafayette } from "@/lib/purdue";
import { compareCourts } from "@/lib/recommend";
import { parseDate, parseProfile, ValidationError } from "@/lib/validate";

// POST /api/compare { profile, meal, date? }
export async function POST(req: Request) {
  return handle(async () => {
    const body = await readJson(req);
    const profile = parseProfile(body.profile);
    if (typeof body.meal !== "string" || !body.meal) throw new ValidationError("meal is required");
    const date = parseDate(body.date, todayInWestLafayette());
    return { date, meal: body.meal, courts: await compareCourts(profile, date, body.meal) };
  });
}
