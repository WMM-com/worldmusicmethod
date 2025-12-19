import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { optimizeImage, optimizeAvatar, optimizeFeedImage } from "@/lib/imageOptimization";

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
  optimizeImages?: boolean;
  imageOptimization?: "avatar" | "feed" | "media" | "none";
  trackInDatabase?: boolean;
  altText?: string;
}

const DEFAULT_MAX_SIZE = 500 * 1024 * 1024; // 500MB for large video files
const DIRECT_UPLOAD_THRESHOLD = 10 * 1024 * 1024; // 10MB - use direct upload for larger files
const DEFAULT_ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "image/heic",
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-m4v",
  "audio/mpeg",
  "audio/wav",
  "audio/mp4",
  "audio/x-m4a",
  "audio/aac",
  "audio/ogg",
  "audio/webm",
  "application/pdf",
];

export function useR2Upload() {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Direct upload using pre-signed URL (for large files - fastest method)
  const uploadDirect = useCallback(
    async (file: File, options: UploadOptions): Promise<UploadResult | null> => {
      const { bucket, folder, trackInDatabase = true, altText } = options;

      try {
        setProgress(10);

        // Get session for auth
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          throw new Error("You must be logged in to upload files");
        }

        setProgress(15);

        // Request pre-signed URL from edge function
        const { data: presignedData, error: presignedError } = await supabase.functions.invoke(
          "r2-presigned-url",
          {
            body: {
              fileName: file.name,
              fileType: file.type,
              fileSize: file.size,
              bucket,
              folder,
            },
          }
        );

        if (presignedError || !presignedData?.success) {
          throw new Error(presignedError?.message || presignedData?.error || "Failed to get upload URL");
        }

        setProgress(25);

        // Upload directly to R2 using XMLHttpRequest for progress tracking
        const uploadResult = await new Promise<boolean>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          
          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              const percentComplete = 25 + (event.loaded / event.total) * 65;
              setProgress(Math.round(percentComplete));
            }
          };

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve(true);
            } else {
              console.error("R2 direct upload failed:", xhr.status, xhr.statusText, xhr.responseText);
              // Fall back to edge function upload on CORS/network error
              reject(new Error(`CORS_OR_NETWORK_ERROR`));
            }
          };

          xhr.onerror = () => {
            console.error("R2 direct upload network error - likely CORS issue");
            reject(new Error("CORS_OR_NETWORK_ERROR"));
          };
          
          xhr.ontimeout = () => reject(new Error("Upload timed out"));

          xhr.open("PUT", presignedData.uploadUrl);
          xhr.setRequestHeader("Content-Type", file.type);
          xhr.timeout = 300000; // 5 minute timeout for large files
          xhr.send(file);
        });

        if (!uploadResult) {
          throw new Error("Upload failed");
        }

        setProgress(90);

        // Track in database if requested
        if (trackInDatabase) {
          const fileCategory = getFileCategory(file.type);
          
          await supabase.from("media_library").insert({
            user_id: session.user.id,
            file_name: presignedData.fileName,
            file_url: presignedData.publicUrl,
            file_type: fileCategory,
            file_size: file.size,
            mime_type: file.type,
            folder: folder || (bucket === "admin" ? "admin" : "user-uploads"),
            alt_text: altText || null,
            metadata: {
              bucket,
              object_key: presignedData.objectKey,
              original_name: file.name,
              upload_method: "direct",
            },
          });
        }

        setProgress(100);

        return {
          success: true,
          url: presignedData.publicUrl,
          key: presignedData.objectKey,
          bucket: presignedData.bucket,
          fileName: presignedData.fileName,
          fileType: file.type,
          size: file.size,
        };
      } catch (err) {
        throw err;
      }
    },
    []
  );

  // Base64 upload through edge function (for small files)
  const uploadViaEdgeFunction = useCallback(
    async (file: File, options: UploadOptions): Promise<UploadResult | null> => {
      const { bucket, folder, trackInDatabase = true, altText } = options;

      try {
        setProgress(30);

        // Convert file to base64
        const base64Data = await fileToBase64(file);
        setProgress(40);

        // Get session for auth
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          throw new Error("You must be logged in to upload files");
        }

        setProgress(50);

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

        setProgress(80);

        // Track in database if requested
        if (trackInDatabase) {
          const fileCategory = getFileCategory(file.type);
          
          await supabase.from("media_library").insert({
            user_id: session.user.id,
            file_name: data.fileName,
            file_url: data.url,
            file_type: fileCategory,
            file_size: data.size,
            mime_type: file.type,
            folder: folder || (bucket === "admin" ? "admin" : "user-uploads"),
            alt_text: altText || null,
            metadata: {
              bucket,
              object_key: data.key,
              original_name: file.name,
              upload_method: "edge-function",
            },
          });
        }

        setProgress(100);

        return {
          success: true,
          url: data.url,
          key: data.key,
          bucket: data.bucket,
          fileName: data.fileName,
          fileType: data.fileType,
          size: data.size,
        };
      } catch (err) {
        throw err;
      }
    },
    []
  );

  const uploadFile = useCallback(
    async (file: File, options: UploadOptions): Promise<UploadResult | null> => {
      const {
        maxSizeBytes = DEFAULT_MAX_SIZE,
        allowedTypes = DEFAULT_ALLOWED_TYPES,
        imageOptimization = "none",
      } = options;

      setIsUploading(true);
      setProgress(0);
      setError(null);

      try {
        // Validate file type first
        if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
          throw new Error(`File type ${file.type} is not allowed`);
        }

        setProgress(5);

        // Optimize image if requested
        let processedFile = file;
        if (file.type.startsWith("image/") && imageOptimization !== "none") {
          setProgress(10);
          
          switch (imageOptimization) {
            case "avatar":
              processedFile = await optimizeAvatar(file);
              break;
            case "feed":
              processedFile = await optimizeFeedImage(file);
              break;
            case "media":
              processedFile = await optimizeImage(file);
              break;
          }
          
          setProgress(20);
        }

        // Validate file size after optimization
        if (processedFile.size > maxSizeBytes) {
          const maxSizeMB = Math.round(maxSizeBytes / (1024 * 1024));
          throw new Error(`File size exceeds ${maxSizeMB}MB limit`);
        }

        // Choose upload method based on file size
        // Large files use direct upload (pre-signed URL) for speed
        // Small files use edge function (simpler, works well for small payloads)
        let result: UploadResult | null;
        
        if (processedFile.size > DIRECT_UPLOAD_THRESHOLD) {
          console.log(`Using direct upload for ${(processedFile.size / 1024 / 1024).toFixed(1)}MB file`);
          try {
            result = await uploadDirect(processedFile, options);
          } catch (directErr) {
            // If direct upload fails due to CORS, fall back to edge function for smaller files
            if (directErr instanceof Error && directErr.message === "CORS_OR_NETWORK_ERROR") {
              const maxEdgeFunctionSize = 20 * 1024 * 1024; // 20MB limit for edge function
              if (processedFile.size <= maxEdgeFunctionSize) {
                console.log("Direct upload failed (CORS), falling back to edge function");
                toast({
                  title: "Switching upload method",
                  description: "Using alternative upload method...",
                });
                result = await uploadViaEdgeFunction(processedFile, options);
              } else {
                throw new Error(
                  "Direct upload failed. Your R2 bucket may need CORS configuration. " +
                  "Please enable CORS for your bucket to allow browser uploads, or use files under 20MB."
                );
              }
            } else {
              throw directErr;
            }
          }
        } else {
          console.log(`Using edge function upload for ${(processedFile.size / 1024).toFixed(1)}KB file`);
          result = await uploadViaEdgeFunction(processedFile, options);
        }

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
    [toast, uploadDirect, uploadViaEdgeFunction]
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

        // Remove from database tracking
        await supabase
          .from("media_library")
          .delete()
          .ilike("file_url", `%${objectKey}%`);

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
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

// Helper to determine file category
function getFileCategory(mimeType: string): string {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  if (mimeType === "application/pdf") return "document";
  return "other";
}
