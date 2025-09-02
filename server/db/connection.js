const mongoose = require("mongoose");

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("Connection is Established with DB...");
  })
  .catch((err) => {
    console.log("No Connection, ERROR : ", err);
  });
