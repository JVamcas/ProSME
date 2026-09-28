export function formSectionCountsAsComplete({
  formCompleted,
  pending,
  ready,
  taskActionSubmission,
}: {
  formCompleted: boolean;
  pending: boolean;
  ready: boolean;
  taskActionSubmission: boolean;
}) {
  return formCompleted || (
    taskActionSubmission && ready && !pending
  );
}
