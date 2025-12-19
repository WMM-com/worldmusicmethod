import { useCallback, useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { Upload, X, File, Image, Video, Music } from "lucide-react";
import { Button } from "./button";
import { Progress } from "./progress";

export interface FileUploadProps {
  onFileSelect: (file: File) => void;
  onRemove?: () => void;
  accept?: string;
  maxSizeMB?: number;
  isUploading?: boolean;
  progress?: number;
  previewUrl?: string;
  error?: string | null;
  disabled?: boolean;
  className?: string;
}

export function FileUpload({
  onFileSelect,
  onRemove,
  accept = "image/*,video/*,audio/*,.pdf",
  maxSizeMB = 10,
  isUploading = false,
  progress = 0,
  previewUrl,
  error,
  disabled = false,
  className,
}: FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [fileType, setFileType] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      if (file.size > maxSizeMB * 1024 * 1024) {
        return;
      }

      setFileType(file.type);

      // Create local preview for images
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setLocalPreview(e.target?.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        setLocalPreview(null);
      }

      onFileSelect(file);
    },
    [maxSizeMB, onFileSelect]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      if (disabled || isUploading) return;

      const file = e.dataTransfer.files[0];
      if (file) {
        handleFile(file);
      }
    },
    [disabled, isUploading, handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFile(file);
      }
    },
    [handleFile]
  );

  const handleRemove = useCallback(() => {
    setLocalPreview(null);
    setFileType("");
    if (inputRef.current) {
      inputRef.current.value = "";
    }
    onRemove?.();
  }, [onRemove]);

  const displayPreview = previewUrl || localPreview;

  const getFileIcon = () => {
    if (fileType.startsWith("image/")) return <Image className="h-8 w-8 text-muted-foreground" />;
    if (fileType.startsWith("video/")) return <Video className="h-8 w-8 text-muted-foreground" />;
    if (fileType.startsWith("audio/")) return <Music className="h-8 w-8 text-muted-foreground" />;
    return <File className="h-8 w-8 text-muted-foreground" />;
  };

  return (
    <div className={cn("w-full", className)}>
      <div
        className={cn(
          "relative border-2 border-dashed rounded-lg transition-colors",
          isDragOver && !disabled ? "border-primary bg-primary/5" : "border-border",
          disabled && "opacity-50 cursor-not-allowed",
          error && "border-destructive"
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {displayPreview && fileType.startsWith("image/") ? (
          <div className="relative aspect-video">
            <img
              src={displayPreview}
              alt="Preview"
              className="w-full h-full object-cover rounded-lg"
            />
            {!isUploading && (
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 h-8 w-8"
                onClick={handleRemove}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        ) : displayPreview || fileType ? (
          <div className="flex items-center justify-center p-8">
            <div className="flex flex-col items-center gap-2">
              {getFileIcon()}
              {!isUploading && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleRemove}
                >
                  Remove
                </Button>
              )}
            </div>
          </div>
        ) : (
          <label
            className={cn(
              "flex flex-col items-center justify-center p-8 cursor-pointer",
              disabled && "cursor-not-allowed"
            )}
          >
            <Upload className="h-10 w-10 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground text-center">
              Drag & drop or click to upload
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Max {maxSizeMB}MB
            </p>
            <input
              ref={inputRef}
              type="file"
              accept={accept}
              onChange={handleInputChange}
              disabled={disabled || isUploading}
              className="hidden"
            />
          </label>
        )}

        {isUploading && (
          <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center rounded-lg">
            <Progress value={progress} className="w-2/3 h-2" />
            <p className="text-sm text-muted-foreground mt-2">
              Uploading... {progress}%
            </p>
          </div>
        )}
      </div>

      {error && (
        <p className="text-sm text-destructive mt-1">{error}</p>
      )}
    </div>
  );
}
