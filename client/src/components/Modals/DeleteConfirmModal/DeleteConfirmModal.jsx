import "./DeleteConfirmModal.css";

const DeleteConfirmModal = ({ isOpen, onClose, onConfirm, message }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="delete-confirm-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="delete-modal-content">
          <p className="delete-message">{message}</p>
          <div className="delete-modal-actions">
            <button className="cancel-btn" onClick={onClose}>
              Cancel
            </button>
            <button className="confirm-btn" onClick={onConfirm}>
              Confirm
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmModal;
