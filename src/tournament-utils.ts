export const utcTime = (date: string) => Date.parse(date.length === 10 ? `${date}T00:00:00Z` : date);
export const isoTime = (time: number) => new Date(time).toISOString();
export const formatDate = (date: string, includeTime = false) => new Intl.DateTimeFormat(undefined, {
  year: "numeric", month: "short", day: "numeric", ...(includeTime ? { hour: "2-digit", minute: "2-digit", timeZoneName: "short" } as const : { timeZone: "UTC" }),
}).format(new Date(date));
export const hashSeed = (text: string) => [...text].reduce((n, ch) => (Math.imul(n, 31) + ch.charCodeAt(0)) >>> 0, 7);
export const formatPrize = (value: number) => new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", minimumFractionDigits: Number.isInteger(value) ? 0 : 2, maximumFractionDigits: 2 }).format(value);
