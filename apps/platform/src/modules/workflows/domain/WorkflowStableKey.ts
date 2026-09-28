const stableKeyPattern = /^[A-Z][A-Z0-9_]*$/;

export function isWorkflowStableKey(value: string) {
  return value.length >= 2
    && value.length <= 80
    && stableKeyPattern.test(value);
}

export function stableKeyFromLabel(value: string, fallback: string) {
  const key = value
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase();
  const prefixed = /^[A-Z]/.test(key) ? key : `${fallback}_${key}`;
  return prefixed.slice(0, 80) || fallback;
}
