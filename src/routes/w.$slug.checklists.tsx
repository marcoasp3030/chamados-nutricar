import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/w/$slug/checklists")({
  component: () => (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <Outlet />
    </div>
  ),
  head: () => ({ meta: [{ title: "Checklists | Nutricar" }] }),
});
