import assert from "node:assert/strict";
import test from "node:test";

import {
  groupSlotsByUtcDate,
  hoursUntil,
  normalizeAvailableSlots,
  slotId,
} from "../src/lib/reservation-utils.js";

test("available slots are filtered and sorted", () => {
  const result = normalizeAvailableSlots([
    { id: "later", startTime: "2026-09-25T10:00:00Z", status: "Available", isActive: true },
    { id: "reserved", startTime: "2026-09-25T08:00:00Z", status: "Reserved", isActive: true },
    { _id: "earlier", startTimeUtc: "2026-09-25T06:00:00Z", status: "Available", isActive: true },
    { id: "inactive", startTime: "2026-09-25T07:00:00Z", status: "Available", isActive: false },
  ]);

  assert.deepEqual(result.map(slotId), ["earlier", "later"]);
});

test("slots are grouped by UTC calendar date", () => {
  const groups = groupSlotsByUtcDate([
    { id: "one", startTime: "2026-09-25T23:00:00Z", status: "Available" },
    { id: "two", startTime: "2026-09-26T01:00:00Z", status: "Available" },
  ]);

  assert.deepEqual([...groups.keys()], ["2026-09-25", "2026-09-26"]);
});

test("hours remaining uses the supplied current time", () => {
  const result = hoursUntil("2026-09-25T18:00:00Z", new Date("2026-09-25T06:00:00Z"));
  assert.equal(result, 12);
});
