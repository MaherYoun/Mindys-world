(() => {
  "use strict";
  const page=document.body.dataset.accountPage;
  if(!page)return;
  const $=id=>document.getElementById(id), cloud=new window.SunflowerCloud();
  const status=text=>{$("pageStatus").textContent=text;};
  if(!cloud.configured){status("The developer has not configured account sync yet.");$("accountForm").querySelector("button").disabled=true;return;}
  if(page==="reset"){
    const params=new URLSearchParams(location.hash.slice(1));const token=params.get("access_token"),type=params.get("type");
    history.replaceState(null,"",location.pathname+location.search);
    if(!token||type!=="recovery"){status("Open the latest password reset link from your email to use this page.");$("accountForm").querySelector("button").disabled=true;return;}
    $("accountForm").addEventListener("submit",async e=>{e.preventDefault();const btn=e.currentTarget.querySelector("button");btn.disabled=true;status("Saving…");try{await cloud.resetPassword(token,e.currentTarget.elements.password.value);status("Password updated. You can now sign in to the game on each device.");e.currentTarget.reset();}catch(error){status(error.message);btn.disabled=false;}});
    return;
  }
  if(page==="delete"){
    $("accountForm").addEventListener("submit",async e=>{e.preventDefault();const btn=e.currentTarget.querySelector("button");btn.disabled=true;status("Signing in…");try{await cloud.signIn(e.currentTarget.elements.email.value.trim(),e.currentTarget.elements.password.value,{sync:false});$("deleteStep").hidden=false;$("accountForm").hidden=true;status("Signed in. You can now confirm deletion below.");}catch(error){status(error.message);btn.disabled=false;}});
    $("deleteButton").addEventListener("click",async()=>{if($("confirmDelete").value!=="DELETE"){status("Type DELETE exactly to confirm.");return;}$("deleteButton").disabled=true;status("Deleting your account…");try{await cloud.deleteAccount();localStorage.removeItem("sunflower-atlas-v1");$("deleteStep").hidden=true;status("Your account and synced game data have been deleted. The local game copy in this browser was cleared.");}catch(error){status(error.message);$("deleteButton").disabled=false;}});
  }
})();
