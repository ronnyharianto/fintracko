/**
 * POST /api/v1/upload — Upload image to Imgur
 *
 * Accepts multipart form data with an image file.
 * Validates image signatures and a maximum file size of 2 MB.
 * Uploads to Imgur API server-side using IMGUR_CLIENT_ID from env.
 * Returns the public Imgur URL.
 */

import { NextRequest } from "next/server";
import { withPipeline } from "@/lib/api/pipeline";
import { success, failure } from "@/lib/api/envelope";
import { requireEnv } from "@/lib/env";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const MAX_FILE_SIZE = 2 * 1024 * 1024;
const MAX_REQUEST_SIZE = MAX_FILE_SIZE + 64 * 1024;

function detectImageType(bytes: Buffer): string | null {
  if (
    bytes.length >= 3 &&
    bytes.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))
  ) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 8 &&
    bytes
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return "image/png";
  }
  if (bytes.length >= 6) {
    const signature = bytes.toString("ascii", 0, 6);
    if (signature === "GIF87a" || signature === "GIF89a") {
      return "image/gif";
    }
  }
  if (
    bytes.length >= 12 &&
    bytes.toString("ascii", 0, 4) === "RIFF" &&
    bytes.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}

export async function POST(request: NextRequest) {
  return withPipeline(request, { requireOnboarding: true }, async () => {
    try {
      const contentLength = Number(request.headers.get("content-length"));
      if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_SIZE) {
        return failure(
          "BAD_REQUEST",
          "Request too large. Maximum image size is 2MB.",
        );
      }

      const formData = await request.formData();
      const file = formData.get("file");

      if (!(file instanceof File)) {
        return failure("BAD_REQUEST", "No file provided.");
      }

      if (!ALLOWED_TYPES.includes(file.type)) {
        return failure(
          "BAD_REQUEST",
          "Invalid file type. Allowed: jpg, png, gif, webp.",
        );
      }

      if (file.size > MAX_FILE_SIZE) {
        return failure("BAD_REQUEST", "File too large. Maximum size is 2MB.");
      }

      const clientId = requireEnv("IMGUR_CLIENT_ID");

      const buffer = Buffer.from(await file.arrayBuffer());
      if (detectImageType(buffer) !== file.type) {
        return failure(
          "BAD_REQUEST",
          "File contents do not match an allowed image type.",
        );
      }

      const base64 = buffer.toString("base64");

      const imgurResponse = await fetch("https://api.imgur.com/3/image", {
        method: "POST",
        headers: {
          Authorization: `Client-ID ${clientId}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ image: base64, type: "base64" }),
        signal: AbortSignal.timeout(15_000),
      });

      if (!imgurResponse.ok) {
        return failure(
          "INTERNAL_SERVER_ERROR",
          "Failed to upload image. Please try again.",
        );
      }

      const imgurData = await imgurResponse.json();

      if (!imgurData.data?.link) {
        return failure(
          "INTERNAL_SERVER_ERROR",
          "Failed to upload image. Please try again.",
        );
      }

      return success({ url: imgurData.data.link });
    } catch {
      return failure(
        "INTERNAL_SERVER_ERROR",
        "Failed to upload image. Please try again.",
      );
    }
  });
}
