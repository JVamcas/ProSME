export type DatedHomeItem = {
  id: number;
  createdAt: string;
  publishedAt?: string | null;
};

export function selectLatestHomeItems<T extends DatedHomeItem>(
  dated: T[],
  undated: T[],
): T[] {
  return [...dated, ...undated]
    .sort((first, second) => {
      const firstDate = first.publishedAt ?? first.createdAt;
      const secondDate = second.publishedAt ?? second.createdAt;
      return secondDate.localeCompare(firstDate) || second.id - first.id;
    })
    .slice(0, 2);
}
