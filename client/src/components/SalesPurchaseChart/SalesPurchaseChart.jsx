// src/components/SalesPurchaseChart.jsx

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
  // --- MODIFIED: Get state and setter from context ---
  const { salesData, isLoading, error, chartPeriod, updateChartPeriod } =
    useDashboard();

  // --- REMOVED: Local state and useEffect hooks that were causing re-renders ---
  // The logic for period and numPeriods is now handled in the context.
  // const [period, setPeriod] = useState("daily");
  // const [numPeriods, setNumPeriods] = useState(12);
  // useEffect() hooks are no longer needed here.

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
              value={chartPeriod} // Use state from context
              onChange={(e) => updateChartPeriod(e.target.value)} // Use setter from context
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
