// ========================================
// NOVASTORE - ADMIN ROUTES
// Admin Dashboard + Product Image Upload
// Product, Order, Customer Management
// Sales & Revenue Reports
// ========================================

const express = require("express");
const router = express.Router();

const multer = require("multer");
const path = require("path");
const fs = require("fs");

const Product = require("../models/product");
const Order = require("../models/Order");
const User = require("../models/User");

const protect = require("../middleware/authMiddleware");
const admin = require("../middleware/adminMiddleware");

// ========================================
// MULTER IMAGE UPLOAD CONFIGURATION
// ========================================

const imageFolder = path.join(__dirname, "../public/images");

if (!fs.existsSync(imageFolder)) {
    fs.mkdirSync(imageFolder, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, imageFolder);
    },

    filename: (req, file, cb) => {
        const uniqueName =
            Date.now() + "-" +
            Math.round(Math.random() * 1E9) +
            path.extname(file.originalname).toLowerCase();

        cb(null, uniqueName);
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
        "image/gif"
    ];

    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error("Only JPG, PNG, WEBP and GIF images are allowed."));
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024
    }
});

// ========================================
// PROTECT ALL ADMIN ROUTES
// ========================================

router.use(protect);
router.use(admin);

// ========================================
// UPLOAD PRODUCT IMAGE
// POST /api/admin/upload-image
// ========================================

router.post("/upload-image", (req, res) => {
    upload.single("image")(req, res, (error) => {
        if (error) {
            return res.status(400).json({
                success: false,
                message: error.code === "LIMIT_FILE_SIZE"
                    ? "Image size must be less than 5MB."
                    : error.message
            });
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "Please select an image."
            });
        }

        const imageUrl = "/images/" + req.file.filename;

        res.status(200).json({
            success: true,
            message: "Image uploaded successfully!",
            image: imageUrl
        });
    });
});

// ========================================
// GET DASHBOARD STATISTICS
// Exclude Cancelled Orders from Revenue
// ========================================

router.get("/stats", async (req, res) => {
    try {
        const totalProducts = await Product.countDocuments();

        const totalOrders = await Order.countDocuments();

        const totalCustomers = await User.countDocuments({
            role: "customer"
        });

        const revenueResult = await Order.aggregate([
            {
                $match: {
                    status: { $ne: "Cancelled" }
                }
            },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: "$total" }
                }
            }
        ]);

        const totalRevenue = revenueResult.length > 0
            ? revenueResult[0].totalRevenue
            : 0;

        res.status(200).json({
            success: true,
            stats: {
                totalProducts,
                totalOrders,
                totalCustomers,
                totalRevenue
            }
        });

    } catch (error) {
        console.error("Admin Stats Error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to load dashboard statistics."
        });
    }
});

// ========================================
// SALES & REVENUE REPORTS
// GET /api/admin/reports
// ========================================

router.get("/reports", async (req, res) => {
    try {
        const matchStage = {
            status: { $ne: "Cancelled" }
        };

        // Daily Sales - Last 7 Days
        const dailyStart = new Date();
        dailyStart.setHours(0, 0, 0, 0);
        dailyStart.setDate(dailyStart.getDate() - 6);

        const dailySales = await Order.aggregate([
            {
                $match: {
                    ...matchStage,
                    createdAt: { $gte: dailyStart }
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: {
                            format: "%Y-%m-%d",
                            date: "$createdAt"
                        }
                    },
                    totalOrders: { $sum: 1 },
                    revenue: { $sum: "$total" }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // Weekly Sales - Last 6 Months
        const weeklyStart = new Date();
        weeklyStart.setMonth(weeklyStart.getMonth() - 6);

        const weeklySales = await Order.aggregate([
            {
                $match: {
                    ...matchStage,
                    createdAt: { $gte: weeklyStart }
                }
            },
            {
                $group: {
                    _id: {
                        year: { $isoWeekYear: "$createdAt" },
                        week: { $isoWeek: "$createdAt" }
                    },
                    totalOrders: { $sum: 1 },
                    revenue: { $sum: "$total" }
                }
            },
            { $sort: { "_id.year": 1, "_id.week": 1 } }
        ]);

        // Monthly Sales - Last 6 Months
        const monthlyStart = new Date();
        monthlyStart.setDate(1);
        monthlyStart.setHours(0, 0, 0, 0);
        monthlyStart.setMonth(monthlyStart.getMonth() - 5);

        const monthlySales = await Order.aggregate([
            {
                $match: {
                    ...matchStage,
                    createdAt: { $gte: monthlyStart }
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: {
                            format: "%Y-%m",
                            date: "$createdAt"
                        }
                    },
                    totalOrders: { $sum: 1 },
                    revenue: { $sum: "$total" }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // Best-Selling Products
        const bestSellingProducts = await Order.aggregate([
            { $match: matchStage },
            { $unwind: "$items" },
            {
                $group: {
                    _id: "$items.name",
                    totalQuantity: { $sum: "$items.quantity" },
                    totalRevenue: {
                        $sum: {
                            $multiply: [
                                "$items.price",
                                "$items.quantity"
                            ]
                        }
                    }
                }
            },
            { $sort: { totalQuantity: -1 } },
            { $limit: 5 }
        ]);

        // Overall Revenue Summary
        const revenueResult = await Order.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: "$total" },
                    totalOrders: { $sum: 1 }
                }
            }
        ]);

        const summary = revenueResult[0] || {
            totalRevenue: 0,
            totalOrders: 0
        };

        res.status(200).json({
            success: true,
            summary,
            dailySales,
            weeklySales,
            monthlySales,
            bestSellingProducts
        });

    } catch (error) {
        console.error("Sales Reports Error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to generate sales reports."
        });
    }
});

// ========================================
// GET ALL PRODUCTS
// ========================================

router.get("/products", async (req, res) => {
    try {
        const products = await Product.find()
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: products.length,
            products
        });

    } catch (error) {
        console.error("Load Products Error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to load products."
        });
    }
});

// ========================================
// ADD NEW PRODUCT
// ========================================

router.post("/products", async (req, res) => {
    try {
        const {
            name,
            description,
            price,
            category,
            image,
            stock
        } = req.body;

        if (
            !name || !description || !category ||
            price === undefined || stock === undefined
        ) {
            return res.status(400).json({
                success: false,
                message: "Please provide all required product details."
            });
        }

        if (
            !Number.isFinite(Number(price)) ||
            Number(price) < 0 ||
            !Number.isInteger(Number(stock)) ||
            Number(stock) < 0
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid price or stock value."
            });
        }

        const product = await Product.create({
            name,
            description,
            price: Number(price),
            category,
            image: image || "",
            stock: Number(stock)
        });

        res.status(201).json({
            success: true,
            message: "Product added successfully!",
            product
        });

    } catch (error) {
        console.error("Add Product Error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to add product."
        });
    }
});

// ========================================
// UPDATE PRODUCT
// ========================================

router.put("/products/:id", async (req, res) => {
    try {
        const {
            name,
            description,
            price,
            category,
            image,
            stock
        } = req.body;

        if (
            !name || !description || !category ||
            price === undefined || stock === undefined
        ) {
            return res.status(400).json({
                success: false,
                message: "Please provide all required product details."
            });
        }

        if (
            !Number.isFinite(Number(price)) ||
            Number(price) < 0 ||
            !Number.isInteger(Number(stock)) ||
            Number(stock) < 0
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid price or stock value."
            });
        }

        const product = await Product.findByIdAndUpdate(
            req.params.id,
            {
                name,
                description,
                price: Number(price),
                category,
                image: image || "",
                stock: Number(stock)
            },
            {
                new: true,
                runValidators: true
            }
        );

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found."
            });
        }

        res.status(200).json({
            success: true,
            message: "Product updated successfully!",
            product
        });

    } catch (error) {
        console.error("Update Product Error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to update product."
        });
    }
});

// ========================================
// DELETE PRODUCT
// ========================================

router.delete("/products/:id", async (req, res) => {
    try {
        const product = await Product.findByIdAndDelete(req.params.id);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found."
            });
        }

        res.status(200).json({
            success: true,
            message: "Product deleted successfully!"
        });

    } catch (error) {
        console.error("Delete Product Error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to delete product."
        });
    }
});

// ========================================
// UPDATE ORDER STATUS
// ========================================

router.put("/orders/:id/status", async (req, res) => {
    try {
        const { status } = req.body;

        const allowedStatuses = [
            "Order Placed",
            "Processing",
            "Shipped",
            "Delivered",
            "Cancelled"
        ];

        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Invalid order status."
            });
        }

        const order = await Order.findByIdAndUpdate(
            req.params.id,
            { status },
            {
                new: true,
                runValidators: true
            }
        );

        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found."
            });
        }

        res.status(200).json({
            success: true,
            message: "Order status updated successfully!",
            order
        });

    } catch (error) {
        console.error("Update Order Status Error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to update order status."
        });
    }
});

// ========================================
// GET ALL ORDERS
// ========================================

router.get("/orders", async (req, res) => {
    try {
        const orders = await Order.find()
            .populate("user", "name email")
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: orders.length,
            orders
        });

    } catch (error) {
        console.error("Load Orders Error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to load orders."
        });
    }
});

// ========================================
// GET ALL CUSTOMERS
// ========================================

router.get("/customers", async (req, res) => {
    try {
        const customers = await User.find({
            role: "customer"
        })
            .select("-password")
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: customers.length,
            customers
        });

    } catch (error) {
        console.error("Load Customers Error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to load customers."
        });
    }
});

// ========================================
// EXPORT ROUTER
// ========================================

module.exports = router;