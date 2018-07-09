function debt1() {
  var sources = [
    "Public Debt",
  ];

  var margin = {top: 20, right: 140, bottom: 20, left: 40},
      width = 800 - margin.left - margin.right,
      height = 400 - margin.top - margin.bottom,
      xscale = d3.time.scale().range([0,width]),
      yscale = d3.scale.linear().range([height,1]),
      timeFormat = d3.time.format("%Y");

  d3.csv("data/cbo-revenues-outlays-deficits-surpluses-debt.csv", function(raw) {
    // convert years to Unix time
    _(raw).each(function(d) {
      d.date = (timeFormat.parse(d.Year)).getTime();
      _(sources).each(function(source) {
        d[source] = parseFloat(d[source].replace(",", ""));
      });
    });

    var minDate = (new Date(raw[0].date)).getTime();
    var currentMaxDate = (new Date(2012, 6)).getTime();
    var maxDate = (new Date(raw[raw.length-1].date)).getTime();
    var dates = _(raw).pluck('date');

    var color = d3.scale.category10();

    var data = [];
    _(sources)
      .each(function(k) {
        if (k == "date") return;
        data.push({
          key: k,
          values: _(raw)
            .chain()
            .map(function(d) {
              return {
                date: d.date,
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
    var yAxis = d3.svg.axis().scale(yscale).orient("left").tickFormat(d3.format(",.0f"));

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
