function housing2() {
  var cities = [
    "CA-Los Angeles",
    "CA-San Francisco",
    "DC-Washington",
    "MA-Boston",
    "NY-New York",
    "MI-Detroit",
    "NV-Las Vegas",
    "Composite-20"
  ];

  var margin = {top: 20, right: 90, bottom: 20, left: 30},
      width = 650 - margin.left - margin.right,
      height = 325 - margin.top - margin.bottom,
      xscale = d3.time.scale().range([0,width]),
      yscale = d3.scale.linear().range([height,0]),
      timeFormat = d3.time.format("%B %Y");

  d3.csv("data/case-shiller-small2.csv", function(raw) {
    // convert years to Unix time
    _(raw).each(function(d) {
      d.YEAR = (timeFormat.parse(d.YEAR)).getTime();
    });

    var minDate = (new Date(raw[0].YEAR)).getTime();
    var currentMaxDate = (new Date(2012, 6)).getTime();
    var maxDate = (new Date(raw[raw.length-1].YEAR)).getTime();
    var dates = _(raw).pluck('YEAR');

    var color = d3.scale.category10();

    var data = [];
    _(cities)
      .each(function(k) {
        if (k == "YEAR") return;
        data.push({
          key: k,
          values: _(raw)
            .chain()
            .map(function(d) {
              return {
                date: d.YEAR,
                value: parseFloat(d[k]) ? parseFloat(d[k]) : null
              }
            })
            .filter(function(d) {
              return d.value != null;
            })
            .value()
        });
      });

    var flattened = _(data).chain().pluck('values').flatten().pluck('value').value();

    xscale.domain([minDate, currentMaxDate]);
    yscale.domain([0.95*d3.min(flattened), 1.05*d3.max(flattened)]);

    var xAxis = d3.svg.axis().scale(xscale);
    var yAxis = d3.svg.axis().scale(yscale).orient("left");

    var svg = d3.select("#chart")
      .html("")
      .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
      .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    svg 
      .append("g").attr("class", "legend")
      .selectAll("text")
      .data(_(data).pluck('key'))
      .enter().append("text")
        .style("fill", function(d,i) { return color(i) })
        .attr("text-anchor", "begin")
        .attr("alignment-baseline", "middle")
        .attr("x", function(d,i) { return xscale(currentMaxDate) + 4;})
        .attr("y", function(d,i) { return yscale(_.last(data[i].values).value);})
        .text(function(d) { return d });

    // Add the clip path.
    svg.append("svg:clipPath")
        .attr("id", "clip")
      .append("svg:rect")
        .attr("width", width)
        .attr("height", height);

    svg.append("svg:g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis);

    svg.append("svg:g")
        .attr("class", "y axis")
        .attr("transform", "translate(0,0)")
        .call(yAxis);

    svg.selectAll("path.line")
        .data(_(data).map(function(d) {
          return d.values;
        }))
        .enter().append("path")
        .attr("class", "line")
        .attr("stroke", function(d,i) { return color(i) })
        .attr("clip-path", "url(#clip)")
        .attr("d", d3.svg.line()
          .x(function(d) { return xscale(d.date); })
          .y(function(d) { return yscale(d.value); }));

  });
};
