// Dashboard, pantry rendering, filtering and real DynamoDB CRUD actions.
let pantryItemsCache=[];

async function renderDashboard(){
    try{
        const user=getCurrentUser()||{name:"FoodKeep User"}; const items=await getPantryItems(); pantryItemsCache=items;
        const active=items.filter((i)=>!i.consumed);
        if(getElement("welcomeText"))getElement("welcomeText").textContent=`Welcome back, ${String(user.name).split(" ")[0]}`;
        if(getElement("statTotal"))getElement("statTotal").textContent=active.length;
        if(getElement("statSoon"))getElement("statSoon").textContent=items.filter((i)=>["Use Soon","Expires Today"].includes(getItemStatus(i))).length;
        if(getElement("statExpired"))getElement("statExpired").textContent=items.filter((i)=>getItemStatus(i)==="Expired").length;
        if(getElement("statConsumed"))getElement("statConsumed").textContent=items.filter((i)=>getItemStatus(i)==="Consumed").length;
        const list=getElement("attentionList"); if(!list)return;
        const urgent=items.filter((i)=>!i.consumed&&getDaysUntilExpiry(i.expiry)<=3).sort((a,b)=>new Date(a.expiry)-new Date(b.expiry)).slice(0,5);
        list.innerHTML=urgent.length?urgent.map((i)=>`<div class="attention-item"><div><h3>${escapeHtml(i.name)}</h3><p>${escapeHtml(i.storage||"Pantry")} · ${getExpiryMessage(i)}</p></div><span class="status ${getStatusClass(getItemStatus(i))}">${getItemStatus(i)}</span></div>`).join(""):'<p class="muted">Nothing urgent today.</p>';
    }catch(error){console.error(error);showToast(error.message||"Unable to load dashboard.","error");}
}

async function renderPantry(){
    try{
        pantryItemsCache=await getPantryItems();
        const filter=getElement("categoryFilter");
        if(filter){const categories=[...new Set(pantryItemsCache.map((i)=>i.category).filter(Boolean))].sort();filter.innerHTML='<option value="all">All categories</option>'+categories.map((c)=>`<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("");}
        applyPantryFilters();
    }catch(error){console.error(error);showToast(error.message||"Unable to load pantry.","error");}
}

function applyPantryFilters(){
    const search=getElement("searchInput")?.value.trim().toLowerCase()||"";
    const status=getElement("statusFilter")?.value||"all"; const category=getElement("categoryFilter")?.value||"all"; const sort=getElement("sortFilter")?.value||"expiry";
    let items=pantryItemsCache.filter((i)=>String(i.name||"").toLowerCase().includes(search)&&(status==="all"||getItemStatus(i)===status)&&(category==="all"||i.category===category));
    if(sort==="expiry")items.sort((a,b)=>new Date(a.expiry)-new Date(b.expiry));
    if(sort==="name")items.sort((a,b)=>String(a.name).localeCompare(String(b.name)));
    if(sort==="newest")items.sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
    if(getElement("resultCount"))getElement("resultCount").textContent=`${items.length} item${items.length===1?"":"s"}`;
    getElement("emptyState")?.classList.toggle("hidden",items.length>0);
    const grid=getElement("pantryGrid"); if(!grid)return;
    grid.innerHTML=items.map((i)=>{const s=getItemStatus(i);return `<article class="food-card" data-item-id="${escapeHtml(i.id)}"><div class="food-visual">${i.emoji||"🥫"}</div><div class="food-body"><div class="panel-head"><div><h3>${escapeHtml(i.name)}</h3><p>${escapeHtml(i.category||"Other")} · Qty ${i.quantity}</p></div><span class="status ${getStatusClass(s)}">${s}</span></div><div class="food-meta"><div><small>Expiry</small><strong>${formatDate(i.expiry)}</strong></div><div><small>Storage</small><strong>${escapeHtml(i.storage||"Pantry")}</strong></div></div><div class="card-actions"><button class="btn ghost icon-btn" data-action="listen" type="button">Listen</button><button class="btn secondary" data-action="edit" type="button">Edit</button><button class="btn ${i.consumed?"secondary":"primary"}" data-action="toggle-consumed" type="button">${i.consumed?"Restore":"Consumed"}</button><button class="btn danger-soft" data-action="delete" type="button">Delete</button></div></div></article>`;}).join("");
}

async function editPantryItem(itemId){
    const item=pantryItemsCache.find((i)=>i.id===itemId); if(!item)return;
    const modal=getElement("editItemModal");
    if(modal&&getElement("editItemForm")){
        getElement("editItemForm").dataset.itemId=itemId;
        if(getElement("editItemName"))getElement("editItemName").value=item.name||"";
        if(getElement("editItemCategory"))getElement("editItemCategory").value=item.category||"Other";
        if(getElement("editItemExpiry"))getElement("editItemExpiry").value=item.expiry||"";
        if(getElement("editItemQuantity"))getElement("editItemQuantity").value=item.quantity||1;
        if(getElement("editItemStorage"))getElement("editItemStorage").value=item.storage||"Pantry";
        if(getElement("editItemNotes"))getElement("editItemNotes").value=item.notes||"";
        modal.classList.remove("hidden"); return;
    }
    const name=window.prompt("Product name:",item.name); if(name===null)return;
    const expiry=window.prompt("Expiry date (YYYY-MM-DD):",item.expiry); if(expiry===null)return;
    await updatePantryItem(itemId,{name:name.trim(),expiry}); await renderPantry(); await renderDashboard(); showToast("Pantry item updated.");
}
async function handleEditModalSubmit(event){
    event.preventDefault(); const id=event.currentTarget.dataset.itemId; if(!id)return;
    try{await updatePantryItem(id,{name:getElement("editItemName")?.value.trim(),category:getElement("editItemCategory")?.value,expiry:getElement("editItemExpiry")?.value,quantity:Number(getElement("editItemQuantity")?.value||1),storage:getElement("editItemStorage")?.value,notes:getElement("editItemNotes")?.value.trim()});getElement("editItemModal")?.classList.add("hidden");await renderPantry();await renderDashboard();showToast("Pantry item updated.");}
    catch(error){console.error(error);showToast(error.message||"Unable to update pantry item.","error");}
}
async function toggleConsumedStatus(id){const item=pantryItemsCache.find((i)=>i.id===id);if(!item)return;await updatePantryItem(id,{consumed:!item.consumed});await renderPantry();await renderDashboard();showToast(item.consumed?"Returned to active pantry.":"Marked as consumed.");}
async function removePantryItem(id){const item=pantryItemsCache.find((i)=>i.id===id);if(!item)return;if(!await showConfirmationModal("Delete pantry item?",`Remove ${item.name} from your pantry?`))return;await deletePantryItem(id);await renderPantry();await renderDashboard();showToast("Item deleted.");}
async function playItemAudio(id){const item=pantryItemsCache.find((i)=>i.id===id);if(item)await synthesizeSpeech(item.consumed?`${item.name}, already consumed.`:`${item.name}. ${getExpiryMessage(item)}.`);}
function handlePantryCardClick(event){const button=event.target.closest("[data-action]");if(!button)return;const card=button.closest("[data-item-id]");if(!card)return;const id=card.dataset.itemId,action=button.dataset.action;if(action==="listen")playItemAudio(id);if(action==="edit")editPantryItem(id);if(action==="toggle-consumed")toggleConsumedStatus(id);if(action==="delete")removePantryItem(id);}
function initialisePantry(){
    ["searchInput","statusFilter","categoryFilter","sortFilter"].forEach((id)=>{getElement(id)?.addEventListener("input",applyPantryFilters);getElement(id)?.addEventListener("change",applyPantryFilters);});
    getElement("pantryGrid")?.addEventListener("click",handlePantryCardClick); getElement("editItemForm")?.addEventListener("submit",handleEditModalSubmit);
    ["editModalCancel","editModalCancelBottom"].forEach((id)=>getElement(id)?.addEventListener("click",()=>getElement("editItemModal")?.classList.add("hidden")));
}
