import { Suspense } from "react";
import { TodayView } from "@/components/TodayView";
import { Spinner } from "@/components/ui";

export default function TodayPage() {
  return (
    <Suspense fallback={<Spinner label="Loading" />}>
      <TodayView />
    </Suspense>
  );
}
