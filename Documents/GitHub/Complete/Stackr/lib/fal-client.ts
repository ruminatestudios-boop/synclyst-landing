import { fal } from "@fal-ai/client";

let configured = false;

function ensureConfigured() {
  if (configured) return;
  const key = process.env.FAL_KEY;
  if (!key) {
    throw new Error(
      "FAL_KEY is not set. Add it to .env.local — see .env.example."
    );
  }
  fal.config({ credentials: key });
  configured = true;
}

/**
 * fal's ApiError.message is often a generic HTTP status phrase (e.g.
 * "Forbidden"); the actually useful reason (invalid key, exhausted
 * balance, validation error) lives in error.body.detail.
 */
function describeFalError(err: unknown): string {
  const body = (err as { body?: unknown })?.body;
  const detail = (body as { detail?: unknown } | undefined)?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((d) => (typeof d === "object" && d && "msg" in d ? String((d as { msg: unknown }).msg) : JSON.stringify(d)))
      .join("; ");
  }
  return err instanceof Error ? err.message : "fal.ai request failed.";
}

async function callFal<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    throw new Error(describeFalError(err));
  }
}

type FalImage = {
  url: string;
  content_type?: string;
  file_name?: string;
  file_size?: number;
  width?: number;
  height?: number;
};

export async function removeBackground(imageDataUrl: string): Promise<FalImage> {
  ensureConfigured();
  const result = await callFal(() =>
    fal.subscribe("fal-ai/bria/background/remove", {
      input: {
        image_url: imageDataUrl,
        sync_mode: true,
      },
    })
  );
  const image = (result.data as { image: FalImage }).image;
  if (!image?.url) throw new Error("Bria RMBG returned no image.");
  return image;
}

/**
 * "Restore" mode: high-fidelity denoise/sharpen/upscale that stays locked to
 * the input — cleans up JPEG artifacts and anti-aliasing noise without
 * reinterpreting the design. Safe, predictable, low creative drift.
 */
export async function restoreImage(imageDataUrl: string): Promise<FalImage> {
  ensureConfigured();
  const result = await callFal(() =>
    fal.subscribe("fal-ai/topaz/upscale/image", {
      input: {
        image_url: imageDataUrl,
        model: "Text Refine",
        upscale_factor: 2,
        face_enhancement: false,
        denoise: 0.6,
        sharpen: 0.5,
        fix_compression: 0.7,
        output_format: "png",
      },
    })
  );
  const image = (result.data as { image: FalImage }).image;
  if (!image?.url) throw new Error("Topaz restore returned no image.");
  return image;
}

export type RecreateSubject = "logo" | "photo";

const RECREATE_PROMPTS: Record<RecreateSubject, string> = {
  logo: "clean flat vector-style logo design, crisp sharp smooth edges, solid flat colors, precise professional typography, no noise, no jpeg artifacts, no gradients, preserve the exact text, layout and composition",
  // Vector tracing can only ever produce flat color regions — a photo has
  // none, so it always comes out posterized. This prompt does that
  // flattening step deliberately (as a stylistic redraw) *before* tracing,
  // instead of letting the tracer do it accidentally and badly.
  photo:
    "convert this photo into a flat vector-style illustration: bold simplified shapes, solid flat colors, clean smooth outlines, poster / screen-print art style, no gradients, no photographic noise or texture, no fine detail — preserve the subject, framing and composition",
};

/**
 * "Recreate" mode: generative redraw. Can look sharper/cleaner than the
 * original, but is a reinterpretation, not a restoration — small text and
 * fine detail can drift, so this is meant to be reviewed before use.
 * `fidelity` (0-1) is inverted into Flux's `strength` (higher strength =
 * more regeneration, less faithfulness to the input). Photos need a lower
 * fidelity than logos — flattening continuous tone into shapes is a bigger
 * change than just cleaning up a graphic.
 */
export async function recreateImage(
  imageDataUrl: string,
  fidelity: number,
  subject: RecreateSubject = "logo"
): Promise<FalImage> {
  ensureConfigured();
  const strength = Math.min(0.9, Math.max(0.15, 1 - fidelity));
  const result = await callFal(() =>
    fal.subscribe("fal-ai/flux/dev/image-to-image", {
      input: {
        image_url: imageDataUrl,
        prompt: RECREATE_PROMPTS[subject],
        strength,
        num_inference_steps: 40,
        guidance_scale: 3.5,
        output_format: "png",
        sync_mode: true,
      },
    })
  );
  const image = (result.data as { images: FalImage[] }).images?.[0];
  if (!image?.url) throw new Error("Flux recreate returned no image.");
  return image;
}

export type PointPrompt = { x: number; y: number; label: 0 | 1 };

export async function segmentAtPoints(
  imageDataUrl: string,
  prompts: PointPrompt[]
): Promise<FalImage> {
  ensureConfigured();
  const result = await callFal(() =>
    fal.subscribe("fal-ai/sam2/image", {
      input: {
        image_url: imageDataUrl,
        prompts: prompts.map((p) => ({
          x: p.x,
          y: p.y,
          label: p.label,
        })),
        apply_mask: true,
        sync_mode: true,
        output_format: "png",
      },
    })
  );
  const image = (result.data as { image: FalImage }).image;
  if (!image?.url) throw new Error("SAM 2 returned no image.");
  return image;
}
