const yearNode=document.getElementById("year");if(yearNode)yearNode.textContent=String(new Date().getFullYear());
const menuButton=document.querySelector(".menu-toggle");
const mainNav=document.querySelector("#main-nav");
if(menuButton&&mainNav){
 menuButton.addEventListener("click",()=>{
  const open=menuButton.getAttribute("aria-expanded")==="true";
  menuButton.setAttribute("aria-expanded",String(!open));
  menuButton.setAttribute("aria-label",open?"Open navigation":"Close navigation");
  mainNav.classList.toggle("is-open",!open);
 });
 mainNav.querySelectorAll("a").forEach(link=>link.addEventListener("click",()=>{
  menuButton.setAttribute("aria-expanded","false");
  menuButton.setAttribute("aria-label","Open navigation");
  mainNav.classList.remove("is-open");
 }));
 document.addEventListener("click",event=>{
  if(!mainNav.contains(event.target)&&!menuButton.contains(event.target)){
   menuButton.setAttribute("aria-expanded","false");
   menuButton.setAttribute("aria-label","Open navigation");
   mainNav.classList.remove("is-open");
  }
 });
}
