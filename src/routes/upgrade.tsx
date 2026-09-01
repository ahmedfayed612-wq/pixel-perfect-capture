import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/upgrade")({
  ssr: false,
  beforeLoad: () => {
    throw redirect({ to: "/app/upgrade" });
  },
  component: () => null,
});
