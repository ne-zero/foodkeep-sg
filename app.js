// Main FoodKeep SG application setup and SPA navigation.
function showPage(pageName){
    appState.currentPage=pageName;
    document.querySelectorAll(".page").forEach((page)=>{page.classList.add("hidden");page.classList.remove("page-enter");});
    const next=getElement(`${pageName}Page`); if(!next){console.error(`Page not found: ${pageName}`);return;}
    next.classList.remove("hidden"); window.requestAnimationFrame(()=>next.classList.add("page-enter"));
    document.querySelectorAll(".nav-btn").forEach((button)=>button.classList.toggle("active",button.dataset.page===pageName));
    if(pageName==="dashboard")renderDashboard(); if(pageName==="pantry")renderPantry(); if(pageName==="profile")renderProfile();
    window.scrollTo({top:0,behavior:"smooth"});
}
function initialiseNavigation(){
    document.querySelectorAll("[data-page]").forEach((button)=>button.addEventListener("click",()=>showPage(button.dataset.page)));
    document.querySelectorAll("[data-go]").forEach((button)=>button.addEventListener("click",()=>showPage(button.dataset.go)));
}
async function initialiseAppView(){
    const completed=await handleCognitoCallback();
    if(completed||isAuthenticated()){
        const token=getIdToken(); if(!getCurrentUser()&&token){const claims=decodeJwtPayload(token);saveCurrentUser({id:claims?.sub||"",name:claims?.name||claims?.email||"FoodKeep User",email:claims?.email||""});}
        showApplication(); return;
    }
    removeCurrentUser(); showAuthentication();
}
document.addEventListener("DOMContentLoaded",async()=>{initialiseAuthentication();initialiseNavigation();initialiseScanner();initialisePantry();initialiseProfile();await initialiseAppView();});
