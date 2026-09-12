export class ClientRequestError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ClientRequestError";
    this.status = status;
  }
}

type ErrorPayload = {
  error?: string;
};

async function parseResponse<TResponse>(response: Response) {
  const body = (await response.json().catch(() => null)) as
    | TResponse
    | ErrorPayload
    | null;

  if (!response.ok) {
    const error = body as ErrorPayload | null;
    throw new ClientRequestError(
      error?.error ?? "The request could not be completed.",
      response.status,
    );
  }

  return body as TResponse;
}

export async function requestJson<TResponse>(
  path: string,
  init?: RequestInit,
) {
  const response = await fetch(path, init);
  return parseResponse<TResponse>(response);
}

export async function postJson<TResponse, TBody>(
  path: string,
  body: TBody,
) {
  return requestJson<TResponse>(path, {
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });
}
