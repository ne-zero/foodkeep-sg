// Shared FoodKeep SG helpers and application state.

const STORAGE_KEYS = {
    currentUser: "foodkeep_current_user",
    idToken: "foodkeep_id_token",
    accessToken: "foodkeep_access_token",
    pkceVerifier: "foodkeep_pkce_verifier",
    authReturnPage: "foodkeep_auth_return_page"
};

const appState = {
    currentPage: "dashboard",
    selectedFile: null,
    selectedImageData: "",
    pendingStatusFilter: null
};

function getElement(id) {
    return document.getElementById(id);
}

function createItemId() {
    const timestamp = Date.now().toString(36).toUpperCase();
    const randomPart = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `FOOD-${timestamp}-${randomPart}`;
}

function formatDate(dateValue) {
    if (!dateValue) return "Not set";
    return new Date(`${dateValue}T12:00:00`).toLocaleDateString("en-SG", {
        day: "2-digit", month: "short", year: "numeric"
    }).toUpperCase();
}

function getDaysUntilExpiry(expiryDate) {
    if (!expiryDate) return 9999;
    const today = new Date();
    const expiry = new Date(`${expiryDate}T12:00:00`);
    today.setHours(12, 0, 0, 0);
    return Math.round((expiry - today) / 86400000);
}

function getItemStatus(item) {
    if (item.consumed) return "Consumed";
    const days = getDaysUntilExpiry(item.expiry);
    if (days < 0) return "Expired";
    if (days === 0) return "Expires Today";
    if (days <= 3) return "Use Soon";
    return "Safe";
}

function getStatusClass(status) {
    if (status === "Safe") return "safe";
    if (status === "Consumed") return "consumed";
    if (status === "Expired") return "expired";
    return "soon";
}

function getExpiryMessage(item) {
    if (item.consumed) return "Marked as consumed";
    const days = getDaysUntilExpiry(item.expiry);
    if (days < 0) {
        const count = Math.abs(days);
        return `Expired ${count} day${count === 1 ? "" : "s"} ago`;
    }
    if (days === 0) return "Expires today";
    if (days === 1) return "Expires tomorrow";
    return `Expires in ${days} days`;
}

function getInitials(name = "FoodKeep User") {
    return name.split(/\s+/).filter(Boolean).slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase()).join("") || "FK";
}

function escapeHtml(value = "") {
    const replacements = {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"};
    return String(value).replace(/[&<>"']/g, (c) => replacements[c]);
}

function showToast(message, type = "") {
    const toast = getElement("toast");
    if (!toast) { console.log(message); return; }
    toast.textContent = message;
    toast.className = `toast ${type}`.trim();
    toast.classList.remove("hidden");
    window.setTimeout(() => toast.classList.add("hidden"), 3200);
}

function setError(id, message = "") {
    const element = getElement(id);
    if (element) element.textContent = message;
}

function clearErrors(ids) {
    ids.forEach((id) => setError(id, ""));
}

function parseExpiryDate(text) {
    const cleaned = String(text).toUpperCase()
        .replace(/BEST BEFORE|USE BY|EXPIRY|EXP/g, "").trim();
    const numeric = cleaned.match(/\b(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})\b/);
    if (!numeric) return "";
    let [, day, month, year] = numeric;
    day = day.padStart(2, "0");
    month = month.padStart(2, "0");
    year = year.length === 2 ? `20${year}` : year;
    return `${year}-${month}-${day}`;
}

function extractExpiryDate(lines = []) {
    const line = lines.find((value) => /BEST BEFORE|USE BY|EXPIRY|EXP/i.test(String(value)));
    return line ? parseExpiryDate(line) : "";
}

function normalisePantryItem(item) {
    return {
        ...item,
        id: item.itemId || item.id,
        itemId: item.itemId || item.id,
        quantity: Number(item.quantity ?? 1),
        detectedText: Array.isArray(item.detectedText) ? item.detectedText : [],
        consumed: Boolean(item.consumed),
        createdAt: item.createdAt || new Date().toISOString()
    };
}

function saveCurrentUser(user) {
    sessionStorage.setItem(STORAGE_KEYS.currentUser, JSON.stringify(user));
}
function getCurrentUser() {
    try { const v=sessionStorage.getItem(STORAGE_KEYS.currentUser); return v ? JSON.parse(v) : null; }
    catch { return null; }
}
function getIdToken() { return sessionStorage.getItem(STORAGE_KEYS.idToken) || ""; }
function getAccessToken() { return sessionStorage.getItem(STORAGE_KEYS.accessToken) || ""; }
function removeCurrentUser() {
    sessionStorage.removeItem(STORAGE_KEYS.currentUser);
    sessionStorage.removeItem(STORAGE_KEYS.idToken);
    sessionStorage.removeItem(STORAGE_KEYS.accessToken);
}

function decodeJwtPayload(token) {
    try {
        const payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
        return JSON.parse(decodeURIComponent(atob(payload).split("").map((c) =>
            `%${("00" + c.charCodeAt(0).toString(16)).slice(-2)}`).join("")));
    } catch { return null; }
}
function tokenIsExpired(token) {
    const payload = decodeJwtPayload(token);
    return !payload?.exp || Date.now() >= payload.exp * 1000;
}

function showConfirmationModal(title, message) {
    const modal = getElement("modal");
    if (!modal) return Promise.resolve(window.confirm(message));
    return new Promise((resolve) => {
        const confirmButton = getElement("modalConfirm");
        const cancelButton = getElement("modalCancel");
        getElement("modalTitle").textContent = title;
        getElement("modalMessage").textContent = message;
        modal.classList.remove("hidden");
        function finish(result) {
            modal.classList.add("hidden");
            confirmButton.removeEventListener("click", confirm);
            cancelButton.removeEventListener("click", cancel);
            resolve(result);
        }
        function confirm(){ finish(true); }
        function cancel(){ finish(false); }
        confirmButton.addEventListener("click", confirm);
        cancelButton.addEventListener("click", cancel);
    });
}
