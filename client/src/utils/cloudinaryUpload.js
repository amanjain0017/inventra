class CloudinaryUploader {
  constructor(cloudName, uploadPreset) {
    this.cloudName = cloudName;
    this.uploadPreset = uploadPreset;
    this.baseUrl = `https://api.cloudinary.com/v1_1/${cloudName}`;
  }

  /*
   * Upload a single image to Cloudinary
   * @param {File} file - The image file to upload
   * @param {Object} options - Upload options
   * @returns {Promise<string>} - The secure URL of the uploaded image
   */
  async uploadImage(file, options = {}) {
    // Validate that it's an image
    if (!file.type.startsWith("image/")) {
      throw new Error("Only image files are allowed");
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", this.uploadPreset);
    formData.append("folder", "products/images");

    // Add any additional options
    Object.keys(options).forEach((key) => {
      formData.append(key, options[key]);
    });

    try {
      const response = await fetch(`${this.baseUrl}/image/upload`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `Cloudinary upload failed: ${
            errorData.error?.message || "Unknown error"
          }`
        );
      }

      const data = await response.json();
      return data.secure_url;
    } catch (error) {
      console.error("Cloudinary upload error:", error);
      throw error;
    }
  }

  /*
   * Validate image file before upload
   * @param {File} file - The image file to validate
   * @param {Object} constraints - Validation constraints
   * @returns {Object} - Validation result
   */
  validateImage(file, constraints = {}) {
    const {
      maxSize = 5 * 1024 * 1024, // 5MB default for images
      allowedTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/gif",
        "image/webp",
      ],
      minWidth = 100,
      minHeight = 100,
    } = constraints;

    const errors = [];

    // Check if it's actually a file
    if (!file || !(file instanceof File)) {
      errors.push("Invalid file");
      return { isValid: false, errors };
    }

    // Check file type
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      errors.push(
        `File type ${
          file.type
        } is not allowed. Allowed types: ${allowedTypes.join(", ")}`
      );
    }

    // Check file size
    if (file.size > maxSize) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
      const limitMB = (maxSize / (1024 * 1024)).toFixed(2);
      errors.push(`File size ${sizeMB}MB exceeds limit of ${limitMB}MB`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      fileInfo: {
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified,
      },
    };
  }

  /*
   * Extract public ID from Cloudinary URL for deletion purposes
   * @param {string} url - Cloudinary URL
   * @returns {string|null} - Public ID or null if invalid
   */
  extractPublicId(url) {
    if (!url || typeof url !== "string") return null;

    try {
      const parts = url.split("/");
      const uploadIndex = parts.findIndex((part) => part === "upload");

      if (uploadIndex === -1) return null;

      // Get everything after 'upload' and any version/transformation parameters
      let pathParts = parts.slice(uploadIndex + 1);

      // Remove version if present (starts with 'v')
      if (
        pathParts[0] &&
        pathParts[0].startsWith("v") &&
        /^\d+$/.test(pathParts[0].substring(1))
      ) {
        pathParts = pathParts.slice(1);
      }

      // Join the remaining parts and remove file extension
      const fullPath = pathParts.join("/");
      const lastDotIndex = fullPath.lastIndexOf(".");

      return lastDotIndex > 0 ? fullPath.substring(0, lastDotIndex) : fullPath;
    } catch (error) {
      console.error("Error extracting public ID:", error);
      return null;
    }
  }

  /*
   * Generate a thumbnail URL from the original image URL
   * @param {string} originalUrl - Original Cloudinary image URL
   * @param {number} width - Thumbnail width
   * @param {number} height - Thumbnail height
   * @returns {string} - Thumbnail URL
   */
  generateThumbnail(originalUrl, width = 150, height = 150) {
    if (!originalUrl) return null;

    try {
      // Insert transformation parameters before the version or filename
      const urlParts = originalUrl.split("/upload/");
      if (urlParts.length !== 2) return originalUrl;

      const transformation = `c_fill,w_${width},h_${height},q_auto,f_auto`;
      return `${urlParts[0]}/upload/${transformation}/${urlParts[1]}`;
    } catch (error) {
      console.error("Error generating thumbnail:", error);
      return originalUrl;
    }
  }
}

// Environment configuration
const cloud_name = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const cloud_upload_preset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

// Create and export a singleton instance
const cloudinaryUploader = new CloudinaryUploader(
  cloud_name || "your-cloud-name",
  cloud_upload_preset || "your-upload-preset"
);

export default cloudinaryUploader;
