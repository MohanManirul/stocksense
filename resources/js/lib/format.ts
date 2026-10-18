const LOCALE = 'en-IN';
const TIME_ZONE = 'Asia/Dhaka';

const currency = new Intl.NumberFormat(LOCALE, {
  style: 'currency',
  currency: 'BDT',
  currencyDisplay: 'narrowSymbol',
});
const compactCurrency = new Intl.NumberFormat(LOCALE, {
  style: 'currency',
  currency: 'BDT',
  currencyDisplay: 'narrowSymbol',
  notation: 'compact',
  maximumFractionDigits: 1,
});
const number = new Intl.NumberFormat(LOCALE);

const dateFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: TIME_ZONE });
const shortDate = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: TIME_ZONE });
const dateTime = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
  timeZone: TIME_ZONE,
});
const weekday = new Intl.DateTimeFormat('en-GB', { weekday: 'short', timeZone: TIME_ZONE });

export const money = (value: string | number) => currency.format(Number(value));

export const moneyCompact = (value: number) =>
  Math.abs(value) >= 1_00_000 ? compactCurrency.format(value) : currency.format(value);

export const qty = (value: number) => number.format(value);

export const percent = (value: number | null | undefined, digits = 1) =>
  value === null || value === undefined ? '—' : `${(value * 100).toFixed(digits)}%`;

const parseDay = (value: string) => (value.length === 10 ? new Date(`${value}T00:00:00+06:00`) : new Date(value));

export const date = (value: string | null) => (value ? dateFormat.format(parseDay(value)) : '—');

export const dayLabel = (value: string) => shortDate.format(parseDay(value));

export const weekdayLabel = (value: string) => weekday.format(parseDay(value));

export const dateTimeLabel = (value: string | null) => (value ? dateTime.format(new Date(value)) : '—');

export const signed = (value: number) => (value > 0 ? `+${number.format(value)}` : number.format(value));