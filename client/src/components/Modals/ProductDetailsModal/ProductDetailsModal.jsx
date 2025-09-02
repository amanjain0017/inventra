import React from "react";
import "./ProductDetailsModal.css";

const ProductDetailsModal = ({ isOpen, onClose, product }) => {
  if (!isOpen || !product) return null;

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="product-details-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>Products Details</h2>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="modal-content">
          <div className="detail-row">
            {/* <span className="detail-label">Product Name</span> */}
            <span className="detail-label">{product.name}</span>
          </div>

          <div className="detail-row">
            <span className="detail-label">Price</span>
            <span className="detail-value">₹{product.price}</span>
          </div>

          <div className="detail-row">
            <span className="detail-label">Quantity</span>
            <span className="detail-value">
              {product.quantity} {product.unit || "Packets"}
            </span>
          </div>

          <div className="detail-row">
            <span className="detail-label">Threshold Value</span>
            <span className="detail-value">
              {product.thresholdValue} {product.unit || "Packets"}
            </span>
          </div>

          <div className="detail-row">
            <span className="detail-label">Expiry Date</span>
            <span className="detail-value">
              {formatDate(product.expiryDate)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailsModal;
