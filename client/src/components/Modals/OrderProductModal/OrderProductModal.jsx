import { useState, useEffect } from "react";
import "./OrderProductModal.css";

const OrderProductModal = ({
  isOpen,
  onClose,
  product,
  onOrder,
  isLoading,
}) => {
  const [orderQuantity, setOrderQuantity] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setOrderQuantity("");
      setError("");
    }
  }, [isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validation
    const quantity = parseInt(orderQuantity);
    if (!quantity || quantity <= 0) {
      setError("Please enter a valid quantity");
      return;
    }

    if (quantity > product.quantity) {
      setError(`Cannot order more than available stock (${product.quantity})`);
      return;
    }

    setError("");
    onOrder(product._id, quantity);
  };

  const handleQuantityChange = (e) => {
    const value = e.target.value;
    // Only allow positive integers
    if (value === "" || (/^\d+$/.test(value) && parseInt(value) > 0)) {
      setOrderQuantity(value);
      setError("");
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const getAvailabilityStatus = (product) => {
    if (product.quantity === 0) return "out-of-stock";
    if (product.quantity <= product.thresholdValue) return "low-stock";
    return "in-stock";
  };

  const getAvailabilityText = (product) => {
    if (product.quantity === 0) return "Out of stock";
    if (product.quantity <= product.thresholdValue) return "Low stock";
    return "In stock";
  };

  // Calculate amounts
  const calculateAmounts = () => {
    const quantity = parseInt(orderQuantity || 0);
    const subtotal = product.price * quantity;
    const taxAmount = subtotal * 0.1; // 10% tax
    const totalAmount = subtotal + taxAmount;

    return {
      subtotal: subtotal.toFixed(2),
      taxAmount: taxAmount.toFixed(2),
      totalAmount: totalAmount.toFixed(2),
    };
  };

  if (!isOpen || !product) return null;

  const amounts = calculateAmounts();

  return (
    <div className="order-modal-overlay" onClick={onClose}>
      <div className="order-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="order-modal-header">
          <h2>Order Product</h2>
          <button className="order-modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="order-modal-body">
          {/* Product Information */}
          <div className="product-info-section">
            <h3>Product Details</h3>
            <div className="product-info-grid">
              <div className="info-item">
                <span className="info-label">Name:</span>
                <span className="info-value">{product.name}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Price:</span>
                <span className="info-value">₹{product.price}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Available Stock:</span>
                <span className="info-value">
                  {product.quantity} {product.unit || "Packets"}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Expiry Date:</span>
                <span className="info-value">
                  {formatDate(product.expiryDate)}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Status:</span>
                <span
                  className={`availability-badge ${getAvailabilityStatus(
                    product
                  )}`}
                >
                  {getAvailabilityText(product)}
                </span>
              </div>
            </div>
          </div>

          {/* Order Form */}
          <div className="order-form">
            <div className="form-group">
              <label htmlFor="orderQuantity" className="form-label">
                Quantity to Order:
              </label>
              <input
                type="text"
                id="orderQuantity"
                value={orderQuantity}
                onChange={handleQuantityChange}
                placeholder="Enter quantity"
                className="quantity-input"
                disabled={isLoading || product.quantity === 0}
              />
              {product.quantity > 0 && (
                <span className="quantity-hint">
                  Max available: {product.quantity} {product.unit || "Packets"}
                </span>
              )}
            </div>

            {error && <div className="order-error-message">{error}</div>}

            {product.quantity > 0 && orderQuantity && (
              <div className="order-summary">
                <div className="summary-item">
                  <span>Quantity:</span>
                  <span>
                    {orderQuantity} {product.unit || "Packets"}
                  </span>
                </div>
                <div className="summary-item">
                  <span>Unit Price:</span>
                  <span>₹{product.price}</span>
                </div>
                <div className="summary-item">
                  <span>Subtotal:</span>
                  <span>₹{amounts.subtotal}</span>
                </div>
                <div className="summary-item">
                  <span>Tax (10%):</span>
                  <span>₹{amounts.taxAmount}</span>
                </div>
                <div className="summary-item total">
                  <span>Total Amount:</span>
                  <span>₹{amounts.totalAmount}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="order-modal-footer">
          <button
            type="button"
            className="cancel-btn"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="order-btn"
            onClick={handleSubmit}
            disabled={isLoading || !orderQuantity || product.quantity === 0}
          >
            {isLoading ? "Ordering..." : "Place Order"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderProductModal;
