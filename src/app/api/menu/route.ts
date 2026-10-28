import { handle } from "@/lib/http";
import { getDayMenu, todayInWestLafayette } from "@/lib/purdue";
import { currentMealName } from "@/lib/recommend";
import { parseDate, ValidationError } from "@/lib/validate";

// GET /api/menu?location=Wiley&date=2026-10-27
export async function GET(req: Request) {
  return handle(async () => {
    const params = new URL(req.url).searchParams;
    const location = params.get("location");
    if (!location) throw new ValidationError("location is required");
    const date = parseDate(params.get("date"), todayInWestLafayette());
    const menu = await getDayMenu(location, date);
    return { ...menu, currentMeal: currentMealName(menu) };
  });
}
