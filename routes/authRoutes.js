
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/User");

const router = express.Router();

// ========================================
// POST - USER REGISTRATION
// ========================================

router.post("/register", async (req, res) => {

    try {

        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "Please provide name, email and password."
            });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: "Please enter a valid email address."
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: "Password must contain at least 6 characters."
            });
        }

        const existingUser = await User.findOne({
            email: email.toLowerCase().trim()
        });

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "An account with this email already exists."
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await User.create({
            name: name.trim(),
            email: email.toLowerCase().trim(),
            password: hashedPassword,
            role: "customer"
        });

        res.status(201).json({
            success: true,
            message: "Account created successfully!",
            user: {
                id: newUser._id,
                name: newUser.name,
                email: newUser.email,
                role: newUser.role
            }
        });

    } catch (error) {

        console.error("Registration Error:", error.message);

        res.status(500).json({
            success: false,
            message: "Registration failed. Please try again."
        });

    }

});

// ========================================
// POST - USER LOGIN
// ========================================

router.post("/login", async (req, res) => {

    try {

        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Please provide email and password."
            });
        }

        // FIND USER

        const user = await User.findOne({
            email: email.toLowerCase().trim()
        });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password."
            });
        }

        // CHECK PASSWORD

        const isPasswordValid = await bcrypt.compare(
            password,
            user.password
        );

        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password."
            });
        }

        // CHECK JWT SECRET

        if (!process.env.JWT_SECRET) {
            throw new Error("JWT_SECRET is not configured.");
        }

        // GENERATE JWT TOKEN

        const token = jwt.sign(
            {
                id: user._id.toString(),
                name: user.name,
                email: user.email,
                role: user.role || "customer"
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "1d"
            }
        );

        // LOGIN SUCCESS RESPONSE

        res.status(200).json({

            success: true,

            message: "Login successful!",

            token,

            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role || "customer"
            }

        });

    } catch (error) {

        console.error("LOGIN ERROR DETAILS:", error);

        res.status(500).json({
            success: false,
            message: "Login failed. Please try again."
        });

    }

});

module.exports = router;
