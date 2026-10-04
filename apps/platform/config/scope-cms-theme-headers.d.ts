type HeaderRule = {
  source: string;
  headers: { key: string; value: string }[];
};

export function scopeCmsThemeHeaders(rules: HeaderRule[]): HeaderRule[];
