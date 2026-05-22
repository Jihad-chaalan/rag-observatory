import { useCallback, useState, useEffect, useRef } from "react";
import { useDropzone } from "react-dropzone";
import { uploadFile, listDocumentsConditional, getTsneConditional } from "../services/api";
import { removeSessionCache } from "../utils/sessionCache";

function DocumentUpload({ onUploadSuccess }) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusStep, setStatusStep] = useState(null);
  const [uploadedFilename, setUploadedFilename] = useState(null);
  const pollRef = useRef(null);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const startProcessingPoll = useCallback((filename) => {
    setStatusStep("waiting_for_registration");

    let checks = 0;
    pollRef.current = setInterval(async () => {
      checks += 1;

      try {
        // 1) Check if the document appears in the document list
        const docsRes = await listDocumentsConditional();
        const isRegistered = docsRes.notModified ? false : (docsRes.documents || []).includes(filename);
        if (isRegistered) {
          setStatusStep("registered");
        }

        // 2) Check t-SNE points for the filename (indicates embedding completed)
        const tsneRes = await getTsneConditional();
        const points = tsneRes.notModified ? null : tsneRes.points || [];
        const hasPoints = points && points.some((p) => p.filename === filename);
        if (hasPoints) {
          setStatusStep("indexed");
          // done
          clearInterval(pollRef.current);
          pollRef.current = null;
          // cleanup cache so pages fetch fresh data
          removeSessionCache("documents");
          removeSessionCache("tsne");
          setUploading(false);
          setProgress(100);
          if (onUploadSuccess) onUploadSuccess();
        }

        // stop after 5 minutes
        if (checks > 150) {
          clearInterval(pollRef.current);
          pollRef.current = null;
          setStatusStep("timeout");
          setUploading(false);
        }
      } catch (err) {
        console.error("Processing poll failed:", err);
      }
    }, 2000);
  }, [onUploadSuccess]);

  const onDrop = useCallback(
    async (acceptedFiles) => {
      if (acceptedFiles.length === 0) return;
      const file = acceptedFiles[0];
      setUploading(true);
      setProgress(0);
      setStatusStep("uploading");
      setUploadedFilename(file.name);

      try {
        await uploadFile(file, (evt) => {
          if (evt && evt.lengthComputable) {
            setProgress(Math.round((evt.loaded / evt.total) * 100));
          }
        });

        // start polling for backend processing
        startProcessingPoll(file.name);
      } catch (err) {
        alert(`Upload failed: ${err.message}`);
        setUploading(false);
        setStatusStep(null);
      }
    },
    [startProcessingPoll],
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
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
        ".docx",
      ],
      "application/vnd.openxmlformats-officedocument.presentationml.presentation": [
        ".pptx",
      ],
    },
    maxFiles: 1,
  });

  return (
    <div>
      <div {...getRootProps()} className="dropzone">
        <input {...getInputProps()} />
        {isDragActive ? (
          <p>Drop the file here ...</p>
        ) : (
          <p>Drag & drop a file here, or click to select</p>
        )}
        <small>Supported: PDF, TXT, CSV, Excel, Word, PowerPoint</small>
      </div>

      {uploading && (
        <div className="card processing-panel">
          <div className="panel-header-row">
            <h4>Processing: {uploadedFilename}</h4>
            <span className="loading-chip">{statusStep}</span>
          </div>

          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>

          <div className="processing-steps">
            <div className={`step ${statusStep === "uploading" ? "active" : ""}`}>Uploading</div>
            <div className={`step ${statusStep === "waiting_for_registration" || statusStep === "registered" ? "active" : ""}`}>Registering</div>
            <div className={`step ${statusStep === "indexed" ? "active" : ""}`}>Embedding & Indexing</div>
          </div>

          {statusStep === "timeout" && (
            <div className="error-note">Processing is taking longer than expected. It will continue in background.</div>
          )}
        </div>
      )}
    </div>
  );
}

export default DocumentUpload;
