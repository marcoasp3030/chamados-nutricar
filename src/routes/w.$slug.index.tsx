import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/w/$slug/")({
  component: RedirecionarPainel,
});

function RedirecionarPainel() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  useEffect(() => {
    navigate({ to: "/w/$slug/painel", params: { slug }, replace: true });
  }, [slug, navigate]);
  return null;
}
