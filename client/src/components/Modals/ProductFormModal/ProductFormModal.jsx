import { useState, useEffect } from "react";
import cloudinaryUploader from "../../../utils/cloudinaryUpload";
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
      // Set the existing image URL if editing
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

    // Basic validation
    if (!formData.name.trim()) {
      return;
    }

    setIsUploading(true);
    let finalImageUrl = imageUrl; // Use existing image URL if no new image

    try {
      // Upload new image if one was selected
      if (formData.image) {
        // Validate image first
        const validation = cloudinaryUploader.validateImage(formData.image);
        if (!validation.isValid) {
          throw new Error(validation.errors.join(", "));
        }

        // Upload the image to Cloudinary
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
        imageUrl: finalImageUrl, // Include the image URL
      };

      await onSubmit(productData, editingProduct);
    } catch (error) {
      console.error("Error during form submission:", error);
      // You might want to show an error toast here
      alert("Error uploading image: " + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleImageSelect = async (file) => {
    if (file && file.type.startsWith("image/")) {
      // Validate the image
      const validation = cloudinaryUploader.validateImage(file);
      if (!validation.isValid) {
        alert("Image validation failed: " + validation.errors.join(", "));
        return;
      }

      setFormData({ ...formData, image: file });
      // Clear any existing image URL since we're replacing it
      setImageUrl("");
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
      handleImageSelect(files[0]);
    }
  };

  const handleFileInputChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleImageSelect(file);
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

  const handleDiscard = () => {
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
    // Reset the file input as well
    const fileInput = document.getElementById("image-file-input");
    if (fileInput) {
      fileInput.value = "";
    }
  };

  const removeImage = () => {
    setFormData({ ...formData, image: null });
    setImageUrl("");
    const fileInput = document.getElementById("image-file-input");
    if (fileInput) {
      fileInput.value = "";
    }
  };

  // Get display image (either new file or existing URL)
  const getDisplayImage = () => {
    if (formData.image) {
      return URL.createObjectURL(formData.image);
    }
    return imageUrl;
  };

  const hasImage = formData.image || imageUrl;

  return (
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
              className={`image-upload-zone ${isDragOver ? "drag-over" : ""} ${
                hasImage ? "has-image" : ""
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
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
                    onChange={handleFileInputChange}
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
              onClick={handleDiscard}
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
  );
};

export default ProductFormModal;
