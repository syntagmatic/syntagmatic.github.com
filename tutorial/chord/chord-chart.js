d3.chart = d3.chart || {};

d3.chart.chord = function(container) {
    var self = {};

    var chord = d3.layout.chord()
      .padding(.05)
      .sortSubgroups(d3.descending)

    var w = 340,
        h = 340,
        r0 = Math.min(w, h) * .37,
        r1 = r0 * 1.1;

    var fill = d3.scale.category20c();

    self.update = function(data) {
      chord.matrix(data);
      self.render();
    };

    self.clear = function() {
        d3.select(container).selectAll('svg').remove();
    };

    self.render = function() {
        self.clear();

        var svg = d3.select(container)
          .append("svg")
            .attr("width", w)
            .attr("height", h)
          .append("g")
            .attr("transform", "translate(" + w / 2 + "," + h / 2 + ")");

        svg.append("g")
          .selectAll("path")
            .data(chord.groups)
          .enter().append("path")
            .style("fill", function(d) { return fill(d.index); })
            .style("stroke", function(d) { return fill(d.index); })
            .attr("d", d3.svg.arc().innerRadius(r0).outerRadius(r1))
            .on("mouseover", fade(.1, svg))
            .on("mouseout", fade(1, svg));

        var ticks = svg.append("g")
          .selectAll("g")
            .data(chord.groups)
          .enter().append("g")
          .selectAll("g")
            .data(groupTicks)
          .enter().append("g")
            .attr("transform", function(d) {
              return "rotate(" + (d.angle * 180 / Math.PI - 90) + ")"
                  + "translate(" + r1 + ",0)";
            });

        ticks.append("line")
            .attr("x1", 1)
            .attr("y1", 0)
            .attr("x2", 5)
            .attr("y2", 0)
            .style("stroke", "#000");

        ticks.append("text")
            .attr("x", 8)
            .attr("dy", ".35em")
            .attr("text-anchor", function(d) {
              return d.angle > Math.PI ? "end" : null;
            })
            .attr("transform", function(d) {
              return d.angle > Math.PI ? "rotate(180)translate(-16)" : null;
            })
            .text(function(d) { return d.label; });

        svg.append("g")
            .attr("class", "chord")
          .selectAll("path")
            .data(chord.chords)
          .enter().append("path")
            .style("fill", function(d) { return fill(d.target.index); })
            .attr("d", d3.svg.chord().radius(r0))
            .style("opacity", 1);
    };

    return self;
};


/* Utility functions */

/** Returns an array of tick angles and labels, given a group. */
function groupTicks(d) {
  var k = (d.endAngle - d.startAngle) / d.value;
  return d3.range(0, d.value, 20).map(function(v, i) {
    return {
      angle: v * k + d.startAngle,
      label: i % 5 ? null : v
    };
  });
}

/** Returns an event handler for fading a given chord group. */
function fade(opacity, svg) {
  return function(g, i) {
    svg.selectAll("g.chord path")
        .filter(function(d) {
          return d.source.index != i && d.target.index != i;
        })
      .transition()
        .style("opacity", opacity);
  };
}
