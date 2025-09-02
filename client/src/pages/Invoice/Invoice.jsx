import { useState } from "react";
import { useInvoices } from "../../context/InvoiceContext";

import Toast from "../../components/Toast/Toast";
import InvoiceDetailsModal from "../../components/Modals/InvoiceDetailsModal/InvoiceDetailsModal";
import DeleteConfirmModal from "../../components/Modals/DeleteConfirmModal/DeleteConfirmModal";

import searchIcon from "../../assets/icons/search.png";
import hidepasswordIcon from "../../assets/icons/hidepassword.png";
import deleteIcon from "../../assets/icons/delete.png";
import threedotsIcon from "../../assets/icons/threedots.png";
import logo from "../../assets/icons/companylogo.png";
import "./Invoice.css";

const Invoice = () => {
  const {
    invoices,
    metrics,
    pagination,
    isLoading,
    error,
    fetchInvoices,
    updateInvoice,
    deleteInvoice,
  } = useInvoices();

  // State management
  const [showInvoiceDetailsModal, setShowInvoiceDetailsModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [toast, setToast] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [viewedInvoices, setViewedInvoices] = useState(new Set());

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Toast helper functions
  const showToast = (message, type = "success") => {
    setToast({ text: message, type });
  };

  const hideToast = () => {
    setToast(null);
  };

  // Event handlers
  const handleSearch = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    fetchInvoices(1, pagination.perPage, value);
  };

  const handleViewInvoiceDetails = (invoice) => {
    setSelectedInvoice(invoice);
    setShowInvoiceDetailsModal(true);
    setOpenDropdown(null);

    setViewedInvoices((prev) => new Set(prev).add(invoice._id));
  };

  const handleDeleteClick = (invoice) => {
    setSelectedInvoice(invoice);
    setShowDeleteModal(true);
    setOpenDropdown(null);
  };

  const handleDeleteConfirm = async () => {
    if (selectedInvoice) {
      const result = await deleteInvoice(selectedInvoice._id);
      if (result.success) {
        showToast("Invoice deleted successfully");
      } else {
        showToast(result.error || "Failed to delete invoice", "error");
      }
      setShowDeleteModal(false);
      setSelectedInvoice(null);
    }
  };

  const handleMarkAsPaid = async (invoice) => {
    setIsSubmitting(true);
    const result = await updateInvoice(invoice._id, { status: "Paid" });
    if (result.success) {
      showToast("Invoice marked as paid successfully");
    } else {
      showToast(result.error || "Failed to update invoice", "error");
    }
    setIsSubmitting(false);
    setOpenDropdown(null);
  };

  const handlePageChange = (newPage) => {
    fetchInvoices(newPage, pagination.perPage, searchTerm);
  };

  const toggleDropdown = (invoiceId) => {
    setOpenDropdown(openDropdown === invoiceId ? null : invoiceId);
  };

  // Close dropdown when clicking outside
  const handleOutsideClick = () => {
    setOpenDropdown(null);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
    });
  };

  const canMarkAsPaid = (status) => {
    return (
      status?.toLowerCase() === "unpaid" || status?.toLowerCase() === "overdue"
    );
  };

  // Loading state
  if (isLoading && invoices.length === 0) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div onClick={handleOutsideClick}>
      {/* Header */}
      <div className="invoice-header">
        <div className="page-title">Invoice</div>
        <div className="mobile-logo">
          <img src={logo} alt="logo" width={35} />
        </div>
        <div className="search-container">
          <div className="search-input-wrapper">
            <img
              src={searchIcon}
              alt="search"
              width={19}
              className="search-icon"
            />
            <input
              type="text"
              placeholder="Search here..."
              value={searchTerm}
              onChange={handleSearch}
              className="search-input"
            />
          </div>
        </div>
      </div>

      <div className="invoice-page">
        {/* Overall Invoice Section */}
        <div className="invoice-overview">
          <h2>Overall Invoice</h2>
          <div className="invoice-metrics-container">
            <div className="invoice-metric">
              <div className="metric-group">
                <h3>Recent Transactions</h3>
                <div className="metric-value">{metrics?.paidInvoices}</div>
                <div className="metric-labels">
                  <span>Last 7 days</span>
                </div>
              </div>
            </div>
            <div className="invoice-metric">
              <h3>Total Invoices</h3>
              <div className="metric-groups">
                <div className="metric-group">
                  <div className="metric-value">
                    {metrics?.totalInvoices || 0}
                  </div>
                  <div className="metric-labels">
                    <span>Last 7 days</span>
                  </div>
                </div>
                <div
                  className="metric-group"
                  style={{ alignItems: "flex-end" }}
                >
                  <div className="metric-value">{viewedInvoices.size}</div>
                  <div className="metric-labels">
                    <span>Processed</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="invoice-metric">
              <h3>Paid Amount</h3>
              <div className="metric-groups">
                <div className="metric-group">
                  <div className="metric-value">{metrics?.paidInvoices}</div>
                  <div className="metric-labels">
                    <span>Last 7 days</span>
                  </div>
                </div>
                <div
                  className="metric-group"
                  style={{ alignItems: "flex-end" }}
                >
                  <div className="metric-value">
                    {formatCurrency(metrics?.totalPaidAmount || 0)}
                  </div>
                  <div className="metric-labels">
                    <span>Amount</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="invoice-metric" style={{ border: "none" }}>
              <h3>Unpaid Amount</h3>
              <div className="metric-groups">
                <div className="metric-group">
                  <div className="metric-value">{metrics?.unpaidInvoices}</div>
                  <div className="metric-labels">
                    <span>Last 7 days</span>
                  </div>
                </div>
                <div
                  className="metric-group"
                  style={{ alignItems: "flex-end" }}
                >
                  <div className="metric-value">
                    {formatCurrency(metrics?.totalUnpaidAmount || 0)}
                  </div>
                  <div className="metric-labels">
                    <span>Amount</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Invoices Section */}
        <div className="invoices-section">
          <div className="invoices-header">
            <h2>Invoices List</h2>
          </div>

          {error && <div className="error-message">{error}</div>}

          {/* Desktop Table View */}
          <div className="invoices-table-container desktop-only">
            <table className="invoices-table">
              <thead>
                <tr>
                  <th>Invoice ID</th>
                  <th>Reference Number</th>
                  <th>Amount (₹)</th>
                  <th>Status</th>
                  <th>Due Date</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice._id}>
                    <td>{invoice.invoiceId}</td>
                    <td>{invoice.referenceNumber || "-"}</td>
                    <td>{formatCurrency(invoice.totalAmount)}</td>
                    <td>
                      <span className={"status-badge "}>{invoice.status}</span>
                    </td>
                    <td className="date-with-actions">
                      {formatDate(invoice.dueDate)}
                      <div className="dropdown-container">
                        <button
                          className="dropdown-trigger"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleDropdown(invoice._id);
                          }}
                        >
                          <img src={threedotsIcon} alt="actions" />
                        </button>
                        {openDropdown === invoice._id && (
                          <div className="dropdown-menu">
                            <button
                              className="dropdown-item"
                              onClick={() => handleViewInvoiceDetails(invoice)}
                            >
                              <div className="view-btn">
                                <img
                                  src={hidepasswordIcon}
                                  alt="view"
                                  height={25}
                                />
                              </div>
                              View Invoice
                            </button>
                            <button
                              className="dropdown-item delete-item"
                              onClick={() => handleDeleteClick(invoice)}
                            >
                              <div className="delete-btn">
                                <img src={deleteIcon} alt="delete" />
                              </div>
                              Delete
                            </button>
                            {canMarkAsPaid(invoice.status) && (
                              <button
                                className="dropdown-item"
                                onClick={() => handleMarkAsPaid(invoice)}
                                disabled={isSubmitting}
                              >
                                Mark as paid
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Table View */}
          <div className="invoices-mobile-table mobile-only">
            <table className="mobile-invoices-table">
              <thead>
                <tr>
                  <th>Invoice ID</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice._id}>
                    <td>
                      <div className="invoice-id-with-info">
                        <span className="invoice-id">{invoice.invoiceId}</span>
                      </div>
                    </td>
                    <td className="date-with-actions">
                      <div className="status-with-info">
                        <div className="mobile-actions">
                          <button
                            className="view-btn"
                            onClick={() => handleViewInvoiceDetails(invoice)}
                          >
                            <img src={hidepasswordIcon} alt="view" width={22} />
                          </button>
                          <button
                            className="delete-btn"
                            onClick={() => handleDeleteClick(invoice)}
                          >
                            <img src={deleteIcon} alt="delete" />
                          </button>
                        </div>
                        {canMarkAsPaid(invoice.status) && (
                          <div className="dropdown-container">
                            <button
                              className="dropdown-trigger"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleDropdown(invoice._id);
                              }}
                            >
                              <img src={threedotsIcon} alt="actions" />
                            </button>

                            {openDropdown === invoice._id && (
                              <div className="dropdown-menu">
                                <button
                                  className="dropdown-item"
                                  onClick={() => handleMarkAsPaid(invoice)}
                                  disabled={isSubmitting}
                                >
                                  Mark as Paid
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* No invoices message */}
          {invoices.length === 0 && !isLoading && (
            <div className="no-invoices">
              <p>
                No invoices found.{" "}
                {searchTerm
                  ? "Try adjusting your search."
                  : "No invoices available."}
              </p>
            </div>
          )}

          {/* Pagination */}
          {invoices.length !== 0 && (
            <div className="pagination">
              <button
                className="pagination-btn"
                onClick={() => handlePageChange(pagination.currentPage - 1)}
                disabled={pagination.currentPage === 1 || isLoading}
              >
                Previous
              </button>
              <span className="pagination-info">
                Page {pagination.currentPage} of {pagination.totalPages}
              </span>
              <button
                className="pagination-btn"
                onClick={() => handlePageChange(pagination.currentPage + 1)}
                disabled={
                  pagination.currentPage === pagination.totalPages || isLoading
                }
              >
                Next
              </button>
            </div>
          )}
        </div>

        {/* Modals */}
        <InvoiceDetailsModal
          isOpen={showInvoiceDetailsModal}
          onClose={() => setShowInvoiceDetailsModal(false)}
          invoice={selectedInvoice}
        />

        <DeleteConfirmModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDeleteConfirm}
          message="This invoice will be deleted."
        />

        {/* Toast Notification */}
        <Toast message={toast} onClose={hideToast} />
      </div>
    </div>
  );
};

export default Invoice;
