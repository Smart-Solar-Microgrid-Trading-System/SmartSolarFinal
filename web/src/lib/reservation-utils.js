const UTC_DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

const UTC_DATE_TIME_FORMATTER = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "UTC",
});

const UTC_TIME_FORMATTER = new Intl.DateTimeFormat("en-US", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "UTC",
});

export function slotId(slot) {
  return slot?.id ?? slot?._id ?? "";
}

export function slotStart(slot) {
  return slot?.startTime ?? slot?.startTimeUtc ?? slot?.scheduledStartUtc ?? "";
}

export function slotEnd(slot) {
  return slot?.endTime ?? slot?.endTimeUtc ?? "";
}

export function isAvailableSlot(slot) {
  return Boolean(slotId(slot) && slotStart(slot))
    && slot?.isActive !== false
    && String(slot?.status ?? "Available").toLowerCase() === "available";
}

export function normalizeAvailableSlots(slots) {
  return (Array.isArray(slots) ? slots : [])
    .filter(isAvailableSlot)
    .sort((left, right) => Date.parse(slotStart(left)) - Date.parse(slotStart(right)));
}

export function groupSlotsByUtcDate(slots) {
  return normalizeAvailableSlots(slots).reduce((groups, slot) => {
    const dateKey = new Date(slotStart(slot)).toISOString().slice(0, 10);
    const current = groups.get(dateKey) ?? [];
    current.push(slot);
    groups.set(dateKey, current);
    return groups;
  }, new Map());
}

export function formatUtcDate(value) {
  if (!value || Number.isNaN(Date.parse(value))) return "Not available";
  return UTC_DATE_FORMATTER.format(new Date(value));
}

export function formatUtcDateTime(value) {
  if (!value || Number.isNaN(Date.parse(value))) return "Not available";
  return `${UTC_DATE_TIME_FORMATTER.format(new Date(value))} UTC`;
}

export function formatUtcTimeRange(start, end) {
  if (!start || Number.isNaN(Date.parse(start))) return "Time unavailable";
  const startLabel = UTC_TIME_FORMATTER.format(new Date(start));
  const endLabel = end && !Number.isNaN(Date.parse(end))
    ? UTC_TIME_FORMATTER.format(new Date(end))
    : "—";
  return `${startLabel} – ${endLabel} UTC`;
}

export function hoursUntil(value, now = new Date()) {
  if (!value || Number.isNaN(Date.parse(value))) return Number.NaN;
  return (Date.parse(value) - now.getTime()) / 3_600_000;
}
