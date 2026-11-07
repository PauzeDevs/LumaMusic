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

/* Reveal sections as they enter the viewport */
(()=>{
 const reduceMotion=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
 const revealTargets=document.querySelectorAll(".section-heading,.feature-row,.feature-footnote,.catalogue-copy,.catalogue-facts,.legal-links a,.legal-note,.site-footer");
 revealTargets.forEach((node,index)=>{
  node.classList.add("js-reveal");
  if(node.classList.contains("feature-row")) node.style.setProperty("--reveal-delay",((index%3)*75)+"ms");
 });
 if(reduceMotion||!("IntersectionObserver" in window)){
  revealTargets.forEach(node=>node.classList.add("is-visible"));
 }else{
  const observer=new IntersectionObserver((entries,instance)=>{
   entries.forEach(entry=>{
    if(entry.isIntersecting){entry.target.classList.add("is-visible");instance.unobserve(entry.target);}
   });
  },{threshold:.12,rootMargin:"0px 0px -45px 0px"});
  revealTargets.forEach(node=>observer.observe(node));
 }
 document.querySelectorAll('a[href^="#"]').forEach(link=>{
  link.addEventListener("click",event=>{
   const target=document.querySelector(link.getAttribute("href"));
   if(target){event.preventDefault();target.scrollIntoView({behavior:reduceMotion?"auto":"smooth",block:"start"});}
  });
 });
})();
