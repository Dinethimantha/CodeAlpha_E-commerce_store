
// ========================================
// NOVASTORE - MY ORDERS
// JWT Authentication + MongoDB
// Customer Order Tracking
// ========================================

const ordersContainer = document.getElementById("ordersContainer");

const token = localStorage.getItem("novaStoreToken");

// ========================================
// CHECK LOGIN
// ========================================

if (!token) {
    alert("Please login to view your orders.");
    window.location.href = "login.html";
}

// ========================================
// SAFE HTML
// ========================================

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => {
        const entities = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        };

        return entities[char];
    });
}

// ========================================
// FORMAT CURRENCY
// ========================================

function formatPrice(value) {
    return Number(value || 0).toLocaleString("en-US");
}

// ========================================
// LOAD USER ORDERS
// ========================================

async function loadOrders() {

    if (!token || !ordersContainer) return;

    try {

        ordersContainer.innerHTML =
            '<p class="orders-loading">Loading your orders...</p>';

        const response = await fetch("/api/orders", {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (response.status === 401) {

            localStorage.removeItem("novaStoreToken");
            localStorage.removeItem("novaStoreUser");

            alert("Your session has expired. Please login again.");

            window.location.href = "login.html";

            return;
        }

        if (!response.ok || !data.success) {
            throw new Error(data.message || "Unable to load orders.");
        }

        displayOrders(data.orders);

    } catch (error) {

        console.error("Orders Loading Error:", error);

        ordersContainer.innerHTML = `
            <p class="orders-error">
                Unable to load orders. Please try again later.
            </p>
        `;
    }
}

// ========================================
// ORDER TRACKING
// ========================================

function getOrderTracking(status) {

    const steps = [
        "Order Placed",
        "Processing",
        "Shipped",
        "Delivered"
    ];

    const messages = {
        "Order Placed": "Your order has been successfully placed.",
        "Processing": "Your order is currently being prepared.",
        "Shipped": "Your order has been shipped and is on its way.",
        "Delivered": "Your order has been successfully delivered."
    };

    if (status === "Cancelled") {

        return `
            <div class="cancelled-message">
                This order has been cancelled.
            </div>
        `;
    }

    let currentIndex = steps.indexOf(status);

    // Fallback for missing or unexpected status
    if (currentIndex === -1) {
        currentIndex = 0;
        status = "Order Placed";
    }

    const progressWidth = currentIndex * (80 / 3);

    const stepsHTML = steps.map((step, index) => {

        let className = "";

        if (index < currentIndex) {
            className = "completed";
        } else if (index === currentIndex) {
            className = "active";
        }

        return `
            <div class="tracking-step ${className}">
                <div class="tracking-circle">
                    ${index < currentIndex ? "✓" : index + 1}
                </div>

                <p>${step}</p>
            </div>
        `;

    }).join("");

    return `
        <div class="tracking-section">

            <h4>Order Tracking</h4>

            <div class="tracking-progress">

                <div
                    class="tracking-line"
                    style="width: ${progressWidth}%"
                ></div>

                ${stepsHTML}

            </div>

            <div class="tracking-message">
                ${messages[status]}
            </div>

        </div>
    `;
}

// ========================================
// DISPLAY ORDERS
// ========================================

function displayOrders(orders) {

    if (!ordersContainer) return;

    ordersContainer.innerHTML = "";

    if (!orders || orders.length === 0) {

        ordersContainer.innerHTML = `
            <div class="empty-orders">
                <h2>No Orders Yet</h2>

                <p>You haven't placed any orders yet.</p>

                <a href="index.html" class="shop-now-btn">
                    Start Shopping
                </a>
            </div>
        `;

        return;
    }

    orders.forEach(order => {

        const orderCard = document.createElement("div");

        orderCard.className = "order-card";

        const orderDate = new Date(order.createdAt)
            .toLocaleDateString();

        const status = order.status || "Order Placed";

        const statusClass =
            status === "Cancelled" ? "cancelled" : "";

        // Product items

        const itemsHTML = (order.items || []).map(item => {

            const itemName = escapeHTML(item.name || "Product");

            const quantity = Number(item.quantity || 0);

            const price = Number(item.price || 0);

            return `
                <div class="order-item">

                    <span>
                        ${itemName} × ${quantity}
                    </span>

                    <strong>
                        Rs. ${formatPrice(price * quantity)}
                    </strong>

                </div>
            `;

        }).join("");

        // Order card

        orderCard.innerHTML = `

            <div class="order-header">

                <div>
                    <h3>Order #${escapeHTML(order._id)}</h3>

                    <p>
                        Date: ${escapeHTML(orderDate)}
                    </p>
                </div>

                <span class="order-status ${statusClass}">
                    ${escapeHTML(status)}
                </span>

            </div>

            ${getOrderTracking(status)}

            <div class="order-details">

                <h4>Customer Details</h4>

                <p>
                    Name: ${escapeHTML(order.customerName)}
                </p>

                <p>
                    Email: ${escapeHTML(order.email)}
                </p>

                <p>
                    Phone: ${escapeHTML(order.phone)}
                </p>

                <p>
                    Address: ${escapeHTML(order.address)}
                </p>

                <p>
                    Payment: ${escapeHTML(order.paymentMethod)}
                </p>

            </div>

            <div class="order-products">

                <h4>Ordered Products</h4>

                ${itemsHTML || "<p>No product details available.</p>"}

            </div>

            <div class="order-summary">

                <p>
                    Subtotal: Rs. ${formatPrice(order.subtotal)}
                </p>

                <p>
                    Delivery: Rs. ${formatPrice(order.delivery)}
                </p>

                <h3>
                    Total: Rs. ${formatPrice(order.total)}
                </h3>

            </div>
        `;

        ordersContainer.appendChild(orderCard);

    });

}


// ========================================
// AUTOMATIC ORDER STATUS REFRESH
// ========================================

let orderRefreshInterval = null;

// Initial load
if (ordersContainer && token) {

    loadOrders();

    // Refresh orders every 10 seconds
    orderRefreshInterval = setInterval(() => {

        // Refresh only when customer is viewing the page
        if (!document.hidden) {
            loadOrders();
        }

    }, 10000);

}

// Refresh immediately when customer returns to the page
document.addEventListener("visibilitychange", () => {

    if (!document.hidden && token) {
        loadOrders();
    }

});

// Stop automatic refresh when leaving the page
window.addEventListener("beforeunload", () => {

    if (orderRefreshInterval) {
        clearInterval(orderRefreshInterval);
    }

});
