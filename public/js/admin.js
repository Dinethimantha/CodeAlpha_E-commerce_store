// ========================================
// NOVASTORE - ADMIN DASHBOARD
// Product Management + Image Upload
// Order Management + Customers
// Sales & Revenue Reports
// ========================================

const API_URL = "http://localhost:5000/api";

const token = localStorage.getItem("novaStoreToken");

const currentUser = JSON.parse(
    localStorage.getItem("novaStoreUser") || "null"
);

let productsCache = [];
let ordersCache = [];

let dailyChart = null;
let weeklyChart = null;
let monthlyChart = null;

const productForm = document.getElementById("productForm");
const productFormContainer = document.getElementById("productFormContainer");
const productFormTitle = document.getElementById("productFormTitle");

const addProductBtn = document.getElementById("addProductBtn");
const cancelProductBtn = document.getElementById("cancelProductBtn");
const saveProductBtn = document.getElementById("saveProductBtn");

const adminProducts = document.getElementById("adminProducts");
const adminOrders = document.getElementById("adminOrders");

const productImageFile = document.getElementById("productImageFile");
const productImage = document.getElementById("productImage");
const productImagePreview = document.getElementById("productImagePreview");
const imagePreviewContainer = document.getElementById("imagePreviewContainer");
const imageUploadError = document.getElementById("imageUploadError");

let previewObjectURL = null;

// ========================================
// CHECK LOGIN
// ========================================

if (!token) {
    alert("Please login first.");
    window.location.href = "login.html";
}

// ========================================
// ESCAPE HTML
// ========================================

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

// ========================================
// FORMAT CURRENCY
// ========================================

function formatPrice(value) {
    return "Rs. " + Number(value || 0).toLocaleString("en-US", {
        maximumFractionDigits: 2
    });
}

// ========================================
// IMAGE URL HELPER
// ========================================

function getImageURL(imagePath) {

    if (!imagePath) return "";

    if (
        imagePath.startsWith("http://") ||
        imagePath.startsWith("https://") ||
        imagePath.startsWith("data:")
    ) {
        return imagePath;
    }

    return `http://localhost:5000/${imagePath.replace(/^\/+/, "")}`;
}

// ========================================
// API REQUEST HELPER
// ========================================

async function adminRequest(url, options = {}) {

    const headers = {
        Authorization: `Bearer ${token}`,
        ...(options.headers || {})
    };

    if (!(options.body instanceof FormData)) {
        headers["Content-Type"] = "application/json";
    }

    const response = await fetch(`${API_URL}${url}`, {
        ...options,
        headers
    });

    let data;

    try {
        data = await response.json();
    } catch {
        data = {};
    }

    if (response.status === 401 || response.status === 403) {

        localStorage.removeItem("novaStoreToken");
        localStorage.removeItem("novaStoreUser");

        alert("Your session is invalid or access is denied.");

        window.location.href = "login.html";

        throw new Error("Authentication failed.");
    }

    if (!response.ok) {
        throw new Error(data.message || "Request failed.");
    }

    return data;
}

// ========================================
// ADMIN NAME
// ========================================

if (currentUser) {
    document.getElementById("adminName").textContent =
        currentUser.name || "Admin";
}

// ========================================
// NAVIGATION
// ========================================

const navLinks = document.querySelectorAll(".nav-link");

const sections = {
    dashboard: document.getElementById("dashboardSection"),
    products: document.getElementById("productsSection"),
    orders: document.getElementById("ordersSection"),
    customers: document.getElementById("customersSection"),
    reports: document.getElementById("reportsSection")
};

navLinks.forEach(link => {

    link.addEventListener("click", event => {

        event.preventDefault();

        const sectionName = link.dataset.section;

        if (!sections[sectionName]) return;

        navLinks.forEach(item => item.classList.remove("active"));

        link.classList.add("active");

        Object.values(sections).forEach(section => {
            section.classList.remove("active");
        });

        sections[sectionName].classList.add("active");

        document.getElementById("pageTitle").textContent =
            link.textContent.trim();

        if (sectionName === "dashboard") loadDashboard();
        if (sectionName === "products") loadProducts();
        if (sectionName === "orders") loadOrders();
        if (sectionName === "customers") loadCustomers();
        if (sectionName === "reports") loadReports();

    });

});

// ========================================
// DASHBOARD STATISTICS
// ========================================

async function loadDashboard() {

    try {

        const data = await adminRequest("/admin/stats");

        const stats = data.stats;

        document.getElementById("totalProducts").textContent =
            stats.totalProducts;

        document.getElementById("totalOrders").textContent =
            stats.totalOrders;

        document.getElementById("totalCustomers").textContent =
            stats.totalCustomers;

        document.getElementById("totalRevenue").textContent =
            formatPrice(stats.totalRevenue);

    } catch (error) {
        console.error("Dashboard Error:", error);
    }

}

// ========================================
// IMAGE PREVIEW FUNCTIONS
// ========================================

function showImagePreview(imageURL) {

    if (!imageURL) {
        hideImagePreview();
        return;
    }

    productImagePreview.onerror = () => {
        hideImagePreview();
        showImageError("Unable to display this image.");
    };

    productImagePreview.src = imageURL;

    imagePreviewContainer.classList.add("show");
}

function hideImagePreview() {

    productImagePreview.src = "";

    imagePreviewContainer.classList.remove("show");
}

function clearImagePreviewURL() {

    if (previewObjectURL) {
        URL.revokeObjectURL(previewObjectURL);
        previewObjectURL = null;
    }
}

function showImageError(message) {

    imageUploadError.textContent = message;

    imageUploadError.classList.add("show");
}

function clearImageError() {

    imageUploadError.textContent = "";

    imageUploadError.classList.remove("show");
}

// ========================================
// IMAGE FILE SELECTION
// ========================================

productImageFile.addEventListener("change", () => {

    clearImageError();
    clearImagePreviewURL();

    const file = productImageFile.files[0];

    if (!file) return;

    const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif"
    ];

    if (!allowedTypes.includes(file.type)) {

        showImageError(
            "Invalid image format. Select JPG, PNG, WEBP or GIF."
        );

        productImageFile.value = "";

        return;
    }

    if (file.size > 5 * 1024 * 1024) {

        showImageError("Image size must be less than 5MB.");

        productImageFile.value = "";

        return;
    }

    previewObjectURL = URL.createObjectURL(file);

    showImagePreview(previewObjectURL);

});

// ========================================
// UPLOAD PRODUCT IMAGE
// ========================================

async function uploadProductImage() {

    const file = productImageFile.files[0];

    if (!file) {
        return productImage.value.trim();
    }

    const formData = new FormData();

    formData.append("image", file);

    const data = await adminRequest("/admin/upload-image", {
        method: "POST",
        body: formData
    });

    if (!data.success || !data.image) {
        throw new Error("Image upload failed.");
    }

    return data.image;
}

// ========================================
// LOAD PRODUCTS
// ========================================

async function loadProducts() {

    adminProducts.innerHTML =
        '<p class="loading-message">Loading products...</p>';

    try {

        const data = await adminRequest("/admin/products");

        productsCache = data.products || [];

        if (productsCache.length === 0) {

            adminProducts.innerHTML =
                '<p class="empty-message">No products found. Add your first product!</p>';

            return;
        }

        adminProducts.innerHTML = `

            <div class="admin-table-wrapper">

                <table class="admin-table">

                    <thead>
                        <tr>
                            <th>Image</th>
                            <th>Product Name</th>
                            <th>Category</th>
                            <th>Price</th>
                            <th>Stock</th>
                            <th>Actions</th>
                        </tr>
                    </thead>

                    <tbody>

                        ${productsCache.map(product => `

                            <tr>

                                <td>
                                    ${
                                        product.image
                                            ? `<img
                                                src="${escapeHTML(getImageURL(product.image))}"
                                                alt="${escapeHTML(product.name)}"
                                                style="width:55px;height:55px;object-fit:contain;border-radius:8px;"
                                                onerror="this.style.display='none'"
                                            >`
                                            : "No Image"
                                    }
                                </td>

                                <td>${escapeHTML(product.name)}</td>

                                <td>${escapeHTML(product.category)}</td>

                                <td>${formatPrice(product.price)}</td>

                                <td>${Number(product.stock)}</td>

                                <td>

                                    <button
                                        class="edit-product-btn"
                                        data-id="${escapeHTML(product._id)}">
                                        Edit
                                    </button>

                                    <button
                                        class="delete-product-btn"
                                        data-id="${escapeHTML(product._id)}">
                                        Delete
                                    </button>

                                </td>

                            </tr>

                        `).join("")}

                    </tbody>

                </table>

            </div>

        `;

    } catch (error) {

        console.error("Load Products Error:", error);

        adminProducts.innerHTML =
            '<p class="empty-message">Unable to load products.</p>';
    }

}

// ========================================
// OPEN ADD PRODUCT FORM
// ========================================

addProductBtn.addEventListener("click", () => {

    closeProductForm();

    productFormTitle.textContent = "Add New Product";

    saveProductBtn.textContent = "Save Product";

    productFormContainer.classList.add("show");

    productFormContainer.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });

});

// ========================================
// CLOSE PRODUCT FORM
// ========================================

function closeProductForm() {

    productForm.reset();

    document.getElementById("productId").value = "";

    productImage.value = "";

    clearImagePreviewURL();
    clearImageError();
    hideImagePreview();

    productFormContainer.classList.remove("show");
}

cancelProductBtn.addEventListener("click", closeProductForm);

// ========================================
// ADD OR UPDATE PRODUCT
// ========================================

productForm.addEventListener("submit", async event => {

    event.preventDefault();

    const productId = document.getElementById("productId").value;

    const productData = {

        name: document.getElementById("productName").value.trim(),

        description: document.getElementById("productDescription").value.trim(),

        price: Number(document.getElementById("productPrice").value),

        category: document.getElementById("productCategory").value,

        stock: Number(document.getElementById("productStock").value)
    };

    if (
        !productData.name ||
        !productData.description ||
        !productData.category ||
        !Number.isFinite(productData.price) ||
        productData.price < 0 ||
        !Number.isInteger(productData.stock) ||
        productData.stock < 0
    ) {

        alert("Please enter valid product details.");

        return;
    }

    if (
        !productId &&
        !productImageFile.files[0] &&
        !productImage.value
    ) {

        showImageError("Please select a product image.");

        return;
    }

    if (imageUploadError.classList.contains("show")) {
        return;
    }

    saveProductBtn.disabled = true;

    saveProductBtn.textContent = "Uploading and Saving...";

    try {

        const uploadedImage = await uploadProductImage();

        productData.image = uploadedImage;

        let data;

        if (productId) {

            data = await adminRequest(
                `/admin/products/${encodeURIComponent(productId)}`,
                {
                    method: "PUT",
                    body: JSON.stringify(productData)
                }
            );

        } else {

            data = await adminRequest("/admin/products", {
                method: "POST",
                body: JSON.stringify(productData)
            });
        }

        alert(data.message);

        closeProductForm();

        await loadProducts();

        await loadDashboard();

    } catch (error) {

        console.error("Save Product Error:", error);

        alert(error.message || "Unable to save product.");

    } finally {

        saveProductBtn.disabled = false;

        saveProductBtn.textContent =
            document.getElementById("productId").value
                ? "Update Product"
                : "Save Product";
    }

});

// ========================================
// EDIT AND DELETE PRODUCTS
// ========================================

adminProducts.addEventListener("click", async event => {

    const editButton = event.target.closest(".edit-product-btn");

    const deleteButton = event.target.closest(".delete-product-btn");

    // EDIT PRODUCT

    if (editButton) {

        const product = productsCache.find(
            item => item._id === editButton.dataset.id
        );

        if (!product) return;

        closeProductForm();

        document.getElementById("productId").value = product._id;

        document.getElementById("productName").value = product.name;

        document.getElementById("productDescription").value =
            product.description;

        document.getElementById("productPrice").value = product.price;

        document.getElementById("productCategory").value =
            product.category;

        document.getElementById("productStock").value = product.stock;

        productImage.value = product.image || "";

        if (product.image) {
            showImagePreview(getImageURL(product.image));
        }

        productFormTitle.textContent = "Edit Product";

        saveProductBtn.textContent = "Update Product";

        productFormContainer.classList.add("show");

        productFormContainer.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }

    // DELETE PRODUCT

    if (deleteButton) {

        const productId = deleteButton.dataset.id;

        const product = productsCache.find(
            item => item._id === productId
        );

        if (!product) return;

        const confirmDelete = confirm(
            `Are you sure you want to delete "${product.name}"?`
        );

        if (!confirmDelete) return;

        try {

            const data = await adminRequest(
                `/admin/products/${encodeURIComponent(productId)}`,
                {
                    method: "DELETE"
                }
            );

            alert(data.message);

            await loadProducts();

            await loadDashboard();

        } catch (error) {

            console.error(error);

            alert(error.message || "Unable to delete product.");
        }
    }

});

// ========================================
// ORDER MANAGEMENT
// ========================================

async function loadOrders() {

    adminOrders.innerHTML =
        '<p class="loading-message">Loading orders...</p>';

    try {

        const data = await adminRequest("/admin/orders");

        ordersCache = data.orders || [];

        displayOrders(ordersCache);

    } catch (error) {

        console.error(error);

        adminOrders.innerHTML =
            '<p class="empty-message">Unable to load orders.</p>';
    }

}

// ========================================
// DISPLAY ORDERS
// ========================================

function displayOrders(orders) {

    if (orders.length === 0) {

        adminOrders.innerHTML =
            '<p class="empty-message">No matching orders found.</p>';

        return;
    }

    const statuses = [
        "Order Placed",
        "Processing",
        "Shipped",
        "Delivered",
        "Cancelled"
    ];

    adminOrders.innerHTML = `

        <div class="admin-table-wrapper">

            <table class="admin-table">

                <thead>
                    <tr>
                        <th>Order ID</th>
                        <th>Customer</th>
                        <th>Phone</th>
                        <th>Total</th>
                        <th>Payment</th>
                        <th>Date</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>

                <tbody>

                    ${orders.map(order => `

                        <tr>

                            <td>
                                ${escapeHTML(String(order._id).slice(-8))}
                            </td>

                            <td>
                                ${escapeHTML(order.customerName || "N/A")}
                            </td>

                            <td>
                                ${escapeHTML(order.phone || "N/A")}
                            </td>

                            <td>${formatPrice(order.total)}</td>

                            <td>
                                ${escapeHTML(order.paymentMethod || "N/A")}
                            </td>

                            <td>
                                ${order.createdAt
                                    ? new Date(order.createdAt).toLocaleDateString()
                                    : "N/A"}
                            </td>

                            <td>

                                <select
                                    class="status-select"
                                    data-order-id="${escapeHTML(order._id)}">

                                    ${statuses.map(status => `

                                        <option
                                            value="${status}"
                                            ${(order.status || "Order Placed") === status ? "selected" : ""}>
                                            ${status}
                                        </option>

                                    `).join("")}

                                </select>

                            </td>

                            <td>

                                <button
                                    type="button"
                                    class="view-order-btn"
                                    data-order-id="${escapeHTML(order._id)}">
                                    View Details
                                </button>

                            </td>

                        </tr>

                    `).join("")}

                </tbody>

            </table>

        </div>

    `;
}

// ========================================
// ORDER DETAILS MODAL
// ========================================

function openOrderDetails(orderId) {

    const order = ordersCache.find(
        item => item._id === orderId
    );

    if (!order) {
        alert("Order details could not be found.");
        return;
    }

    const modal = document.getElementById("orderDetailsModal");

    const content = document.getElementById("orderDetailsContent");

    if (!modal || !content) return;

    const items = Array.isArray(order.items) ? order.items : [];

    const itemRows = items.length > 0

        ? items.map(item => {

            const itemName = item.name || item.product?.name || "Product";

            const price = Number(item.price || 0);

            const quantity = Number(item.quantity || 0);

            return `
                <tr>
                    <td>${escapeHTML(itemName)}</td>
                    <td>${formatPrice(price)}</td>
                    <td>${quantity}</td>
                    <td>${formatPrice(price * quantity)}</td>
                </tr>
            `;

        }).join("")

        : `<tr><td colspan="4">No product items found.</td></tr>`;

    const subtotal = Number(order.subtotal || 0);
    const delivery = Number(order.delivery || 0);
    const total = Number(order.total || 0);

    content.innerHTML = `

        <div class="order-detail-section">

            <h3>Customer Information</h3>

            <div class="order-detail-grid">

                <div class="order-detail-item">
                    <span>Customer Name</span>
                    <strong>${escapeHTML(order.customerName || "N/A")}</strong>
                </div>

                <div class="order-detail-item">
                    <span>Email Address</span>
                    <strong>${escapeHTML(order.email || "N/A")}</strong>
                </div>

                <div class="order-detail-item">
                    <span>Phone Number</span>
                    <strong>${escapeHTML(order.phone || "N/A")}</strong>
                </div>

                <div class="order-detail-item">
                    <span>Order Date</span>
                    <strong>
                        ${order.createdAt
                            ? new Date(order.createdAt).toLocaleString()
                            : "N/A"}
                    </strong>
                </div>

                <div class="order-detail-item">
                    <span>Delivery Address</span>
                    <strong>${escapeHTML(order.address || "N/A")}</strong>
                </div>

                <div class="order-detail-item">
                    <span>Payment Method</span>
                    <strong>${escapeHTML(order.paymentMethod || "N/A")}</strong>
                </div>

                <div class="order-detail-item">
                    <span>Order ID</span>
                    <strong>${escapeHTML(order._id)}</strong>
                </div>

                <div class="order-detail-item">
                    <span>Order Status</span>
                    <strong>${escapeHTML(order.status || "Order Placed")}</strong>
                </div>

            </div>

        </div>

        <div class="order-detail-section">

            <h3>Ordered Products</h3>

            <div class="admin-table-wrapper">

                <table class="order-items-table">

                    <thead>
                        <tr>
                            <th>Product</th>
                            <th>Unit Price</th>
                            <th>Quantity</th>
                            <th>Total</th>
                        </tr>
                    </thead>

                    <tbody>
                        ${itemRows}
                    </tbody>

                </table>

            </div>

            <div class="order-total-box">

                <div class="order-total-row">
                    <span>Subtotal</span>
                    <strong>${formatPrice(subtotal)}</strong>
                </div>

                <div class="order-total-row">
                    <span>Delivery</span>
                    <strong>${formatPrice(delivery)}</strong>
                </div>

                <div class="order-total-row final">
                    <span>Grand Total</span>
                    <strong>${formatPrice(total)}</strong>
                </div>

            </div>

        </div>

    `;

    modal.classList.add("show");
}

function closeOrderDetails() {

    const modal = document.getElementById("orderDetailsModal");

    if (modal) {
        modal.classList.remove("show");
    }
}

adminOrders.addEventListener("click", event => {

    const viewButton = event.target.closest(".view-order-btn");

    if (viewButton) {
        openOrderDetails(viewButton.dataset.orderId);
    }

});

document.addEventListener("click", event => {

    if (event.target.closest("#closeOrderModal")) {
        closeOrderDetails();
    }

    if (event.target.id === "orderDetailsModal") {
        closeOrderDetails();
    }

});

document.addEventListener("keydown", event => {

    if (event.key === "Escape") {
        closeOrderDetails();
    }

});

// ========================================
// SEARCH AND FILTER ORDERS
// ========================================

function filterOrders() {

    const searchInput = document.getElementById("orderSearch");

    const statusFilter = document.getElementById("orderStatusFilter");

    if (!searchInput || !statusFilter) return;

    const searchValue = searchInput.value.toLowerCase().trim();

    const selectedStatus = statusFilter.value;

    const filteredOrders = ordersCache.filter(order => {

        const orderId = String(order._id || "").toLowerCase();

        const customerName = String(
            order.customerName || ""
        ).toLowerCase();

        const matchesSearch =
            orderId.includes(searchValue) ||
            customerName.includes(searchValue);

        const matchesStatus =
            selectedStatus === "All" ||
            (order.status || "Order Placed") === selectedStatus;

        return matchesSearch && matchesStatus;
    });

    displayOrders(filteredOrders);
}

document.getElementById("orderSearch").addEventListener(
    "input",
    filterOrders
);

document.getElementById("orderStatusFilter").addEventListener(
    "change",
    filterOrders
);

// ========================================
// UPDATE ORDER STATUS
// ========================================

adminOrders.addEventListener("change", async event => {

    if (!event.target.classList.contains("status-select")) {
        return;
    }

    const selectElement = event.target;

    const orderId = selectElement.dataset.orderId;

    const newStatus = selectElement.value;

    const order = ordersCache.find(
        item => item._id === orderId
    );

    const previousStatus = order?.status || "Order Placed";

    selectElement.disabled = true;

    try {

        const result = await adminRequest(
            `/admin/orders/${encodeURIComponent(orderId)}/status`,
            {
                method: "PUT",
                body: JSON.stringify({
                    status: newStatus
                })
            }
        );

        if (order) {
            order.status = newStatus;
        }

        alert(result.message || "Order status updated successfully!");

        filterOrders();

        // Refresh revenue reports if Reports page is open
        if (sections.reports.classList.contains("active")) {
            await loadReports();
        }

        await loadDashboard();

    } catch (error) {

        console.error(error);

        alert(error.message || "Unable to update order status.");

        selectElement.value = previousStatus;

    } finally {

        selectElement.disabled = false;
    }

});

// ========================================
// CUSTOMER MANAGEMENT
// ========================================

async function loadCustomers() {

    const container = document.getElementById("adminCustomers");

    container.innerHTML =
        '<p class="loading-message">Loading customers...</p>';

    try {

        const data = await adminRequest("/admin/customers");

        if (!data.customers || data.customers.length === 0) {

            container.innerHTML =
                '<p class="empty-message">No customers found.</p>';

            return;
        }

        container.innerHTML = `

            <div class="admin-table-wrapper">

                <table class="admin-table">

                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Registered Date</th>
                        </tr>
                    </thead>

                    <tbody>

                        ${data.customers.map(customer => `

                            <tr>

                                <td>${escapeHTML(customer.name)}</td>

                                <td>${escapeHTML(customer.email)}</td>

                                <td>
                                    ${customer.createdAt
                                        ? new Date(customer.createdAt).toLocaleDateString()
                                        : "N/A"}
                                </td>

                            </tr>

                        `).join("")}

                    </tbody>

                </table>

            </div>

        `;

    } catch (error) {

        console.error(error);

        container.innerHTML =
            '<p class="empty-message">Unable to load customers.</p>';
    }

}

// ========================================
// SALES REPORTS
// ========================================

async function loadReports() {

    const bestSellingContainer =
        document.getElementById("bestSellingProducts");

    bestSellingContainer.innerHTML =
        '<p class="report-empty">Loading reports...</p>';

    try {

        const data = await adminRequest("/admin/reports");

        if (!data.success) {
            throw new Error(data.message || "Unable to load reports.");
        }

        displayReportSummary(data.summary || {});

        displayDailyChart(data.dailySales || []);

        displayWeeklyChart(data.weeklySales || []);

        displayMonthlyChart(data.monthlySales || []);

        displayBestSellingProducts(data.bestSellingProducts || []);

    } catch (error) {

        console.error("Reports Error:", error);

        bestSellingContainer.innerHTML = `
            <p class="report-error">
                ${escapeHTML(error.message || "Unable to load sales reports.")}
            </p>
        `;
    }

}

// ========================================
// REPORT SUMMARY
// ========================================

function displayReportSummary(summary) {

    const revenue = Number(summary.totalRevenue || 0);

    const totalOrders = Number(summary.totalOrders || 0);

    const averageOrder = totalOrders > 0
        ? revenue / totalOrders
        : 0;

    document.getElementById("reportTotalRevenue").textContent =
        formatPrice(revenue);

    document.getElementById("reportTotalOrders").textContent =
        totalOrders.toLocaleString("en-US");

    document.getElementById("reportAverageOrder").textContent =
        formatPrice(averageOrder);
}

// ========================================
// CHART HELPER
// ========================================

function createSalesChart(canvasId, oldChart, labels, values, label) {

    const canvas = document.getElementById(canvasId);

    if (!canvas || typeof Chart === "undefined") {
        console.error("Chart.js or chart canvas is unavailable.");
        return oldChart;
    }

    if (oldChart) {
        oldChart.destroy();
    }

    return new Chart(canvas, {

        type: "bar",

        data: {
            labels,

            datasets: [{
                label,
                data: values,
                backgroundColor: "rgba(59, 130, 246, 0.7)",
                borderColor: "rgb(37, 99, 235)",
                borderWidth: 1,
                borderRadius: 6
            }]
        },

        options: {
            responsive: true,
            maintainAspectRatio: false,

            plugins: {
                legend: {
                    display: true
                },

                tooltip: {
                    callbacks: {
                        label: context => {
                            return "Revenue: " + formatPrice(context.raw);
                        }
                    }
                }
            },

            scales: {
                y: {
                    beginAtZero: true,

                    ticks: {
                        callback: value => {
                            return "Rs. " + Number(value).toLocaleString("en-US");
                        }
                    }
                }
            }
        }
    });
}

// ========================================
// DAILY SALES CHART
// ========================================

function displayDailyChart(dailySales) {

    const labels = [];
    const values = [];

    const salesMap = {};

    dailySales.forEach(item => {
        salesMap[item._id] = Number(item.revenue || 0);
    });

    // Generate all 7 days including days with no orders
    for (let i = 6; i >= 0; i--) {

        const date = new Date();

        date.setHours(0, 0, 0, 0);

        date.setDate(date.getDate() - i);

        const key = [
            date.getFullYear(),
            String(date.getMonth() + 1).padStart(2, "0"),
            String(date.getDate()).padStart(2, "0")
        ].join("-");

        labels.push(date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric"
        }));

        values.push(salesMap[key] || 0);
    }

    dailyChart = createSalesChart(
        "dailySalesChart",
        dailyChart,
        labels,
        values,
        "Daily Revenue"
    );
}

// ========================================
// WEEKLY SALES CHART
// ========================================

function displayWeeklyChart(weeklySales) {

    const labels = weeklySales.map(item => {
        return `Week ${item._id.week}, ${item._id.year}`;
    });

    const values = weeklySales.map(item => {
        return Number(item.revenue || 0);
    });

    weeklyChart = createSalesChart(
        "weeklySalesChart",
        weeklyChart,
        labels,
        values,
        "Weekly Revenue"
    );
}

// ========================================
// MONTHLY SALES CHART
// ========================================

function displayMonthlyChart(monthlySales) {

    const labels = [];
    const values = [];

    const salesMap = {};

    monthlySales.forEach(item => {
        salesMap[item._id] = Number(item.revenue || 0);
    });

    // Generate last 6 months including months with no orders
    for (let i = 5; i >= 0; i--) {

        const date = new Date();

        date.setDate(1);

        date.setMonth(date.getMonth() - i);

        const key = [
            date.getFullYear(),
            String(date.getMonth() + 1).padStart(2, "0")
        ].join("-");

        labels.push(date.toLocaleDateString("en-US", {
            month: "short",
            year: "numeric"
        }));

        values.push(salesMap[key] || 0);
    }

    monthlyChart = createSalesChart(
        "monthlySalesChart",
        monthlyChart,
        labels,
        values,
        "Monthly Revenue"
    );
}

// ========================================
// BEST-SELLING PRODUCTS
// ========================================

function displayBestSellingProducts(products) {

    const container =
        document.getElementById("bestSellingProducts");

    if (!products || products.length === 0) {

        container.innerHTML = `
            <p class="report-empty">
                No sales data available yet.
            </p>
        `;

        return;
    }

    container.innerHTML = `

        <div class="admin-table-wrapper">

            <table class="report-table">

                <thead>
                    <tr>
                        <th>Rank</th>
                        <th>Product Name</th>
                        <th>Units Sold</th>
                        <th>Revenue</th>
                    </tr>
                </thead>

                <tbody>

                    ${products.map((product, index) => `

                        <tr>

                            <td>#${index + 1}</td>

                            <td>${escapeHTML(product._id)}</td>

                            <td>
                                ${Number(product.totalQuantity || 0).toLocaleString("en-US")}
                            </td>

                            <td>
                                ${formatPrice(product.totalRevenue)}
                            </td>

                        </tr>

                    `).join("")}

                </tbody>

            </table>

        </div>

    `;
}

// ========================================
// REFRESH REPORTS BUTTON
// ========================================

document.getElementById("refreshReportsBtn").addEventListener(
    "click",
    async () => {

        const button = document.getElementById("refreshReportsBtn");

        button.disabled = true;

        button.textContent = "Refreshing...";

        await loadReports();

        button.disabled = false;

        button.textContent = "Refresh Reports";
    }
);

// ========================================
// LOGOUT
// ========================================

document.getElementById("logoutBtn").addEventListener("click", () => {

    const confirmLogout = confirm("Are you sure you want to logout?");

    if (confirmLogout) {

        localStorage.removeItem("novaStoreToken");

        localStorage.removeItem("novaStoreUser");

        alert("Logged out successfully!");

        window.location.href = "login.html";
    }

});

// ========================================
// START DASHBOARD
// ========================================

async function startAdminDashboard() {

    try {

        await adminRequest("/admin/stats");

        await loadDashboard();

    } catch (error) {

        console.error("Admin access error:", error);
    }

}

if (token) {
    startAdminDashboard();
}