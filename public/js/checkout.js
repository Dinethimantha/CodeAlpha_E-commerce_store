
// ========================================
// NOVASTORE - CHECKOUT
// JWT Authentication + MongoDB Orders
// ========================================

const checkoutForm = document.getElementById("checkoutForm");

const checkoutItems = document.getElementById("checkoutItems");
const checkoutSubtotal = document.getElementById("checkoutSubtotal");
const checkoutDelivery = document.getElementById("checkoutDelivery");
const checkoutTotal = document.getElementById("checkoutTotal");

let cart = JSON.parse(localStorage.getItem("novaStoreCart")) || [];

// ========================================
// CHECK LOGIN STATUS
// ========================================

const token = localStorage.getItem("novaStoreToken");

if (!token) {

    alert("Please login before placing an order.");

    window.location.href = "login.html";

}

// ========================================
// DISPLAY CHECKOUT SUMMARY
// ========================================

function displayCheckoutSummary() {

    if (!checkoutItems) return;

    if (cart.length === 0) {

        checkoutItems.innerHTML = "<p>Your cart is empty.</p>";

        if (checkoutForm) {
            checkoutForm.style.display = "none";
        }

        return;
    }

    let subtotal = 0;

    checkoutItems.innerHTML = "";

    cart.forEach(item => {

        const itemTotal = Number(item.price) * Number(item.quantity);

        subtotal += itemTotal;

        const itemElement = document.createElement("div");

        itemElement.className = "checkout-item";

        itemElement.innerHTML = `
            <p>
                ${item.name} × ${item.quantity}
                <strong>Rs. ${itemTotal.toLocaleString("en-US")}</strong>
            </p>
        `;

        checkoutItems.appendChild(itemElement);

    });

    const delivery = subtotal >= 10000 ? 0 : 500;
    const total = subtotal + delivery;

    checkoutSubtotal.textContent =
        "Rs. " + subtotal.toLocaleString("en-US");

    checkoutDelivery.textContent =
        delivery === 0 ? "FREE" : "Rs. " + delivery.toLocaleString("en-US");

    checkoutTotal.textContent =
        "Rs. " + total.toLocaleString("en-US");

}

// ========================================
// PLACE ORDER
// ========================================

if (checkoutForm) {

    checkoutForm.addEventListener("submit", async function(event) {

        event.preventDefault();

        // Check authentication again
        const currentToken = localStorage.getItem("novaStoreToken");

        if (!currentToken) {

            alert("Please login before placing an order.");

            window.location.href = "login.html";

            return;
        }

        if (cart.length === 0) {

            alert("Your cart is empty!");

            return;
        }

        const customerName =
            document.getElementById("customerName").value.trim();

        const email =
            document.getElementById("email").value.trim();

        const phone =
            document.getElementById("phone").value.trim();

        const address =
            document.getElementById("address").value.trim();

        const paymentMethod =
            document.getElementById("payment").value;

        const orderData = {

            customerName,
            email,
            phone,
            address,
            paymentMethod,

            items: cart.map(item => ({

                productId: item.id,
                quantity: Number(item.quantity)

            }))

        };

        const submitButton =
            checkoutForm.querySelector('button[type="submit"]');

        if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = "Placing Order...";
        }

        try {

            const response = await fetch("/api/orders", {

                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${currentToken}`
                },

                body: JSON.stringify(orderData)

            });

            const data = await response.json();

            if (response.status === 401) {

                localStorage.removeItem("novaStoreToken");
                localStorage.removeItem("novaStoreUser");

                alert("Your login session has expired. Please login again.");

                window.location.href = "login.html";

                return;
            }

            if (!response.ok || !data.success) {

                throw new Error(data.message || "Unable to place order.");

            }

            // Clear cart after successful order
            localStorage.removeItem("novaStoreCart");

            cart = [];

            alert(
                "Order placed successfully!\n\n" +
                "Order ID: " + data.order._id +
                "\nTotal: Rs. " +
                Number(data.order.total).toLocaleString("en-US")
            );

            window.location.href = "orders.html";

        } catch (error) {

            console.error("Checkout Error:", error);

            alert(error.message);

            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = "Place Order";
            }

        }

    });

}

// ========================================
// INITIALIZE CHECKOUT
// ========================================

displayCheckoutSummary();

