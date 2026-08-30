/**
 * POST /api/v1/upload — Upload image to Imgur
 *
 * Accepts multipart form data with an image file.
 * Validates file type (jpg, png, gif, webp) and max size (5MB).
 * Uploads to Imgur API server-side using IMGUR_CLIENT_ID from env.
 * Returns the public Imgur URL.
 */

import { NextRequest } from "next/server";
import { withPipeline } from "@/lib/api/pipeline";
import { success, failure } from "@/lib/api/envelope";
import { requireEnv } from "@/lib/env";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(request: NextRequest) {
  return withPipeline(
    request,
    { requireOnboarding: true },
    async () => {
      try {
        const formData = await request.formData();
        const file = formData.get("file") as File | null;

        if (!file) {
          return failure("BAD_REQUEST", "No file provided.");
        }

        if (!ALLOWED_TYPES.includes(file.type)) {
          return failure("BAD_REQUEST", "Invalid file type. Allowed: jpg, png, gif, webp.");
        }

        if (file.size > MAX_SIZE) {
          return failure("BAD_REQUEST", "File too large. Maximum size is 5MB.");
        }

        const clientId = requireEnv("IMGUR_CLIENT_ID");

        // Convert file to base64 for Imgur API
        const buffer = Buffer.from(await file.arrayBuffer());
        const base64 = buffer.toString("base64");

        const imgurResponse = await fetch("https://api.imgur.com/3/image", {
          method: "POST",
          headers: {
            Authorization: `Client-ID ${clientId}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ image: base64, type: "base64" }),
        });

        if (!imgurResponse.ok) {
          return failure("INTERNAL_SERVER_ERROR", "Failed to upload image. Please try again.");
        }

        const imgurData = await imgurResponse.json();

        if (!imgurData.data?.link) {
          return failure("INTERNAL_SERVER_ERROR", "Failed to upload image. Please try again.");
        }

        return success({ url: imgurData.data.link });
      } catch {
        return failure("INTERNAL_SERVER_ERROR", "Failed to upload image. Please try again.");
      }
    },
  );
}
