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
import { useDashboard } from "./DashboardContext";

const InvoiceContext = createContext();

export const useInvoices = () => {
  return useContext(InvoiceContext);
};

// --- Helper Functions for Single-Field Caching ---
const INVOICE_CACHE_KEY = "invoices_cache";

// Saves all invoice data (invoices, metrics, pagination) into one object
const saveInvoiceDataToCache = (invoices, metrics, pagination) => {
  try {
    const cacheData = { invoices, metrics, pagination };
    localStorage.setItem(INVOICE_CACHE_KEY, JSON.stringify(cacheData));
  } catch (error) {
    console.error("Failed to save data to localStorage:", error);
  }
};

// Retrieves all invoice data from the single cache key
const getInvoiceDataFromCache = () => {
  try {
    const cachedData = localStorage.getItem(INVOICE_CACHE_KEY);
    return cachedData ? JSON.parse(cachedData) : null;
  } catch (error) {
    console.error("Failed to parse data from localStorage:", error);
    return null;
  }
};

// Clears the single cache key
const clearInvoiceDataFromCache = () => {
  localStorage.removeItem(INVOICE_CACHE_KEY);
};

export const InvoiceProvider = ({ children }) => {
  const { token } = useAuth();
  const { refreshDashboardAfterProductChange } = useDashboard();
  const cachedData = getInvoiceDataFromCache();

  // Use refs to store current state values for callbacks
  const invoicesRef = useRef([]);
  const metricsRef = useRef(null);
  const paginationRef = useRef({
    currentPage: 1,
    totalPages: 1,
    totalInvoices: 0,
    perPage: 10,
  });

  const [invoices, setInvoices] = useState(cachedData?.invoices || []);
  const [metrics, setMetrics] = useState(cachedData?.metrics || null);
  const [pagination, setPagination] = useState(
    cachedData?.pagination || {
      currentPage: 1,
      totalPages: 1,
      totalInvoices: 0,
      perPage: 10,
    }
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Update refs whenever state changes
  useEffect(() => {
    invoicesRef.current = invoices;
  }, [invoices]);

  useEffect(() => {
    metricsRef.current = metrics;
  }, [metrics]);

  useEffect(() => {
    paginationRef.current = pagination;
  }, [pagination]);

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

  // API Call Functions (with stable dependencies)
  const fetchInvoices = useCallback(
    async (page = 1, limit = 10, search = "", status = "") => {
      setIsLoading(true);
      setError(null);
      try {
        const client = apiClient();
        const response = await client.get("/invoices", {
          params: { page, limit, search, status },
        });
        const { invoices: fetchedInvoices, ...paginationData } = response.data;

        setInvoices(fetchedInvoices);
        setPagination(paginationData);

        // Use current metrics from ref to avoid dependency
        saveInvoiceDataToCache(
          fetchedInvoices,
          metricsRef.current,
          paginationData
        );
      } catch (err) {
        console.error("Failed to fetch invoices:", err);
        setError(err.response?.data?.error || "Failed to load invoices.");
      } finally {
        setIsLoading(false);
      }
    },
    [apiClient] // Only depend on apiClient
  );

  const fetchInvoiceMetrics = useCallback(async () => {
    try {
      const client = apiClient();
      const response = await client.get("/invoices/metrics");
      setMetrics(response.data);

      // Use current state from refs to avoid dependency
      saveInvoiceDataToCache(
        invoicesRef.current,
        response.data,
        paginationRef.current
      );
    } catch (err) {
      console.error("Failed to fetch invoice metrics:", err);
    }
  }, [apiClient]); // Only depend on apiClient

  const createInvoice = async (invoiceData) => {
    setIsLoading(true);
    setError(null);
    try {
      const client = apiClient();
      const response = await client.post("/invoices", invoiceData);

      // Refetch data after creation
      await fetchInvoices(
        paginationRef.current.currentPage,
        paginationRef.current.perPage
      );
      await fetchInvoiceMetrics();

      // Refresh dashboard data after invoice creation
      if (refreshDashboardAfterProductChange) {
        await refreshDashboardAfterProductChange();
      }

      return { success: true, invoice: response.data.invoice };
    } catch (err) {
      console.error("Failed to create invoice:", err);
      const errorMessage =
        err.response?.data?.error || "Failed to create invoice.";
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  const updateInvoice = async (id, updatedData) => {
    setIsLoading(true);
    setError(null);
    try {
      const client = apiClient();
      const response = await client.put(`/invoices/${id}`, updatedData);

      const updatedInvoices = invoicesRef.current.map((inv) =>
        inv._id === id ? response.data.invoice : inv
      );
      setInvoices(updatedInvoices);

      // Fetch updated metrics after update
      const metricsResponse = await client.get("/invoices/metrics");
      const updatedMetrics = metricsResponse.data;
      setMetrics(updatedMetrics);

      // Save to cache with updated metrics
      saveInvoiceDataToCache(
        updatedInvoices,
        updatedMetrics,
        paginationRef.current
      );

      // Refresh dashboard data after invoice update
      if (refreshDashboardAfterProductChange) {
        await refreshDashboardAfterProductChange();
      }

      return { success: true, invoice: response.data.invoice };
    } catch (err) {
      console.error("Failed to update invoice:", err);
      const errorMessage =
        err.response?.data?.error || "Failed to update invoice.";
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  const deleteInvoice = async (id) => {
    setIsLoading(true);
    setError(null);
    try {
      const client = apiClient();
      await client.delete(`/invoices/${id}`);

      const updatedInvoices = invoicesRef.current.filter(
        (inv) => inv._id !== id
      );
      setInvoices(updatedInvoices);

      // Fetch updated metrics after deletion
      const metricsResponse = await client.get("/invoices/metrics");
      const updatedMetrics = metricsResponse.data;
      setMetrics(updatedMetrics);

      // Save to cache with updated metrics
      saveInvoiceDataToCache(
        updatedInvoices,
        updatedMetrics,
        paginationRef.current
      );

      // Refresh dashboard data after invoice deletion
      if (refreshDashboardAfterProductChange) {
        await refreshDashboardAfterProductChange();
      }

      return { success: true };
    } catch (err) {
      console.error("Failed to delete invoice:", err);
      const errorMessage =
        err.response?.data?.error || "Failed to delete invoice.";
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  // Function to refresh invoices when a product is ordered
  const refreshInvoicesAfterOrder = useCallback(async () => {
    try {
      // Silently refetch invoices and metrics without showing loading state
      const client = apiClient();
      const [invoicesResponse, metricsResponse] = await Promise.all([
        client.get("/invoices", {
          params: {
            page: paginationRef.current.currentPage,
            limit: paginationRef.current.perPage,
          },
        }),
        client.get("/invoices/metrics"),
      ]);

      const { invoices: fetchedInvoices, ...paginationData } =
        invoicesResponse.data;

      setInvoices(fetchedInvoices);
      setPagination(paginationData);
      setMetrics(metricsResponse.data);

      // Update cache
      saveInvoiceDataToCache(
        fetchedInvoices,
        metricsResponse.data,
        paginationData
      );
    } catch (err) {
      console.error("Failed to refresh invoices after product order:", err);
    }
  }, [apiClient]);

  // Initial Data Fetch on Mount/Token Change
  useEffect(() => {
    const cachedData = getInvoiceDataFromCache();
    if (token) {
      // Only fetch if no cache or cache is empty
      if (
        !cachedData ||
        !cachedData.invoices ||
        cachedData.invoices.length === 0
      ) {
        fetchInvoices();
        fetchInvoiceMetrics();
      } else {
        // Use cached data and stop loading
        setIsLoading(false);
      }
    } else {
      // Clear everything when no token
      setInvoices([]);
      setMetrics(null);
      setPagination({
        currentPage: 1,
        totalPages: 1,
        totalInvoices: 0,
        perPage: 10,
      });
      clearInvoiceDataFromCache();
      setIsLoading(false);
    }
  }, [token, fetchInvoices, fetchInvoiceMetrics]);

  const value = {
    invoices,
    metrics,
    pagination,
    isLoading,
    error,
    fetchInvoices,
    fetchInvoiceMetrics,
    createInvoice,
    updateInvoice,
    deleteInvoice,
    refreshInvoicesAfterOrder,
  };

  return (
    <InvoiceContext.Provider value={value}>{children}</InvoiceContext.Provider>
  );
};
