interface DeepseekParams {
  system: string;
  user: string;
  temperature?: number;
  maxTokens?: number;
}

export async function deepseekChat(params: DeepseekParams): Promise<string> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error("DEEPSEEK_API_KEY not configured");

  const res = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: params.system },
        { role: "user", content: params.user },
      ],
      temperature: params.temperature ?? 0.3,
      max_tokens: params.maxTokens ?? 2048,
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`DeepSeek ${res.status}: ${detail}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

export async function deepseekJson<T = unknown>(params: DeepseekParams): Promise<T> {
  let content = await deepseekChat(params);
  content = content.replace(/^```json?\n?/i, "").replace(/\n?```$/i, "").trim();
  const start = content.indexOf("{");
  const startArr = content.indexOf("[");
  const begin = startArr !== -1 && (start === -1 || startArr < start) ? startArr : start;
  const endObj = content.lastIndexOf("}");
  const endArr = content.lastIndexOf("]");
  const end = Math.max(endObj, endArr);
  if (begin !== -1 && end !== -1) content = content.slice(begin, end + 1);
  return JSON.parse(content) as T;
}
