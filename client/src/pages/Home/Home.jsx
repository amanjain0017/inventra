import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useProducts } from "../../context/ProductContext";
import { useInvoices } from "../../context/InvoiceContext";

import salesIcon from "../../assets/icons/Sales.png";
import revenueIcon from "../../assets/icons/Revenue.png";
import profitIcon from "../../assets/icons/Profit.png";
import costIcon from "../../assets/icons/Cost.png";
import purchaseBagIcon from "../../assets/icons/PurchaseBag.png";
import cancelIcon from "../../assets/icons/Cancel.png";
import categoriesIcon from "../../assets/icons/Categories.png";
import suppliersIcon from "../../assets/icons/Suppliers.png";
import quantityIcon from "../../assets/icons/Quantity.png";
import locationIcon from "../../assets/icons/Location.png";
import logo from "../../assets/icons/companylogo.png";

import SalesPurchaseChart from "../../components/SalesPurchaseChart/SalesPurchaseChart";
import TopProducts from "../../components/TopProducts/TopProducts";

import "./Home.css";

const Home = () => {
  const { user } = useAuth();
  const { metrics: productsMetrics } = useProducts();
  const { metrics: invoicesMetrics } = useInvoices();

  const [chartPeriod, setChartPeriod] = useState("weekly");

  // Left column cards (draggable order)
  const [leftColumn, setLeftColumn] = useState([
    { id: "salesOverview", component: "salesOverview" },
    { id: "purchaseOverview", component: "purchaseOverview" },
    { id: "salesChart", component: "salesChart" },
  ]);

  // Right column cards (draggable order)
  const [rightColumn, setRightColumn] = useState([
    { id: "inventorySummary", component: "inventorySummary" },
    { id: "productSummary", component: "productSummary" },
    { id: "topProducts", component: "topProducts" },
  ]);

  // ---------- Drag & Drop Logic ----------
  const handleDragStart = (e, index, column) => {
    e.dataTransfer.setData("dragIndex", index);
    e.dataTransfer.setData("column", column);
  };

  const handleDrop = (e, dropIndex, column) => {
    e.preventDefault();
    const dragIndex = e.dataTransfer.getData("dragIndex");
    const dragColumn = e.dataTransfer.getData("column");

    if (dragColumn !== column) return; // restrict movement to same column

    const col = column === "left" ? [...leftColumn] : [...rightColumn];
    const [dragged] = col.splice(dragIndex, 1);
    col.splice(dropIndex, 0, dragged);

    column === "left" ? setLeftColumn(col) : setRightColumn(col);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat("en-IN").format(num || 0);
  };

  // ---------- Card Renderers ----------
  const renderCard = (id) => {
    switch (id) {
      case "salesOverview":
        return (
          <div className="card sales-overview">
            <h2 className="card-title">Sales Overview</h2>
            <div className="metrics-grid">
              {/* Sales, Revenue, Profit, Cost */}
              <div className="metric-item">
                <div className="metric-icon sales">
                  <img src={salesIcon} alt="sales" width={18} />
                </div>
                <div className="metric-content">
                  <div className="metric-value">
                    {invoicesMetrics?.totalProductsSold}
                  </div>
                  <div className="metric-label">Sales</div>
                </div>
              </div>
              <div className="metric-item">
                <div className="metric-icon revenue">
                  <img src={revenueIcon} alt="revenue" width={18} />
                </div>
                <div className="metric-content">
                  <div className="metric-value">
                    {new Intl.NumberFormat("en-IN", {
                      style: "currency",
                      currency: "INR",
                      maximumFractionDigits: 0,
                    }).format(invoicesMetrics?.totalSalesAmount || 0)}
                  </div>
                  <div className="metric-label">Revenue</div>
                </div>
              </div>
              {/* Profit */}
              <div className="metric-item">
                <div className="metric-icon profit">
                  <img src={profitIcon} alt="profit" width={18} />
                </div>
                <div className="metric-content">
                  <div className="metric-value">
                    {new Intl.NumberFormat("en-IN", {
                      style: "currency",
                      currency: "INR",
                      maximumFractionDigits: 0,
                    }).format(
                      (invoicesMetrics?.totalSalesAmount || 0) -
                        (invoicesMetrics?.totalSubTotal || 0)
                    )}
                  </div>
                  <div className="metric-label">Profit</div>
                </div>
              </div>
              {/* Cost */}
              <div className="metric-item">
                <div className="metric-icon cost">
                  <img src={costIcon} alt="cost" width={18} />
                </div>
                <div className="metric-content">
                  <div className="metric-value">
                    {new Intl.NumberFormat("en-IN", {
                      style: "currency",
                      currency: "INR",
                      maximumFractionDigits: 0,
                    }).format(invoicesMetrics?.totalSubTotal || 0)}
                  </div>
                  <div className="metric-label">Cost</div>
                </div>
              </div>
            </div>
          </div>
        );

      case "purchaseOverview":
        return (
          <div className="card purchase-overview">
            <h2 className="card-title">Purchase Overview</h2>
            <div className="metrics-grid">
              <div className="metric-item">
                <div className="metric-icon purchase">
                  <img src={purchaseBagIcon} alt="purchasebag" width={18} />
                </div>
                <div className="metric-content">
                  <div className="metric-value">
                    {formatNumber(productsMetrics?.totalStock || 0)}
                  </div>
                  <div className="metric-label">Purchase</div>
                </div>
              </div>
              <div className="metric-item">
                <div className="metric-icon cost-purchase">
                  <img src={costIcon} alt="cost" width={18} />
                </div>
                <div className="metric-content">
                  <div className="metric-value">
                    {formatCurrency(productsMetrics?.totalCost || 0)}
                  </div>
                  <div className="metric-label">Cost</div>
                </div>
              </div>
              <div className="metric-item">
                <div className="metric-icon cancel">
                  <img src={cancelIcon} alt="cancel" width={18} />
                </div>
                <div className="metric-content">
                  <div className="metric-value">
                    {productsMetrics?.expiredProducts || 0}
                  </div>
                  <div className="metric-label">Cancel</div>
                </div>
              </div>
              <div className="metric-item">
                <div className="metric-icon return">
                  <img src={profitIcon} alt="profit" width={18} />
                </div>
                <div className="metric-content">
                  <div className="metric-value">
                    {formatCurrency(productsMetrics?.totalRestockCost || 0)}
                  </div>
                  <div className="metric-label">Restock</div>
                </div>
              </div>
            </div>
          </div>
        );

      case "salesChart":
        return (
          <div className="sales-chart card">
            <SalesPurchaseChart
              chartPeriod={chartPeriod}
              setChartPeriod={setChartPeriod}
            />
          </div>
        );

      case "inventorySummary":
        return (
          <div className="card inventory-summary">
            <h2 className="card-title">Inventory Summary</h2>
            <div className="inventory-metrics">
              <div className="inventory-item">
                <div className="inventory-icon in-hand">
                  <img src={quantityIcon} alt="quantity" width={18} />
                </div>
                <div className="inventory-content">
                  <div className="inventory-value">
                    {productsMetrics?.totalStock || 0}
                  </div>
                  <div className="inventory-label">Quantity in Hand</div>
                </div>
              </div>
              <div className="inventory-item">
                <div className="inventory-icon to-receive">
                  <img src={locationIcon} alt="location" width={18} />
                </div>
                <div className="inventory-content">
                  <div className="inventory-value">
                    {(productsMetrics?.notInStock || 0) +
                      (productsMetrics?.lowStocks || 0)}
                  </div>
                  <div className="inventory-label">To be received</div>
                </div>
              </div>
            </div>
          </div>
        );

      case "productSummary":
        return (
          <div className="card product-summary">
            <h2 className="card-title">Product Summary</h2>
            <div className="product-metrics">
              <div className="product-item">
                <div className="product-icon suppliers">
                  <img src={suppliersIcon} alt="suppliers" width={18} />
                </div>
                <div className="products-content">
                  <div className="product-value">
                    {productsMetrics?.totalProducts || 0}
                  </div>
                  <div className="product-label">Number of Products</div>
                </div>
              </div>
              <div className="product-item">
                <div className="product-icon categories">
                  <img src={categoriesIcon} alt="categories" width={18} />
                </div>
                <div className="products-content">
                  <div className="product-value">
                    {productsMetrics?.categories || 0}
                  </div>
                  <div className="product-label">Number of Categories</div>
                </div>
              </div>
            </div>
          </div>
        );

      case "topProducts":
        return (
          <div className="card top-products">
            <TopProducts limit={6} days={30} />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <div className="home-header">
        <div className="mobile-logo">
          <img src={logo} alt="logo" width={35} />
        </div>
        <h1 className="page-title">Home</h1>
      </div>

      <div className="home-page">
        <div className="dashboard-grid">
          {/* Left Column */}
          <div className="left-column">
            {leftColumn.map((card, index) => (
              <div
                key={card.id}
                className={`draggable-section ${
                  card.component === "salesChart" ? "salesChart" : ""
                }`}
                draggable
                onDragStart={(e) => handleDragStart(e, index, "left")}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, index, "left")}
              >
                {renderCard(card.component)}
              </div>
            ))}
          </div>

          {/* Right Column */}
          <div className="right-column">
            {rightColumn.map((card, index) => (
              <div
                key={card.id}
                className={`draggable-section ${
                  card.component === "topProducts" ? "topProducts" : ""
                }`}
                draggable
                onDragStart={(e) => handleDragStart(e, index, "right")}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, index, "right")}
              >
                {renderCard(card.component)}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default Home;
