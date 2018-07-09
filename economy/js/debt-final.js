function debtFinal() {
  var playing = true;

  var sidebarHTML = [
    "<p>National debt grew under George W Bush with wars in Afghanistan and Iraq, tax cuts, expansion of Medicare vouchers, and financial bailouts.</p><p>Under Obama, debt continued to increase due to a stimulus programme, extension of Bush-era tax cuts, and high defence spending.</p>",
    "<p>The weak state of the economy, initially triggered by the collapse of the housing bubble, has lowered the amount the government collects in taxes, which widens budget deficits and thus increases national debt.</p>",
    "<p>The size of the debt is a key issue motivating US Republicans, especially the conservative Tea Party movement.</p>"
  ];

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
      width = 730 - margin.left - margin.right,
      height = 346 - margin.top - margin.bottom,
      xscale = d3.time.scale().range([0,width]),
      yscale = d3.scale.linear().range([height,1]),
      timeFormat = d3.time.format("%Y");

  function create_graph(error, results) {
    var raw = results[0];

    var minDate = timeFormat.parse("1913");
    var maxDate = timeFormat.parse("2012");

    var color = function(i) { return d3.hcl(380-i*140,50,50).toString(); };

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

    var xAxis = d3.svg.axis().scale(xscale).tickValues([
        timeFormat.parse("1913"),
        timeFormat.parse("1945"),
        timeFormat.parse("1980"),
        timeFormat.parse("1992"),
        timeFormat.parse("2001"),
        timeFormat.parse("2007"),
        timeFormat.parse("2012")]);
    var yAxis = d3.svg.axis().scale(yscale).orient("left").tickFormat(d3.format(",.0f"));

    var svg = d3.select("#chart5")
      .html("")
      .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
      .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    var legend = svg 
      .append("g").attr("class", "legend")
      .selectAll("text")
      .data(["Total Public Debt", "GDP"])
      .enter().append("text")
        .style("fill", function(d,i) { return color(i) })
        .style("fill-opacity", 0) 
        .attr("text-anchor", "begin")
        .attr("alignment-baseline", "middle")
        .attr("x", function(d,i) { return xscale(maxDate) + 4;})
        .attr("y", function(d,i) { return yscale(_.last(data[i].values).value);})
        .text(function(d) { return d });

    // Add the clip path.
    svg.append("svg:clipPath")
        .attr("id", "clip5")
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

    var original = _(data).map(function(d) {
          return d.values;
        }).slice(0,2);

    var adjusted = _(original).map(function(series) {
      return _(series).map(function(d) {
        return {
          Year: d.Year,
          value: d.value / inflation[d.Year]
        }
      });
    });

    var lines = svg.selectAll("path.line")
        .data(original)
        .enter().append("path")
        .attr("class", "line")
        .attr("stroke", function(d,i) { return color(i) })
        .style("stroke-opacity", function(d,i) { return 0; })
        .attr("clip-path", "url(#clip5)")
        .attr("d", path());

    var stepNames = [
      "Nominal Debt",
      "Gross Domestic Product",
      "Inflation Adjusted"
    ];

    var steps = d3.select("#chart-steps5")
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
      d3.selectAll("#chart-steps5 .step").classed("active", false);
      d3.select("#chart-steps5 .step-" + i).classed("active", true);
      d3.select("#sidebar-notes")
          .html(sidebarHTML[i])
    };

    function step1() {
      updateSidebar(0);

      svg.append("text")
        .attr("class", "annotation")
        .attr("text-anchor", "middle")
        .attr("x", 340)
        .attr("y", 138)
        .text("Public debt has been growing rapidly since 2001.")
        .style("fill-opacity", 0)
        .transition()
        .duration(0).delay(700)
        .style("fill-opacity", 1);

      lines.transition().duration(0).delay(50)
        .style("stroke-opacity", function(d,i) { return i == 0 ? 1 : 0;});
      legend.transition().duration(0).delay(50)
        .style("fill-opacity", function(d,i) { return i == 0 ? 1 : 0;});

      svg.selectAll("path.line")
        .data(original)
        .transition()
        .delay(140).duration(800)
        .attr("d", path());

      svg
        .selectAll(".legend text")
          .transition()
          .delay(140).duration(800)
          .attr("y", function(d,i) { return yscale(_.last(data[i].values).value);})

      svg.select(".y-label")
        .transition()
        .delay(400)
        .text("Billions of Dollars");

      setTimeout(function() {
        if (!playing) return;
        clearOut();
        setTimeout(step2, 600);
      }, 3200);
    };

    function step2() {
      updateSidebar(1);

      lines.transition().duration(0).delay(0)
        .style("stroke-opacity", 1);
      legend.transition().duration(0).delay(0)
        .style("fill-opacity", 1);

      svg.append("text")
        .attr("class", "annotation")
        .attr("text-anchor", "end")
        .attr("x", xscale(timeFormat.parse("2012"))-20)
        .attr("y", 34)
        .text("In 2012, public debt surpassed GDP.")
        .style("fill-opacity", 0)
        .transition()
        .duration(0).delay(700)
        .style("fill-opacity", 1);

      svg.selectAll("path.line")
        .data(original)
        .transition()
        .delay(100).duration(800)
        .attr("d", path());

      svg
        .selectAll(".legend text")
          .transition()
          .delay(100).duration(800)
          .attr("y", function(d,i) { return yscale(_.last(data[i].values).value);})

      svg.select(".y-label")
        .transition()
        .delay(400)
        .text("Billions of Dollars");

      setTimeout(function() {
        if (!playing) return;
        clearOut();
        step3();
      }, 3200);
    };

    function step3() {
      updateSidebar(2);

      lines.transition().duration(0).delay(0)
        .style("stroke-opacity", 1);
      legend.transition().duration(0).delay(0)
        .style("fill-opacity", 1);

      svg.selectAll("path.line")
        .data(adjusted)
        .transition()
        .delay(500).duration(1800)
        .attr("d", path());

    svg.select(".y-label")
      .transition()
      .delay(1100)
      .text("Billions, Adjusted to 2000 Dollars");

    svg.append("text")
      .attr("class", "annotation")
      .attr("text-anchor", "middle")
      .attr("x", 220)
      .attr("y", 140)
      .text("Adjusting for inflation...")
      .style("fill-opacity", 0)
      .transition()
      .duration(0).delay(100)
      .style("fill-opacity", 1)
      .transition()
      .duration(0).delay(1800)
      .style("fill-opacity", 0);
 
    svg.append("text")
      .attr("class", "annotation")
      .attr("text-anchor", "middle")
      .attr("x", 484)
      .attr("y", 64)
      .text("Real GDP fell during the recession, and has since grown slowly.")
      .style("fill-opacity", 0)
      .transition()
      .duration(0).delay(1600)
      .style("fill-opacity", 1);
 
    svg
      .selectAll(".legend text")
        .transition()
        .delay(500).duration(1800)
        .attr("y", function(d,i) { return yscale(_.last(data[i].values).value/inflation[timeFormat(maxDate)]);})
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
  };
};
