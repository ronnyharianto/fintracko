"use client";

import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { apiFetch, ApiClientError } from "@/lib/api/client";
import NextImage from "next/image";
import { Upload, X, Image as ImageIcon } from "lucide-react";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

interface ImageUploadProps {
  value?: string | null;
  onChange: (url: string | null) => void;
  disabled?: boolean;
}

export function ImageUpload({ value, onChange, disabled }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      setUploadError("Invalid file type. Allowed: jpg, png, gif, webp.");
      return;
    }
    if (file.size > MAX_SIZE) {
      setUploadError("File too large. Maximum size is 5MB.");
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const result = await apiFetch<{ url: string }>("/api/v1/upload", {
        method: "POST",
        body: formData,
      });

      onChange(result.url);
    } catch (err) {
      const message =
        err instanceof ApiClientError ? err.message : "Failed to upload image.";
      setUploadError(message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void handleFile(file);
    // Reset input so the same file can be re-selected
    e.target.value = "";
  };

  const handleRemove = () => {
    onChange(null);
    setUploadError(null);
  };

  // Image preview state
  if (value) {
    return (
      <div className="relative inline-block">
        <NextImage
          src={value}
          alt="Attachment preview"
          width={96}
          height={96}
          unoptimized
          className="h-24 w-24 rounded-md border object-cover"
        />
        {!disabled && (
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute -right-2 -top-2 h-6 w-6 rounded-full"
            onClick={handleRemove}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={disabled || isUploading}
        className={`flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed p-4 text-sm text-muted-foreground transition-colors hover:border-muted-foreground/50 hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {isUploading ? (
          <>
            <Upload className="h-4 w-4 animate-spin" />
            Uploading...
          </>
        ) : (
          <>
            <ImageIcon className="h-4 w-4" />
            Click to upload image
          </>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_TYPES.join(",")}
        onChange={handleInputChange}
        className="hidden"
      />
      {uploadError && (
        <p className="text-xs text-destructive">{uploadError}</p>
      )}
    </div>
  );
}
