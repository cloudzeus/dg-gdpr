const STORAGE_HOST = process.env.BUNNY_STORAGE_API_HOST ?? "storage.bunnycdn.com";
const STORAGE_ZONE = process.env.BUNNY_STORAGE_ZONE ?? "dgsoft";
const ACCESS_KEY = process.env.BUNNY_ACCESS_KEY ?? "";
const CDN_HOST = process.env.BUNNY_CDN_HOSTNAME ?? "dgsoft.b-cdn.net";

export async function uploadToBunny(
  buffer: Buffer,
  remotePath: string,
  contentType: string
): Promise<string> {
  const url = `https://${STORAGE_HOST}/${STORAGE_ZONE}/${remotePath}`;

  const res = await fetch(url, {
    method: "PUT",
    headers: {
      AccessKey: ACCESS_KEY,
      "Content-Type": contentType,
    },
    body: buffer as unknown as BodyInit,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Bunny upload failed (${res.status}): ${text}`);
  }

  return `https://${CDN_HOST}/${remotePath}`;
}
