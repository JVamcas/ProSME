import type { ListingItem } from "../ContentTypes";

export const HOME_FEED_LIMIT = 4;

export type HomeFeedItem = ListingItem & {
  kind: "news" | "resource";
};

export function selectLatestHomeItems<T extends { id: number }>(
  items: T[],
  dateOf: (item: T) => string,
): T[] {
  return [...items]
    .sort((first, second) => {
      const firstDate = dateOf(first);
      const secondDate = dateOf(second);
      return secondDate.localeCompare(firstDate) || second.id - first.id;
    })
    .slice(0, HOME_FEED_LIMIT);
}
