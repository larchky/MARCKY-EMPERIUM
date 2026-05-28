import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const runtime = "nodejs";

const LOGO_PATH = join(process.cwd(), "public", "marky-logo.jpg");

export async function GET() {
  try {
    const logo = await readFile(LOGO_PATH);

    return new Response(logo, {
      headers: {
        "Cache-Control": "public, max-age=3600",
        "Content-Type": "image/jpeg",
      },
    });
  } catch {
    return new Response("Marky Emporium logo unavailable.", {
      status: 404,
    });
  }
}
