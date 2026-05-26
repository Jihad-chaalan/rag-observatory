import { useCallback, useEffect, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import {
  uploadFile,
  listDocumentsConditional,
  getTsneConditional,
} from "../services/api";
import { removeSessionCache } from "../utils/sessionCache";

function getStatusCopy(statusStep) {
  switch (statusStep) {
    case "uploading":
      return "Uploading your file now. Bigger files may take a little longer to finish.";
    case "uploaded":
      return "Uploaded. Processing is still running in the background.";
    case "processing":
      return "Processing your file. Embeddings are still running.";
    case "indexed":
      return "Processing is complete. The document is ready to use.";
    case "timeout":
      return "The upload finished, but backend processing is taking longer than expected.";
    default:
      return "";
  }
}

function getPhaseLabel(statusStep) {
  switch (statusStep) {
    case "uploading":
      return "Uploading";
    case "uploaded":
      return "Uploaded";
    case "processing":
      return "Processing";
    case "indexed":
      return "Ready";
    case "timeout":
      return "Processing";
    default:
      return "Uploading";
  }
}

function getPhaseHint(statusStep) {
  switch (statusStep) {
    case "uploading":
      return "This label tracks file transfer only.";
    case "uploaded":
      return "The upload is done. Processing is still running.";
    case "processing":
      return "Chunking and embedding are still running.";
    case "indexed":
      return "Embedding is finished. OK.";
    case "timeout":
      return "Processing is still running in the background.";
    default:
      return "";
  }
}

function DocumentUpload({ onUploadSuccess }) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusStep, setStatusStep] = useState(null);
  const [uploadedFilename, setUploadedFilename] = useState(null);
  const [successNoteVisible, setSuccessNoteVisible] = useState(false);
  const pollRef = useRef(null);
  const successNoteTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (successNoteTimerRef.current)
        clearTimeout(successNoteTimerRef.current);
    };
  }, []);

  const startProcessingPoll = useCallback(
    (filename) => {
      setStatusStep("processing");

      let checks = 0;
      pollRef.current = setInterval(async () => {
        checks += 1;

        try {
          const docsRes = await listDocumentsConditional();
          const isRegistered = docsRes.notModified
            ? false
            : (docsRes.documents || []).includes(filename);
          if (isRegistered) {
            setStatusStep("processing");
          }

          const tsneRes = await getTsneConditional();
          const points = tsneRes.notModified ? null : tsneRes.points || [];
          const hasPoints =
            points && points.some((p) => p.filename === filename);
          if (hasPoints) {
            setStatusStep("indexed");
            clearInterval(pollRef.current);
            pollRef.current = null;
            removeSessionCache("documents");
            removeSessionCache("tsne");
            setUploading(false);
            setProgress(100);
            setSuccessNoteVisible(true);
            if (successNoteTimerRef.current)
              clearTimeout(successNoteTimerRef.current);
            successNoteTimerRef.current = setTimeout(() => {
              setSuccessNoteVisible(false);
            }, 15000);
            if (onUploadSuccess) onUploadSuccess();
          }

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
    },
    [onUploadSuccess],
  );

  const onDrop = useCallback(
    async (acceptedFiles) => {
      if (acceptedFiles.length === 0) return;
      const file = acceptedFiles[0];
      setUploading(true);
      setProgress(0);
      setStatusStep("uploading");
      setUploadedFilename(file.name);
      setSuccessNoteVisible(false);
      if (successNoteTimerRef.current)
        clearTimeout(successNoteTimerRef.current);

      try {
        await uploadFile(file, (evt) => {
          if (evt && evt.lengthComputable) {
            setProgress(Math.round((evt.loaded / evt.total) * 100));
          }
        });

        setStatusStep("uploaded");
        setProgress(100);

        if (onUploadSuccess) onUploadSuccess();

        startProcessingPoll(file.name);
      } catch (err) {
        alert(`Upload failed: ${err.message}`);
        setUploading(false);
        setStatusStep(null);
      }
    },
    [startProcessingPoll, onUploadSuccess],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/plain": [".txt"],
      "application/pdf": [".pdf"],
      "text/csv": [".csv"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        [".docx"],
      "application/vnd.openxmlformats-officedocument.presentationml.presentation":
        [".pptx"],
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
    onDropRejected: (fileRejections) => {
      const oversizeFile = fileRejections.find((item) =>
        item.errors.some((error) => error.code === "file-too-large"),
      );
      if (oversizeFile) {
        alert("File is too large. Please upload a file smaller than 10 MB.");
      }
    },
  });

  const statusCopy = getStatusCopy(statusStep);
  const phaseLabel = getPhaseLabel(statusStep);
  const phaseHint = getPhaseHint(statusStep);

  return (
    <div>
      {successNoteVisible && (
        <div className="status-banner upload-success-note">
          Upload complete. You can see it in the t-SNE tab and the chunks
          vector.
        </div>
      )}
      <div {...getRootProps()} className="dropzone">
        <input {...getInputProps()} />
        {isDragActive ? (
          <p>Drop the file here ...</p>
        ) : (
          <p>Drag & drop a file here, or click to select</p>
        )}
        <small>Supported: PDF, TXT.</small>
      </div>

      {uploading && (
        <div className="card processing-panel" aria-live="polite">
          <div className="processing-header">
            <div className="processing-title-wrap">
              <span className="processing-spinner" aria-hidden="true" />
              <div>
                <h4>{phaseLabel}</h4>
                <p>{statusCopy}</p>
              </div>
            </div>
            <span className="loading-chip">
              {statusStep === "indexed" ? "OK" : phaseLabel}
            </span>
          </div>

          <div className="processing-file-row">
            <span className="processing-filename">{uploadedFilename}</span>
            <span className="processing-meta">{phaseHint}</span>
          </div>

          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>

          <div className="processing-steps">
            <div
              className={`step ${statusStep === "uploading" ? "active" : ""}`}
            >
              Uploading
            </div>
            <div
              className={`step ${statusStep === "uploaded" || statusStep === "processing" ? "active" : ""}`}
            >
              Processing
            </div>
            <div className={`step ${statusStep === "indexed" ? "active" : ""}`}>
              Ready
            </div>
          </div>

          {statusStep === "timeout" && (
            <div className="error-note">
              Processing is taking longer than expected. It will continue in
              background.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default DocumentUpload;
