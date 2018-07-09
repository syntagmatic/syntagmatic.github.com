$ ->
  # Set up
  chart = d3.select("#canvas")
  minTime = 1976
  maxTime = 2009
  t = minTime
  $('h2').text(t)

  # Some Data Structures
  window.countryList = []
  ct = 0
  window.yearlyTotals = []
  for masterCountry of countryTotals
    countryList.push
      country: masterCountry
      colorClass: "c"+ct
      color: Raphael.getColor()
    yearlyTotals.push
      country: masterCountry
      years: {}
    ct++

  makeData = (countries) ->
    for country, dates of countries
      for i in countryList
        if country is i.country
          i.cash = dates[t]
      for b in yearlyTotals
        if country is b.country
          for u,v of dates
            b.years[u] or= 0
            b.years[u] += v
    return countryList

  getCountryClass = (country) ->
    for c in countryList
      if country is c.country
        return c.colorClass

  getCountryYearTotal = (country, year) ->
    for c in yearlyTotals
      if country is c.country
        return "$" + formatMoney c.years[year]

  # Init JSON and make each bar
  d3.json "data/aid.json", (depts) ->
    for dept, countries of depts
      bar = chart.data(makeData(countries)).append("div").attr("class","bar")
      bar.append("label").text(dept)
      barInner = bar.append("div").attr("class","barInner")
      bar.append("p")
      bar.append("div").attr("class","clearfix")
      fillBar(countries, bar, barInner)
      updateBars countries, bar, barInner
      runHovers()

  fillBar = (countries, bar, barInner) ->
    barVal = 0
    $("h2").text(t)
    for country, dates of countries
      val = dates[t]
      barVal += val
      if val isnt null
        section = barInner.append("div")
                        .attr("class","section")
        makeSection(val, section, country)
    barInner.attr("width", scaleData(barVal) + "px")
    bar.selectAll("p").text("$"+formatMoney(barVal))

  # Make each block within each bar
  makeSection = (val, section, country) ->
    newVal = scaleData(val)
    color = getCountryClass country
    section.style("width", newVal + "px")
           .attr("title", country + ": $" + formatMoney(val))
           .classed color, true

  # Event Functions
  updateBars = (countries, bar, barInner) ->
    $('body').bind 'updateBars', ->
      barInner.selectAll("div").remove()
      fillBar(countries, bar, barInner)
      runHovers()

  # Helper Functions
  scaleData = (val) ->
    if val*.000000099999 < 1
      newVal = 1
    else
      newVal = val*.000000099999

  getOtherClass = (element, excludedClass) ->
    classes = element.attr("className").split(" ")
    for classA in classes
      if classA isnt excludedClass
        return classA

  # Event Binding
  $("h2").bind "click", ->
    if t < maxTime
      t += 1
    $('body').trigger('updateBars')

  runHovers = ->
    colorClass = ""
    $('.section').bind "mouseenter", ->
      colorClass = getOtherClass $(this), "section"
      for c in countryList
        if colorClass is c.colorClass
          $('.'+colorClass).css({background:c.color})
          $('#countryTotal').text("#{c.country} : #{getCountryYearTotal(c.country, t)}")
    .bind "mouseleave", ->
      $('.'+colorClass).css({background:'transparent'})
      $('#countryTotal').text('')

# Helper and Setup functions
getNewAid = (d) ->
  newAid = {}
  makeDate = (dt) ->
    dt = "" + dt
    y = dt.substring(2, 6)
    return parseInt(y)

  for row in d
    for key, val of row
      newAid[row.program_name] or= {}
      newAid[row.program_name][row.country_name] or= {}
      if key.substring(0,2) is "FY"
        if key.substring(6,8).length isnt 2
          date = makeDate(key)
          newAid[row.program_name][row.country_name][date] = val

formatMoney = (val) ->
	###
	val = val.toString()
  len = val.length
  num_commas = Math.ceil(len/3)- 1
  newVal = val.substr(-3, 3)
  if num_commas > 0
    for i in [1..num_commas]
      pos = -(1+i)*3
      newVal = val.substr(pos, 3) + "," + newVal
  return newVal
	###
	return val.toString()
