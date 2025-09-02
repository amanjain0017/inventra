import React, { useState, useRef } from "react";

import uploadIcon from "../../../assets/icons/upload.png";
import fileIcon from "../../../assets/icons/file.png";
import "./CsvUploadModal.css";
import "../Modal.css";

const CsvUploadModal = ({ isOpen, onClose, onUpload, isLoading }) => {
  const [csvFile, setCsvFile] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.type === "text/csv" || file.name.endsWith(".csv")) {
        setCsvFile(file);
      } else {
        setCsvFile(null);
        // Clear the input value for invalid files
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      const file = files[0];
      if (file.type === "text/csv" || file.name.endsWith(".csv")) {
        setCsvFile(file);
      } else {
        setCsvFile(null);
      }
    }
  };

  const handleUpload = async () => {
    if (csvFile && onUpload) {
      await onUpload(csvFile);
      setCsvFile(null);
      // Clear the file input after successful upload
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveFile = () => {
    setCsvFile(null);
    // Clear the file input value when removing file
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleClose = () => {
    setCsvFile(null);
    // Clear the file input when closing modal
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div
        className="modal-content csv-upload-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <h3>CSV Upload</h3>
            <p>Add your document here</p>
          </div>
          <button className="close-btn" onClick={handleClose}>
            ×
          </button>
        </div>
        <div className="csv-upload-content">
          <div
            className={`csv-drop-zone ${isDragOver ? "drag-over" : ""}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="csv-upload-icon">
              <img src={uploadIcon} alt="upload" width={48} />
            </div>
            <p>Drag your file(s) to start uploading</p>
            <p>------------ OR ------------</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              style={{ display: "none" }}
              id="csv-file-input"
            />
            <button
              className="browse-btn"
              onClick={() => fileInputRef.current?.click()}
            >
              Browse files
            </button>
          </div>
          {csvFile && (
            <div className="selected-file">
              <div className="file-info">
                <div className="file-icon">
                  <img src={fileIcon} alt="file" width={24} />
                </div>
                <span>{csvFile.name}</span>
              </div>
              <button className="remove-file-btn" onClick={handleRemoveFile}>
                ×
              </button>
            </div>
          )}
          <div className="csv-modal-actions">
            <button className="cancel-btn" onClick={handleClose}>
              Cancel
            </button>
            <button
              className="upload-btn"
              onClick={handleUpload}
              disabled={!csvFile || isLoading}
            >
              {isLoading ? "Uploading..." : "Upload"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CsvUploadModal;
