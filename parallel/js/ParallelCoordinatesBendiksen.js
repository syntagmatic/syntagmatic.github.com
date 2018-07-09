
/** constructor 
arguments: 
	d3canvas - the id of the canvas for the webgl context
	d2canvas - the id of the canvas for the 2d context
		
*/
function ParCoord(d3canvas, d2canvas) {	//check wheter this line is brushed by each brush respectively, and sets a boolean for each

	this.gl;
	this.shaderProgram;
	this.pMatrix;
	this.polyLineBuffer;
	this.cubeVertexColorBuffer;
	this.cubeVertexIndexBuffer;
	this.data;
	this.brushes = [];
	this.datacols = [];


// how much to scale and translate the lines, so that we get some air around them
	this.scaley = 0.85;
	this.translatey = 0.05;
	this.scalex = 0.9;
	this.translatex = 0.05;


// color of unbrushed lines
	this.alphaValue = 0.3;
	this.r = 0;
	this.g = 0;
	this.b = 0.2;
	
// color of brushed lines
	this.ba = 0.8;
	this.br = 1;
	this.bg = 0;
	this.bb = 0;

	this.overlay;
	this.initCanvas(d2canvas);

	this.webGLStart(d3canvas);

	this.addBrush();
}

// adds a brush, then updates shaders
ParCoord.prototype.addBrush = function() {
	var o = new Object();

	o.col = -1;
	o.low = 0.2;
	o.high = 0.6;
	o.active = true;
	this.brushes.push(o);
	if (this.activebrush >= 0)
		this.brushes[this.activebrush].active = false;
	this.activebrush = this.brushes.length - 1;
	this.initShaders();
}

// removes active brush, then updates shaders
ParCoord.prototype.removeBrush = function() {
	this.brushes.pop();
	this.activebrush = this.brushes.length - 1;
	this.initShaders();
}


// initialises the 2d canvas, adds mouselisteners
ParCoord.prototype.initCanvas = function(name) {

	this.d2name = name;
	//var c = $('#' + name)[0];
	var c = document.getElementById(name);

	c.addEventListener("mousedown", this.mousePressed.bind(this), false);
	c.addEventListener("mousemove", this.mouseMoved.bind(this), false);
	c.addEventListener("mouseup", this.mouseReleased.bind(this), false);

	this.canvas = c;
	this.overlay = this.canvas.getContext("2d");
	// for (i in this.overlay)
	// this.log(i)
}

ParCoord.prototype.mousePressed = function(e) {
	this.pressed = true;
	this.x = e.offsetX;
	this.y = e.offsetY;
}

// when mouse is moved and button is pressed, we are brushing, and need to update the current brush and draw the brushing square
ParCoord.prototype.mouseMoved = function(e) {
	if (this.pressed) {

		this.drawSquare = true;
		this.squarePos = [ this.x, this.y, e.offsetX - this.x,
				e.offsetY - this.y ];
		this.updateBrush();
		// this.overlay.strokeRect(this.squarePos[0],this.squarePos[1],this.squarePos[2],this.squarePos[3]
		// );
		this.tick();
	}
}

// when someone clicks the bottom of a column we turn it upside down
ParCoord.prototype.clicked = function(x,y) {

	var click = x /this.canvas.width;

	var col = Math.round((click - this.translatex)/this.scalex *(this.cols-1));

	if (col >=0 && col < this.datacols.length && this.canvas.height - y < 20) {
		this.turn(col);
	}

}

// a column is turned by setting a boolean in the columns array
ParCoord.prototype.turn = function(col) {
	this.datacols[col].turn = !this.datacols[col].turn;
}

// stop drawing brushing square
ParCoord.prototype.mouseReleased = function(e) {
	if (e.offsetX == this.x && e.offsetY == this.y) {
		this.clicked(this.x, this.y);
	}


	this.pressed = false;
	this.drawSquare = false;
	this.x = e.offsetX;
	this.y = e.offsetY;
}

// draws the axes, the brushes, the bushing square, the numbers and labels
ParCoord.prototype.drawOverlay = function() {
	this.overlay.clearRect(0, 0, this.canvas.width, this.canvas.height);

	for (var i = 0; i < this.cols; i++) {
		// draw one axis
		this.overlay.beginPath();
		var x = i / (this.cols - 1) * this.canvas.width * this.scalex + this.translatex
				* this.canvas.width;
		this.overlay.moveTo(x, this.translatey * this.canvas.height);
		this.overlay.lineTo(x, this.canvas.height * (this.scaley + this.translatey));
		this.overlay.stroke();

		// determines which unicode char is an arrow in the correct direction of this axis
		var arrow;
		if (this.datacols[i].turn) {
			var strmax = this.datacols[i].range.min;
			var strmin = this.datacols[i].range.max;
			arrow = "\u25BC";
		} else {
			var strmax = this.datacols[i].range.max;
			var strmin = this.datacols[i].range.min;
			arrow = "\u25B2";
		}

		// measures the different labels and posistions them accordingly
		var str = this.datacols[i].name + arrow;
		var metrics = this.overlay.measureText(str);
		// the label
		this.overlay.fillText(str, x-metrics.width/2,this.canvas.height-this.canvas.height*(1.0-this.translatey*2.5-this.scaley));

		// the lower range value
		var metricsmin = this.overlay.measureText(strmin);
		this.overlay.fillText(strmin, x-metricsmin.width/2,this.canvas.height-this.canvas.height*(1.0-this.translatey*1.7-this.scaley));

		// the upper range value
		var metricsmax = this.overlay.measureText(strmax);
		this.overlay.fillText(strmax, x-metricsmax.width/2,this.canvas.height*this.translatey*0.7);
	}
	
	
	// draw the brushes
	this.overlay.strokeStyle = 'rgba(255,0,0,1)';
	this.overlay.lineWidth = 4;
	//this.overlay.fillStyle = 'rgba(255,0,0,0.5)';
	for (var i = 0; i < this.brushes.length; i++) {
		// check wheter to turn the brush, if column is turned
		var col = this.brushes[i].col;
		if ( col >= 0 && this.datacols[col].turn) {
			var high = 1.0 - this.brushes[i].low;
			var low = 1.0 - this.brushes[i].high;
		}else {
			var low = this.brushes[i].low;
			var high = this.brushes[i].high;
		}

		this.overlay.beginPath();

		var x = col / (this.cols - 1) * this.canvas.width * this.scalex + this.translatex
				* this.canvas.width;

		//this.overlay.moveTo(x, this.canvas.height-5);
		var ytop = this.canvas.height * ((1.0 - high) * this.scaley + this.translatey);
		var ybottom = this.canvas.height * ((1.0 - low) * this.scaley + this.translatey);

		this.overlay.moveTo(x, ytop);
		this.overlay.lineTo(x, ybottom);
		this.overlay.stroke();
	}
	this.overlay.lineWidth = 2;
	this.overlay.strokeStyle = 'rgba(0,0,0,1)';

	// draws the brushing square if brushing
	if (this.drawSquare) {
		this.overlay.strokeRect(this.squarePos[0], this.squarePos[1],
				this.squarePos[2], this.squarePos[3]);
	}
}

// called by other script to set the google visualization data object
ParCoord.prototype.setData = function(data) {
	this.data = data;
	this.initBuffers();
	this.initShaders();
	this.tick();
}

// only when debugging, will log msg to an element with id "text"
ParCoord.prototype.log = function(msg) {
	//err = document.getElementById("text");
	//err.innerHTML = msg + "<br/>" + err.innerHTML;
}

// while brushing, updates the active brushes values
ParCoord.prototype.updateBrush = function() {

	var b = this.brushes[this.activebrush];

	var height = this.canvas.height;
	var width = this.canvas.width;

	var high = 1.0 * this.squarePos[1] / height;
	var low = 1.0 * this.squarePos[3] / height + high;
	high = (high - this.translatey) / this.scaley;
	low = (low - this.translatey) / this.scaley;

	var x1 = 1.0 * this.squarePos[0] / width;
	var x2 = 1.0 * this.squarePos[2] / width + x1;

	for (i = 0; i < this.cols; i++) {
		var col = i / (this.cols - 1) * this.scalex + this.translatex;
		if (col > x1 && col < x2  || col < x1 && col > x2) {
			b.col = i;
			if (b.col >= 0 && this.datacols[b.col].turn) {
				b.high = low;
				b.low = high;
			}
			else {
				b.high = 1.0 - high;
				b.low = 1.0 - low;
			}

			if (b.high < b.low) {
				var tmp = b.high;
				b.high = b.low;
				b.low = tmp;
			}

			break;
		}
	}
	
	// sorts the brushes according to column, will be used for making logic OR between brushes on the same axis in the shader
	var sortBrushes = function(a,b) {
		return a.col-b.col;
	}
	
	this.brushes.sort(sortBrushes);
	for (var i = 0; i < this.brushes.length; i++) {
		if (this.brushes[i].active == true){
			this.activebrush = i;
			break;
		}
	}

}

// sets the uniforms of each brush
ParCoord.prototype.updateBrushesUniforms = function() {
	for ( var i = 0; i < this.brushes.length; i++) {
		this.gl.uniform1i(this.shaderProgram['brushColUniform' + i],
				this.brushes[i].col);
		this.gl.uniform1f(this.shaderProgram['brushLowUniform' + i],
				this.brushes[i].low);
		this.gl.uniform1f(this.shaderProgram['brushHighUniform' + i],
				this.brushes[i].high);
	}
}

// initializes the webgl canvas, or shows an error alert if not supported
ParCoord.prototype.initGL = function(canvas) {
	try {
		this.gl = canvas.getContext("experimental-webgl");
		this.canvas3d = canvas;
		this.gl.viewportWidth =  1.0;
		this.gl.viewportHeight = 1.0;
		this.resize();
	} catch (e) {

	}
	if (!this.gl) {
		alert("Could not initialise WebGL, sorry :-(");
	}
}

// called to set the correct resolution on the canvases
ParCoord.prototype.resize = function() {
		
		this.canvas3d.height = this.canvas3d.clientHeight;
		this.canvas3d.width = this.canvas3d.clientWidth;
		this.canvas.height = this.canvas3d.clientHeight;
		this.canvas.width = this.canvas3d.clientWidth;
		this.gl.viewport(0,0,this.canvas3d.clientWidth,this.canvas3d.clientHeight);
	
}

// generates the shaders
ParCoord.prototype.initShaders = function() {
	this.shaderfs = "\
    \
      varying vec4 color;\
      void main(void) {\
        gl_FragColor = color;\
      }";

	this.shadervs = "\
      attribute vec2 pos;\
      uniform int cols;\
      uniform int rows;\
      uniform bool drawColor;\
      varying vec4 color;\
      uniform mat4 uPMatrix;\
      ";

	// adds each brushes uniforms
      for (i = 0; i < this.datacols.length; i++) {

    	  this.shadervs += "uniform bool turnCol" + i + ";";

      }
	var brushes = 1;
	for (i = 0; i < this.brushes.length; i++) {
		this.shadervs += "uniform int brushCol" + i + ";";
		this.shadervs += "uniform float brushLow" + i + ";";
		this.shadervs += "uniform float brushHigh" + i + ";";
	}
	for (i = 0; i < this.cols; i++) {
		this.shadervs += "attribute float value" + i + ";";
	}
	this.shadervs += "\
      void main(void) {\
        float y = pos.y;\
        float x = pos.x;\
        int col = int(x * (cols-1));\
        float z = 0.0;\
        color = vec4("+ this.r+", "+ this.g+", "+ this.b+", " + this.alphaValue +");\
      ";

	// turns the column if needed
    elsestring = "";
    for (i = 0; i< this.datacols.length; i++) {
    	this.shadervs += elsestring +"if (col < " + (i + 0.1) + " && col > " + (i - 0.1) +" && turnCol" + i +" ){y = 1-y;}";
    	elsestring = "else ";
    }
      //  this.shadervs += "if (turnCol1) y = 1.0-y;"
	for (i = 0; i < this.brushes.length; i++) {
		this.shadervs += "bool color" + i + " = false;";
	}

	//check wheter this line is brushed by each brush respectively, and sets a boolean for each
	for (i = 0; i < this.brushes.length; i++) {
		elseString = "";
		for (j = 0; j < this.cols; j++) {
			this.shadervs += elseString + "if (brushCol" + i + " == " + j
					+ " && brushLow" + i + " <= value" + j + " && brushHigh"
					+ i + " >= value" + j + ") {";
			this.shadervs += "color" + i + "= true; }";
			elseString = "else ";
		}
		if (i > 0) {
			this.shadervs += "else if (brushCol" + i + " == -1){color" + i
					+ " = true;}";
		}
	}
	
	// goes through each brush, and checks whether all are brushing this line, in that case, is should be colored, and r will be true
	if (this.brushes.length > 0) {
		
		this.shadervs += "bool r = color0;";
		for (i = 1; i < this.brushes.length; i++) {
			
				this.shadervs += "r = r && color" +i +";";
						
				
						
						
			
		}
		this.shadervs += "" +
				"if (r) {" +
				" color = vec4(" + this.br + "," + this.bg + ", " + this.bb + ", " + this.ba +"); z = 1.0;  " +
				"}else if (drawColor) {" +
				"z = -11.0;}";
	}
	this.shadervs += "gl_Position = uPMatrix * vec4(x*"+ this.scalex +"+"+ this.translatex +", y*"+this.scaley+"+"+(1-this.scaley-this.translatey)+",z,1.0);}";

	var w = this.shadervs.replace(/;/g, ";<br />");
	var p = document.getElementById("text");
	//p.innerHTML = w;// + "<br/>";
	
	var gl = this.gl;
	
	// compile
	// fragment shader
	var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
	gl.shaderSource(fragmentShader, this.shaderfs);
	gl.compileShader(fragmentShader);
	if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
		alert(gl.getShaderInfoLog(fragmentShader));
		return null;
	}

	// vertex shader
	var vertexShader = gl.createShader(gl.VERTEX_SHADER);
	gl.shaderSource(vertexShader, this.shadervs);
	gl.compileShader(vertexShader);
	if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
		alert(gl.getShaderInfoLog(vertexShader));
		return null;
	}

	// shader progrram
	var shaderProgram = gl.createProgram();
	gl.attachShader(shaderProgram, vertexShader);
	gl.attachShader(shaderProgram, fragmentShader);
	gl.linkProgram(shaderProgram);

	if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
		alert("Could not initialise shaders");
	}

	gl.useProgram(shaderProgram);
	
	
	// get all the uniform and attribute locations

	shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram,
			"pos");
	gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

	for (i = 0; i < this.cols; i++) {
		shaderProgram['value' + i] = gl.getAttribLocation(shaderProgram,
				"value" + i);
		gl.enableVertexAttribArray(shaderProgram['value' + i]);
	}

	for (i = 0; i < this.brushes.length; i++) {
		shaderProgram['brushColUniform' + i] = gl.getUniformLocation(
				shaderProgram, "brushCol" + i);
		shaderProgram['brushLowUniform' + i] = gl.getUniformLocation(
				shaderProgram, "brushLow" + i);
		shaderProgram['brushHighUniform' + i] = gl.getUniformLocation(
				shaderProgram, "brushHigh" + i);

	}

	for (i = 0; i< this.datacols.length; i++) {
		shaderProgram['turnColUniform' + i] = gl.getUniformLocation(shaderProgram, 'turnCol'+i);
	}

	shaderProgram.drawColorUniform = gl.getUniformLocation(shaderProgram,
	"drawColor");

	shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram,
			"uPMatrix");
	shaderProgram.rowsUniform = gl.getUniformLocation(shaderProgram, "rows");
	shaderProgram.colsUniform = gl.getUniformLocation(shaderProgram, "cols");


	this.shaderProgram = shaderProgram;
}
// makes correct projection matrix
ParCoord.prototype.makePerspective = function() {
	this.pMatrix = makeOrtho(0.0, 1.0, 0.0, 1.0, -1.0, 1.0);
}

// sets the uniforms
ParCoord.prototype.setMatrixUniforms = function() {
	this.gl.uniformMatrix4fv(this.shaderProgram.pMatrixUniform, false,
			new WebGLFloatArray(this.pMatrix.flatten()));

	// set uniforms
	this.gl.uniform1i(this.shaderProgram.colsUniform, this.cols);
	this.gl.uniform1i(this.shaderProgram.rowsUniform, this.rows);

	this.updateBrushesUniforms();

	for (var i = 0; i<this.datacols.length; i++) {
		this.gl.uniform1i(this.shaderProgram['turnColUniform' + i], this.datacols[i].turn);
	}
}

// generates the webgl VBO for displaying the lines, and setting the attributes. For each line segment, each of the column values are set as attributes, so that all the brushes can be checked locally in each vertex
ParCoord.prototype.initBuffers = function() {

	// testbuffer
	var test = [ 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 0.0, 0.0, 0.0,
			1.0, 1.0, 0.0, 1.0, 0.0, 0.0 ];
	this.testBuffer = this.gl.createBuffer();
	this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.testBuffer);
	this.gl.bufferData(this.gl.ARRAY_BUFFER, new WebGLFloatArray(test),
			this.gl.STATIC_DRAW);
	this.testBuffer.itemSize = 3;
	this.testBuffer.numItems = 6;

	// make polylineBuffer
	this.polyLineBuffer = this.gl.createBuffer();
	this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.polyLineBuffer);

	if (this.data != null) {
		var cols = this.data.getNumberOfColumns();
		var rows = this.data.getNumberOfRows();

		var datacols = [];
		for (j = 0; j < cols; j++) {
			if (this.data.getColumnType(j) == 'number') {
				var o = new Object();
				o.index = j;
				o.name = this.data.getColumnLabel(j);
				o.range = this.data.getColumnRange(j);
				o.turn = false;
				datacols.push(o);
			}
		}

		this.cols = datacols.length;
		this.datacols = datacols;
		this.rows = rows;

		var numItems = 0;
		// rows * datacols.length;

		var vertices = [];
		for (i = 0; i < rows; i++) {
			var prev = 0;
			for (j = 1; j < datacols.length; j++) {

				var range = datacols[j - 1].range;
				// tegn linje fra
				vertices.push((prev * 1.0) / (this.cols - 1));
				vertices
						.push((this.data.getValue(i, datacols[j - 1].index) - range.min)
								/ (range.max - range.min));
				for (k = 0; k < datacols.length; k++) {
					var range = datacols[k].range;
					var value = (this.data.getValue(i, datacols[k].index) - range.min)
							/ (range.max - range.min);
					vertices.push(value);
				}
				// til
				var range = datacols[j].range;
				vertices.push(((++prev) * 1.0) / (this.cols - 1));
				vertices
						.push((this.data.getValue(i, datacols[j].index) - range.min)
								/ (range.max - range.min));
				for (k = 0; k < datacols.length; k++) {
					var range = datacols[k].range;
					var value = (this.data.getValue(i, datacols[k].index) - range.min)
							/ (range.max - range.min);
					vertices.push(value);
				}

				// to nye vertexer
				numItems += 2;

			}

		}

		this.gl.bufferData(this.gl.ARRAY_BUFFER, new WebGLFloatArray(vertices),
				this.gl.STATIC_DRAW);
		this.polyLineBuffer.itemSize = 2;
		this.polyLineBuffer.numItems = numItems;
		this.polyLineBuffer.stride = (this.cols + 2) * 4;

	} else {

		vertices = [ 0.0, 1.0, 0.1, 0.5, 0.2, 0.3, 0.3, 0.2, 0.4, 0.3, 0.5,
				0.9, 0.6, 0.7, 0.7, 0.2, 0.8, 0.4, 0.9, 0.3 ];

		this.gl.bufferData(this.gl.ARRAY_BUFFER, new WebGLFloatArray(vertices),
				this.gl.STATIC_DRAW);
		this.polyLineBuffer.itemSize = 2;
		this.polyLineBuffer.numItems = 10;
		this.polyLineBuffer.stride = 0;
	}
}

// draws all the polylines
ParCoord.prototype.drawScene = function() {
	this.gl.clearColor( 1,1,1,1 );
	this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);


	if (!this.data) {
		return;
	}
	
	//this.gl.enable(this.gl.BLEND )
	this.gl.blendFunc( this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA );
//	this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE);
	this.gl.blendEquation( this.gl.FUNC_ADD )

	if (this.shaderProgram != null) {



		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.polyLineBuffer);

		this.gl.vertexAttribPointer(this.shaderProgram.vertexPositionAttribute,
				this.polyLineBuffer.itemSize, this.gl.FLOAT, false,
				this.polyLineBuffer.stride, 0);

		for (i = 0; i < this.cols; i++) {
			this.gl.vertexAttribPointer(this.shaderProgram['value' + i], 1,
					this.gl.FLOAT, false, this.polyLineBuffer.stride,
					(2 + i) * 4);
		}

		this.setMatrixUniforms();

		// first draw the unbrushed lines
		this.gl.uniform1i(this.shaderProgram.drawColorUniform, 0);
		this.gl.drawArrays(this.gl.LINES, 0, this.polyLineBuffer.numItems);
		// then draw the brushed lines, to have them on top
		this.gl.uniform1i(this.shaderProgram.drawColorUniform, 1);
		this.gl.drawArrays(this.gl.LINES, 0, this.polyLineBuffer.numItems);
	}

}

// updates both the webgl canvas and the 2d canvas
ParCoord.prototype.tick = function() {
//	this.resize();
	this.drawScene();
	this.drawOverlay();
}

// initializes webgl
ParCoord.prototype.webGLStart = function(name) {
	var name = document.getElementById(name);

	this.initGL(name);
	// this.initShaders();
	// this.initBuffers();

	//this.gl.clearColor(1.0, 1.0, 1.0, 0.0);

	this.gl.clearDepth(1.0);

	this.gl.enable(this.gl.BLEND);
	//this.gl.enable(this.gl.DEPTH_TEST);
	//this.gl.depthFunc(this.gl.LEQUAL);
	
	this.makePerspective();
	this.tick();
}
