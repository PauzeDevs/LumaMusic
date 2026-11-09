const yearNode=document.getElementById("year");if(yearNode)yearNode.textContent=String(new Date().getFullYear());
const menuButton=document.querySelector(".menu-toggle"),mainNav=document.querySelector("#main-nav");
if(menuButton&&mainNav){
 const closeMenu=()=>{menuButton.setAttribute("aria-expanded","false");menuButton.setAttribute("aria-label","Open navigation");mainNav.classList.remove("is-open");};
 menuButton.addEventListener("click",()=>{const open=menuButton.getAttribute("aria-expanded")==="true";menuButton.setAttribute("aria-expanded",String(!open));menuButton.setAttribute("aria-label",open?"Open navigation":"Close navigation");mainNav.classList.toggle("is-open",!open);});
 mainNav.querySelectorAll("a").forEach(link=>link.addEventListener("click",closeMenu));
 document.addEventListener("click",event=>{if(!mainNav.contains(event.target)&&!menuButton.contains(event.target))closeMenu();});
}
(()=>{
 const reduce=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
 const targets=document.querySelectorAll(".intro-section,.section-top,.feature-card,.feature-disclaimer,.catalogue-copy,.catalogue-panel,.closing-section,.legal-links a,.site-footer");
 targets.forEach((node,index)=>{node.classList.add("js-reveal");node.style.transitionDelay=(index%4)*65+"ms";});
 if(reduce||!("IntersectionObserver" in window)){targets.forEach(node=>node.classList.add("is-visible"));return;}
 const observer=new IntersectionObserver((entries,instance)=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add("is-visible");instance.unobserve(entry.target);}}),{threshold:.1,rootMargin:"0px 0px -35px 0px"});
 targets.forEach(node=>observer.observe(node));
})();
