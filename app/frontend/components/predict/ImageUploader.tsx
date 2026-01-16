"use client";

import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Camera, Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ImageUploaderProps {
  onImageSelect: (file: File) => void;
  imagePreview: string | null;
  onPredict: () => void;
  loading: boolean;
  hasImage: boolean;
}

export function ImageUploader({
  onImageSelect,
  imagePreview,
  onPredict,
  loading,
  hasImage,
}: ImageUploaderProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        onImageSelect(acceptedFiles[0]);
      }
    },
    [onImageSelect]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".jpeg", ".jpg", ".png", ".webp"],
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer",
          isDragActive
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/50",
          imagePreview && "border-solid border-primary"
        )}
      >
        <input {...getInputProps()} />

        {imagePreview ? (
          <div className="space-y-4">
            <img
              src={imagePreview}
              alt="Selected food"
              className="max-h-64 mx-auto rounded-lg shadow-lg"
            />
            <p className="text-sm text-muted-foreground">
              Tap to select a different image
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <Upload className="w-8 h-8 text-primary" />
            </div>
            <div>
              <p className="font-medium">
                {isDragActive ? "Drop image here" : "Upload food image"}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Drag & drop or tap to select
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Camera Button (Mobile) */}
      <div className="flex gap-3">
        <label className="flex-1 flex items-center justify-center gap-2 p-3 bg-secondary rounded-lg cursor-pointer hover:bg-secondary/80 transition-colors">
          <Camera className="w-5 h-5" />
          <span>Take Photo</span>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onImageSelect(file);
            }}
          />
        </label>
      </div>

      {/* Analyze Button */}
      {hasImage && (
        <Button
          onClick={onPredict}
          disabled={loading}
          className="w-full h-12 text-lg"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <span className="mr-2">🔍</span>
              Analyze Food
            </>
          )}
        </Button>
      )}
    </div>
  );
}
