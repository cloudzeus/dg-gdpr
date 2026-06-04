import { describe, it, expect, vi } from "vitest";
import { stubSmsSender } from "@/lib/sms";

describe("stubSmsSender", () => {
  it("logs and resolves null (no provider configured)", async () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const res = await stubSmsSender.send("+306900000000", "hello");
    expect(res).toBeNull();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
