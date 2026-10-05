import { parseBoundedJson } from "./lib/bounded-json.mjs";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function expectReject(promise, message) {
  let rejected = false;
  try {
    await promise;
  } catch {
    rejected = true;
  }
  assert(rejected, message);
}

const valid = new Response('{"ok":true}', {
  headers: { "Content-Type": "application/json" },
});
const parsed = await parseBoundedJson(valid, { maxBytes: 64, label: "fixture" });
assert(parsed.ok === true, "JSON válido no fue parseado.");

const advertisedTooLarge = new Response("{}", {
  headers: {
    "Content-Type": "application/json",
    "Content-Length": "65",
  },
});
await expectReject(
  parseBoundedJson(advertisedTooLarge, { maxBytes: 64, label: "fixture" }),
  "Content-Length fuera de límite fue aceptado.",
);

const encoder = new TextEncoder();
const streamingTooLarge = new Response(
  new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode('{"data":"'));
      controller.enqueue(encoder.encode("x".repeat(64)));
      controller.enqueue(encoder.encode('"}'));
      controller.close();
    },
  }),
  { headers: { "Content-Type": "application/json" } },
);
await expectReject(
  parseBoundedJson(streamingTooLarge, { maxBytes: 32, label: "fixture" }),
  "Body streaming fuera de límite fue aceptado.",
);

const wrongContentType = new Response("{}", {
  headers: { "Content-Type": "text/plain" },
});
await expectReject(
  parseBoundedJson(wrongContentType, { maxBytes: 64, label: "fixture" }),
  "Content-Type no JSON fue aceptado.",
);

console.log(
  "[bounded-json-validation] PASS",
  JSON.stringify({
    contentTypeRequired: true,
    advertisedLengthBounded: true,
    streamingLengthBounded: true,
  }),
);
