import { describe, it, expect, vi, afterEach } from "vitest";
import { deepseekJson } from "@/lib/deepseek";

afterEach(() => vi.restoreAllMocks());

describe("deepseekJson", () => {
  it("parses JSON content stripped of markdown fences", async () => {
    process.env.DEEPSEEK_API_KEY = "test-key";
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({ choices: [{ message: { content: "```json\n{\"el\":\"Α\",\"en\":\"A\"}\n```" } }] }),
        { status: 200 },
      ) as Response,
    );
    const out = await deepseekJson<{ el: string; en: string }>({ system: "s", user: "u" });
    expect(out).toEqual({ el: "Α", en: "A" });
  });

  it("throws when DEEPSEEK_API_KEY is missing", async () => {
    delete process.env.DEEPSEEK_API_KEY;
    await expect(deepseekJson({ system: "s", user: "u" })).rejects.toThrow("DEEPSEEK_API_KEY");
  });
});
