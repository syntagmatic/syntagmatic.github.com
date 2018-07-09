function initHeat(opts) {

  var heat = {};

  var data = data || [],
      legislators = [],
      votes = [];

  // Set defaults

  var options = _.extend({
    year: 1990,
    mapEl: '#heatmap-wrap',
    loadingEl: '#loading',
    heatEL: '#heatmap'
  }, opts);

  options.vote_key = _.extend({}, opts.vote_key);

  options.colors = _.extend({}, opts.colors);

	options.hoverColors = _.extend({}, opts.hoverColors);

  options.size = _.extend({
    dotsize: function() {return 4},
    gutsize: function() {return 1},
		totsize: function() {return options.size.dotsize() + options.size.gutsize()}
  }, opts.size);

  // get or set data
  heat.data = function(new_data) {
    if (!new_data) {
      return data;
    } else {
      data = new_data;
    }
  }
  // get or set options
  heat.options = function(opts) {
    if (!opts) {
      return options;
    } else {
      options = _.extend(options, opts);
    }
  }
  
  //Init options in dom
  _.each(options.colors, function(c, k) {
    if (k == "null" || k == "undefined") {
      $('.color5').css({"color":c});
    } else {
      $('.color'+k).css({"color":c});
    } 
  }); 

  heat.draw = function() {
    var height = data.length*options.size.dotsize()+options.size.gutsize();
    var width = _(data).chain()
                       .map(function(d) { return d.length})
                       .max()
                       .value()*options.size.dotsize()+options.size.gutsize();
    $('#heatmap').attr('height', parseInt(height));
    $('#heatmap').attr('width', parseInt(width));
    $('#hover').attr('height', parseInt(height));
    $('#hover').attr('width', parseInt(width));
    $('#party').attr('height', parseInt(height));
    $('#party').attr('width', parseInt(options.size.dotsize()*4));
		$(options.mapEl).css({"padding-left": options.size.dotsize()*4+16});
		$('#hover').css({"left": options.size.dotsize()*4+16});
    $('#results').attr('width', parseInt(width));

    var b = heatmap('heatmap', data, {
      colorize: function(val) {
        return options.colors[val];
      },
      dotsize: options.size.dotsize(),
      gutsize: options.size.gutsize(),
			totsize: options.size.totsize()
    });

    b.render();
    $(options.loadingEl).hide();
    $(options.mapEl).fadeIn();

		var c = document.getElementById('hover'),
				hoverCtx = c.getContext('2d');

    c.onmousemove = function(e) {
      var pos = indices(options.size.dotsize()+options.size.gutsize(), e);
      var val = lookup(pos, data);
      c.crossHover(pos);
			heat.move(e, pos.i, pos.j, val);
    };

		c.onmouseout = function(e) {
			heat.out(e);
			hoverCtx.clearRect(0, 0, parseInt(width), parseInt(height));
		};

    c.onclick = function(e) {
      var pos = indices(options.size.dotsize()+options.size.gutsize(), e);
      var val = lookup(pos, data);
      heat.click(pos.i, pos.j, val);
    };

		c.crossHover = function(pos) {
			hoverCtx.clearRect(0, 0, parseInt(width), parseInt(height));
	  	_(data[pos.i]).each(function(row, j) {
				var val = lookup({i:pos.i, j:j}, data);
				hoverCtx.fillStyle = options.hoverColors[val];
				hoverCtx.fillRect(options.size.totsize()*j, options.size.totsize()*pos.i, options.size.dotsize(), options.size.dotsize());
			});
			var h = _.map(data, function(i) {
				return i[pos.j]
			});
			_(h).each(function(column, i) {
				var val = lookup({i:i, j:pos.j}, data);
				hoverCtx.fillStyle = options.hoverColors[val];
				hoverCtx.fillRect(options.size.totsize()*pos.j, options.size.totsize()*i, options.size.dotsize(), options.size.dotsize());
			});
		};
  };

  heat.move = function(e, row, col, val) { };
  heat.click = function(row, col, val) { };
	heat.out = function(e) {};

	$(window).scroll(function() {
		if ($(window).scrollLeft() != 0) {
			$('#party-wrap').hide().css("left", parseInt($(window).scrollLeft())).fadeIn();
		}
	});
  return heat;
};
