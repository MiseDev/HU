window.onload = function(){
    setTimeout(function(){
        document.body.style.overflow = 'hidden';
        window.scrollTo(0, 0);
    }, 10);
    setTimeout(function(){
        window.scrollTo({top:1000,
            behavior: 'smooth'});
    }, 4000);
    setTimeout(function(){
        console.log("test")
        document.body.style.overflow = 'visible';
    }, 5000);
};