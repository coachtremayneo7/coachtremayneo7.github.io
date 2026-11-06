// Shared helpers for the Challenge scheduling pages. Every time shown or entered is America/Chicago.
const CH_TZ = "America/Chicago";
const ERRORS = {
  unauthorized: "That link or key isn't valid. Check it and try again.",
  not_found: "That session or client isn't available.",
  not_eligible: "Booking isn't open for your account yet. Contact Coach TreMayne.",
  already_booked: "You're already booked into this session.",
  session_full: "This session just filled up. Pick another time.",
  weekly_limit: "You've reached your booking limit for this week.",
  outside_window: "Sessions can only be booked up to 90 days ahead, and not in the past.",
  not_enabled: "Booking isn't turned on for your account yet. Contact Coach TreMayne.",
  nonexistent_local_time: "That time doesn't exist on this date because of the daylight saving change. Pick another time.",
  ambiguous_local_time: "That time happens twice on this date because of the daylight saving change. Pick another time.",
  bad_hours: "Check the hours. Each block needs a start and end on the quarter hour, at least 45 minutes long, and blocks can't overlap.",
  bad_limit: "The weekly limit must be a whole number from 1 to 7.",
  session_unavailable: "This session is closed or has already started.",
  client_overlap: "This overlaps a session you already booked.",
  overlap: "This overlaps an existing session.",
  slot_exists: "A session already exists at that time.",
  outside_availability: "That time is outside the training windows.",
  bad_capacity: "Capacity must be between 1 and 20.",
  capacity_below_booked: "Capacity can't go below the number of booked participants.",
  bad_range: "Check the dates and try again.",
  overlaps_block: "That time overlaps time off that is still active. Release it first, or pick another time.",
  preview_changed: "Sessions or bookings changed since the preview. Preview again before blocking.",
  nothing_to_block: "No open sessions start in that range, so there is nothing to block.",
  time_blocked: "That time overlaps time off. Release the time off first, or pick another time.",
  bad_time: "Times must be on the quarter hour, and the end must be after the start.",
  block_not_active: "That block was already released.",
  bad_request: "Something in the request wasn't right.",
  server_error: "Something went wrong on our side. Try again.",
  network: "Can't reach the server right now. Check your connection and try again.",
};
function msgFor(code) { return ERRORS[code] || ("Something went wrong (" + code + ")."); }

// The API address comes from the page's <meta name="api-base">. PRODUCTION build: accepts only the production Worker
// (and localhost, used by the local test harness). Staging addresses are refused.
const PROD_API = "https://checkin-api.quantumflexpt.workers.dev";
function apiBase() {
  const m = document.querySelector('meta[name="api-base"]');
  const b = (m && m.content) || "";
  const prod = b === PROD_API;
  const local = /^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(b);
  if (!prod && !local) throw new Error("api-base is not the production Worker");
  return b;
}
async function apiCall(method, path, { key = null, query = "", body = null } = {}) {
  const headers = { "content-type": "application/json" };
  if (key) headers.authorization = "Bearer " + key;
  let res;
  try { res = await fetch(apiBase() + path + (query ? "?" + query : ""), { method, headers, body: body ? JSON.stringify(body) : undefined }); }
  catch (_) { return { status: 0, ok: false, error: "network", data: null }; }
  let data = null; try { data = await res.json(); } catch (_) {}
  return { status: res.status, ok: res.ok && !(data && data.ok === false), error: data && data.error, data };
}

// Chicago wall-clock helpers (DST-safe: the offset is re-measured after each step).
function chParts(d) {
  const f = new Intl.DateTimeFormat("en-US", { timeZone: CH_TZ, weekday: "short", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  const p = {}; for (const x of f.formatToParts(d)) p[x.type] = x.value;
  return { y: +p.year, mo: +p.month, d: +p.day, h: +p.hour, mi: +p.minute, dow: { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[p.weekday] };
}
function chToUtc(dateStr, hm) {
  const [y, mo, d] = dateStr.split("-").map(Number); const [h, mi] = hm.split(":").map(Number);
  const want = Date.UTC(y, mo - 1, d, h, mi);
  let guess = want;
  for (let i = 0; i < 2; i++) { const c = chParts(new Date(guess)); guess += want - Date.UTC(c.y, c.mo - 1, c.d, c.h, c.mi); }
  return new Date(guess);
}
function weekKey(iso) {
  const c = chParts(new Date(iso));
  const monday = Date.UTC(c.y, c.mo - 1, c.d) - ((c.dow + 6) % 7) * 86400000;
  return new Date(monday).toISOString().slice(0, 10);
}
function fmtTime(iso) { return new Intl.DateTimeFormat("en-US", { timeZone: CH_TZ, weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(iso)); }
function fmtHour(iso) { return new Intl.DateTimeFormat("en-US", { timeZone: CH_TZ, hour: "numeric", minute: "2-digit" }).format(new Date(iso)); }
function fmtDay(iso) { return new Intl.DateTimeFormat("en-US", { timeZone: CH_TZ, weekday: "long", month: "long", day: "numeric" }).format(new Date(iso)); }
function fmtWeek(key) { return "Week of " + new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "short", day: "numeric" }).format(new Date(key + "T00:00:00Z")); }
function overlaps(a, b) { return a.starts_at < b.ends_at && b.starts_at < a.ends_at; }
function setMsg(el, text, bad) { el.textContent = text || ""; el.dataset.state = bad ? "bad" : (text ? "ok" : ""); }
