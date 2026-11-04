
// ========================================
// NOVASTORE - SHOPPING CART
// ========================================

let cart = JSON.parse(localStorage.getItem("novaStoreCart")) || [];

const cartItemsContainer = document.getElementById("cartItems");
const cartCount = document.getElementById("cartCount");

const subtotalElement = document.getElementById("subtotal");
const deliveryElement = document.getElementById("delivery");
const totalElement = document.getElementById("total");

const checkoutBtn = document.getElementById("checkoutBtn");

function formatPrice(price) {
    return "Rs. " + Number(price).toLocaleString("en-US");
}

function saveCart() {
    localStorage.setItem("novaStoreCart", JSON.stringify(cart));
}

function updateCartCount() {
    const totalItems = cart.reduce((total, item) => {
        return total + item.quantity;
    }, 0);

    if (cartCount) {
        cartCount.textContent = totalItems;
    }
}

function updateSummary() {
    const subtotal = cart.reduce((total, item) => {
        return total + (item.price * item.quantity);
    }, 0);

    const delivery = subtotal === 0 || subtotal >= 10000 ? 0 : 500;
    const total = subtotal + delivery;

    subtotalElement.textContent = formatPrice(subtotal);
    deliveryElement.textContent =
        delivery === 0 ? "Free" : formatPrice(delivery);

    totalElement.textContent = formatPrice(total);
}

function displayCart() {
    cartItemsContainer.innerHTML = "";

    if (cart.length === 0) {
        cartItemsContainer.innerHTML = `
            <div class="empty-cart">
                <h2>Your Cart is Empty!</h2>
                <p>You haven't added any products yet.</p>
                <a href="index.html#products" class="continue-btn">
                    Start Shopping
                </a>
            </div>
        `;

        updateSummary();
        updateCartCount();
        return;
    }

    cart.forEach((item, index) => {
        const cartItem = document.createElement("div");

        cartItem.className = "cart-item";

        cartItem.innerHTML = `
            <div style="display:flex; align-items:center; gap:18px;">

                <img
                    src="${item.image}"
                    alt="${item.name}"
                    style="width:100px;height:100px;object-fit:cover;border-radius:10px;"
                >

                <div class="cart-item-info">

                    <h3>${item.name}</h3>

                    <p>${formatPrice(item.price)} each</p>

                    <div class="quantity-controls">

                        <button
                            type="button"
                            class="decrease-btn"
                            data-index="${index}">
                            −
                        </button>

                        <span>${item.quantity}</span>

                        <button
                            type="button"
                            class="increase-btn"
                            data-index="${index}">
                            +
                        </button>

                    </div>

                </div>

            </div>

            <div class="cart-item-actions">

                <h3>
                    ${formatPrice(item.price * item.quantity)}
                </h3>

                <button
                    type="button"
                    class="remove-btn"
                    data-index="${index}">
                    Remove
                </button>

            </div>
        `;

        cartItemsContainer.appendChild(cartItem);
    });

    updateSummary();
    updateCartCount();
}

// ========================================
// CART BUTTON ACTIONS
// ========================================

cartItemsContainer.addEventListener("click", async function(event) {

    const index = Number(event.target.dataset.index);

    if (!Number.isInteger(index) || !cart[index]) return;

    if (event.target.classList.contains("increase-btn")) {

        try {
            const response = await fetch(
                `/api/products/${cart[index].id}`
            );

            const data = await response.json();

            if (!response.ok || !data.success) {
                alert("Unable to check product stock.");
                return;
            }

            if (cart[index].quantity >= data.product.stock) {
                alert("Sorry! Maximum available stock reached.");
                return;
            }

            cart[index].quantity++;

        } catch (error) {
            alert("Unable to check stock. Please try again.");
            return;
        }

    } else if (event.target.classList.contains("decrease-btn")) {

        cart[index].quantity--;

        if (cart[index].quantity <= 0) {
            cart.splice(index, 1);
        }

    } else if (event.target.classList.contains("remove-btn")) {

        cart.splice(index, 1);

    } else {
        return;
    }

    saveCart();
    displayCart();

});

// ========================================
// CHECKOUT
// ========================================

if (checkoutBtn) {

    checkoutBtn.addEventListener("click", function() {

        if (cart.length === 0) {

            Swal.fire({
                title: "Your Cart is Empty!",
                text: "Please add products before checkout.",
                icon: "warning",
                confirmButtonColor: "#e87932"
            });

        } else {

            window.location.href = "checkout.html";

        }

    });

}

// ========================================
// INITIALIZE CART
// ========================================

saveCart();
displayCart();

console.log("NovaStore Cart Loaded Successfully!");
