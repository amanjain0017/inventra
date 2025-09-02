import { useState } from "react";
import { useProducts } from "../../context/ProductContext";
import { useInvoices } from "../../context/InvoiceContext";
import { useDashboard } from "../../context/DashboardContext";

import Toast from "../../components/Toast/Toast";
import UploadTypeModal from "../../components/Modals/UploadTypeModal/UploadTypeModal";
import CsvUploadModal from "../../components/Modals/CsvUploadModal/CsvUploadModal";
import ProductFormModal from "../../components/Modals/ProductFormModal/ProductFormModal";
import ProductDetailsModal from "../../components/Modals/ProductDetailsModal/ProductDetailsModal";
import OrderProductModal from "../../components/Modals/OrderProductModal/OrderProductModal";

import searchIcon from "../../assets/icons/search.png";
import infoIcon from "../../assets/icons/Info.png";
import logo from "../../assets/icons/companylogo.png";
import "./Product.css";

const Product = () => {
  const {
    products,
    metrics,
    pagination,
    isLoading,
    error,
    searchTerm,
    addProduct,
    updateProduct,
    deleteProduct,
    addBulkProducts,
    orderProduct,
    changePage,
    updateSearchTerm,
  } = useProducts();

  const { metrics: invoiceMetrics } = useInvoices();
  const { topProductsSummary } = useDashboard();

  // State management
  const [showUploadTypeModal, setShowUploadTypeModal] = useState(false);
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [showProductFormModal, setShowProductFormModal] = useState(false);
  const [showProductDetailsModal, setShowProductDetailsModal] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [orderingProduct, setOrderingProduct] = useState(null);
  const [toast, setToast] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    updateSearchTerm(e.target.value);
  };

  const handleAddProduct = () => {
    setShowUploadTypeModal(true);
  };

  const handleSelectIndividual = () => {
    setShowUploadTypeModal(false);
    setEditingProduct(null);
    setShowProductFormModal(true);
  };

  const handleSelectMultiple = () => {
    setShowUploadTypeModal(false);
    setShowCsvModal(true);
  };

  const handleEditProduct = (e, product) => {
    e.stopPropagation(); // Prevent row click
    setEditingProduct(product);
    setShowProductFormModal(true);
  };

  const handleViewProductDetails = (e, product) => {
    e.stopPropagation(); // Prevent row click
    setSelectedProduct(product);
    setShowProductDetailsModal(true);
  };

  const handleDeleteProduct = async (e, productId) => {
    e.stopPropagation(); // Prevent row click
    if (window.confirm("Are you sure you want to delete this product?")) {
      const result = await deleteProduct(productId);
      if (result.success) {
        showToast("Product deleted successfully");
      } else {
        showToast(result.error || "Failed to delete product", "error");
      }
    }
  };

  // New row click handler for ordering
  const handleRowClick = (product) => {
    if (product.quantity > 0) {
      setOrderingProduct(product);
      setShowOrderModal(true);
    } else {
      showToast("Cannot order - product is out of stock", "error");
    }
  };

  const handleProductFormSubmit = async (productData, editingProduct) => {
    setIsSubmitting(true);
    let result;

    try {
      if (editingProduct) {
        result = await updateProduct(editingProduct._id, productData);
        if (result.success) {
          showToast("Product updated successfully");
          setShowProductFormModal(false);
        } else {
          showToast(result.error || "Failed to update product", "error");
        }
      } else {
        result = await addProduct(productData);
        if (result.success) {
          showToast("Product added successfully");
          setShowProductFormModal(false);
        } else {
          showToast(result.error || "Failed to add product", "error");
        }
      }
    } catch (err) {
      showToast("An unexpected error occurred", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCsvUpload = async (file) => {
    setIsSubmitting(true);
    try {
      const result = await addBulkProducts(file);
      if (result.success) {
        showToast(
          `Successfully uploaded ${result.addedCount} products`,
          "success"
        );
        setShowCsvModal(false);

        // Show detailed results if there were any errors
        if (result.errors && result.errors.length > 0) {
          console.log("Upload errors:", result.errors);
          showToast(
            `${result.addedCount} products added, ${result.errors.length} failed`,
            "warning"
          );
        }
      } else {
        showToast(result.error || "Failed to upload CSV file", "error");

        // Show detailed error information
        if (result.details) {
          console.log("Upload details:", result.details);
        }
      }
    } catch (err) {
      showToast("An unexpected error occurred during upload", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // New order handler
  const handleOrderSubmit = async (productId, quantity) => {
    setIsSubmitting(true);
    try {
      const result = await orderProduct(productId, quantity);
      if (result.success) {
        showToast(`Successfully ordered ${quantity} units`);
        setShowOrderModal(false);
        setOrderingProduct(null);

        // Optionally show invoice information
        if (result.invoice) {
          console.log("Invoice details:", result.invoice);
        }
      } else {
        showToast(result.error || "Failed to place order", "error");
      }
    } catch (err) {
      showToast("An unexpected error occurred", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePageChange = (newPage) => {
    changePage(newPage);
  };

  // Utility functions
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

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
    });
  };

  // Loading state
  if (isLoading && products.length === 0) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <>
      {/* Header */}
      <div className="product-header">
        <div className="page-title">Product</div>
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

      <div className="product-page">
        {/* Overall Inventory Section */}
        <div className="inventory-overview">
          <h2>Overall Inventory</h2>
          <div className="inventory-metrics-container">
            <div className="inventory-metric">
              <div className="metric-group">
                <h3>Categories</h3>
                <div className="metric-value">{metrics?.categories || 0}</div>
                <div className="metric-labels">
                  <span>Last 7 days</span>
                </div>
              </div>
            </div>
            <div className="inventory-metric">
              <h3>Total Products</h3>
              <div className="metric-groups">
                <div className="metric-group">
                  <div className="metric-value">
                    {metrics?.totalProducts || 0}
                  </div>
                  <div className="metric-labels">
                    <span>Last 7 days</span>
                  </div>
                </div>
                <div
                  className="metric-group"
                  style={{ alignItems: "flex-end" }}
                >
                  <div className="metric-value">
                    {formatCurrency(invoiceMetrics?.totalSalesAmount || 0)}
                  </div>
                  <div className="metric-labels">
                    <span>Revenue</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="inventory-metric">
              <h3>Top Selling</h3>
              <div className="metric-groups">
                <div className="metric-group">
                  <div className="metric-value">
                    {topProductsSummary?.count || 0}
                  </div>
                  <div className="metric-labels">
                    <span>Last 7 days</span>
                  </div>
                </div>
                <div
                  className="metric-group"
                  style={{ alignItems: "flex-end" }}
                >
                  <div className="metric-value">
                    {formatCurrency(topProductsSummary?.totalRevenue || 0)}
                  </div>
                  <div className="metric-labels">
                    <span>Cost</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="inventory-metric" style={{ border: "none" }}>
              <h3>Low Stocks</h3>
              <div className="metric-groups">
                <div className="metric-group">
                  <div className="metric-value">{metrics?.lowStocks || 0}</div>
                  <div className="metric-labels">
                    <span>Low stock</span>
                  </div>
                </div>
                <div
                  className="metric-group"
                  style={{ alignItems: "flex-end" }}
                >
                  <div className="metric-value">{metrics?.notInStock || 0}</div>
                  <div className="metric-labels">
                    <span>Not in stock</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Products Section */}
        <div className="products-section">
          <div className="products-header">
            <h2>Products</h2>
            <button className="add-product-btn" onClick={handleAddProduct}>
              Add Product
            </button>
          </div>

          {error && <div className="error-message">{error}</div>}

          {/* Desktop Table View */}
          <div className="products-table-container desktop-only">
            <table className="products-table">
              <thead>
                <tr>
                  <th>Products</th>
                  <th>Price</th>
                  <th>Quantity</th>
                  <th>Threshold Value</th>
                  <th>Expiry Date</th>
                  <th>Availability</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr
                    key={product._id}
                    className={`product-row ${
                      product.quantity > 0 ? "clickable" : "disabled"
                    }`}
                    onClick={() => handleRowClick(product)}
                    title={
                      product.quantity > 0
                        ? "Click to order this product"
                        : "Out of stock - cannot order"
                    }
                  >
                    <td>{product.name}</td>
                    <td>₹{product.price}</td>
                    <td>
                      {product.quantity} {product.unit || "Packets"}
                    </td>
                    <td>
                      {product.thresholdValue} {product.unit || "Packets"}
                    </td>
                    <td>{formatDate(product.expiryDate)}</td>
                    <td>
                      <span
                        className={`availability-badge ${getAvailabilityStatus(
                          product
                        )}`}
                      >
                        {getAvailabilityText(product)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Table View */}
          <div className="products-mobile-table mobile-only">
            <table className="mobile-products-table">
              <thead>
                <tr>
                  <th>Products</th>
                  <th>Availability</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr
                    key={product._id}
                    className={`product-row ${
                      product.quantity > 0 ? "clickable" : "disabled"
                    }`}
                    onClick={() => handleRowClick(product)}
                  >
                    <td>
                      <div className="product-name-with-info">
                        <span className="product-name">{product.name}</span>
                      </div>
                    </td>
                    <td>
                      <div className="availability-with-info">
                        <span
                          className={`availability-badge ${getAvailabilityStatus(
                            product
                          )}`}
                        >
                          {getAvailabilityText(product)}
                        </span>
                        <button
                          className="info-btn"
                          onClick={(e) => handleViewProductDetails(e, product)}
                        >
                          <img src={infoIcon} alt="info" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* No products message */}
          {products.length === 0 && !isLoading && (
            <div className="no-products">
              <p>
                No products found.{" "}
                {searchTerm
                  ? "Try adjusting your search."
                  : "Add your first product to get started."}
              </p>
            </div>
          )}

          {/* Pagination */}
          {products.length !== 0 && (
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
        <UploadTypeModal
          isOpen={showUploadTypeModal}
          onClose={() => setShowUploadTypeModal(false)}
          onSelectIndividual={handleSelectIndividual}
          onSelectMultiple={handleSelectMultiple}
        />

        <CsvUploadModal
          isOpen={showCsvModal}
          onClose={() => setShowCsvModal(false)}
          onUpload={handleCsvUpload}
          isLoading={isSubmitting}
        />

        <ProductFormModal
          isOpen={showProductFormModal}
          onClose={() => setShowProductFormModal(false)}
          onSubmit={handleProductFormSubmit}
          editingProduct={editingProduct}
          isLoading={isSubmitting}
        />

        <ProductDetailsModal
          isOpen={showProductDetailsModal}
          onClose={() => setShowProductDetailsModal(false)}
          product={selectedProduct}
        />

        <OrderProductModal
          isOpen={showOrderModal}
          onClose={() => {
            setShowOrderModal(false);
            setOrderingProduct(null);
          }}
          product={orderingProduct}
          onOrder={handleOrderSubmit}
          isLoading={isSubmitting}
        />

        {/* Toast Notification */}
        <Toast message={toast} onClose={hideToast} />
      </div>
    </>
  );
};

export default Product;
