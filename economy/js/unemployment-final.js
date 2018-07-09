function unemploymentFinal() {
  var playing = true;

  var sidebarHTML = [
    "<p>The rate of jobless Americans is significantly higher than it was before the financial collapse of 2008.</p>",
    "<p>The crisis caused jobless numbers to soar, peaking at 10 per cent. Since then, the numbers have fallen, but slowly. In September 2012, the unemployment rate slid down to 7.8 per cent, breaking the 8 per cent barrier for the first time in 44 months.</p>",
    "<p>As one might expect, high levels of unemployment tend to hurt the incumbent president and aid his opponent.  Accordingly, the Mitt Romney campaign has with some exceptions focused its rhetoric on the still far-from-robust economy.</p>",
    "<p>The state of Nevada, one of the worst-hit by the crisis, now has the highest unemployment rate in the country, at 12.1 per cent. Meanwhile, North Dakota – which is enjoying a big energy boom – was virtually unaffected. Just 3 per cent there are jobless.</p>"
  ];

  var margin = {top: 20, right: 120, bottom: 20, left: 30},
      width = 730 - margin.left - margin.right,
      height = 346 - margin.top - margin.bottom,
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

    var svg = d3.select("#chart0")
      .html("")
      .data(_(data).map(function(d) { return d.values }))
      .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
      .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    // Add the clip path.
    svg.append("svg:clipPath")
        .attr("id", "clip0")
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
        .call(yAxis)
    .append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 6)
      .attr("dy", ".71em")
      .style("text-anchor", "end")
      .style("font-weight", "bold")
      .attr("class", "y-label")
      .text("% of Labor Force");

;

    var lines = svg.selectAll("path.line")
        .data(_(data).map(function(d) {
          return d.values;
        }))
        .enter().append("path")
        .attr("class", "line")
        .attr("stroke", function(d,i) { return color(i) })
        .attr("clip-path", "url(#clip0)")
        .attr("d", d3.svg.line()
          .x(function(d) { return xscale(d.date); })
          .y(function(d) { return yscale(d.value); }));

    var legened = svg 
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
    function shiftDate(new_end) {
        currentMaxDate = timeFormat.parse(new_end).getTime();
        currentMinDate = d3.time.month.round(new Date(currentMaxDate - 8*365*25*60*60*1000));
        xscale.domain([currentMinDate, currentMaxDate]);

        var t = svg.transition().duration(1500).ease('quad-in-out');
        t.selectAll(".legend text")
        .attr("y", function(d,i) { return yscale(_.last(beforeCurrent(data[i].values)).value);})
        t.select(".x.axis").call(xAxis);
        t.selectAll("path.line").attr("d", d3.svg.line()
          .x(function(d) { return xscale(d.date); })
          .y(function(d) { return yscale(d.value); }));
    };

    var stepNames = [
      "Clinton",
      "Bush",
      "Obama"
    ];

    var steps = d3.select("#chart-steps0")
      .html("")
      .selectAll(".step")
        .data([step1, step2, step3])
      .enter().append("span")
        .attr("class", function(d,i) { return "step step-" + i; })
        .text(function(d,i) { return stepNames[i]; })
        .on("click", function(step) {
          playing = false;
          clearOut();
          setTimeout(step, 140);
        });

    step1();

    function updateSidebar(i) {
      d3.selectAll("#chart-steps0 .step").classed("active", false);
      d3.select("#chart-steps0 .step-" + i).classed("active", true);
      d3.select("#sidebar-notes")
          .html(sidebarHTML[i])
    };


    function step1() {
      updateSidebar(0);

      shiftDate("January 2001");

      setTimeout(function() {
        if (!playing) return;
        clearOut();
        setTimeout(step2, 600);
      }, 3200);
    };
    function step2() {
      updateSidebar(1);

      shiftDate("January 2009");

      setTimeout(function() {
        if (!playing) return;
        clearOut();
        setTimeout(step3, 600);
      }, 3200);
    };
    function step3() {
      updateSidebar(2);

      shiftDate("January 2012");

      setTimeout(function() {
        if (!playing) return;
        //clearOut();
        //setTimeout(step2, 600);
      }, 3200);
    };

    function clearOut() {
      svg.selectAll(".annotation")
        .transition()
        .duration(0).delay(0)
        .style("fill-opacity", 0)
        .transition()
        .delay(1400)
        .remove();
    };
    function beforeCurrent(values) {
      return _(values).filter(function(d) { return d.date < currentMaxDate });
    };


    // to bail out
    window.chartInvalidate = function() { playing = false};
  };
};
