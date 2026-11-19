import { createFileRoute } from "@tanstack/react-router";
import { GroveApp } from "@/app/GroveApp";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Work Mode — Work & Rest Timer" },
      { name: "description", content: "A work/rest timer that grows a tree with every minute you focus." },
      { property: "og:title", content: "Work Mode — Work & Rest Timer" },
      { property: "og:description", content: "A work/rest timer that grows a tree with every minute you focus." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: GroveApp,
});
