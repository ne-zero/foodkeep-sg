// Amazon Cognito SPA authentication using Authorization Code + PKCE.

function showApplication() {
    const user = getCurrentUser();
    if (!user) return showAuthentication();
    getElement("authView")?.classList.add("hidden");
    getElement("appView")?.classList.remove("hidden");
    updateAccountDisplay(user);
    showPage("dashboard");
}
function showAuthentication() {
    getElement("appView")?.classList.add("hidden");
    getElement("authView")?.classList.remove("hidden");
}
function updateAccountDisplay(user) {
    if (!user) return;
    const name = user.name || user.email || "FoodKeep User";
    const initials = getInitials(name);
    if (getElement("headerAvatar")) getElement("headerAvatar").textContent = initials;
    if (getElement("profileAvatar")) getElement("profileAvatar").textContent = initials;
    if (getElement("profileName")) getElement("profileName").textContent = name;
    if (getElement("profileEmail")) getElement("profileEmail").textContent = user.email || "";
    if (getElement("profileNameInput")) getElement("profileNameInput").value = name;
    if (getElement("profileEmailInput")) getElement("profileEmailInput").value = user.email || "";
}

function randomPkceString(length=64) {
    const chars="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
    const values=new Uint32Array(length); crypto.getRandomValues(values);
    return Array.from(values).map((v)=>chars[v%chars.length]).join("");
}
function base64UrlEncode(buffer) {
    const bytes=new Uint8Array(buffer); let binary="";
    bytes.forEach((b)=>binary+=String.fromCharCode(b));
    return btoa(binary).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
}
async function createPkceChallenge(verifier) {
    const digest=await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
    return base64UrlEncode(digest);
}

async function startCognitoLogin(mode="login") {
    const verifier=randomPkceString();
    const challenge=await createPkceChallenge(verifier);
    sessionStorage.setItem(STORAGE_KEYS.pkceVerifier, verifier);
    const endpoint = mode === "signup" ? `${APP_CONFIG.COGNITO_DOMAIN}/signup` : `${APP_CONFIG.COGNITO_DOMAIN}/login`;
    const params=new URLSearchParams({
        client_id:APP_CONFIG.COGNITO_CLIENT_ID,
        response_type:"code",
        scope:"openid email profile",
        redirect_uri:APP_CONFIG.COGNITO_REDIRECT_URI,
        code_challenge:challenge,
        code_challenge_method:"S256"
    });
    window.location.assign(`${endpoint}?${params.toString()}`);
}

async function exchangeAuthorizationCode(code) {
    const verifier=sessionStorage.getItem(STORAGE_KEYS.pkceVerifier);
    if (!verifier) throw new Error("Sign-in session missing. Please sign in again.");
    const response=await fetch(`${APP_CONFIG.COGNITO_DOMAIN}/oauth2/token`, {
        method:"POST",
        headers:{"Content-Type":"application/x-www-form-urlencoded"},
        body:new URLSearchParams({
            grant_type:"authorization_code",
            client_id:APP_CONFIG.COGNITO_CLIENT_ID,
            code,
            redirect_uri:APP_CONFIG.COGNITO_REDIRECT_URI,
            code_verifier:verifier
        })
    });
    const result=await response.json();
    if (!response.ok) throw new Error(result.error_description || result.error || "Unable to complete sign in.");
    sessionStorage.setItem(STORAGE_KEYS.idToken,result.id_token);
    sessionStorage.setItem(STORAGE_KEYS.accessToken,result.access_token);
    sessionStorage.removeItem(STORAGE_KEYS.pkceVerifier);
    const claims=decodeJwtPayload(result.id_token);
    const user={
        id:claims?.sub || "",
        name:claims?.name || claims?.["cognito:username"] || claims?.email || "FoodKeep User",
        email:claims?.email || ""
    };
    saveCurrentUser(user);
    return user;
}

async function handleCognitoCallback() {
    const params=new URLSearchParams(window.location.search);
    if (params.get("error")) {
        showToast(params.get("error_description") || "Cognito sign in failed.","error");
        window.history.replaceState({},document.title,window.location.pathname);
        return false;
    }
    const code=params.get("code");
    if (!code) return false;
    try {
        await exchangeAuthorizationCode(code);
        window.history.replaceState({},document.title,window.location.pathname);
        showToast("Signed in successfully.");
        return true;
    } catch(error) {
        console.error(error); showToast(error.message,"error"); return false;
    }
}
function isAuthenticated() { const token=getIdToken(); return Boolean(token) && !tokenIsExpired(token); }
function signOut() {
    removeCurrentUser();
    const params=new URLSearchParams({client_id:APP_CONFIG.COGNITO_CLIENT_ID,logout_uri:APP_CONFIG.COGNITO_LOGOUT_URI});
    window.location.assign(`${APP_CONFIG.COGNITO_DOMAIN}/logout?${params.toString()}`);
}

async function handleLogin(event){ event.preventDefault(); await startCognitoLogin("login"); }
async function handleRegistration(event){ event.preventDefault(); await startCognitoLogin("signup"); }
function showRegisterForm(){
    getElement("loginForm")?.classList.add("hidden"); getElement("registerForm")?.classList.remove("hidden");
    if(getElement("authTitle")) getElement("authTitle").textContent="Create your FoodKeep account";
    if(getElement("authSubtitle")) getElement("authSubtitle").textContent="Registration is secured by Amazon Cognito.";
}
function showLoginForm(){
    getElement("registerForm")?.classList.add("hidden"); getElement("loginForm")?.classList.remove("hidden");
    if(getElement("authTitle")) getElement("authTitle").textContent="Sign in to your pantry";
    if(getElement("authSubtitle")) getElement("authSubtitle").textContent="Authentication is secured by Amazon Cognito.";
}
function initialiseAuthentication(){
    getElement("showRegister")?.addEventListener("click",showRegisterForm);
    getElement("showLogin")?.addEventListener("click",showLoginForm);
    getElement("loginForm")?.addEventListener("submit",handleLogin);
    getElement("registerForm")?.addEventListener("submit",handleRegistration);
    getElement("demoLoginBtn")?.classList.add("hidden");
}
