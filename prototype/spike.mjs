// version: 0.1.1
// tags: [prototype, spike, llm, tool-calling, structured-output]

// Run: node --env-file=.env spike.mjs
const { LLM_BASE_URL, LLM_API_KEY = "", LLM_MODEL } = process.env;
if (!LLM_BASE_URL || !LLM_MODEL) {
  console.error("Set LLM_BASE_URL and LLM_MODEL (see .env.example).");
  process.exit(1);
}

const tools = [
  {
    type: "function",
    function: {
      name: "get_technician_status",
      description: "Get a technician's current status, location, skills, and minutes until their current job ends.",
      parameters: {
        type: "object",
        properties: { technician_id: { type: "string" } },
        required: ["technician_id"],
      },
    },
  },
];

const technicians = {
  "tech-001": { status: "on_job", location: "12 Elm St", skills: ["plumbing"], minutes_until_free: 45 },
};

async function chat(messages, extra = {}) {
  const res = await fetch(`${LLM_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${LLM_API_KEY}` },
    body: JSON.stringify({ model: LLM_MODEL, messages, ...extra }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return (await res.json()).choices[0].message;
}

const started = Date.now();
const messages = [
  { role: "system", content: "You are a dispatch assistant. Use tools to look up facts; never guess them." },
  { role: "user", content: "A drain cleaning (needs plumbing) must start within 30 minutes. Can tech-001 take it?" },
];

let toolCalls = 0;
for (let round = 0; round < 6; round++) {
  const msg = await chat(messages, { tools });
  messages.push(msg);
  if (!msg.tool_calls?.length) break;
  for (const call of msg.tool_calls) {
    toolCalls++;
    const args = JSON.parse(call.function.arguments);
    const result = technicians[args.technician_id] ?? { error: "unknown technician" };
    console.log(`tool call: ${call.function.name}(${call.function.arguments})`);
    messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(result) });
  }
}

messages.push({
  role: "user",
  content: 'Return only JSON: {"can_take_job": boolean, "reason": string, "confidence": number}.',
});
const final = await chat(messages, { response_format: { type: "json_object" } });

let parsed = null;
try {
  parsed = JSON.parse(final.content);
} catch {}

console.log("tool calls made:", toolCalls);
console.log("valid JSON:", parsed !== null);
console.log("answer:", parsed ?? final.content);
console.log(`elapsed: ${((Date.now() - started) / 1000).toFixed(1)}s`);
