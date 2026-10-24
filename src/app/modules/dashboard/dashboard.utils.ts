import httpStatus from "http-status";

import AppError from "../../errors/AppError";
import {
  addCalendarDays,
  daysBetween,
  dhakaToday,
  endInstantExclusive,
  isCalendarDate,
  startInstant,
} from "../../utils/dhakaDate";
import {
  DEFAULT_RANGE_DAYS,
  MAX_RANGE_DAYS,
  WEEKLY_THRESHOLD_DAYS,
} from "./dashboard.constant";
import { TGranularity, TSeries, TSeriesPoint } from "./dashboard.interface";

export type TResolvedRange = {
  from: string;
  to: string;
  fromAt: Date;
  toAtExclusive: Date;
  prevFromAt: Date;
  prevToAtExclusive: Date;
  days: number;
  granularity: TGranularity;
};

export const resolveRange = (
  fromRaw?: string,
  toRaw?: string,
): TResolvedRange => {
  const to = toRaw ?? dhakaToday();
  const from = fromRaw ?? addCalendarDays(to, -(DEFAULT_RANGE_DAYS - 1));

  if (!isCalendarDate(from) || !isCalendarDate(to)) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "`from` and `to` must be YYYY-MM-DD dates",
    );
  }

  const days = daysBetween(from, to) + 1;

  if (days <= 0) {
    throw new AppError(httpStatus.BAD_REQUEST, "`from` must not be after `to`");
  }
  if (days > MAX_RANGE_DAYS) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Range is capped at ${MAX_RANGE_DAYS} days`,
    );
  }

  const prevTo = addCalendarDays(from, -1);
  const prevFrom = addCalendarDays(prevTo, -(days - 1));

  return {
    from,
    to,
    fromAt: startInstant(from),
    toAtExclusive: endInstantExclusive(to),
    prevFromAt: startInstant(prevFrom),
    prevToAtExclusive: endInstantExclusive(prevTo),
    days,
    granularity: days > WEEKLY_THRESHOLD_DAYS ? "week" : "day",
  };
};

export const dayKeys = (from: string, to: string): string[] => {
  const keys: string[] = [];
  for (
    let cursor = from;
    daysBetween(cursor, to) >= 0;
    cursor = addCalendarDays(cursor, 1)
  ) {
    keys.push(cursor);
  }
  return keys;
};

export const foldToWeeks = (points: TSeriesPoint[]): TSeriesPoint[] => {
  const folded: TSeriesPoint[] = [];
  for (let i = 0; i < points.length; i += 7) {
    const chunk = points.slice(i, i + 7);
    folded.push({
      bucket: chunk[0].bucket,
      value: chunk.reduce((sum, point) => sum + point.value, 0),
    });
  }
  return folded;
};

export const fillSeries = (
  counts: Map<string, number>,
  range: TResolvedRange,
): TSeries => {
  const daily = dayKeys(range.from, range.to).map((day) => ({
    bucket: day,
    value: counts.get(day) ?? 0,
  }));

  return range.granularity === "day"
    ? { granularity: "day", points: daily }
    : { granularity: "week", points: foldToWeeks(daily) };
};

export const toCountMap = (
  rows: { _id: string; value: number }[],
): Map<string, number> => new Map(rows.map((row) => [row._id, row.value]));
