
const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({

    
user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: false
},


    customerName: {
        type: String,
        required: true,
        trim: true
    },

    email: {
        type: String,
        required: true,
        trim: true
    },

    phone: {
        type: String,
        required: true
    },

    address: {
        type: String,
        required: true
    },

    paymentMethod: {
        type: String,
        required: true
    },

    items: [
        {
            product: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Product",
                required: true
            },

            name: {
                type: String,
                required: true
            },

            price: {
                type: Number,
                required: true
            },

            quantity: {
                type: Number,
                required: true,
                min: 1
            }
        }
    ],

    subtotal: {
        type: Number,
        required: true
    },

    delivery: {
        type: Number,
        required: true
    },

    total: {
        type: Number,
        required: true
    },

    
status: {
    type: String,
    enum: [
        "Order Placed",
        "Processing",
        "Shipped",
        "Delivered",
        "Cancelled"
    ],
    default: "Order Placed"
}

}, {
    timestamps: true
});

module.exports = mongoose.model("Order", orderSchema);
