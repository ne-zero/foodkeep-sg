// Cognito profile display. SES/SNS/EventBridge are backend services.
async function renderProfile(){
    const user=getCurrentUser(); if(!user)return; updateAccountDisplay(user);
    try{const items=await getPantryItems();if(getElement("profileItemCount"))getElement("profileItemCount").textContent=`${items.length} tracked`;}catch(error){console.error(error);}
    if(getElement("profileNotifyStatus"))getElement("profileNotifyStatus").textContent="Expiry email + SMS reminders are handled by AWS SES, SNS and EventBridge.";
    ["sesForm","snsForm","alertForm"].forEach((id)=>getElement(id)?.classList.add("hidden"));
}
function handleProfileUpdate(event){
    event.preventDefault(); const name=getElement("profileNameInput")?.value.trim();
    if(!name||name.length<2)return setError("profileNameError","Enter your full name.");
    const user={...getCurrentUser(),name}; saveCurrentUser(user); updateAccountDisplay(user); showToast("Display name updated for this session.");
}
function initialiseProfile(){
    getElement("profileForm")?.addEventListener("submit",handleProfileUpdate); getElement("logoutBtn")?.addEventListener("click",signOut);
    ["restoreBtn","clearBtn"].forEach((id)=>getElement(id)?.classList.add("hidden"));
}
