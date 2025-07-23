// JavaScript Document
$(window).on('load', function(){
$('#sp-headphone, #sp-dap, #sp-cables,#sp-dac-amp,#sp-speaker,#sp-acess,#sp-hot-headphone').owlCarousel({
    loop:true,
    margin:10,
    nav:true,
	autoplay:true,
	dots:false,
    responsive:{
        0:{
            items:1
        },
        600:{
            items:2
        },
        1000:{
            items:3
        }
    }
})
//headphone JS
$('#sp-hifiman,#sp-sony,#sp-sennheiser').owlCarousel({
    loop:true,
    margin:10,
    nav:true,
	autoplay:true,
    autoplayTimeout: 3000,
    autoplayHoverPause: true,
	dots:false,
    responsive:{
        0:{
            items:1
        },
        600:{
            items:2
        },
        1000:{
            items:3
        }
    }
})
//dap JS
$('#sp-astell, #sp-fiio').owlCarousel({
    loop:true,
    margin:10,
    nav:true,
	autoplay:true,
    autoplayTimeout: 3000,
    autoplayHoverPause: true,
	dots:false,
    responsive:{
        0:{
            items:1
        },
        600:{
            items:2
        },
        1000:{
            items:3
        }
    }
})
//cables JS
$('#sp-briseaudio, #sp-wagnus, #sp-eletech').owlCarousel({
    loop:true,
    margin:10,
    nav:true,
    autoplay:true,
    autoplayTimeout: 3000,
    autoplayHoverPause: true,
    dots:false,
    responsive:{
        0:{
            items:1
        },
        600:{
            items:2
        },
        1000:{
            items:3
        }
    }
})
//dac-amp JS
$('#sp-chord, #sp-ddhifi, #sp-ifi').owlCarousel({
    loop:true,
    margin:10,
    nav:true,
    autoplay:true,
    autoplayTimeout: 3000,
    autoplayHoverPause: true,
    dots:false,
    responsive:{
        0:{
            items:1
        },
        600:{
            items:2
        },
        1000:{
            items:3
        }
    }
})
//accessories JS
$('#sp-case').owlCarousel({
    loop:true,
    margin:10,
    nav:true,
    autoplay:true,
    autoplayTimeout: 3000,
    autoplayHoverPause: true,
    dots:false,
    responsive:{
        0:{
            items:1
        },
        600:{
            items:2
        },
        1000:{
            items:3
        }
    }
})
});