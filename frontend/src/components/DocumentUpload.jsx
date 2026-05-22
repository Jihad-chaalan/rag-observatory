import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { uploadFile } from "../services/api";

function DocumentUpload({ onUploadSuccess }) {
  const onDrop = useCallback(
    async (acceptedFiles) => {
      if (acceptedFiles.length === 0) return;
      const file = acceptedFiles[0];
      try {
        // You could show a loading indicator here
        const result = await uploadFile(file); // from api.js
        console.log("Upload success:", result);
        if (onUploadSuccess) onUploadSuccess();
      } catch (err) {
        alert(`Upload failed: ${err.message}`);
      }
    },
    [onUploadSuccess],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/plain": [".txt"],
      "application/pdf": [".pdf"],
      "text/csv": [".csv"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
        ".xlsx",
      ],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        [".docx"],
      "application/vnd.openxmlformats-officedocument.presentationml.presentation":
        [".pptx"],
    },
    maxFiles: 1,
  });

  return (
    <div {...getRootProps()} style={dropzoneStyle}>
      <input {...getInputProps()} />
      {isDragActive ? (
        <p>Drop the file here ...</p>
      ) : (
        <p>Drag & drop a file here, or click to select</p>
      )}
      <small>Supported: PDF, TXT, CSV, Excel, Word, PowerPoint</small>
    </div>
  );
}

const dropzoneStyle = {
  border: "2px dashed #cccccc",
  borderRadius: "4px",
  padding: "20px",
  textAlign: "center",
  cursor: "pointer",
  marginBottom: "20px",
};

export default DocumentUpload;
