import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { useAuth } from "./AuthContext";
import axios from "axios";

const DashboardContext = createContext();

export const useDashboard = () => {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error("useDashboard must be used within an DashboardProvider");
  }
  return context;
};

// Cache helper functions
const DASHBOARD_CACHE_KEY = "dashboard_cache";

const saveDashboardDataToCache = (
  topProducts,
  topProductsSummary,
  salesData
) => {
  try {
    const cacheData = {
      topProducts,
      topProductsSummary,
      salesData,
      timestamp: Date.now(),
    };
    localStorage.setItem(DASHBOARD_CACHE_KEY, JSON.stringify(cacheData));
  } catch (error) {
    console.error("Failed to save dashboard data to localStorage:", error);
  }
};

const getDashboardDataFromCache = () => {
  try {
    const cachedData = localStorage.getItem(DASHBOARD_CACHE_KEY);
    if (!cachedData) return null;

    const parsedData = JSON.parse(cachedData);

    return parsedData;
  } catch (error) {
    console.error("Failed to parse dashboard data from localStorage:", error);
    return null;
  }
};

const clearDashboardCache = () => {
  localStorage.removeItem(DASHBOARD_CACHE_KEY);
};

export const DashboardProvider = ({ children }) => {
  const { token, isAuthenticated } = useAuth();

  const [topProducts, setTopProducts] = useState(null);
  const [topProductsSummary, setTopProductsSummary] = useState(null);
  const [salesData, setSalesData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Re-configure axios to use the apiClient from AuthContext
  const apiClient = axios.create({
    baseURL: `${import.meta.env.VITE_BACKEND_URL}/api`,
  });

  // Set up the request interceptor for this specific context's API calls
  apiClient.interceptors.request.use(
    (config) => {
      const storedToken = localStorage.getItem("token");
      if (storedToken) {
        config.headers.Authorization = `Bearer ${storedToken}`;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // API Call Functions
  const fetchTopSellingProducts = useCallback(async (limit = 5, days = 30) => {
    const response = await apiClient.get("/dashboard/top-selling-products", {
      params: { limit, days },
    });
    return response.data;
  }, []);

  const fetchSalesOverTime = useCallback(
    async (period = "daily", numPeriods = 30) => {
      const response = await apiClient.get("/dashboard/sales-over-time", {
        params: { period, numPeriods },
      });
      return response.data;
    },
    []
  );

  // Data Fetching and State Management with caching
  const fetchAllDashboardData = useCallback(
    async (forceRefresh = false) => {
      if (!isAuthenticated()) {
        setIsLoading(false);
        setError("User is not authenticated. Please log in.");
        return;
      }

      // Check cache first if not forcing refresh
      if (!forceRefresh) {
        const cachedData = getDashboardDataFromCache();
        if (cachedData) {
          setTopProducts(cachedData.topProducts);
          setTopProductsSummary(cachedData.topProductsSummary);
          setSalesData(cachedData.salesData);
          setIsLoading(false);
          return;
        }
      }

      setIsLoading(true);
      setError(null);
      try {
        const [topProductsResponse, salesDataResponse] = await Promise.all([
          fetchTopSellingProducts(),
          fetchSalesOverTime(),
        ]);

        const topProductsData = topProductsResponse.topProducts;
        const topProductsSummaryData = topProductsResponse.summary;
        const salesDataData = salesDataResponse.salesData;

        setTopProducts(topProductsData);
        setTopProductsSummary(topProductsSummaryData);
        setSalesData(salesDataData);

        // Save to cache
        saveDashboardDataToCache(
          topProductsData,
          topProductsSummaryData,
          salesDataData
        );
      } catch (err) {
        console.error("Failed to fetch dashboard data:", err);
        const errorMessage =
          err.response?.data?.error ||
          "Failed to load dashboard data. Please check your network and try again.";
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [isAuthenticated, fetchTopSellingProducts, fetchSalesOverTime]
  );

  const refetchTopProducts = async (limit, days) => {
    setIsLoading(true);
    try {
      const response = await fetchTopSellingProducts(limit, days);
      const topProductsData = response.topProducts;
      const topProductsSummaryData = response.summary;

      setTopProducts(topProductsData);
      setTopProductsSummary(topProductsSummaryData);

      // Update cache with new top products data
      const cachedData = getDashboardDataFromCache();
      if (cachedData) {
        saveDashboardDataToCache(
          topProductsData,
          topProductsSummaryData,
          cachedData.salesData
        );
      }
    } catch (err) {
      console.error("Failed to fetch top products:", err);
      setError("Failed to load top products.");
    } finally {
      setIsLoading(false);
    }
  };

  const refetchSalesData = useCallback(
    async (period, numPeriods) => {
      setIsLoading(true);
      try {
        const response = await fetchSalesOverTime(period, numPeriods);
        const salesDataData = response.salesData;
        setSalesData(salesDataData);

        // Update cache with new sales data
        const cachedData = getDashboardDataFromCache();
        if (cachedData) {
          saveDashboardDataToCache(
            cachedData.topProducts,
            cachedData.topProductsSummary,
            salesDataData
          );
        }
      } catch (err) {
        console.error("Failed to fetch sales data:", err);
        setError("Failed to load sales data.");
      } finally {
        setIsLoading(false);
      }
    },
    [fetchSalesOverTime]
  );

  // Function to invalidate cache and force refresh
  const invalidateCache = useCallback(() => {
    clearDashboardCache();
    fetchAllDashboardData(true);
  }, [fetchAllDashboardData]);

  // Initial data fetch on component mount, or when token changes
  useEffect(() => {
    if (token) {
      fetchAllDashboardData();
    } else {
      // Clear cache when user logs out
      clearDashboardCache();
      setTopProducts(null);
      setTopProductsSummary(null);
      setSalesData(null);
      setIsLoading(false);
    }
  }, [token, fetchAllDashboardData]);

  // Function to refresh dashboard data after product interactions
  const refreshDashboardAfterProductChange = useCallback(async () => {
    try {
      const [topProductsResponse, salesDataResponse] = await Promise.all([
        fetchTopSellingProducts(),
        fetchSalesOverTime(),
      ]);

      const topProductsData = topProductsResponse.topProducts;
      const topProductsSummaryData = topProductsResponse.summary;
      const salesDataData = salesDataResponse.salesData;

      setTopProducts(topProductsData);
      setTopProductsSummary(topProductsSummaryData);
      setSalesData(salesDataData);

      // Save to cache
      saveDashboardDataToCache(
        topProductsData,
        topProductsSummaryData,
        salesDataData
      );
    } catch (err) {
      console.error("Failed to refresh dashboard after product change:", err);
    }
  }, [fetchTopSellingProducts, fetchSalesOverTime]);

  const value = {
    topProducts,
    topProductsSummary,
    salesData,
    isLoading,
    error,
    refetchTopProducts,
    refetchSalesData,
    invalidateCache,
    refreshDashboard: () => fetchAllDashboardData(true),
    refreshDashboardAfterProductChange,
  };

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
};
