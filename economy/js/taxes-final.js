function taxesFinal() {
  var playing = true;

  var sidebarHTML = [
    "<p>Despite a handful of new laws, the US tax code has not radically changed compared to four years ago, but the politics surrounding the tax issue have become more heated.</p>",
    "<p>Although the Republican Party has traditionally favoured lower tax rates, it has become even more staunchly anti-tax in the past four years - in part because of the ascendance of the conservative Tea Party movement. Republicans argue that lowering tax rates will encourage businesses to hire more workers and thus lower unemployment.</p>",
    "<p>Many Democratic politicians support tax cuts for the lower- and middle-class, though most party members say tax cuts on the wealthy would not lead to more jobs being created, and would increase the size of the national debt.</p>"
  ];

  var sources = [
    "Individual income",
    "Corporate Income",
    "Social Insurance",
    "Total"
  ];

  var margin = {top: 20, right: 140, bottom: 20, left: 40},
      width = 730 - margin.left - margin.right,
      height = 346 - margin.top - margin.bottom,
      xscale = d3.time.scale().range([0,width]),
      yscale = d3.scale.linear().range([height,1]),
      timeFormat = d3.time.format("%Y");

  d3.csv("data/cbo-taxes.csv", function(raw) {
    // convert years to Unix time
    _(raw).each(function(d) {
      d.date = (timeFormat.parse(d.Year)).getTime();
      _(sources).each(function(source) {
        d[source] = parseFloat(d[source].replace(",", ""));
      });
    });

    var minDate = (new Date(raw[0].date)).getTime();
    var currentMaxDate = (new Date(2011, 0)).getTime();
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

    var svg = d3.select("#chart4")
      .html("")
      .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
      .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    var legend = svg 
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
        .attr("id", "clip4")
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
      .text("Billions of Dollars");

    var lines = svg.selectAll("path.line")
        .data(_(data).map(function(d) {
          return d.values;
        }))
        .enter().append("path")
        .attr("class", "line")
        .attr("stroke", function(d,i) { return color(i) })
        .attr("clip-path", "url(#clip4)")
        .attr("d", d3.svg.line()
          .x(function(d) { return xscale(d.date); })
          .y(function(d) { return yscale(d.value); }));

    var stepNames = [
      "Total",
      "Income",
      "Corporate"
    ];

    var steps = d3.select("#chart-steps4")
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
      d3.selectAll("#chart-steps4 .step").classed("active", false);
      d3.select("#chart-steps4 .step-" + i).classed("active", true);
      d3.select("#sidebar-notes")
          .html(sidebarHTML[i])
    };

    function step1() {
      updateSidebar(0);

      setTimeout(function() {
        if (!playing) return;
        clearOut();
        setTimeout(step2, 600);
      }, 3200);
    };
    function step2() {
      updateSidebar(1);

      setTimeout(function() {
        if (!playing) return;
        clearOut();
        setTimeout(step3, 600);
      }, 3200);
    };
    function step3() {
      updateSidebar(2);
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


    // to bail out
    window.chartInvalidate = function() { playing = false};
  });
};
