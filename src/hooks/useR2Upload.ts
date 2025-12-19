import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface UploadResult {
  success: boolean;
  url: string;
  key: string;
  bucket: "admin" | "user";
  fileName: string;
  fileType: string;
  size: number;
}

export interface UploadOptions {
  bucket: "admin" | "user";
  folder?: string;
  maxSizeBytes?: number;
  allowedTypes?: string[];
}

const DEFAULT_MAX_SIZE = 10 * 1024 * 1024; // 10MB
const DEFAULT_ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "video/mp4",
  "video/webm",
  "audio/mpeg",
  "audio/wav",
  "application/pdf",
];

export function useR2Upload() {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const uploadFile = useCallback(
    async (file: File, options: UploadOptions): Promise<UploadResult | null> => {
      const {
        bucket,
        folder,
        maxSizeBytes = DEFAULT_MAX_SIZE,
        allowedTypes = DEFAULT_ALLOWED_TYPES,
      } = options;

      setIsUploading(true);
      setProgress(0);
      setError(null);

      try {
        // Validate file size
        if (file.size > maxSizeBytes) {
          const maxSizeMB = Math.round(maxSizeBytes / (1024 * 1024));
          throw new Error(`File size exceeds ${maxSizeMB}MB limit`);
        }

        // Validate file type
        if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
          throw new Error(`File type ${file.type} is not allowed`);
        }

        setProgress(10);

        // Convert file to base64
        const base64Data = await fileToBase64(file);
        setProgress(30);

        // Get the current session for auth
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          throw new Error("You must be logged in to upload files");
        }

        setProgress(40);

        // Call the edge function
        const { data, error: invokeError } = await supabase.functions.invoke("r2-upload", {
          body: {
            fileName: file.name,
            fileType: file.type,
            fileData: base64Data,
            bucket,
            folder,
          },
        });

        if (invokeError) {
          throw new Error(invokeError.message || "Upload failed");
        }

        if (!data.success) {
          throw new Error(data.error || "Upload failed");
        }

        setProgress(100);

        const result: UploadResult = {
          success: true,
          url: data.url,
          key: data.key,
          bucket: data.bucket,
          fileName: data.fileName,
          fileType: data.fileType,
          size: data.size,
        };

        return result;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Upload failed";
        setError(errorMessage);
        toast({
          title: "Upload failed",
          description: errorMessage,
          variant: "destructive",
        });
        return null;
      } finally {
        setIsUploading(false);
      }
    },
    [toast]
  );

  const deleteFile = useCallback(
    async (objectKey: string, bucket: "admin" | "user"): Promise<boolean> => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          throw new Error("You must be logged in to delete files");
        }

        const { data, error: invokeError } = await supabase.functions.invoke("r2-delete", {
          body: {
            objectKey,
            bucket,
          },
        });

        if (invokeError) {
          throw new Error(invokeError.message || "Delete failed");
        }

        if (!data.success) {
          throw new Error(data.error || "Delete failed");
        }

        toast({
          title: "File deleted",
          description: "The file has been removed",
        });

        return true;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Delete failed";
        toast({
          title: "Delete failed",
          description: errorMessage,
          variant: "destructive",
        });
        return false;
      }
    },
    [toast]
  );

  const reset = useCallback(() => {
    setIsUploading(false);
    setProgress(0);
    setError(null);
  }, []);

  return {
    uploadFile,
    deleteFile,
    isUploading,
    progress,
    error,
    reset,
  };
}

// Helper to convert file to base64
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the data URL prefix (e.g., "data:image/png;base64,")
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}
