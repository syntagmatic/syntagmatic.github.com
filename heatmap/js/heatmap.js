var defaults = {
  dotsize: 5,
  gutsize: 1,
  totsize: 6
}

function heatmap(id, data, options) {
  var self = {};
  var options = _.extend(defaults, options);
  self.data = data || [];
  self.canvas = document.getElementById(id);
  self.ctx = self.canvas.getContext('2d');
  self.colorize = options.colorize || default_colorize;

  self.ctx.clearRect(
    0,
    0,
    _.size(self.data),
    _.size(self.data[0])
  );
  // render heatmap
  self.render = function() {
    _(self.data).each(function(row,j) {
      _(row).each(function(val,i) {
        self.ctx.fillStyle = self.colorize(val);
        self.ctx.fillRect(options.totsize*i,options.totsize*j,options.dotsize,options.dotsize);
      });
    });
  }

  self.update = function(data) {
    self.data = data;
  };

  return self;
};

function linegraph(id, data) {
  var self = {};
  self.data = data || [];
  self.bg = $('#' + id + ' .background')[0];
  self.bgctx = self.bg.getContext('2d');
  self.fg = $('#' + id + ' .foreground')[0];
  self.fgctx = self.fg.getContext('2d');

  // render
  self.bgctx.strokeStyle = 'hsla(0,0%,50%,0.4)';
  self.bgctx.beginPath();
  _(data).each(function(row) {
    _(row).each(function(val,j) {
      if (j == 0)
        self.bgctx.moveTo(defaults.totsize*j,120-val*120);
      else
        self.bgctx.lineTo(defaults.totsize*j,120-val*120);
    });
  });
  self.bgctx.stroke();

  self.highlight = function(pos) {
    self.fgctx.strokeStyle = '#fb5';
    self.fgctx.lineWidth = 2.2;
    self.fgctx.clearRect(0,0,900,120);
    self.fgctx.beginPath();
     _(data[pos.i]).each(function(val,j) {
      if (j == 0)
        self.fgctx.moveTo(defaults.totsize*j,120-val*120);
      else
        self.fgctx.lineTo(defaults.totsize*j,120-val*120);
    });   
    self.fgctx.stroke();
    self.fgctx.beginPath();
    self.fgctx.strokeStyle = '#6f9';
    self.fgctx.lineWidth = 1;
    self.fgctx.moveTo(defaults.totsize*pos.j, 0);
    self.fgctx.lineTo(defaults.totsize*pos.j, 120);
    self.fgctx.stroke();
  };

  return self;
};

/* utility functions */

// colorize based on value
function default_colorize(val) {
  return 'hsla(0,' + (100*val) +'%,50%,' + val + ')';
};

// invert mapping to get indices
function indices(totsize, e) {
  var x = e.pageX - $(e.target).offset().left;
  var y = e.pageY - $(e.target).offset().top;
  var j = Math.floor(x/totsize);
  var i = Math.floor(y/totsize);
  return {
    x: x,
    y: y,
    i: i,
    j: j
  };
};

// lookup value with indices
function lookup(pos, data) {
  if (_.isArray(data)) {
    return data[pos.i][pos.j];      // 2d array
  } else {
    if (pos.i in data) {
      if (pos.j in data[row]) {
        return data[pos.i][pos.j];  // nested object
      }
    }
  }
  return undefined;                 // couldn't find anything
};
