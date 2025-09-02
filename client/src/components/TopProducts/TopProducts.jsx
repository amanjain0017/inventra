import { useDashboard } from "../../context/DashboardContext";
import "./TopProducts.css";

const TopProducts = ({ limit = 5, days = 30 }) => {
  const { topProducts, isLoading, error } = useDashboard();

  const formatQuantity = (quantity) => {
    return quantity?.toLocaleString() || 0;
  };

  const formatRevenue = (revenue) => {
    return revenue?.toLocaleString() || 0;
  };

  const getProgressWidth = (currentRevenue, maxRevenue) => {
    if (!maxRevenue || maxRevenue === 0) return 0;
    const percentage = Math.min((currentRevenue / maxRevenue) * 100, 100);
    return percentage;
  };

  // Calculate max revenue for progress bar scaling (now based on revenue instead of quantity)
  const maxRevenue =
    topProducts?.reduce((max, product) => {
      return Math.max(max, product.totalRevenue || 0);
    }, 0) || 1;

  if (isLoading && !topProducts) {
    return (
      <div className="top-products-container">
        <div className="top-products-header">
          <h3>Top Products</h3>
        </div>
        <div className="top-products-loading">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="top-products-container">
        <div className="top-products-header">
          <h3>Top Products</h3>
        </div>
        <div className="top-products-error">
          Failed to load top products: {error}
        </div>
      </div>
    );
  }

  if (!topProducts || topProducts.length === 0) {
    return (
      <div className="top-products-container">
        <div className="top-products-header">
          <h3>Top Products</h3>
        </div>
        <div className="top-products-empty">No top products data available</div>
      </div>
    );
  }

  return (
    <div className="top-products-container">
      <div className="top-products-header">
        <h3>Top Products</h3>
      </div>

      <div className="top-products-list">
        {topProducts.slice(0, limit).map((product, index) => (
          <div
            key={product.product?.productId || index}
            className="top-product-item"
          >
            {/* Product Image */}
            <div className="product-image-container">
              {product.product?.imageUrl ? (
                <img
                  src={product.product.imageUrl}
                  alt={product.product?.name || "Product"}
                  className="product-image"
                  onError={(e) => {
                    e.target.style.display = "none";
                    e.target.nextElementSibling.style.display = "flex";
                  }}
                />
              ) : null}
              <div
                className="product-image-placeholder"
                style={{ display: product.product?.imageUrl ? "none" : "flex" }}
              ></div>
            </div>

            {/* Product Info */}
            <div className="product-content">
              <div className="product-info">
                <div className="product-name">
                  {index + 1}. {product.product?.name || "Unknown Product"}
                </div>
              </div>

              <div className="product-progress">
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${getProgressWidth(
                        product.totalRevenue,
                        maxRevenue
                      )}%`,
                    }}
                    title={`Revenue: ₹${formatRevenue(
                      product.totalRevenue
                    )} / Max: ₹${formatRevenue(maxRevenue)}`}
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TopProducts;
