document.addEventListener("DOMContentLoaded", loadAuthStatus);

async function loadAuthStatus() {
    const navList = document.querySelector("nav ul");
    const statusItem = document.createElement(navList ? "li" : "div");
    statusItem.className = "auth-status";

    if (navList) {
        navList.append(statusItem);
    } else {
        statusItem.classList.add("auth-status-header");
        const header = document.querySelector("header");
        if (!header) return;
        header.append(statusItem);
    }

    try {
        const response = await fetch("../php/auth-status.php", {
            credentials: "same-origin",
            headers: { Accept: "application/json" }
        });
        if (!response.ok) throw new Error(`Sign-in status request failed (${response.status}).`);

        const status = await response.json();
        statusItem.replaceChildren();

        const message = document.createElement("span");
        if (status.logged_in && typeof status.username === "string") {
            message.textContent = `Logged in as ${status.username}`;
            const form = document.createElement("form");
            form.action = "../php/logout.php";
            form.method = "post";
            const logout = document.createElement("button");
            logout.type = "submit";
            logout.textContent = "Log out";
            form.append(logout);
            statusItem.append(message, form);
            statusItem.classList.add("is-logged-in");
        } else {
            message.textContent = "Not signed in";
            statusItem.append(message);
            statusItem.classList.add("is-logged-out");
        }
    } catch (error) {
        console.error("Could not check sign-in status.", error);
        statusItem.textContent = "Sign-in status unavailable";
        statusItem.classList.add("status-error");
    }
}
