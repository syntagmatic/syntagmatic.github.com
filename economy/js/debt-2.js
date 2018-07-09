function debt2() {
  var sources = [
    {
      name: "Total Public Debt",
      source: "data/treasury-debt.csv",
    },
    {
      name: "GDP",
      source: "data/bea-gdp.csv"
    },
    {
      name: "Inflation",
      source: "data/bls-inflation-annual.csv"
    }
  ];

  // load data
  var q = queue();
  _(sources).each(function(v) {
    q.defer(utils.load_csv(v.source))
  });
  q.await(create_graph);

  var margin = {top: 20, right: 140, bottom: 20, left: 40},
      width = 800 - margin.left - margin.right,
      height = 400 - margin.top - margin.bottom,
      xscale = d3.time.scale().range([0,width]),
      yscale = d3.scale.linear().range([height,1]),
      timeFormat = d3.time.format("%Y");

  function create_graph(error, results) {
    var raw = results[0];

    var minDate = timeFormat.parse("1913");
    var maxDate = timeFormat.parse("2011");

    var color = d3.scale.category10();

    var data = [];
    _(sources)
      .each(function(source,i) {
        var key = source.name;
        data.push({
          key: key,
          values: _(results[i])
            .chain()
            .map(function(d) {
              return {
                Year: d.Year,
                value: parseFloat(d[key]) ? parseFloat(d[key]) : null
              }
            })
            .filter(function(d) {
              return d.value != null;
            })
            .sortBy(function(d) {
              return d.Year;
            })
            .value()
        });
      });

    // Inflation lookup
    var inflation = {};
    _(results[2]).each(function(d) {
      inflation[d.Year] = parseFloat(d.Inflation);
    });

    var flattened = _(data[0].values).pluck('value');

    xscale.domain([minDate, maxDate]);
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
      .data(["Total Public Debt", "GDP"])
      .enter().append("text")
        .style("fill", function(d,i) { return color(i) })
        .attr("text-anchor", "begin")
        .attr("alignment-baseline", "middle")
        .attr("x", function(d,i) { return xscale(maxDate) + 4;})
        .attr("y", function(d,i) { return yscale(_.last(data[i].values).value);})
        .text(function(d) { return d });

    // Add the clip path.
    svg.append("svg:clipPath")
        .attr("id", "clip")
      .append("svg:rect")
        .attr("width", width)
        .attr("height", height);

    svg.append("g")
      .attr("class", "y axis")
      .call(yAxis)
    .append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 6)
      .attr("dy", ".71em")
      .style("text-anchor", "end")
      .style("font-weight", "bold")
      .attr("class", "y-label")
      .text("Billions of Dollars");

    svg.append("svg:g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis);

    svg.append("svg:g")
        .attr("class", "y axis")
        .attr("transform", "translate(0,0)")
        .call(yAxis);

    function path() {
      return d3.svg.line()
          .x(function(d) { return xscale(timeFormat.parse(d.Year)); })
          .y(function(d) { return yscale(d.value); });
    };

    svg.selectAll("path.line")
        .data(_(data).map(function(d) {
          return d.values;
        }).slice(0,2))
        .enter().append("path")
        .attr("class", "line")
        .attr("stroke", function(d,i) { return color(i) })
        .attr("clip-path", "url(#clip)")
        .attr("d", path());

    step2();

    function step2() {
      var original = d3.selectAll("path.line").data();
      console.log(original);
      var adjusted = _(original).map(function(series) {
        return _(series).map(function(d) {
          return {
            Year: d.Year,
            value: d.value / inflation[d.Year]
          }
        });
      });

      svg.selectAll("path.line")
        .data(adjusted)
        .transition()
        .delay(1200).duration(1800)
        .attr("d", path());

    svg.select(".y-label")
      .transition()
      .delay(1800)
      .text("Billions, Adjusted to 2000 Dollars");

    svg.append("text")
      .attr("class", "annotation")
      .attr("text-anchor", "middle")
      .attr("x", 220)
      .attr("y", 140)
      .text("Adjusting for inflation...")
      .style("fill-opacity", 0)
      .transition()
      .duration(0).delay(700)
      .style("fill-opacity", 1)
      .transition()
      .duration(0).delay(2400)
      .style("fill-opacity", 0);
 
    svg
      .selectAll(".legend text")
        .transition()
        .delay(1200).duration(1800)
        .attr("y", function(d,i) { return yscale(_.last(data[i].values).value/inflation[timeFormat(maxDate)]);})
    };
  };
};
