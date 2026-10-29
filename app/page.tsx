import { Suspense } from "react";
import { LiveStatus } from "./_components/LiveStatus";

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-svh bg-page" />}>
      <LiveStatus />
    </Suspense>
  );
}
