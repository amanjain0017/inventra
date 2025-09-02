import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import axios from "axios";
import { useAuth } from "./AuthContext";
import { useInvoices } from "./InvoiceContext";
import { useDashboard } from "./DashboardContext";

const ProductContext = createContext();

export const useProducts = () => {
  return useContext(ProductContext);
};

// --- Helper Functions for Single-Field Caching ---
const PRODUCT_CACHE_KEY = "products_cache";

// Saves all product data (products, metrics, pagination) into one object
const saveProductDataToCache = (products, metrics, pagination) => {
  try {
    const cacheData = { products, metrics, pagination };
    localStorage.setItem(PRODUCT_CACHE_KEY, JSON.stringify(cacheData));
  } catch (error) {
    console.error("Failed to save data to localStorage:", error);
  }
};

// Retrieves all product data from the single cache key
const getProductDataFromCache = () => {
  try {
    const cachedData = localStorage.getItem(PRODUCT_CACHE_KEY);
    return cachedData ? JSON.parse(cachedData) : null;
  } catch (error) {
    console.error("Failed to parse data from localStorage:", error);
    return null;
  }
};

// Clears the single cache key
const clearProductDataFromCache = () => {
  localStorage.removeItem(PRODUCT_CACHE_KEY);
};

export const ProductProvider = ({ children }) => {
  const { token } = useAuth();
  const { refreshInvoicesAfterOrder } = useInvoices();
  const { refreshDashboardAfterProductChange } = useDashboard();
  const cachedData = getProductDataFromCache();

  // Use refs to store current state values for callbacks
  const productsRef = useRef([]);
  const metricsRef = useRef(null);
  const paginationRef = useRef({
    currentPage: 1,
    totalPages: 1,
    totalProducts: 0,
    perPage: 10,
  });

  const [products, setProducts] = useState(cachedData?.products || []);
  const [metrics, setMetrics] = useState(cachedData?.metrics || null);
  const [pagination, setPagination] = useState(
    cachedData?.pagination || {
      currentPage: 1,
      totalPages: 1,
      totalProducts: 0,
      perPage: 10,
    }
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search state management
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const searchTimeoutRef = useRef(null);

  // Flag to track if initial fetch has been done
  const initialFetchDone = useRef(false);

  // Update refs whenever state changes
  useEffect(() => {
    productsRef.current = products;
  }, [products]);

  useEffect(() => {
    metricsRef.current = metrics;
  }, [metrics]);

  useEffect(() => {
    paginationRef.current = pagination;
  }, [pagination]);

  // Handle search debouncing
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchTerm]);

  // Create API client with stable reference
  const apiClient = useCallback(() => {
    return axios.create({
      baseURL: `${import.meta.env.VITE_BACKEND_URL}/api`,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
  }, [token]);

  // API Call Functions with stable dependencies
  const fetchProducts = useCallback(
    async (page = 1, limit = 10, search = "") => {
      setIsLoading(true);
      setError(null);
      try {
        const client = apiClient();
        const response = await client.get("/products", {
          params: { page, limit, search },
        });
        const { products: fetchedProducts, ...paginationData } = response.data;

        setProducts(fetchedProducts);
        setPagination(paginationData);

        // Use current metrics from ref to avoid dependency
        saveProductDataToCache(
          fetchedProducts,
          metricsRef.current,
          paginationData
        );
      } catch (err) {
        console.error("Failed to fetch products:", err);
        setError(err.response?.data?.error || "Failed to load products.");
      } finally {
        setIsLoading(false);
      }
    },
    [apiClient] // Only depend on apiClient
  );

  const fetchProductMetrics = useCallback(async () => {
    try {
      const client = apiClient();
      const response = await client.get("/products/metrics");
      setMetrics(response.data);

      // Use current state from refs to avoid dependency
      saveProductDataToCache(
        productsRef.current,
        response.data,
        paginationRef.current
      );
    } catch (err) {
      console.error("Failed to fetch product metrics:", err);
    }
  }, [apiClient]); // Only depend on apiClient

  // Fetch products when debounced search term changes (only after initial fetch)
  useEffect(() => {
    if (token && initialFetchDone.current) {
      fetchProducts(1, 10, debouncedSearchTerm);
    }
  }, [debouncedSearchTerm, fetchProducts, token]);

  const addProduct = async (productData) => {
    try {
      const client = apiClient();
      const response = await client.post("/products", productData);

      // Refetch data after adding
      await fetchProducts(
        1,
        paginationRef.current.perPage,
        debouncedSearchTerm
      );
      await fetchProductMetrics();

      // Refresh dashboard data after product addition
      if (refreshDashboardAfterProductChange) {
        await refreshDashboardAfterProductChange();
      }

      return { success: true, product: response.data.product };
    } catch (err) {
      console.error("Failed to add product:", err);
      const errorMessage =
        err.response?.data?.error || "Failed to add product. Please try again.";
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const updateProduct = async (id, updatedData) => {
    try {
      const client = apiClient();
      const response = await client.put(`/products/${id}`, updatedData);

      const updatedProducts = productsRef.current.map((p) =>
        p._id === id ? response.data.product : p
      );
      setProducts(updatedProducts);

      await fetchProductMetrics();
      saveProductDataToCache(
        updatedProducts,
        metricsRef.current,
        paginationRef.current
      );

      // Refresh dashboard data after product update
      if (refreshDashboardAfterProductChange) {
        await refreshDashboardAfterProductChange();
      }

      return { success: true, product: response.data.product };
    } catch (err) {
      console.error("Failed to update product:", err);
      const errorMessage =
        err.response?.data?.error ||
        "Failed to update product. Please try again.";
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const deleteProduct = async (id) => {
    try {
      const client = apiClient();
      await client.delete(`/products/${id}`);

      const updatedProducts = productsRef.current.filter((p) => p._id !== id);
      setProducts(updatedProducts);

      await fetchProductMetrics();
      saveProductDataToCache(
        updatedProducts,
        metricsRef.current,
        paginationRef.current
      );

      // Refresh dashboard data after product deletion
      if (refreshDashboardAfterProductChange) {
        await refreshDashboardAfterProductChange();
      }

      return { success: true };
    } catch (err) {
      console.error("Failed to delete product:", err);
      const errorMessage =
        err.response?.data?.error || "Failed to delete product.";
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Function to fetch a single product by its ID
  const fetchProductById = async (id) => {
    try {
      const client = apiClient();
      const response = await client.get(`/products/${id}`);
      return { success: true, product: response.data.product };
    } catch (err) {
      console.error("Failed to fetch single product:", err);
      const errorMessage =
        err.response?.data?.error || "Product not found or access denied.";
      return { success: false, error: errorMessage };
    }
  };

  // Function to handle ordering a product
  const orderProduct = async (id, orderedQuantity) => {
    try {
      const client = apiClient();
      const response = await client.put(`/products/${id}/order`, {
        orderedQuantity,
      });

      // Optimistically update the product quantity in the current state
      const updatedProducts = productsRef.current.map((p) =>
        p._id === id ? response.data.product : p
      );
      setProducts(updatedProducts);

      // Re-fetch metrics and pagination to ensure they are up to date
      await fetchProductMetrics();

      // Refresh invoice data after ordering a product
      if (refreshInvoicesAfterOrder) {
        await refreshInvoicesAfterOrder();
      }

      // Refresh dashboard data after ordering a product
      if (refreshDashboardAfterProductChange) {
        await refreshDashboardAfterProductChange();
      }

      return {
        success: true,
        product: response.data.product,
        invoice: response.data.invoice,
      };
    } catch (err) {
      console.error("Failed to order product:", err);
      const errorMessage =
        err.response?.data?.error || "Failed to order product.";
      return { success: false, error: errorMessage };
    }
  };

  // Function to handle bulk product upload via CSV
  const addBulkProducts = async (file) => {
    try {
      const client = apiClient();
      const formData = new FormData();
      formData.append("file", file);

      const response = await client.post("/products/bulk", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      // Re-fetch all products and metrics to reflect the new additions
      await fetchProducts(1, 10, debouncedSearchTerm);
      await fetchProductMetrics();

      // Refresh dashboard data after bulk product addition
      if (refreshDashboardAfterProductChange) {
        await refreshDashboardAfterProductChange();
      }

      return {
        success: true,
        message: response.data.message,
        addedCount: response.data.addedCount,
        errors: response.data.errors,
      };
    } catch (err) {
      console.error("Failed to bulk add products:", err);
      const errorMessage =
        err.response?.data?.error || "Failed to upload file.";
      const details =
        err.response?.data?.details ||
        err.response?.data?.processedErrors ||
        null;
      return { success: false, error: errorMessage, details };
    }
  };

  // Page change function
  const changePage = useCallback(
    (newPage) => {
      if (
        newPage !== paginationRef.current.currentPage &&
        newPage > 0 &&
        newPage <= paginationRef.current.totalPages
      ) {
        fetchProducts(
          newPage,
          paginationRef.current.perPage,
          debouncedSearchTerm
        );
      }
    },
    [fetchProducts, debouncedSearchTerm]
  );

  // Search function exposed to components
  const updateSearchTerm = useCallback((term) => {
    setSearchTerm(term);
  }, []);

  // Initial Data Fetch on Mount/Token Change
  useEffect(() => {
    const cachedData = getProductDataFromCache();
    if (token) {
      // Only fetch if no cache or cache is empty
      if (
        !cachedData ||
        !cachedData.products ||
        cachedData.products.length === 0
      ) {
        fetchProducts();
        fetchProductMetrics();
      } else {
        // Use cached data and stop loading
        setIsLoading(false);
      }
      // Mark initial fetch as done
      initialFetchDone.current = true;
    } else {
      // Clear everything when no token
      setProducts([]);
      setMetrics(null);
      setPagination({
        currentPage: 1,
        totalPages: 1,
        totalProducts: 0,
        perPage: 10,
      });
      clearProductDataFromCache();
      setIsLoading(false);
      initialFetchDone.current = false;
    }
  }, [token, fetchProducts, fetchProductMetrics]);

  const value = {
    products,
    metrics,
    pagination,
    isLoading,
    error,
    searchTerm,
    fetchProducts,
    fetchProductMetrics,
    addProduct,
    updateProduct,
    deleteProduct,
    fetchProductById,
    orderProduct,
    addBulkProducts,
    changePage,
    updateSearchTerm,
  };

  return (
    <ProductContext.Provider value={value}>{children}</ProductContext.Provider>
  );
};
