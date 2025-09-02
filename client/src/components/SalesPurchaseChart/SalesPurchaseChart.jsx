import { useState, useEffect, useRef } from "react";
import { useDashboard } from "../../context/DashboardContext";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";

import timeframeIcon from "../../assets/icons/Quantity.png";
import "./SalesPurchaseChart.css";

const SalesPurchaseChart = () => {
  const { salesData, isLoading, error, refetchSalesData } = useDashboard();
  const [period, setPeriod] = useState("daily");
  const [numPeriods, setNumPeriods] = useState(12);
  const prevPeriodRef = useRef();
  const prevNumPeriodsRef = useRef();

  // Adjust default periods when switching
  useEffect(() => {
    switch (period) {
      case "daily":
        setNumPeriods(30);
        break;
      case "weekly":
        setNumPeriods(12);
        break;
      case "yearly":
        setNumPeriods(5);
        break;
      default:
        setNumPeriods(12);
    }
  }, [period]);

  // Refetch when period changes
  useEffect(() => {
    if (
      period &&
      numPeriods &&
      (prevPeriodRef.current !== period ||
        prevNumPeriodsRef.current !== numPeriods)
    ) {
      refetchSalesData(period, numPeriods);
      prevPeriodRef.current = period;
      prevNumPeriodsRef.current = numPeriods;
    }
  }, [period, numPeriods]);

  const formatCurrency = (amount) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);

  if (isLoading && !salesData) {
    return <div>Loading chart data...</div>;
  }

  if (error) {
    return <div>Failed to load chart data: {error}</div>;
  }

  return (
    <div className="chart-card">
      <div className="chart-header">
        <h2 className="card-title">Sales & Purchase</h2>
        <div className="chart-controls">
          <div className="custom-select-wrapper">
            <img src={timeframeIcon} alt="icon" className="select-icon" />
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="chart-select"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
        </div>
      </div>

      {!salesData || salesData.length === 0 ? (
        <div>No data available for the selected period</div>
      ) : (
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={salesData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="periodLabel" />
            <YAxis tickFormatter={formatCurrency} />
            <Tooltip
              formatter={(value) => formatCurrency(value)}
              labelFormatter={(label) => `Period: ${label}`}
            />
            <Legend />
            <Bar dataKey="totalPurchases" name="Purchases" fill="#79cff2" />
            <Bar dataKey="totalSales" name="Sales" fill="#56d763" />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

export default SalesPurchaseChart;
