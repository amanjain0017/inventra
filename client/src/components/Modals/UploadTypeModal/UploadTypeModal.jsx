import "./UploadTypeModal.css";
import "../Modal.css";

const UploadTypeModal = ({
  isOpen,
  onClose,
  onSelectIndividual,
  onSelectMultiple,
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content upload-type-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3></h3>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="upload-type-options">
          <button
            className="upload-type-btn individual"
            onClick={onSelectIndividual}
          >
            Individual product
          </button>
          <button
            className="upload-type-btn multiple"
            onClick={onSelectMultiple}
          >
            Multiple product
          </button>
        </div>
      </div>
    </div>
  );
};

export default UploadTypeModal;
