import { getStatistics } from "../../ServerContentQueries";
import { homeImpactContent } from "../../HomeImpactContent";
import { HomeImpact } from "./HomeImpact";

export async function StatisticsBlock({
  block,
}: {
  block: Record<string, unknown>;
}) {
  const content = homeImpactContent(block);
  if (!content.items.length) {
    content.items = await getStatistics();
  }

  return <HomeImpact content={content} />;
}
