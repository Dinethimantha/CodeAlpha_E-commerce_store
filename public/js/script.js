
// ========================================
// NOVASTORE - MAIN JAVASCRIPT
// MongoDB Products, Search, Categories, Cart & Authentication
// ========================================

const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");
const cartCount = document.getElementById("cartCount");
const productGrid = document.getElementById("productGrid");

const categoryCards = document.querySelectorAll(".category-card");
const authNavLink = document.getElementById("authNavLink");

let cart = JSON.parse(localStorage.getItem("novaStoreCart")) || [];
let allProducts = [];
let selectedCategory = "All";

// ========================================
// UPDATE CART COUNT
// ========================================

function updateCartCount() {

    const totalItems = cart.reduce((total, item) => {
        return total + item.quantity;
    }, 0);

    if (cartCount) {
        cartCount.textContent = totalItems;
    }

    localStorage.setItem("novaStoreCart", JSON.stringify(cart));
}

// ========================================
// LOAD PRODUCTS FROM MONGODB
// ========================================

async function loadProducts() {

    if (!productGrid) return;

    try {

        productGrid.innerHTML = "<p>Loading products...</p>";

        const response = await fetch("/api/products");

        if (!response.ok) {
            throw new Error("Failed to connect to product API");
        }

        const data = await response.json();

        if (!data.success) {
            throw new Error("Unable to load products");
        }

        allProducts = data.products;

        displayProducts(allProducts);

        console.log("MongoDB Products Loaded Successfully!");

    } catch (error) {

        console.error("Product Loading Error:", error);

        productGrid.innerHTML =
            "<p>Unable to load products. Please try again later.</p>";

    }
}

// ========================================
// DISPLAY PRODUCTS
// ========================================

function displayProducts(products) {

    if (!productGrid) return;

    productGrid.innerHTML = "";

    if (products.length === 0) {

        productGrid.innerHTML = "<p>No products found.</p>";

        return;
    }

    products.forEach(product => {

        const productCard = document.createElement("div");

        productCard.className = "product-card";
        productCard.dataset.category = product.category;

        productCard.innerHTML = `

            <div class="product-image">

                <img src="${product.image}" alt="${product.name}">

            </div>

            <div class="product-info">

                <span class="product-category">
                    ${product.category}
                </span>

                <h3>${product.name}</h3>

                <div class="product-bottom">

                    <h4>
                        Rs. ${Number(product.price).toLocaleString("en-US")}
                    </h4>

                    <button
                        class="add-cart-btn"
                        data-id="${product._id}"
                        ${product.stock <= 0 ? "disabled" : ""}
                    >
                        ${product.stock <= 0 ? "Out of Stock" : "Add +"}
                    </button>

                </div>

            </div>

        `;

        productGrid.appendChild(productCard);

    });

}

// ========================================
// ADD PRODUCT TO CART
// ========================================

if (productGrid) {

    productGrid.addEventListener("click", function(event) {

        const button = event.target.closest(".add-cart-btn");

        if (!button) return;

        const productId = button.dataset.id;

        const product = allProducts.find(item => {
            return item._id === productId;
        });

        if (!product) return;

        if (product.stock <= 0) {
            alert("This product is currently out of stock!");
            return;
        }

        const existingProduct = cart.find(item => {
            return item.id === productId;
        });

        if (existingProduct) {

            if (existingProduct.quantity >= product.stock) {
                alert("Sorry! Maximum available stock reached.");
                return;
            }

            existingProduct.quantity++;

        } else {

            cart.push({

                id: product._id,
                name: product.name,
                price: product.price,
                image: product.image,
                quantity: 1

            });

        }

        updateCartCount();

        alert(product.name + " added to your cart!");

    });

}

// ========================================
// SEARCH AND CATEGORY FILTER
// ========================================

function filterProducts() {

    const searchText = searchInput
        ? searchInput.value.trim().toLowerCase()
        : "";

    const filteredProducts = allProducts.filter(product => {

        const matchesSearch =
            product.name.toLowerCase().includes(searchText) ||
            product.category.toLowerCase().includes(searchText);

        const matchesCategory =
            selectedCategory === "All" ||
            product.category.toLowerCase() === selectedCategory.toLowerCase();

        return matchesSearch && matchesCategory;

    });

    displayProducts(filteredProducts);

}

// ========================================
// SEARCH BUTTON
// ========================================

if (searchBtn) {

    searchBtn.addEventListener("click", function() {

        filterProducts();

        const productsSection = document.getElementById("products");

        if (productsSection) {
            productsSection.scrollIntoView({
                behavior: "smooth"
            });
        }

    });

}

// ========================================
// SEARCH WHILE TYPING
// ========================================

if (searchInput) {

    searchInput.addEventListener("input", filterProducts);

    searchInput.addEventListener("keydown", function(event) {

        if (event.key === "Enter") {

            event.preventDefault();

            filterProducts();

            const productsSection = document.getElementById("products");

            if (productsSection) {
                productsSection.scrollIntoView({
                    behavior: "smooth"
                });
            }

        }

    });

}

// ========================================
// CATEGORY FILTER
// ========================================

categoryCards.forEach(category => {

    category.addEventListener("click", function() {

        selectedCategory = this.dataset.category;

        filterProducts();

    });

});

// ========================================
// LOGIN / LOGOUT NAVBAR
// ========================================

function updateAuthNavbar() {

    if (!authNavLink) return;

    const token = localStorage.getItem("novaStoreToken");
    const userData = localStorage.getItem("novaStoreUser");

    if (token && userData) {

        let user;

        try {
            user = JSON.parse(userData);
        } catch (error) {
            localStorage.removeItem("novaStoreToken");
            localStorage.removeItem("novaStoreUser");
            authNavLink.textContent = "Login";
            authNavLink.href = "login.html";
            return;
        }

        authNavLink.textContent = "Logout";
        authNavLink.href = "#";

        authNavLink.onclick = function(event) {

            event.preventDefault();

            const confirmLogout = confirm(
                "Are you sure you want to logout?"
            );

            if (!confirmLogout) return;

            // Clear login information
            localStorage.removeItem("novaStoreToken");
            localStorage.removeItem("novaStoreUser");

            // Update navbar immediately
            authNavLink.textContent = "Login";
            authNavLink.href = "login.html";
            authNavLink.onclick = null;

            alert("You have logged out successfully!");

            window.location.href = "index.html";

        };

    } else {

        authNavLink.textContent = "Login";
        authNavLink.href = "login.html";
        authNavLink.onclick = null;

    }

}

// ========================================
// INITIALIZE WEBSITE
// ========================================

updateCartCount();

loadProducts();

updateAuthNavbar();

console.log("NovaStore JavaScript Loaded Successfully!");
