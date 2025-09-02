import { useState } from "react";
import { useProducts } from "../../context/ProductContext";
import { useInvoices } from "../../context/InvoiceContext";
import TopProducts from "../../components/TopProducts/TopProducts";
import SalesPurchaseChart from "../../components/SalesPurchaseChart/SalesPurchaseChart";

import activityIcon from "../../assets/icons/activity.png";
import cardIcon from "../../assets/icons/credit-card.png";
import logo from "../../assets/icons/companylogo.png";
import "./Statistics.css";

const Statistics = () => {
  const { metrics: productsMetrics } = useProducts();
  const { metrics: invoicesMetrics } = useInvoices();

  // State for top metrics (draggable horizontally)
  const [metrics, setMetrics] = useState([
    {
      id: "revenue",
      label: "Total Revenue",
      value: () => formatCurrency(invoicesMetrics?.totalSalesAmount || 0),
      className: "metric-card total-revenue",
      icon: <div className="metric-icon">₹</div>,
    },
    {
      id: "sold",
      label: "Products Sold",
      value: () => formatNumber(invoicesMetrics?.totalProductsSold || 0),
      className: "metric-card products-sold",
      icon: <img src={cardIcon} alt="icon" className="metric-icon" />,
    },
    {
      id: "stock",
      label: "Products In Stock",
      value: () => formatNumber(productsMetrics?.totalStock || 0),
      className: "metric-card products-stock",
      icon: <img src={activityIcon} alt="icon" className="metric-icon" />,
    },
  ]);

  const [sections, setSections] = useState([
    { id: "chart", component: <SalesPurchaseChart /> },
    { id: "topProducts", component: <TopProducts limit={6} days={30} /> },
  ]);

  const formatCurrency = (amount) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);

  const formatNumber = (num) => new Intl.NumberFormat("en-IN").format(num);

  // ---------- Drag & Drop Handlers for Metrics ----------
  const handleMetricDragStart = (e, index) => {
    e.dataTransfer.setData("metricIndex", index);
  };

  const handleMetricDrop = (e, dropIndex) => {
    const dragIndex = e.dataTransfer.getData("metricIndex");
    if (dragIndex === null) return;

    const newMetrics = [...metrics];
    const [dragged] = newMetrics.splice(dragIndex, 1);
    newMetrics.splice(dropIndex, 0, dragged);

    setMetrics(newMetrics);
  };

  const handleDragOver = (e) => {
    e.preventDefault(); // allow dropping
  };

  // ---------- Drag & Drop Handlers for Sections ----------
  const handleSectionDragStart = (e, index) => {
    e.dataTransfer.setData("sectionIndex", index);
  };

  const handleSectionDrop = (e, dropIndex) => {
    const dragIndex = e.dataTransfer.getData("sectionIndex");
    if (dragIndex === null) return;

    const newSections = [...sections];
    const [dragged] = newSections.splice(dragIndex, 1);
    newSections.splice(dropIndex, 0, dragged);

    setSections(newSections);
  };

  return (
    <>
      {/* Header */}
      <div className="statistics-header">
        <h1 className="page-title">Statistics</h1>
        <div className="mobile-logo">
          <img src={logo} alt="logo" width={35} />
        </div>
      </div>
      <div className="statistics-page">
        <div className="statistics-content">
          {/* Top Metrics Row (Draggable) */}
          <div className="top-metrics">
            {metrics.map((metric, index) => (
              <div
                key={metric.id}
                className={`${metric.className} draggable-section`}
                draggable
                onDragStart={(e) => handleMetricDragStart(e, index)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleMetricDrop(e, index)}
              >
                <div className="metric-card-content">
                  <div className="metric-label">{metric.label}</div>
                  {metric.icon}
                </div>
                <div className="metric-value">{metric.value()}</div>
              </div>
            ))}
          </div>

          {/* Bottom Section (Draggable) */}
          <div className="bottom-section">
            {sections.map((section, index) => (
              <div
                key={section.id}
                className={`draggable-section page-sections`}
                draggable
                onDragStart={(e) => handleSectionDragStart(e, index)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleSectionDrop(e, index)}
              >
                {section.component}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default Statistics;
