import type {
  ChecklistResultItem,
  CommentResultItem,
  DocumentResultItem,
  SaveTaskReviewDraftInput,
  ScoreResultItem,
} from "@/modules/work-queue/TaskTypes";

export type ReviewAutosaveValues = {
  comments: CommentResultItem[];
  documents: DocumentResultItem[];
  items: ChecklistResultItem[];
  scores: ScoreResultItem[];
};

function changedItems<T>(
  previous: T[],
  current: T[],
  key: (item: T) => string,
) {
  const previousByKey = new Map(
    previous.map((item) => [key(item), JSON.stringify(item)]),
  );
  return current.filter(
    (item) => previousByKey.get(key(item)) !== JSON.stringify(item),
  );
}

export function createReviewDraftPatch(
  previous: ReviewAutosaveValues,
  current: ReviewAutosaveValues,
): SaveTaskReviewDraftInput {
  const comments = changedItems(
    previous.comments,
    current.comments,
    (item) => item.key,
  );
  const documents = changedItems(
    previous.documents,
    current.documents,
    (item) => item.category,
  );
  const items = changedItems(previous.items, current.items, (item) => item.code);
  const scores = changedItems(
    previous.scores,
    current.scores,
    (item) => item.criterion,
  );
  return {
    ...(comments.length ? { comments } : {}),
    ...(documents.length ? { documents } : {}),
    ...(items.length ? { items } : {}),
    ...(scores.length ? { scores } : {}),
  };
}

function mergeItems<T>(
  current: T[] | undefined,
  next: T[] | undefined,
  key: (item: T) => string,
) {
  if (!current && !next) return undefined;
  const merged = new Map<string, T>();
  current?.forEach((item) => merged.set(key(item), item));
  next?.forEach((item) => merged.set(key(item), item));
  return [...merged.values()];
}

export function mergeReviewDraftPatches(
  current: SaveTaskReviewDraftInput,
  next: SaveTaskReviewDraftInput,
): SaveTaskReviewDraftInput {
  const comments = mergeItems(
    current.comments,
    next.comments,
    (item) => item.key,
  );
  const documents = mergeItems(
    current.documents,
    next.documents,
    (item) => item.category,
  );
  const items = mergeItems(current.items, next.items, (item) => item.code);
  const scores = mergeItems(
    current.scores,
    next.scores,
    (item) => item.criterion,
  );
  return {
    ...(comments?.length ? { comments } : {}),
    ...(documents?.length ? { documents } : {}),
    ...(items?.length ? { items } : {}),
    ...(scores?.length ? { scores } : {}),
  };
}

export function reviewDraftPatchIsEmpty(patch: SaveTaskReviewDraftInput) {
  return !patch.comments?.length
    && !patch.documents?.length
    && !patch.items?.length
    && !patch.scores?.length;
}
