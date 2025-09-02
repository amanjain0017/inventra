import React, { useEffect } from "react";
import "./Toast.css";

const Toast = ({ message, onClose, duration = 2000 }) => {
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [message, onClose, duration]);

  if (!message) return null;

  return (
    <div className={`toast toast-${message.type}`}>
      <div className="toast-content">
        <span className="toast-icon">
          {message.type === "success" ? "✓" : "⚠"}
        </span>
        <span className="toast-text">{message.text}</span>
        <button onClick={onClose} className="toast-close">
          ×
        </button>
      </div>
    </div>
  );
};

export default Toast;
