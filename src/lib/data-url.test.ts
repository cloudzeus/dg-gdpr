import { describe, it, expect } from "vitest";
import { dataUrlToBuffer } from "@/lib/data-url";

describe("dataUrlToBuffer", () => {
  it("parses a base64 PNG data URL", () => {
    const payload = Buffer.from("hello").toString("base64");
    const { buffer, contentType } = dataUrlToBuffer(`data:image/png;base64,${payload}`);
    expect(contentType).toBe("image/png");
    expect(buffer.toString()).toBe("hello");
  });

  it("throws on a non-data URL", () => {
    expect(() => dataUrlToBuffer("https://example.com/x.png")).toThrow();
  });

  it("throws on a malformed data URL", () => {
    expect(() => dataUrlToBuffer("data:image/png,notbase64")).toThrow();
  });
});
