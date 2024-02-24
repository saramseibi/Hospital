/*animation*/
document.addEventListener("DOMContentLoaded", () => {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add("animate-on-scroll");
            } else {
                entry.target.classList.remove("animate-on-scroll");
            }
        });
    }, {
        threshold: 0.1 
    });

    document.querySelectorAll('.service .card, .main .hero-content, .main .hero-image').forEach((element) => {
        observer.observe(element);
    });
});
/*smoothscroll*/
function smoothScroll(target) {
    const element = document.getElementById(target);
  
    if (element) {
      element.scrollIntoView({
        behavior: "smooth",
        block: "start",
        inline: "nearest"
      });
    }
  }
  
  // Attach the function to link clicks
  document.querySelectorAll(".navbar-link").forEach(link => {
    link.addEventListener("click", () => smoothScroll(link.hash.substring(1)));
  });