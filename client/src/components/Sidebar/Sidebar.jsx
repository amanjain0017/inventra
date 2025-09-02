import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

import logo from "../../assets/icons/companylogo.png";
import homeIcon from "../../assets/icons/home.png";
import productIcon from "../../assets/icons/product.png";
import invoiceIcon from "../../assets/icons/invoice.png";
import statsIcon from "../../assets/icons/stats.png";
import settingsIcon from "../../assets/icons/settings.png";
import "./Sidebar.css";

const Sidebar = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const menuItems = [
    {
      path: "/home",
      name: "Home",
      icon: <img src={homeIcon} alt="home" width={17} />,
    },
    {
      path: "/product",
      name: "Product",
      icon: <img src={productIcon} alt="product" width={17} />,
    },
    {
      path: "/invoice",
      name: "Invoice",
      icon: <img src={invoiceIcon} alt="invoice" width={17} />,
    },
    {
      path: "/statistics",
      name: "Statistics",
      icon: <img src={statsIcon} alt="stats" width={17} />,
    },
    {
      path: "/settings",
      name: "Settings",
      icon: <img src={settingsIcon} alt="settings" width={17} />,
    },
  ];

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="sidebar desktop-sidebar">
        <div className="sidebar-header" onClick={() => navigate("/home")}>
          <div className="logo">
            <img src={logo} alt="logo" width={32} />
          </div>
          <div className="company-title">Inventra</div>
        </div>

        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `nav-item ${isActive ? "active" : ""}`
              }
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-text">{item.name}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">
              {user?.firstName ? user.firstName.charAt(0).toUpperCase() : "U"}
            </div>
            <span className="user-name">{user?.firstName || "User"}</span>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="mobile-bottom-nav">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `mobile-nav-item ${isActive ? "active" : ""}`
            }
          >
            <span className="mobile-nav-icon">{item.icon}</span>
          </NavLink>
        ))}
      </div>
    </>
  );
};

export default Sidebar;
