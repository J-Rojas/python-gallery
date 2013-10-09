/*
    Copyright 2013 Jose Rojas
    Author: Jose Rojas 
*/

function qs(key) {
    key = key.replace(/[*+?^$.\[\]{}()|\\\/]/g, "\\$&"); // escape RegEx meta chars
    var match = location.search.match(new RegExp("[?&]"+key+"=([^&]+)(&|$)"));
    return match && decodeURIComponent(match[1].replace(/\+/g, " "));
}

function show(node, bShow) {
    node.className = node.className.replace(/ ?(hide|show) ?/g, "");
    node.className += bShow ? " show" : " hide";
}

var Carousel = (function() {
    
    var clazz = function Carousel(node, caption, loading) {
        this.node = node;
        this.loading = loading;
        this.caption = caption;
    };
    var self = clazz.prototype;
   
    self.TIMER = 5000; //timeout before beginning the next image change
    self.SWAP_TIMER = 3000; //timeout before swapping the current with the next image, should match the CSS transition timeout
    self.imageset = null; //the current image set
    self.loadedImages = [];
    self.curpos = -1;
    self.noScale = qs('noscale') == 'true';

    self.changeImageSet = function (imageList)
    {        
        //begin loading the images
        var loadedImages = [];
        this.loadedImages = loadedImages;

        var me = this;
        var ready = function () {
            if (me.loading) {
                show(me.node, true);
                me.loading.className += ' remove';
                me.loading = null;
            }

            if (!this._loaded)
            {
                //insert them into the loaded list
                loadedImages.push(this);
                if (loadedImages.length == 1 && !self.runningCarousel)
                {
                    me.fireCarousel(); //kick start the carousel
                }
            }
            this._loaded=true;
        }

        if (imageList != null)
        {
            for (var i = 0; i < imageList.length; i++)
            {            
                var img = new Image();    
                img.addEventListener('load', ready);
                img.src = imageList[i].url;
                img.caption = imageList[i].caption;
                
                if (img.complete) //if cached and in case onload() doesn't fire
                    ready.call(img);
            }
        }
    }

    self.changeImageSetInOrder = function (imageList)
    {        
        //begin loading the images
        var loadedImages = [];
        this.loadedImages = loadedImages;

        if (imageList != null)
        {
            for (var i = 0; i < imageList.length; i++)
            {            
                var img = new Image();    
                var me = this;
                img.addEventListener('load', function() {
                    this._loaded = true;
                });
                img.src = imageList[i].url;
                img.caption = imageList[i].caption;
                
                loadedImages.push(img);                                    
            }


            var ready = function () {
                if (me.loading) {
                    show(me.node, true);
                    me.loading.className += ' remove';
                    me.loading = null;
                }
                me.fireCarousel(); //kick start the carousel
            };

            //for the first image...
            var firstImg = loadedImages[0];
            firstImg.addEventListener('load', ready);

            //if cached and in case onload() doesn't fire
            if (firstImg.complete) {
                ready.call(firstImg);
            }
        }
    }

    self.navPrev = function() {
        this.curpos -= 2;
        this.cancelTimers();
        this.fireCarousel();        
    }

    self.navNext = function() {
        this.cancelTimers();
        this.fireCarousel();
    }

    self.cancelTimers = function() {
        if (this.fireCarouselTimer) {
            window.clearTimeout(this.fireCarouselTimer);
        }
        if (this.swapImagesTimer) {
            window.clearTimeout(this.swapImagesTimer);
        }
    }

    self.fireCarousel = function()
    {
        var me = this;

        this.runningCarousel = true;
        if (this.loadedImages.length > 0)
        {    
            this.curpos++;
            if (this.curpos >= this.loadedImages.length)
                this.curpos = 0;
            else if (this.curpos < 0)
                this.curpos = this.loadedImages.length - 1;

            //show the image
            var success = this.showImage(this.loadedImages[this.curpos], true);

            if (!success)
                this.curpos--; //try again

            //restart carousel
            this.fireCarouselTimer = window.setTimeout(function() { me.fireCarousel() }, success ? this.TIMER : 10);
            if (success)
                this.swapImagesTimer = window.setTimeout(function() { me.swapImages() }, this.SWAP_TIMER);
        }
        else 
        {
            //reset the images
            this.showImage(null, true);        
            this.swapImagesTimer = window.setTimeout(function() { me.swapImages() }, this.SWAP_TIMER);
            this.runningCarousel = false;
        }
    }

    self.showImage = function(img, fade)
    {
        var src = img != null ? 'url('+ img.src + ')' : '';

        var img1 = this.node.querySelector('#image_next');
        var img2 = this.node.querySelector('#image_curr');

        this.setImage(img1, src);
        //assumes CSS3 support    
        if (fade)
        {
            img2.className += ' anim_fade';
            img1.className += ' anim_show';
        }
        return img != null;
    }

    self.setImage = function(node, src)
    {
        if (!src)
            node.style.backgroundColor = 'black';    
        node.style.backgroundImage = src;
        if (!this.noScale)
            node.style.backgroundSize = 'contain'; //a little cheat... you can also set the width/height aspect ratio directly.

        this.caption.innerHTML = this.loadedImages[this.curpos].caption || '';        
    }

    self.swapImages = function()
    {
        var img1 = this.node.querySelector('#image_next');
        var img2 = this.node.querySelector('#image_curr');

        this.setImage(img2, img1.style.backgroundImage);
        this.setImage(img1, '');

        img1.className = 'full imgcontain hide'; //reset animation    
        img2.className = 'full imgcontain show'; //reset animation
    }

    return clazz;
})();

(function() {

    var inOrder = qs('order') || 'InOrder';

    var gallery = new Carousel(
        document.querySelector('#gallery'),  //the gallery node
        document.querySelector('#caption'),  //the caption node        
        document.querySelector('#loading')  //the loading node
    );

    //parse the JSON...
    var galleryJSON = new XMLHttpRequest();
    
    galleryJSON.open('GET', '/proxy/snapguide.com/api/v1/guide/b995492d5e7943e3b2757a88fe3ef7c6', true);
    
    galleryJSON.onreadystatechange = function() {
        if (galleryJSON.readyState == 4) {
            if (galleryJSON.status == 200) {
                galleryJSON = JSON.parse(galleryJSON.responseText);
            
                var galleryImages = [];
                var captions = [];
                var items = galleryJSON.guide.items;
                for (var ii = 1; ii < items.length; ii+= 2) {
                    if (items[ii].type == 'image') {
                        var img = { 
                            url: 'http://images.snapguide.com/images/guide/' + items[ii].content.media_item_uuid + '/original.jpg', 
                            caption: items[ii].content.caption };
                        galleryImages.push(img);
                    }
                    ii++;
                }
                
                if (inOrder == 'InOrder')
                    gallery.changeImageSetInOrder(galleryImages);
                else
                    gallery.changeImageSet(galleryImages);
            }
            else {
                alert('Oops! There was an error accessing the gallery feed.');
            }
            galleryJSON = null;
        }
    };

    galleryJSON.send();

    var left = function() { gallery.navPrev(); };
    var right = function() { gallery.navNext(); };
    document.getElementById('left').addEventListener('click', left);
    document.getElementById('right').addEventListener('click', right);
    document.addEventListener('keydown', function(event) { if (event.keyCode == 37) left.call(event); });
    document.addEventListener('keydown', function(event) { if (event.keyCode == 39) right.call(event); });
    

})();
