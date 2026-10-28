import { handle } from "@/lib/http";
import { DINING_COURTS, getLocations } from "@/lib/purdue";

export async function GET() {
  return handle(async () => {
    const locations = await getLocations();
    return { diningCourts: DINING_COURTS, locations };
  });
}
