type AuthFeedbackProps = {
  error?: string;
  notice?: string;
};

export function AuthFeedback({ error, notice }: AuthFeedbackProps) {
  return (
    <>
      {error ? (
        <p
          role="alert"
          className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </p>
      ) : null}
      {notice ? (
        <p
          role="status"
          className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-800"
        >
          {notice}
        </p>
      ) : null}
    </>
  );
}
