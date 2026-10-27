import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/w/$slug/suporte")({
  component: LayoutSuporte,
  head: () => ({ meta: [{ title: "Suporte | Nutricar" }] }),
});

function LayoutSuporte() {
  return (
    <div className="min-h-full bg-muted/30 px-4 py-4 sm:px-6">
      <Outlet />
    </div>
  );
}
