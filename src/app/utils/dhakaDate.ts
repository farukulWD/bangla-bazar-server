export const DHAKA_TIME_ZONE = "Asia/Dhaka";
export const CALENDAR_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const DHAKA_OFFSET = "+06:00";

export const dhakaToday = (): string =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: DHAKA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

export const isCalendarDate = (value: string): boolean => {
  if (!CALENDAR_DATE_PATTERN.test(value)) {
    return false;
  }

  const parsed = new Date(`${value}T00:00:00Z`);

  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
};

export const addCalendarDays = (date: string, days: number): string =>
  new Date(new Date(`${date}T00:00:00Z`).getTime() + days * 86_400_000)
    .toISOString()
    .slice(0, 10);

export const daysBetween = (from: string, to: string): number =>
  Math.round(
    (new Date(`${to}T00:00:00Z`).getTime() -
      new Date(`${from}T00:00:00Z`).getTime()) /
      86_400_000,
  );

export const startInstant = (date: string): Date =>
  new Date(`${date}T00:00:00${DHAKA_OFFSET}`);

export const endInstantExclusive = (date: string): Date =>
  startInstant(addCalendarDays(date, 1));
