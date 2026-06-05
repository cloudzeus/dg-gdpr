/** Parse a base64 data URL (`data:<mime>;base64,<payload>`) into a Buffer. */
export function dataUrlToBuffer(dataUrl: string): { buffer: Buffer; contentType: string } {
  const match = /^data:([^;]+);base64,([\s\S]+)$/.exec(dataUrl);
  if (!match) throw new Error("Μη έγκυρο data URL");
  return { buffer: Buffer.from(match[2], "base64"), contentType: match[1] };
}
