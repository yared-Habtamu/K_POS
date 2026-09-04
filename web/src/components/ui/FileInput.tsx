import React, { useRef } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Camera, Upload, X } from "lucide-react";

interface FileInputProps {
  id?: string;
  accept?: string;
  file?: File | null;
  preview?: string | null;
  onChange: (file: File | null) => void;
  showCamera?: boolean;
  className?: string;
}

export function FileInput({
  id = "file-input",
  accept = "image/*",
  file,
  preview,
  onChange,
  showCamera = true,
  className = "",
}: FileInputProps) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    onChange(selectedFile);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Hidden file input elements */}
      <input
        id={id}
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
      />
      {showCamera && (
        <input
          id={`${id}-camera`}
          ref={cameraInputRef}
          type="file"
          accept={accept}
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
        />
      )}

      {/* Styled file input trigger bar */}
      <div className="flex items-center gap-2 border rounded-md p-1.5 bg-background shadow-sm">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          className="h-8 px-3 text-xs font-medium shrink-0 bg-primary/10 text-primary hover:bg-primary/20"
        >
          <Upload className="h-3.5 w-3.5 mr-1.5" />
          {t("choose_file", { defaultValue: "Choose File" })}
        </Button>

        <span className="text-xs text-muted-foreground truncate flex-1 px-1">
          {file ? file.name : t("no_file_chosen", { defaultValue: "No file Chosen" })}
        </span>

        {file && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleClear}
            className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
            aria-label="Clear file"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}

        {showCamera && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => cameraInputRef.current?.click()}
            className="h-8 w-8 shrink-0"
            title={t("take_photo", { defaultValue: "Take photo" })}
          >
            <Camera className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Optional image preview */}
      {preview && (
        <div className="relative inline-block mt-1">
          <img
            src={preview}
            alt="Preview"
            className="w-20 h-20 object-cover rounded-md border shadow-sm"
          />
        </div>
      )}
    </div>
  );
}
