import { useState, useEffect } from "react";
import cloudinaryUploader from "../../../utils/cloudinaryUpload";
import Toast from "../../Toast/Toast";
import "./ProductFormModal.css";

const ProductFormModal = ({
  isOpen,
  onClose,
  onSubmit,
  editingProduct,
  isLoading,
}) => {
  const [formData, setFormData] = useState({
    name: "",
    productId: "",
    category: "",
    price: "",
    quantity: "",
    unit: "",
    expiryDate: "",
    thresholdValue: "",
    image: null,
  });
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [toastMessage, setToastMessage] = useState(null);

  useEffect(() => {
    if (editingProduct) {
      setFormData({
        name: editingProduct.name || "",
        productId: editingProduct.productId || "",
        category: editingProduct.category || "",
        price: editingProduct.price?.toString() || "",
        quantity: editingProduct.quantity?.toString() || "",
        unit: editingProduct.unit || "",
        expiryDate: editingProduct.expiryDate
          ? editingProduct.expiryDate.split("T")[0]
          : "",
        thresholdValue: editingProduct.thresholdValue?.toString() || "",
        image: null,
      });
      setImageUrl(editingProduct.imageUrl || "");
    } else {
      setFormData({
        name: "",
        productId: "",
        category: "",
        price: "",
        quantity: "",
        unit: "",
        expiryDate: "",
        thresholdValue: "",
        image: null,
      });
      setImageUrl("");
    }
    setIsUploading(false);
  }, [editingProduct, isOpen]);

  if (!isOpen) return null;

  const handleFormSubmit = async (e) => {
    e.preventDefault();

    // Client-side validation
    if (!formData.name.trim()) {
      setToastMessage({ type: "error", text: "Product Name is required" });
      return;
    }
    if (!formData.productId.trim()) {
      setToastMessage({ type: "error", text: "Product ID is required" });
      return;
    }
    if (!formData.category.trim()) {
      setToastMessage({ type: "error", text: "Category is required" });
      return;
    }
    if (!formData.price.trim()) {
      setToastMessage({ type: "error", text: "Price is required" });
      return;
    }
    if (!formData.quantity.trim()) {
      setToastMessage({ type: "error", text: "Quantity is required" });
      return;
    }
    if (!formData.unit.trim()) {
      setToastMessage({ type: "error", text: "Unit is required" });
      return;
    }
    if (!formData.thresholdValue.trim()) {
      setToastMessage({ type: "error", text: "Threshold Value is required" });
      return;
    }

    setIsUploading(true);
    let finalImageUrl = imageUrl;

    try {
      if (formData.image) {
        const validation = cloudinaryUploader.validateImage(formData.image);
        if (!validation.isValid) {
          throw new Error(validation.errors.join(", "));
        }
        finalImageUrl = await cloudinaryUploader.uploadImage(formData.image);
      }

      const productData = {
        name: formData.name.trim(),
        productId: formData.productId.trim(),
        category: formData.category,
        price: parseFloat(formData.price) || 0,
        quantity: parseInt(formData.quantity) || 0,
        unit: formData.unit || "",
        thresholdValue: parseInt(formData.thresholdValue) || 0,
        expiryDate: formData.expiryDate || null,
        imageUrl: finalImageUrl,
      };

      await onSubmit(productData, editingProduct);

      setToastMessage({
        type: "success",
        text: editingProduct
          ? "Product updated successfully!"
          : "Product added successfully!",
      });

      handleClose();
    } catch (error) {
      console.error("Error during form submission:", error);
      setToastMessage({ type: "error", text: error.message });
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      name: "",
      productId: "",
      category: "",
      price: "",
      quantity: "",
      unit: "",
      expiryDate: "",
      thresholdValue: "",
      image: null,
    });
    setImageUrl("");
    setIsUploading(false);
    onClose();
  };

  const removeImage = () => {
    setFormData({ ...formData, image: null });
    setImageUrl("");
    const fileInput = document.getElementById("image-file-input");
    if (fileInput) fileInput.value = "";
  };

  const getDisplayImage = () => {
    if (formData.image) return URL.createObjectURL(formData.image);
    return imageUrl;
  };

  const hasImage = formData.image || imageUrl;

  return (
    <>
      {toastMessage && (
        <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
      )}

      <div className="modal-overlay" onClick={handleClose}>
        <div
          className="modal-content product-form-modal"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modal-header" style={{ backgroundColor: "#ececf4" }}>
            <h3>
              {editingProduct
                ? "Edit Individual Product"
                : "Add Individual Product"}
            </h3>
            <button className="close-btn" onClick={handleClose}>
              ×
            </button>
          </div>

          <div className="product-form">
            {/* Image Upload Section */}
            <div className="form-group">
              <div
                className={`image-upload-zone ${
                  isDragOver ? "drag-over" : ""
                } ${hasImage ? "has-image" : ""}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDragOver(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDragOver(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDragOver(false);
                  const files = e.dataTransfer.files;
                  if (files && files[0])
                    setFormData({ ...formData, image: files[0] });
                }}
              >
                <div className="image-preview">
                  {hasImage ? (
                    <div className="image-container">
                      <img
                        src={getDisplayImage()}
                        alt="Product preview"
                        className="preview-image"
                      />
                      <button
                        type="button"
                        className="remove-image-btn"
                        onClick={removeImage}
                        title="Remove image"
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <div className="image-placeholder"></div>
                  )}
                </div>

                {!hasImage && (
                  <div className="image-upload-text">
                    <p>Drag image here</p>
                    <p>or</p>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) =>
                        setFormData({ ...formData, image: e.target.files[0] })
                      }
                      style={{ display: "none" }}
                      id="image-file-input"
                    />
                    <button
                      type="button"
                      className="browse-image-btn"
                      onClick={() =>
                        document.getElementById("image-file-input").click()
                      }
                    >
                      Browse image
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Your existing form fields remain unchanged */}
            <div className="form-group form-group-horizontal">
              <label className="form-label">Product Name</label>
              <input
                type="text"
                placeholder="Enter product name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
                className="form-input"
              />
            </div>

            <div className="form-group form-group-horizontal">
              <label className="form-label">Product ID</label>
              <input
                type="text"
                placeholder="Enter product ID"
                value={formData.productId}
                onChange={(e) =>
                  setFormData({ ...formData, productId: e.target.value })
                }
                className="form-input"
              />
            </div>

            <div className="form-group form-group-horizontal">
              <label className="form-label">Category</label>
              <input
                type="text"
                placeholder="Enter product category"
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value })
                }
                required
                className="form-input"
              />
            </div>

            <div className="form-group form-group-horizontal">
              <label className="form-label">Price</label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="Enter price"
                value={formData.price}
                onChange={(e) =>
                  setFormData({ ...formData, price: e.target.value })
                }
                required
                className="form-input"
              />
            </div>

            <div className="form-group form-group-horizontal">
              <label className="form-label">Quantity</label>
              <input
                type="number"
                min="0"
                placeholder="Enter product quantity"
                value={formData.quantity}
                onChange={(e) =>
                  setFormData({ ...formData, quantity: e.target.value })
                }
                required
                className="form-input"
              />
            </div>

            <div className="form-group form-group-horizontal">
              <label className="form-label">Unit</label>
              <input
                type="text"
                placeholder="Enter product unit"
                value={formData.unit}
                onChange={(e) =>
                  setFormData({ ...formData, unit: e.target.value })
                }
                required
                className="form-input"
              />
            </div>

            <div className="form-group form-group-horizontal">
              <label className="form-label">Expiry Date</label>
              <input
                type="date"
                placeholder="Enter expiry date"
                value={formData.expiryDate}
                onChange={(e) =>
                  setFormData({ ...formData, expiryDate: e.target.value })
                }
                min={new Date().toISOString().split("T")[0]}
                className="form-input"
              />
            </div>

            <div className="form-group form-group-horizontal">
              <label className="form-label">Threshold Value</label>
              <input
                type="number"
                min="0"
                placeholder="Enter threshold value"
                value={formData.thresholdValue}
                onChange={(e) =>
                  setFormData({ ...formData, thresholdValue: e.target.value })
                }
                required
                className="form-input"
              />
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="cancel-btn"
                onClick={handleClose}
                disabled={isLoading || isUploading}
              >
                Discard
              </button>
              <button
                onClick={handleFormSubmit}
                disabled={isLoading || isUploading}
                className="submit-btn"
              >
                {isUploading
                  ? "Uploading..."
                  : isLoading
                  ? editingProduct
                    ? "Updating..."
                    : "Adding..."
                  : editingProduct
                  ? "Update Product"
                  : "Add Product"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ProductFormModal;
