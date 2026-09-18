const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const vendorRoutes = require("./routes/vendor.routes");
const authRoutes = require("./routes/authRoutes");
const masterRoutes = require("./routes/masterRoutes");
const contractRoutes = require("./routes/contractRoutes");
const invoiceRoutes = require("./routes/invoiceRoutes");
const workflowRoutes = require("./routes/workflowRoutes");
<<<<<<< HEAD
const userRoutes = require("./routes/userRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const reportsRoutes = require("./routes/reportsRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const errorMiddleware = require("./middleware/errorMiddelware");
const settingRoutes = require('./routes/settingRoutes');
const permissionRoutes = require('./routes/permissionRoutes');
const accessRequestRoutes = require('./routes/accessRequestRoutes');
=======
const errorMiddleware = require("./middleware/errorMiddelware");
const settingRoutes = require('./routes/settingRoutes');
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c
const path = require("path");

const app = express();

app.use(cors());

app.use(helmet());

app.use(morgan("dev"));

app.use(express.json());

app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "Freight Contract Management API Running"
    });
});


app.use("/api/auth", authRoutes);
app.use("/api/vendors", vendorRoutes);
app.use("/api/masters", masterRoutes);
app.use("/api/contracts", contractRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/workflows", workflowRoutes);
<<<<<<< HEAD
app.use("/api/users", userRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/notifications", notificationRoutes);
app.use('/api/settings', settingRoutes);
app.use('/api/permissions', permissionRoutes);
app.use('/api/access-requests', accessRequestRoutes);
=======
app.use('/api/settings', settingRoutes);
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use(errorMiddleware);
module.exports = app;
