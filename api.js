// Real Part 2 API layer. No mock branches and no userId=DEMO.

function getAuthHeaders(includeJson = true) {
    const token = getIdToken();
    if (!token || tokenIsExpired(token)) {
        throw new Error("Your session has expired. Please sign in again.");
    }
    const headers = { Authorization: `Bearer ${token}` };
    if (includeJson) headers["Content-Type"] = "application/json";
    return headers;
}

async function parseApiResponse(response, fallbackMessage) {
    let result = null;
    try { result = await response.json(); } catch {}
    if (!response.ok) {
        if (response.status === 401) removeCurrentUser();
        throw new Error(result?.message || result?.error || fallbackMessage);
    }
    return result;
}

async function getPantryItems() {
    const response = await fetch(`${APP_CONFIG.API_BASE_URL}/items`, {
        method: "GET", headers: getAuthHeaders(false)
    });
    const result = await parseApiResponse(response, "Unable to load pantry items.");
    return Array.isArray(result) ? result.map(normalisePantryItem) : [];
}

async function createPantryItem(itemData) {
    const item = {
        ...itemData,
        itemId: itemData.itemId || itemData.id || createItemId(),
        createdAt: itemData.createdAt || new Date().toISOString(),
        consumed: itemData.consumed ?? false
    };
    delete item.imageData; delete item.id; delete item.userId;
    const response = await fetch(`${APP_CONFIG.API_BASE_URL}/items`, {
        method: "POST", headers: getAuthHeaders(), body: JSON.stringify(item)
    });
    const result = await parseApiResponse(response, "Unable to save the pantry item.");
    return normalisePantryItem(result.item || item);
}

async function updatePantryItem(itemId, updates) {
    const clean = {...updates};
    delete clean.userId; delete clean.itemId; delete clean.id; delete clean.imageData;
    const response = await fetch(`${APP_CONFIG.API_BASE_URL}/items/${encodeURIComponent(itemId)}`, {
        method: "PUT", headers: getAuthHeaders(), body: JSON.stringify(clean)
    });
    const result = await parseApiResponse(response, "Unable to update the pantry item.");
    return normalisePantryItem(result.item || {itemId, ...clean});
}

async function deletePantryItem(itemId) {
    const response = await fetch(`${APP_CONFIG.API_BASE_URL}/items/${encodeURIComponent(itemId)}`, {
        method: "DELETE", headers: getAuthHeaders(false)
    });
    return parseApiResponse(response, "Unable to delete the pantry item.");
}

async function analyseFoodImage(imageData) {
    const response = await fetch(`${APP_CONFIG.API_BASE_URL}/analyse`, {
        method: "POST", headers: getAuthHeaders(), body: JSON.stringify({imageData})
    });
    return parseApiResponse(response, "Unable to analyse the image.");
}

async function generateRecipeSuggestion(items) {
    const response = await fetch(`${APP_CONFIG.API_BASE_URL}/recipe`, {
        method: "POST", headers: getAuthHeaders(), body: JSON.stringify({items})
    });
    return parseApiResponse(response, "Unable to generate a recipe.");
}

// Browser speech is an accessibility feature, not presented as Amazon Polly.
async function synthesizeSpeech(text) {
    if (!("speechSynthesis" in window)) throw new Error("Speech playback is not supported.");
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    window.speechSynthesis.speak(utterance);
}
