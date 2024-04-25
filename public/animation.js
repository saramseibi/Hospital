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

    document.querySelectorAll('.service .card, .main .hero-content, .main .hero-image , .container').forEach((element) => {
        observer.observe(element);
    });
});
/*smoothscroll*/
function smoothScroll(target) {
    const element = document.getElementById(target);

    if (element) {
        element.scrollIntoView({
            behavior: "smooth",
            block: "center",
            inline: "nearest"
        });
    }
}
document.querySelectorAll(".navbar-link").forEach(link => {
    link.addEventListener("click", () => smoothScroll(link.hash.substring(1)));
});
/*contact us*/
document.addEventListener('DOMContentLoaded', (event) => {
    const inputs = document.querySelectorAll(".input");

    function focusFunc() {
        let parent = this.parentNode;
        parent.classList.add("focus");
    }

    function blurFunc() {
        let parent = this.parentNode;
        if (this.value == "") {
            parent.classList.remove("focus");
        }
    }

    inputs.forEach((input) => {
        input.addEventListener("focus", focusFunc);
        input.addEventListener("blur", blurFunc);
    });
});
/*btn move */
document.addEventListener('DOMContentLoaded', function() {
    const signInBtn = document.querySelector("#sign-in-btn");
    const signUpBtn = document.querySelector("#sign-up-btn");
    const container = document.querySelector(".container");

    signUpBtn.addEventListener('click', () => {
        container.classList.add("sign-up-mode");
       
    });

    signInBtn.addEventListener('click', () => {
        container.classList.remove("sign-in-mode");
    });   
});
