import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";

export async function GET() {
  const modelsDirectory = path.join(process.cwd(), "public/models");
  try {
    const filenames = fs.readdirSync(modelsDirectory);
    const vrmFiles = filenames
      .filter((file) => file.endsWith(".vrm"))
      .map((file) => `/models/${file}`);
    return NextResponse.json(vrmFiles);
  } catch (error) {
    console.error("Error reading models directory:", error);
    return NextResponse.json(
      { error: "Failed to read models directory" },
      { status: 500 },
    );
  }
}
