function fieldErrorMessages(fields?: Record<string, string[]>) {
  return [...new Set(Object.values(fields ?? {}).flat())].filter(
    (message) => message.trim().length > 0,
  );
}

function fieldErrorMessage(fields?: Record<string, string[]>) {
  const messages = fieldErrorMessages(fields);
  const visible = messages.slice(0, 3);
  const remaining = messages.length - visible.length;

  if (!visible.length) return undefined;

  return [
    visible.join(" "),
    remaining > 0
      ? `${remaining} more validation ${remaining === 1 ? "issue requires" : "issues require"} attention.`
      : "",
  ]
    .filter(Boolean)
    .join(" ");
}

export class ClientRequestError extends Error {
  readonly code?: string;
  readonly conflict?: Record<string, number | string>;
  readonly correlationId?: string;
  readonly fields?: Record<string, string[]>;
  readonly status: number;

  constructor(
    message: string,
    status: number,
    details: {
      code?: string;
      conflict?: Record<string, number | string>;
      correlationId?: string;
      fields?: Record<string, string[]>;
    } = {},
  ) {
    super(fieldErrorMessage(details.fields) ?? message);
    this.name = "ClientRequestError";
    this.status = status;
    this.code = details.code;
    this.conflict = details.conflict;
    this.correlationId = details.correlationId;
    this.fields = details.fields;
  }
}

export function getErrorMessages(error: unknown): string[] {
  if (error instanceof ClientRequestError) {
    const messages = fieldErrorMessages(error.fields);
    if (messages.length > 0) return messages;
  }

  const message = getErrorMessage(error);
  return message ? [message] : [];
}

export function getErrorMessage(error: unknown) {
  if (typeof error === "string" && error.trim()) {
    return error;
  }

  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string" &&
    error.message.trim()
  ) {
    return error.message;
  }

  return undefined;
}

type ErrorPayload = {
  error?:
    | string
    | {
        code?: string;
        conflict?: Record<string, number | string>;
        fields?: Record<string, string[]>;
        message?: string;
      };
  meta?: {
    correlationId?: string;
  };
};

type DataEnvelope<TData> = {
  data: TData;
  meta: {
    correlationId: string;
  };
};

async function parseResponse<TResponse>(response: Response) {
  const body = (await response.json().catch(() => null)) as
    TResponse | ErrorPayload | null;

  if (!response.ok) {
    const error = body as ErrorPayload | null;
    const structuredError =
      error?.error && typeof error.error === "object" ? error.error : undefined;
    const message =
      typeof error?.error === "string" ? error.error : structuredError?.message;

    throw new ClientRequestError(
      message ?? "The request could not be completed.",
      response.status,
      {
        code: structuredError?.code,
        conflict: structuredError?.conflict,
        correlationId: error?.meta?.correlationId,
        fields: structuredError?.fields,
      },
    );
  }

  return body as TResponse;
}

export async function requestJson<TResponse>(path: string, init?: RequestInit) {
  const response = await fetch(path, init);
  return parseResponse<TResponse>(response);
}

export async function requestData<TData>(path: string, init?: RequestInit) {
  const envelope = await requestJson<DataEnvelope<TData>>(path, init);
  return envelope.data;
}

export async function postJson<TResponse, TBody>(path: string, body: TBody) {
  return requestJson<TResponse>(path, {
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });
}

export async function postData<TData, TBody>(path: string, body: TBody) {
  return requestData<TData>(path, {
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });
}

export async function patchData<TData, TBody>(path: string, body: TBody) {
  return requestData<TData>(path, {
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
    },
    method: "PATCH",
  });
}

export async function deleteData<TData>(path: string) {
  return requestData<TData>(path, { method: "DELETE" });
}

export async function requestBlob(path: string, init?: RequestInit) {
  const response = await fetch(path, init);
  if (!response.ok) {
    await parseResponse(response);
  }
  return response.blob();
}
