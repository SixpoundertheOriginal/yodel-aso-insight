
import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload, FileText, X, Image, FileSpreadsheet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface GrowthGapFileUploadProps {
  onFilesUploaded: (files: File[]) => void;
}

export const GrowthGapFileUpload: React.FC<GrowthGapFileUploadProps> = ({ onFilesUploaded }) => {
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFiles((prevFiles) => [...prevFiles, ...newFiles]);
      onFilesUploaded([...files, ...newFiles]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      const newFiles = Array.from(e.dataTransfer.files);
      setFiles((prevFiles) => [...prevFiles, ...newFiles]);
      onFilesUploaded([...files, ...newFiles]);
    }
  };

  const handleRemoveFile = (index: number) => {
    const newFiles = [...files];
    newFiles.splice(index, 1);
    setFiles(newFiles);
    onFilesUploaded(newFiles);
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.includes("image")) {
      return <Image className="h-4 w-4" />;
    } else if (
      fileType.includes("spreadsheet") ||
      fileType.includes("csv") ||
      fileType.includes("excel")
    ) {
      return <FileSpreadsheet className="h-4 w-4" />;
    } else {
      return <FileText className="h-4 w-4" />;
    }
  };

  return (
    <Card className="border-none shadow-none bg-transparent">
      <CardHeader className="p-4">
        <CardTitle className="text-lg text-white">Upload Files</CardTitle>
      </CardHeader>
      
      <CardContent className="p-4 pt-0">
        <div
          className={`border-2 border-dashed rounded-lg p-6 transition-colors ${
            isDragging
              ? "border-yodel-orange bg-yodel-orange/10"
              : "border-zinc-700 hover:border-zinc-500"
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="flex flex-col items-center justify-center text-center">
            <Upload className="h-8 w-8 text-zinc-400 mb-2" />
            <p className="text-sm font-medium text-zinc-300 mb-1">
              Drag & drop or click to upload
            </p>
            <p className="text-xs text-zinc-500">
              Supports .csv, .xlsx, .png, and .jpg files
            </p>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileChange}
              multiple
              accept=".csv,.xlsx,.png,.jpg,.jpeg"
            />
          </div>
        </div>

        {files.length > 0 && (
          <div className="mt-4">
            <p className="text-sm font-medium text-zinc-300 mb-2">
              Uploaded Files ({files.length})
            </p>
            <div className="space-y-2">
              {files.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between bg-zinc-800 rounded-md p-2"
                >
                  <div className="flex items-center space-x-2">
                    {getFileIcon(file.type)}
                    <span className="text-sm text-zinc-300 truncate max-w-[150px]">
                      {file.name}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveFile(index);
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
