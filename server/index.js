require("dotenv").config();
const express = require("express");
const app = express();
const cors = require("cors");

//mongoDB Connection
require("./db/connection");

// server port
const port = process.env.PORT || 4000;

// importing the routes
const authRoutes = require("./routes/authRoutes");
const productRoutes = require("./routes/productRoutes");
const invoiceRoutes = require("./routes/invoiceRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const cronRoutes = require("./routes/cronRoutes");

//Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//Root route
app.get("/", (req, res) => {
  res.send("Canova Inventra Backend is running...");
});

//application routes
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/cron", cronRoutes);

//starting the server
app.listen(port, () => {
  console.log(`Server is running at port : ${port}`);
});
