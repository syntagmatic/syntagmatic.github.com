function has(id, nuts) {
  return _(nuts).detect(function(d) {
    return d.id == id;
  });
};

function like(str, name) {
  return name.toLowerCase().indexOf(str) != -1;
};

function get(obj, key) {
  if (!obj)
    return null;
  if (key in obj)
    return obj[key];
  else
    return null;
}

var transformed = [];

_(foodgroups).each(function(group) {
  var transformed_group = _(group.foods)
    .chain()
    .filter(function(food) {
      var nuts = food.nutrients;
      return !(like('dressing', food.name)) &&
             (like('oil', food.name));
      })
    .map(function(food) {
      return {
        name: food.name,
        group: group.name,
        // "carbohydrate (g)": get(_(food.nutrients).find(function(d) { return d.id == "205" }), 'amount'),
        // "sugars (g)": get(_(food.nutrients).find(function(d) { return d.id == "269" }), 'amount'),
        // "fat (g)": get(_(food.nutrients).find(function(d) { return d.id == "204" }), 'amount'),
        // "water (g)": get(_(food.nutrients).find(function(d) { return d.id == "255" }), 'amount'),
        // "calories": get(_(food.nutrients).find(function(d) { return d.id == "208" }), 'amount'),
        "saturated (g)": get(_(food.nutrients).find(function(d) { return d.id == "606" }), 'amount'),
        "monounsat (g)": get(_(food.nutrients).find(function(d) { return d.id == "645" }), 'amount'),
        "polyunsat (g)": get(_(food.nutrients).find(function(d) { return d.id == "646" }), 'amount'),
        "trans fats (g)": get(_(food.nutrients).find(function(d) { return d.id == "605" }), 'amount'),
        "trans-monoenoic (g)": get(_(food.nutrients).find(function(d) { return d.id == "693" }), 'amount'),
        "trans-polyenoic (g)": get(_(food.nutrients).find(function(d) { return d.id == "695" }), 'amount'),
        "16:0 (g)": get(_(food.nutrients).find(function(d) { return d.id == "613" }), 'amount'),
        "18:0 (g)": get(_(food.nutrients).find(function(d) { return d.id == "614" }), 'amount'),
        "18:1 undiff (g)": get(_(food.nutrients).find(function(d) { return d.id == "617" }), 'amount'),
        "18:2 undiff (g)": get(_(food.nutrients).find(function(d) { return d.id == "618" }), 'amount'),
        "18:3 undiff (g)": get(_(food.nutrients).find(function(d) { return d.id == "619" }), 'amount'),
        //"phytosterols (g)": get(_(food.nutrients).find(function(d) { return d.id == "636" }), 'amount') / 1000,
        "14:0 (g)": get(_(food.nutrients).find(function(d) { return d.id == "612" }), 'amount'),
        //"cholesterol (g)": get(_(food.nutrients).find(function(d) { return d.id == "601" }, 'amount')) / 1000
      }
      })
    .sortBy(function(d) { return d.name; })
    .value();

  transformed = transformed.concat(transformed_group);
});

  $('body').html("var foods= " + JSON.stringify(transformed) + ";");

