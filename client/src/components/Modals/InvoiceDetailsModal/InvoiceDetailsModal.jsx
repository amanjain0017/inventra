import footnoteIcon from "../../../assets/icons/footnote.png";
import "./InvoiceDetailsModal.css";

const InvoiceDetailsModal = ({ isOpen, onClose, invoice }) => {
  if (!isOpen || !invoice) return null;

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="invoice-details-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="invoice-modal-header">
          <h2>INVOICE</h2>
          <div className="modal-actions">
            <button className="close-btn" onClick={onClose}>
              ×
            </button>
          </div>
          <div style={{ fontSize: "12px", fontWeight: "500" }}>Billed to</div>
          <div className="company-info">
            <div className="info-one">
              <div className="customer-details">
                <div className="customer-name">Company Name</div>
                <div className="customer-email">Company Address</div>
                <div className="customer-phone">City, Country - 00000</div>
              </div>
            </div>
            <div className="info-two">
              <div className="customer-details">
                <div className="customer-name">Buisness Address</div>
                <div className="customer-email">City, State, IN - 000 000 </div>
                <div className="customer-phone">TAX ID 00XXXX1234XXXX</div>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="modal-content">
          {/* Invoice Info Section */}
          <div className="invoice-meta">
            <div className="invoice-details">
              <div className="detail-row">
                <span className="label">Invoice #</span>
                <span className="value">{invoice.invoiceId}</span>
              </div>
              <div className="detail-row">
                <span className="label">Invoice date</span>
                <span className="value">{formatDate(invoice.invoiceDate)}</span>
              </div>
              <div className="detail-row">
                <span className="label">Reference</span>
                <span className="value">
                  {invoice.referenceNumber || "N/A"}
                </span>
              </div>
              <div className="detail-row">
                <span className="label">Due date</span>
                <span className="value">{formatDate(invoice.dueDate)}</span>
              </div>
            </div>
          </div>

          {/* Products Table */}
          <div className="products-section">
            <table className="products-table">
              <thead>
                <tr>
                  <th>Products</th>
                  <th>Qty</th>
                  <th style={{ textAlign: "right" }}>Price</th>
                </tr>
              </thead>
              <tbody>
                {invoice.products?.map((product, index) => (
                  <tr key={index}>
                    <td className="product-name">{product.name}</td>
                    <td className="product-qty">{product.quantity}</td>
                    <td
                      className="product-price"
                      style={{ textAlign: "right" }}
                    >
                      {formatCurrency(product.price)}
                    </td>
                  </tr>
                ))}
                {/* Totals as table rows */}
                <tr className="total-row-table">
                  <td colSpan="2" className="total-label-table">
                    Subtotal
                  </td>
                  <td
                    className="total-label-table"
                    style={{ textAlign: "right" }}
                  >
                    {formatCurrency(invoice.subTotal)}
                  </td>
                </tr>
                <tr className="total-row-table">
                  <td colSpan="2" className="total-label-table">
                    Tax (10%)
                  </td>
                  <td
                    className="total-label-table"
                    style={{ textAlign: "right" }}
                  >
                    {formatCurrency(invoice.taxAmount)}
                  </td>
                </tr>
                <tr className="final-total-table">
                  <td
                    colSpan="2"
                    className="total-label-table final-label"
                    style={{ color: "#008799" }}
                  >
                    Total due
                  </td>
                  <td
                    className="total-value-table final-value"
                    style={{ textAlign: "right", color: "#008799" }}
                  >
                    {formatCurrency(invoice.totalAmount)}
                  </td>
                </tr>
              </tbody>
            </table>
            <div className="footnote">
              <img src={footnoteIcon} alt="" width={10} />
              <div>Please pay within 15 days of receiving this invoice.</div>
            </div>
          </div>
        </div>
        {/* Footer */}
        <div className="invoice-footer">
          <div className="company-details">
            <div>www.inventra.com</div>
            <div>+91 00000 00000</div>
            <div>canova@inventra.com</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceDetailsModal;
