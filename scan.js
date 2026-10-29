// Real single-item scan flow: frontend -> /analyse -> Rekognition Lambda.

const MAX_IMAGE_SIZE=2*1024*1024;
const ALLOWED_IMAGE_TYPES=["image/jpeg","image/png"];

function setScanStep(activeStep){
    const ids=["scanStepMode","scanStepUpload","scanStepReview","scanStepConfirm","scanStepSave"];
    ids.forEach((id,index)=>{ const step=getElement(id); if(!step)return; const n=index+1; step.classList.toggle("active",n===activeStep); step.classList.toggle("complete",n<activeStep); });
}
function createImageThumbnail(source){
    return new Promise((resolve)=>{ const image=new Image(); image.onload=()=>{
        const max=720, scale=Math.min(1,max/Math.max(image.width,image.height));
        const canvas=document.createElement("canvas"), ctx=canvas.getContext("2d");
        canvas.width=Math.round(image.width*scale); canvas.height=Math.round(image.height*scale);
        ctx.fillStyle="#fff"; ctx.fillRect(0,0,canvas.width,canvas.height); ctx.drawImage(image,0,0,canvas.width,canvas.height);
        resolve(canvas.toDataURL("image/jpeg",0.76));
    }; image.onerror=()=>resolve(""); image.src=source; });
}
function handleSelectedImage(file){
    setError("uploadError","");
    if(!ALLOWED_IMAGE_TYPES.includes(file.type)) return setError("uploadError","Use a JPG or PNG image.");
    if(file.size>MAX_IMAGE_SIZE) return setError("uploadError","Image must be 2 MB or smaller.");
    const reader=new FileReader();
    reader.onload=async()=>{
        appState.selectedFile=file; appState.selectedImageData=await createImageThumbnail(reader.result);
        const preview=getElement("imagePreview"); if(preview){preview.src=reader.result; preview.classList.remove("hidden");}
        getElement("imageStage")?.classList.remove("hidden"); getElement("uploadPrompt")?.classList.add("hidden");
        getElement("removeImageBtn")?.classList.remove("hidden"); if(getElement("analyseBtn"))getElement("analyseBtn").disabled=false; setScanStep(3);
    };
    reader.readAsDataURL(file);
}
function resetScanForm(){
    appState.selectedFile=null; appState.selectedImageData="";
    if(getElement("imageInput"))getElement("imageInput").value="";
    if(getElement("imagePreview")){getElement("imagePreview").src="";getElement("imagePreview").classList.add("hidden");}
    getElement("imageStage")?.classList.add("hidden"); getElement("uploadPrompt")?.classList.remove("hidden"); getElement("removeImageBtn")?.classList.add("hidden");
    if(getElement("analyseBtn"))getElement("analyseBtn").disabled=true; getElement("analysisPanel")?.classList.add("hidden"); getElement("foodForm")?.reset(); setScanStep(2);
}
function modelClassToDisplayName(value=""){ return String(value).replace(/_/g," ").replace(/\b\w/g,(c)=>c.toUpperCase()); }
function mapModelClassToCategory(value=""){
    value=String(value).toLowerCase().replace(/_/g," ");
    if(["milk","yoghurt","yogurt"].includes(value))return "Dairy";
    if(["juice","soda","water","coffee","tea"].includes(value))return "Beverages";
    if(["chips","candy","chocolate","nuts","cake"].includes(value))return "Snacks";
    if(value==="fish")return "Meat & Seafood";
    if(["tomato sauce","vinegar","oil","honey","jam","spices"].includes(value))return "Condiments";
    return "Other";
}
function loadReviewItem(result){
    const text=Array.isArray(result.detectedText)?result.detectedText:[];
    const name=result.productName||modelClassToDisplayName(result.productClass)||text[0]||"";
    const category=result.category||mapModelClassToCategory(result.productClass);
    const expiry=result.expiry||extractExpiryDate(text)||"";
    if(getElement("productName"))getElement("productName").value=name;
    if(getElement("category")){
        const select=getElement("category"); const valid=Array.from(select.options).some((o)=>o.value===category); select.value=valid?category:"Other";
    }
    if(getElement("expiryDate"))getElement("expiryDate").value=expiry;
    if(getElement("quantity"))getElement("quantity").value=result.quantity||1;
    if(getElement("confidenceValue"))getElement("confidenceValue").textContent=`${Number(result.confidence||0).toFixed(1)}%`;
    if(getElement("detectedText"))getElement("detectedText").textContent=text.length?text.join(" · "):"No package text detected";
    const hint=getElement("expiryDateHint"); if(hint){hint.textContent=expiry?"Expiry date detected from package text. Please confirm it.":"No expiry date was detected. Please enter it manually."; hint.classList.toggle("warning",!expiry);}
}
async function handleImageAnalysis(){
    if(!appState.selectedImageData)return setError("uploadError","Select an image first.");
    getElement("analysisPanel")?.classList.remove("hidden"); getElement("loadingState")?.classList.remove("hidden"); getElement("resultState")?.classList.add("hidden");
    try{
        const result=await analyseFoodImage(appState.selectedImageData);
        getElement("loadingState")?.classList.add("hidden"); getElement("resultState")?.classList.remove("hidden"); loadReviewItem(result); setScanStep(4); showToast("Analysis complete. Review the detected details.");
    }catch(error){console.error(error);getElement("loadingState")?.classList.add("hidden");showToast(error.message||"Unable to analyse the image.","error");}
}
function valueOf(id,fallback=""){ return getElement(id)?getElement(id).value:fallback; }
function validateFoodForm(){
    clearErrors(["productNameError","categoryError","expiryDateError","quantityError","storageError"]); let valid=true;
    if(valueOf("productName").trim().length<2){setError("productNameError","Enter a product name.");valid=false;}
    if(!valueOf("category")){setError("categoryError","Select a category.");valid=false;}
    if(!valueOf("expiryDate")){setError("expiryDateError","Select a date.");valid=false;}
    const q=Number(valueOf("quantity","1")); if(!Number.isInteger(q)||q<1||q>99){setError("quantityError","Enter a quantity from 1 to 99.");valid=false;}
    return valid;
}
function collectFormData(){
    const text=getElement("detectedText")?getElement("detectedText").textContent.split(" · ").filter((v)=>v&&v!=="No package text detected"):[];
    return {
        name:valueOf("productName").trim(), brand:valueOf("brand").trim(), packSize:valueOf("packSize").trim(), category:valueOf("category","Other"), quantity:Number(valueOf("quantity","1")), expiry:valueOf("expiryDate"), manufacturingDate:valueOf("manufacturingDate"), storage:valueOf("storageLocation","Pantry"), storageInstructions:valueOf("storageInstructions").trim(), notes:valueOf("notes").trim(),
        nutrition:{servingSize:valueOf("servingSize").trim(),calories:valueOf("calories").trim(),sugar:valueOf("sugar").trim(),sodium:valueOf("sodium").trim(),saturatedFat:valueOf("saturatedFat").trim(),protein:valueOf("protein").trim(),nutriGrade:valueOf("nutriGrade"),allergens:valueOf("allergens").trim()},
        confidence:Number(getElement("confidenceValue")?.textContent.replace("%","")||0), detectedText:text, emoji:"🥫"
    };
}
async function handleFoodFormSubmit(event){
    event.preventDefault(); if(!validateFoodForm())return;
    try{setScanStep(5);await createPantryItem(collectFormData());resetScanForm();showPage("pantry");showToast("Item saved to pantry.");}
    catch(error){console.error(error);showToast(error.message||"Unable to save the pantry item.","error");}
}
function initialiseScanner(){
    setScanStep(1);
    document.querySelectorAll('input[name="scanMode"]').forEach((radio)=>{const box=radio.closest(".scan-mode-option");if(radio.value!=="single"&&box)box.classList.add("hidden");if(radio.value==="single")radio.checked=true;});
    const input=getElement("imageInput"); input?.addEventListener("change",()=>{const file=input.files?.[0];if(file)handleSelectedImage(file);});
    getElement("removeImageBtn")?.addEventListener("click",resetScanForm); getElement("analyseBtn")?.addEventListener("click",handleImageAnalysis); getElement("foodForm")?.addEventListener("submit",handleFoodFormSubmit); setScanStep(2);
}
