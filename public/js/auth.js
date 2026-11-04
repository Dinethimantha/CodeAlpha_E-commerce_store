
let isRegisterMode = false;

const authForm = document.getElementById("authForm");
const nameInput = document.getElementById("name");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");

const formTitle = document.getElementById("formTitle");
const formDescription = document.getElementById("formDescription");
const submitBtn = document.getElementById("submitBtn");
const switchText = document.getElementById("switchText");
const switchLink = document.getElementById("switchLink");

// ========================================
// SWITCH LOGIN / REGISTER MODE
// ========================================

switchLink.addEventListener("click", function (e) {
    e.preventDefault();

    isRegisterMode = !isRegisterMode;

    if (isRegisterMode) {
        formTitle.textContent = "Create Account";
        formDescription.textContent = "Join NovaStore today!";
        submitBtn.textContent = "Register";

        nameInput.style.display = "block";
        nameInput.required = true;

        switchText.textContent = "Already have an account?";
        switchLink.textContent = "Login";

    } else {
        formTitle.textContent = "Welcome Back!";
        formDescription.textContent = "Login to your NovaStore account";
        submitBtn.textContent = "Login";

        nameInput.style.display = "none";
        nameInput.required = false;
        nameInput.value = "";

        switchText.textContent = "Don't have an account?";
        switchLink.textContent = "Register";
    }
});

// ========================================
// LOGIN / REGISTER FORM SUBMISSION
// ========================================

authForm.addEventListener("submit", async function (e) {

    e.preventDefault();

    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    const endpoint = isRegisterMode
        ? "/api/auth/register"
        : "/api/auth/login";

    const userData = isRegisterMode
        ? { name, email, password }
        : { email, password };

    submitBtn.disabled = true;
    submitBtn.textContent = "Please wait...";

    try {

        const response = await fetch(endpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(userData)
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || "Something went wrong.");
        }

        // REGISTER SUCCESS
        if (isRegisterMode) {

            await Swal.fire({
                icon: "success",
                title: "Account Created!",
                text: "Your account has been created successfully. Please login."
            });

            authForm.reset();

            isRegisterMode = true;
            switchLink.click();

        }

        // LOGIN SUCCESS
        else {

            localStorage.setItem("novaStoreToken", data.token);

            localStorage.setItem(
                "novaStoreUser",
                JSON.stringify(data.user)
            );

            await Swal.fire({
                icon: "success",
                title: "Login Successful!",
                text: `Welcome back, ${data.user.name}!`,
                timer: 1800,
                showConfirmButton: false
            });

            window.location.href = "index.html";
        }

    } catch (error) {

        Swal.fire({
            icon: "error",
            title: "Authentication Failed",
            text: error.message
        });

    } finally {

        submitBtn.disabled = false;
        submitBtn.textContent = isRegisterMode ? "Register" : "Login";

    }

});
