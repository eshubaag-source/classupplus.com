"use client";

import VehicleFeesPage from "./dashboard/vehicle-fees/page";

export default function Home() {
  return (
    <div style={{ padding: "2rem" }}>
      <h1 style={{ fontSize: "2rem", marginBottom: "0rem" }}>Vehicle Fees Overview</h1>
      <hr className="horizontalBar" />
      <VehicleFeesPage />
    </div>
  );
}
