import { NextResponse } from "next/server";
import { removeBackground, segmentAtPoints, type PointPrompt } from "@/lib/fal-client";

export const runtime = "nodejs";
export const maxDuration = 60;

type DecomposeRequest = {
  imageBase64: string;
  width: number;
  height: number;
  mode: "auto" | "points";
  points?: PointPrompt[];
};

export async function POST(request: Request) {
  let body: DecomposeRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { imageBase64, width, height, mode, points } = body;

  if (!imageBase64 || !imageBase64.startsWith("data:image/")) {
    return NextResponse.json(
      { error: "imageBase64 must be a data: URL." },
      { status: 400 }
    );
  }
  if (!width || !height) {
    return NextResponse.json(
      { error: "width and height are required." },
      { status: 400 }
    );
  }
  if (mode === "points" && (!points || points.length === 0)) {
    return NextResponse.json(
      { error: "At least one point is required in points mode." },
      { status: 400 }
    );
  }

  const effectivePoints: PointPrompt[] =
    mode === "points" && points
      ? points.map(p => ({ x: p.x / width, y: p.y / height, label: p.label }))
      : [{ x: 0.5, y: 0.5, label: 1 }];

  try {
    const [subject, element] = await Promise.all([
      removeBackground(imageBase64),
      segmentAtPoints(imageBase64, effectivePoints),
    ]);

    return NextResponse.json({
      layers: [
        {
          id: "subject",
          label: "Primary Subject",
          imageUrl: subject.url,
          source: "fal-ai/bria/background/remove",
        },
        {
          id: "element",
          label: mode === "points" ? "Custom Selection" : "Accent / Detail",
          imageUrl: element.url,
          source: "fal-ai/sam2/image",
        },
      ],
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Decomposition failed.";
    const status = message.includes("FAL_KEY") ? 500 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
