# Canvas

### Generative Sketches
<a href="http://mariuswatz.com/works/abstract01js/index_auto.html"><img src=abstract.png alt="abstract01js" ></img></a>

### Julia Set
<a href="http://bl.ocks.org/syntagmatic/3736720"><img src=julia.png alt="Zoomable Julia Set" ></img></a>

### Heightmap
<a href="http://bl.ocks.org/mbostock/3289530"><img src=heightmap.png alt="Heightmap" ></img></a>

### Parallel Coordinates - Nutrition
<a href="http://bl.ocks.org/2420080"><img src=parallel-coordinates.png alt="Nutrition Parallel Coordinates" ></img></a>

### Map Projection Transitions
<a href="http://www.jasondavies.com/maps/transition/"><img src=projections.png alt="Map Projection Transitions" ></img></a>


### Basic Usage

    <canvas id="tutorial" width="150" height="150"></canvas>

    <script>
      var canvas = document.getElementById('tutorial');
      var ctx = canvas.getContext('2d');

      // your code here
    </script>

### Full Screen

    <canvas id="tutorial" width="150" height="150"></canvas>

    <script>
      var canvas = document.getElementById('tutorial');
      var ctx = canvas.getContext('2d');
      canvas.width = document.body.clientWidth;
      canvas.height = document.body.clientHeight;

      // your code here
    </script>

### Animation 

See this [blog post](http://paulirish.com/2011/requestanimationframe-for-smart-animating/) on smart animating with Canvas.

    function render() {
      // your code here
    };

    window.requestAnimFrame = window.requestAnimationFrame  || 
                  window.webkitRequestAnimationFrame        || 
                  window.mozRequestAnimationFrame           || 
                  window.oRequestAnimationFrame             || 
                  window.msRequestAnimationFrame            || 
                  function(callback, element) {
                    window.setTimeout(callback, 16);
                  };

    (function animloop(){
      requestAnimFrame(animloop);
      render();
    })();

Here's an [example](example.html) of a basic full screen, animated canvas.

### Canvas Scratch Pad
<a href="http://www.kevs3d.co.uk/dev/scratchpad/"><img src=scratchpad.png alt="Canvas Scratch Pad"></img></a>

#### Clear Canvas

    // clear the canvas
    ctx.fillStyle = "#fff"
    ctx.fillRect(0,0,width,height);

#### Gradient

Canvas also has [methods for linear and radial gradients](https://developer.mozilla.org/en-US/docs/HTML/Canvas/Tutorial/Applying_styles_and_colors#Gradients).

    // horizontal hue gradient
    for (var i = 0; i < width; i++) {
      ctx.fillStyle = "hsl(" + i + ",50%,50%)";
      ctx.fillRect(i,0,1,height);
    }

#### Double Gradient 

    // horizontal hue, vertical saturation gradient
    for (var i = 0; i < 360; i++) {
      for (var j = 0; j < 400; j++) {
        ctx.fillStyle = "hsl(" + i + "," +
          Math.round(100*j/400) + "%,50%)";
        ctx.fillRect(i,j,1,1);
      }
    }

#### Circular Motion

Use this example in animate mode:

    // circular motion
    var time = Date.now() / 1600;
    var x = Math.sin(time);
    var y = Math.cos(time);

    // fade canvas
    ctx.fillStyle = "rgba(0,0,0,0.2)"
    ctx.fillRect(0,0,width,height);

    // scale and center
    var i = width * ((1+x)/2);
    var j = height * ((1+y)/2);

    // draw dot
    ctx.fillStyle = "#fff";
    ctx.fillRect(i,j,2.5,2.5);

### Canvas Cheat Sheet
<a href="http://blog.nihilogic.dk/2009/02/html5-canvas-cheat-sheet.html"><img src=canvas-cheat.png alt="Nihilogic's Canvas Cheat Sheet"></img></a>

### Coordinate Transformations
See this <a href="https://developer.mozilla.org/en-US/docs/HTML/Canvas/Tutorial/Transformations">tutorial</a> for examples of translating, rotating and scaling the canvas.

<a href="http://bl.ocks.org/syntagmatic/5000831"><img src=transform.png alt="Coordinate Transform Example"></img></a>

### Compositing
<a href="https://developer.mozilla.org/en/Canvas_tutorial/Compositing"><img src=compositing.png alt="globalCompositeOperation examples"></img></a>

### Resources

* [Canvas Element](http://en.wikipedia.org/wiki/Canvas_element)
* [MDN Canvas Tutorial](https://developer.mozilla.org/en/Canvas_tutorial)
* [W3Schools Canvas Reference](http://www.w3schools.com/html5/html5_ref_canvas.asp)

### Galleries

* [Kevin Roast's Demos](http://www.kevs3d.co.uk/dev/index.html)
* [Mike Bostock](http://bost.ocks.org/mike/)
* [Canvas Demos](http://www.canvasdemos.com/)
* [21 Canvas Experiments](http://net.tutsplus.com/articles/web-roundups/21-ridiculously-impressive-html5-canvas-experiments/)

### Books

* [Canvas Pocket Reference](http://shop.oreilly.com/product/0636920016045.do)
* [HTML5 Canvas](http://shop.oreilly.com/product/0636920013327.do)

### SVG 

* [d3.js](http://d3js.org/)
* [SVG on Wikipedia](http://en.wikipedia.org/wiki/Scalable_Vector_Graphics)
* [W3C Spec](http://www.w3.org/TR/SVG/)
* [MDN SVG Tutorial](https://developer.mozilla.org/en/SVG)

### WebGL 

* [Three.js](http://mrdoob.github.com/three.js/)
* [Chrome Experiments](http://www.chromeexperiments.com/)
* [30 WebGL Experiments](http://www.hongkiat.com/blog/webgl-chrome-experiments/)

### Color

* [CSS Colors](http://www.w3schools.com/cssref/css_colors.asp)
* [Guide to CSS Colors](http://sixrevisions.com/css/colors-webdesign/)
* [Adobe Kuler](http://kuler.adobe.com/)
* [Chroma.js](https://github.com/gka/chroma.js)

<a href="http://vis4.net/blog/posts/avoid-equidistant-hsv-colors/"><img src=allcolors.png alt="Named and Brewer Colors in Chromas.js" ></img></a>

### Compatibity

* [Canvas](http://caniuse.com/canvas)
* [SVG](http://caniuse.com/svg)
* [WebGL](http://caniuse.com/webgl)

### d3.js
<a href="https://github.com/mbostock/d3/wiki/Gallery"><img src=d3js.png alt="d3.js Gallery" ></img></a>

### Three.js
<a href="http://mrdoob.github.com/three.js/"><img src=threejs.png alt="Three.js Gallery" ></img></a>

### Processing.js
<a href="http://processingjs.org/exhibition/"><img src=processing.png alt="Processing.js" ></img></a>
