// Payment reconciliation.
//
// Reads payments.jsonl and works out how much money we actually collected.
// Run:  node reconcile.js

const fs = require("fs");

// Amounts are sometimes exported as strings with thousands separators, e.g. "4,804.15".
function parseAmount(value) {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const n = Number(value.replace(/,/g, "").trim());
    if (Number.isFinite(n)) return n;
  }
  return NaN;
}

// Keep only the latest attempt for each txn_id.
const latest = new Map();

const lines = fs.readFileSync("payments.jsonl", "utf8").split(/\r?\n/);
for (const line of lines) {
  if (line.trim() === "") continue;

  let event;
  try {
    event = JSON.parse(line);
  } catch {
    continue; // unreadable line
  }
  if (!event || typeof event !== "object") continue;

  const txnId = typeof event.txn_id === "string" ? event.txn_id.trim() : "";
  if (!txnId) continue; // no txn_id

  const ts = Date.parse(event.ts);
  if (Number.isNaN(ts)) continue;

  const amount = parseAmount(event.amount);
  if (Number.isNaN(amount)) continue;

  const status = String(event.status).trim().toLowerCase();

  const prev = latest.get(txnId);
  if (!prev || ts >= prev.ts) {
    latest.set(txnId, { ts, status, amount });
  }
}

let total = 0;
let count = 0;
for (const event of latest.values()) {
  if (event.status === "success") {
    total += event.amount;
    count += 1;
  }
}

const expected = parseInt(fs.readFileSync("expected.txt", "utf8").trim(), 10);

if (count !== expected) {
  console.log(`Check failed: counted ${count} successful payments, expected ${expected}.`);
  console.log("Something in the data isn't being handled the way the README describes.");
} else {
  console.log(`Check passed: ${count} successful payments.`);
  console.log(`Your code: KOYA-${Math.round(total)}`);
}
