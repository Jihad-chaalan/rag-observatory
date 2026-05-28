import { useCallback, useEffect, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import {
  uploadFile,
  getJobStatus,
  listDocumentsConditional,
  getTsneConditional,
} from "../services/api";
import { removeSessionCache } from "../utils/sessionCache";

function getStatusCopy(statusStep) {
  switch (statusStep) {
    case "uploading":
      return "Uploading your file now. Bigger files may take a little longer to finish.";
    case "uploaded":
      return "Uploaded. Processing is running in the background.";
    case "processing":
      return "Processing your file. Embeddings are being generated.";
    case "indexed":
      return "Processing complete. The document is ready to use.";
    case "failed":
      return "Processing failed. Check logs or retry upload.";
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
    case "failed":
      return "Failed";
    case "timeout":
      return "Processing";
    default:
      return "Uploading";
  }
}

function DocumentUpload({ onUploadSuccess }) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusStep, setStatusStep] = useState(null);
  const [uploadedFilename, setUploadedFilename] = useState(null);

  const [activeJobId, setActiveJobId] = useState(null);
  const [jobStatus, setJobStatus] = useState(null);
  const [chunksProcessed, setChunksProcessed] = useState(0);

  const [successNoteVisible, setSuccessNoteVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const pollRef = useRef(null);
  const successNoteTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (successNoteTimerRef.current)
        clearTimeout(successNoteTimerRef.current);
    };
  }, []);

  // Fallback filename polling (kept for compatibility)
  const startFilenamePoll = useCallback(
    (filename) => {
      setJobStatus("processing");
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
            const tsneRes = await getTsneConditional();
            const points = tsneRes.notModified ? null : tsneRes.points || [];
            const hasPoints =
              points && points.some((p) => p.filename === filename);

            if (hasPoints) {
              clearInterval(pollRef.current);
              pollRef.current = null;

              setJobStatus("completed");
              setStatusStep("indexed");
              setUploading(false);
              setProgress(100);
              setSuccessNoteVisible(true);

              if (successNoteTimerRef.current)
                clearTimeout(successNoteTimerRef.current);
              successNoteTimerRef.current = setTimeout(
                () => setSuccessNoteVisible(false),
                15000,
              );

              if (onUploadSuccess) onUploadSuccess();
              removeSessionCache("documents");
              removeSessionCache("tsne");
            }
          }

          if (checks > 150) {
            clearInterval(pollRef.current);
            pollRef.current = null;
            setJobStatus("timeout");
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

  const startJobPoll = useCallback(
    (jobId) => {
      setJobStatus("running");
      setStatusStep("processing");
      let checks = 0;
      const POLL_INTERVAL = 2000;

      pollRef.current = setInterval(async () => {
        checks += 1;
        try {
          const status = await getJobStatus(jobId);

          setJobStatus(status?.status || "running");
          const processed = Number(status?.progress?.chunks_processed || 0);
          if (!Number.isNaN(processed)) {
            setChunksProcessed(processed);
          }

          if (status.status === "completed") {
            clearInterval(pollRef.current);
            pollRef.current = null;

            setStatusStep("indexed");
            setUploading(false);
            setProgress(100);
            setSuccessNoteVisible(true);

            removeSessionCache("documents");
            removeSessionCache("tsne");

            if (successNoteTimerRef.current)
              clearTimeout(successNoteTimerRef.current);
            successNoteTimerRef.current = setTimeout(
              () => setSuccessNoteVisible(false),
              15000,
            );

            if (onUploadSuccess) onUploadSuccess();
            return;
          }

          if (status.status === "failed") {
            clearInterval(pollRef.current);
            pollRef.current = null;

            setJobStatus("failed");
            setStatusStep("failed");
            setUploading(false);
            setErrorMessage(status.message || "Processing failed");
            return;
          }

          // Coarse progress display while processing
          if (status.progress && status.progress.chunks_processed) {
            const p = Math.min(
              99,
              Math.round((status.progress.chunks_processed / 100) * 100),
            );
            setProgress((prev) => Math.max(prev, p));
          }

          if (checks > 300) {
            clearInterval(pollRef.current);
            pollRef.current = null;

            setJobStatus("timeout");
            setStatusStep("timeout");
            setUploading(false);
          }
        } catch (err) {
          console.error("Job poll failed:", err);
        }
      }, POLL_INTERVAL);
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
      setJobStatus("uploading");
      setUploadedFilename(file.name);
      setActiveJobId(null);
      setChunksProcessed(0);
      setSuccessNoteVisible(false);
      setErrorMessage(null);

      if (successNoteTimerRef.current)
        clearTimeout(successNoteTimerRef.current);

      try {
        const res = await uploadFile(file, (evt) => {
          if (evt && evt.lengthComputable) {
            setProgress(Math.round((evt.loaded / evt.total) * 100));
          }
        });

        const jobId = res.job_id || res.jobId || res.job || null;
        setStatusStep("uploaded");
        setJobStatus("uploaded");
        setProgress(100);
        setActiveJobId(jobId);

        if (jobId) {
          startJobPoll(jobId);
        } else {
          startFilenamePoll(file.name);
        }
      } catch (err) {
        alert(`Upload failed: ${err.message}`);
        setUploading(false);
        setStatusStep(null);
        setJobStatus(null);
      }
    },
    [startJobPoll, startFilenamePoll],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/plain": [".txt"],
      "application/pdf": [".pdf"],
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

  return (
    <div>
      {successNoteVisible && (
        <div className="status-banner upload-success-note">
          Upload complete. You can see it in the t-SNE tab and the chunks
          vector.
        </div>
      )}

      {errorMessage && (
        <div className="status-banner error-note">{errorMessage}</div>
      )}

      <div {...getRootProps()} className="dropzone">
        <input {...getInputProps()} />
        {isDragActive ? (
          <p>Drop the file here ...</p>
        ) : (
          <p>Drag & drop a file here, or click to select</p>
        )}
        <small>Supported: PDF, TXT. Maximum 10 MB.</small>
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
          </div>
          {/* 
          {activeJobId && (
            <div className="processing-file-row">
              <span className="processing-filename">Job: {activeJobId}</span>
            </div>
          )} */}

          <div className="processing-file-row">
            <span className="processing-filename">
              Chunks processed: {chunksProcessed.toLocaleString()}
              {jobStatus ? ` (${jobStatus})` : ""}
            </span>
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

          {statusStep === "failed" && (
            <div className="error-note">
              Processing failed. You can retry uploading the file.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default DocumentUpload;
