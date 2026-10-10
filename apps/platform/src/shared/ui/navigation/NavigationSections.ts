export type NavigationSectionId =
  | "overview"
  | "funding"
  | "account"
  | "content"
  | "queue"
  | "process-monitor"
  | "reporting"
  | "analytics"
  | "applications"
  | "chatbot"
  | "administration";

const labels: Record<NavigationSectionId, string> = {
  overview: "Overview",
  funding: "Funding",
  account: "My account",
  content: "Website content",
  queue: "My Queue",
  "process-monitor": "Process Monitor",
  analytics: "Analytics",
  reporting: "Reporting",
  applications: "Application management",
  chatbot: "Chatbot",
  administration: "Administration",
};

export function groupNavigationRoutes<
  T extends { id: string; section?: NavigationSectionId },
>(routes: readonly T[]) {
  const groups: { id: string; label?: string; routes: T[] }[] = [];
  for (const route of routes) {
    const id = route.section ?? route.id;
    const previous = groups.at(-1);
    if (previous?.id === id) {
      previous.routes.push(route);
    } else {
      groups.push({
        id,
        label: route.section ? labels[route.section] : undefined,
        routes: [route],
      });
    }
  }
  return groups;
}
