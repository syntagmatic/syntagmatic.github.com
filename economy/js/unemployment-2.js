function unemployment2() {
  var margin = {top: 20, right: 120, bottom: 20, left: 30},
      width = 800 - margin.left - margin.right,
      height = 325 - margin.top - margin.bottom,
      xscale = d3.time.scale().range([0,width]),
      yscale = d3.scale.linear().range([height,0]),
      timeFormat = d3.time.format("%B %Y");

  var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  var sources = [
    {
      name: "Unemployed",
      source: "data/bls-unemployment-U-3.csv"
    },
    {
      name: "Discouraged",
      source: "data/bls-unemployment-U-5.csv"
    },
    {
      name: "Part-time",
      source: "data/bls-unemployment-U-6.csv"
    },
  ];

  // load data
  var q = queue();
  _(sources).each(function(v) {
    q.defer(utils.load_csv(v.source))
  });
  q.await(create_graph);

  function create_graph(error, results) {
    // clean up BLS data format
    var data = _(results).map(function(raw,i) {
      _(raw).each(function(d) {
        delete d[''];
        delete d['Annual'];
      });
      return {
        key: sources[i].name,
        values: utils.date_value(raw)
      }
    });

    var flattened = _(data).chain().pluck('values').flatten().value();
    var values = _(flattened).pluck('value');
    var dates = _(flattened).pluck('date');

    var minDate = (new Date(1993, 0)).getTime();
    var currentMinDate = (new Date(1993, 0)).getTime();
    var currentMaxDate = (new Date(2001, 0)).getTime();
    var maxDate = (new Date(d3.max(dates))).getTime();

    var color = d3.scale.category10();

    xscale.domain([minDate, currentMaxDate]);
    yscale.domain([0.95*d3.min(values), 1.05*d3.max(values)]);

    var xAxis = d3.svg.axis().scale(xscale);
    var yAxis = d3.svg.axis().scale(yscale).orient("left");

    var svg = d3.select("#chart")
      .data(_(data).map(function(d) { return d.values }))
      .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
      .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

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

    svg 
      .append("g").attr("class", "legend")
      .selectAll("text")
      .data(_(data).pluck('key'))
      .enter().append("text")
        .style("fill", function(d,i) { return color(i) })
        .attr("text-anchor", "begin")
        .attr("alignment-baseline", "middle")
        .attr("x", function(d,i) { return xscale(currentMaxDate) + 4;})
        .attr("y", function(d,i) { return yscale(_.last(beforeCurrent(data[i].values)).value);})
        .text(function(d) { return d });

    // transition
    d3.selectAll(".date-step")
      .on("click", function() {
        currentMaxDate = timeFormat.parse(d3.select(this).attr("data-year")).getTime();
        currentMinDate = d3.time.month.round(new Date(currentMaxDate - 8*365*25*60*60*1000));
        xscale.domain([currentMinDate, currentMaxDate]);

        var t = svg.transition().duration(1500).ease('quad-in-out');
        t.selectAll(".legend text")
        .attr("y", function(d,i) { return yscale(_.last(beforeCurrent(data[i].values)).value);})
        t.select(".x.axis").call(xAxis);
        t.selectAll("path.line").attr("d", d3.svg.line()
          .x(function(d) { return xscale(d.date); })
          .y(function(d) { return yscale(d.value); }));
    });

    function beforeCurrent(values) {
      return _(values).filter(function(d) { return d.date < currentMaxDate });
    };
  };
};
