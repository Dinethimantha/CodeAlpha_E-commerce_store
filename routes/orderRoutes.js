
const express = require("express");
const mongoose = require("mongoose");

const router = express.Router();

const Order = require("../models/Order");
const Product = require("../models/product");
const protect = require("../middleware/authMiddleware");

// ========================================
// POST - CREATE A NEW ORDER
// ========================================

router.post("/", protect, async (req, res) => {

    const session = await mongoose.startSession();

    try {

        const {
            customerName,
            email,
            phone,
            address,
            paymentMethod,
            items
        } = req.body;

        // Validate customer details
        if (!customerName || !email || !phone || !address || !paymentMethod) {
            return res.status(400).json({
                success: false,
                message: "Please provide all customer details."
            });
        }

        // Validate cart items
        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Your cart is empty."
            });
        }

        let savedOrder;

        await session.withTransaction(async () => {

            let orderItems = [];
            let subtotal = 0;

            // Check products and stock
            for (const item of items) {

                const productId = item.productId || item.id;
                const quantity = Number(item.quantity);

                if (
                    !mongoose.Types.ObjectId.isValid(productId) ||
                    !Number.isInteger(quantity) ||
                    quantity < 1
                ) {
                    throw new Error("Invalid product or quantity.");
                }

                const product = await Product.findById(productId)
                    .session(session);

                if (!product) {
                    throw new Error("Product not found.");
                }

                if (product.stock < quantity) {
                    throw new Error(`Insufficient stock for ${product.name}.`);
                }

                // Reduce stock
                const updatedProduct = await Product.findOneAndUpdate(
                    {
                        _id: productId,
                        stock: { $gte: quantity }
                    },
                    {
                        $inc: { stock: -quantity }
                    },
                    {
                        new: true,
                        session
                    }
                );

                if (!updatedProduct) {
                    throw new Error(`Unable to update stock for ${product.name}.`);
                }

                // Calculate subtotal
                subtotal += product.price * quantity;

                orderItems.push({
                    product: product._id,
                    name: product.name,
                    price: product.price,
                    quantity: quantity
                });

            }

            // Calculate delivery and total
            const delivery = subtotal >= 10000 ? 0 : 500;
            const total = subtotal + delivery;

            // Save order with logged-in user's ID
            const newOrder = await Order.create([{
                user: req.user.id,
                customerName,
                email,
                phone,
                address,
                paymentMethod,
                items: orderItems,
                subtotal,
                delivery,
                total
            }], { session });

            savedOrder = newOrder[0];

        });

        res.status(201).json({
            success: true,
            message: "Order placed successfully!",
            order: savedOrder
        });

    } catch (error) {

        console.error("Create Order Error:", error.message);

        res.status(400).json({
            success: false,
            message: error.message
        });

    } finally {

        await session.endSession();

    }

});

// ========================================
// GET - LOGGED-IN USER'S ORDERS
// ========================================

router.get("/", protect, async (req, res) => {

    try {

        const orders = await Order.find({
            user: req.user.id
        }).sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: orders.length,
            orders
        });

    } catch (error) {

        console.error("Get Orders Error:", error.message);

        res.status(500).json({
            success: false,
            message: "Unable to retrieve orders."
        });

    }

});

module.exports = router;
