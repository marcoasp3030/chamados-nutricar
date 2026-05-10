import { createFileRoute } from "@tanstack/react-router";
import { EditorTemplate } from "@/paginas/checklists/EditorTemplate";

export const Route = createFileRoute("/w/$slug/checklists/template")({
  component: EditorTemplate,
});
