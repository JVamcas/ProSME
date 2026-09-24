export function formatTaskConfiguration(config: unknown) {
  return JSON.stringify(config, null, 2);
}
