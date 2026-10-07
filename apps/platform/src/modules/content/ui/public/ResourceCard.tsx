import type { ListingItem } from "../../ContentTypes";
import { ContentListingCard } from "./ContentListingCard";

export function ResourceCard({ item }: { item: ListingItem }) {
  return (
    <ContentListingCard headingAs="h2" item={item} kind="resource" />
  );
}
