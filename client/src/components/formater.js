export const DASHBOARD_LOCALE = "en-US";
export const DASHBOARD_CURRENCY = "USD";

export function parseIsoCalendarDate(isoDate) {
  return new Date(`${isoDate}T12:00:00`);
}

export function formatDate(isoDate, style) {
  const date = parseIsoCalendarDate(isoDate);
  if (style === "month") {
    return date.toLocaleDateString(DASHBOARD_LOCALE, { month: "short" });
  }
  if (style === "day-month") {
    return date.toLocaleDateString(DASHBOARD_LOCALE, {
      day: "numeric",
      month: "short",
    });
  }
  return date.toLocaleDateString(DASHBOARD_LOCALE, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatChartAxisTick(isoDate, periodDays) {
  const date = parseIsoCalendarDate(isoDate);
  if (periodDays <= 7) {
    return date.toLocaleDateString(DASHBOARD_LOCALE, { weekday: "short" });
  }
  return formatDate(isoDate, "day-month");
}

export function formatChartTooltipDate(isoDate, weekdayStyle = "short") {
  const date = parseIsoCalendarDate(isoDate);
  return date.toLocaleDateString(DASHBOARD_LOCALE, {
    weekday: weekdayStyle,
    day: "numeric",
    month: "short",
  });
}

export function formatCurrency(value) {
  return new Intl.NumberFormat(DASHBOARD_LOCALE, {
    currency: DASHBOARD_CURRENCY,
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}

export function formatCompactCurrency(value, options) {
  const { maximumFractionDigits = 0 } = options ?? {};
  return new Intl.NumberFormat(DASHBOARD_LOCALE, {
    currency: DASHBOARD_CURRENCY,
    maximumFractionDigits,
    notation: "compact",
    style: "currency",
  }).format(value);
}

export function formatFullCurrency(value) {
  return new Intl.NumberFormat(DASHBOARD_LOCALE, {
    currency: DASHBOARD_CURRENCY,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    style: "currency",
  }).format(value);
}

export function formatCompactNumber(value) {
  return new Intl.NumberFormat(DASHBOARD_LOCALE, {
    maximumFractionDigits: 1,
    notation: "compact",
  }).format(value);
}

export function formatInteger(value) {
  return new Intl.NumberFormat(DASHBOARD_LOCALE, {
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPercent(value, fractionDigits = 2) {
  return `${value.toFixed(fractionDigits)}%`;
}
