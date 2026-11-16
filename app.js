"use strict";

// ISO codes are snapshots of the sources linked in README.md.
const groups = {
  eu: "AUT BEL BGR HRV CYP CZE DNK EST FIN FRA DEU GRC HUN IRL ITA LVA LTU LUX MLT NLD POL PRT ROU SVK SVN ESP SWE",
  oecd: "AUS AUT BEL CAN CHL COL CRI CZE DNK EST FIN FRA DEU GRC HUN ISL IRL ISR ITA JPN KOR LVA LTU LUX MEX NLD NZL NOR POL PRT SVK SVN ESP SWE CHE TUR GBR USA",
  nato: "ALB BEL BGR CAN HRV CZE DNK EST FIN FRA DEU GRC HUN ISL ITA LVA LTU LUX MNE MKD NLD NOR POL PRT ROU SVK SVN ESP SWE TUR GBR USA",
  population: "IND CHN USA IDN PAK NGA BRA BGD RUS ETH MEX JPN EGY PHL COD VNM IRN TUR DEU TZA",
  northAmerica: "CAN USA MEX BLZ CRI SLV GTM HND NIC PAN ATG BHS BRB CUB DMA DOM GRD HTI JAM KNA LCA VCT TTO"
};
const countryCodes = [...new Set(Object.values(groups).flatMap(group => group.split(" ")))];
const countryNames = {
  ATG: "Antigua and Barbuda", BHS: "The Bahamas", COD: "Democratic Republic of the Congo",
  CZE: "Czechia", DEU: "Germany", GBR: "United Kingdom", KNA: "Saint Kitts and Nevis",
  KOR: "South Korea", MKD: "North Macedonia", NLD: "Netherlands", RUS: "Russia",
  SVK: "Slovakia", TUR: "Türkiye", USA: "United States", VCT: "Saint Vincent and the Grenadines"
};
const continents = ["Africa", "Antarctica", "Asia", "Europe", "North America", "Oceania", "South America"];
const oceans = ["Arctic Ocean", "Atlantic Ocean", "Indian Ocean", "Pacific Ocean", "Southern Ocean"];
const oceanRegions = {
  "Arctic Ocean": [[[-180, 90], [180, 90], [180, 66], [-180, 66]]],
  "Southern Ocean": [[[-180, -60], [180, -60], [180, -90], [-180, -90]]],
  "Atlantic Ocean": [[[-100, 66], [20, 66], [20, -60], [-70, -60], [-70, -50], [-85, 10]]],
  "Indian Ocean": [[[20, 30], [120, 30], [120, -60], [20, -60]]],
  "Pacific Ocean": [[[-180, 66], [-100, 66], [-85, 10], [-70, -50], [-70, -60], [-180, -60]], [[120, 66], [180, 66], [180, -60], [120, -60]]]
};
const svgNS = "http://www.w3.org/2000/svg";
const $ = id => document.getElementById(id);
let features = [];
let countries = [];
let mode = "all";
let question = null;
let answered = 0;
let score = 0;
let bags = {};
let previous = {};
let mapReady = false;

function shuffle(items) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function svgElement(name, attributes = {}) {
  const element = document.createElementNS(svgNS, name);
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, value);
  return element;
}

function point([lon, lat]) {
  return [(lon + 180) * 1000 / 360, (90 - lat) * 500 / 180];
}

function ringPath(ring) {
  return ring.map((coordinate, index) => {
    const [x, y] = point(coordinate);
    return `${index ? "L" : "M"}${x.toFixed(2)},${y.toFixed(2)}`;
  }).join("") + "Z";
}

function geometryPath(geometry) {
  const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  return polygons.map(polygon => polygon.map(ringPath).join("")).join("");
}

function eachPoint(coordinates, callback) {
  if (typeof coordinates[0] === "number") callback(coordinates);
  else coordinates.forEach(item => eachPoint(item, callback));
}

function buildMap() {
  const map = $("map");
  map.replaceChildren();
  const grid = svgElement("g", { class: "graticule" });
  for (let lon = -150; lon <= 150; lon += 30) {
    const x = point([lon, 0])[0];
    grid.append(svgElement("path", { d: `M${x},0V500` }));
  }
  for (let lat = -60; lat <= 60; lat += 30) {
    const y = point([0, lat])[1];
    grid.append(svgElement("path", { d: `M0,${y}H1000` }));
  }
  map.append(grid, svgElement("g", { id: "ocean-layer" }));
  const land = svgElement("g", { id: "land-layer" });
  for (const feature of features) {
    const path = svgElement("path", {
      d: geometryPath(feature.geometry),
      class: "land",
      "fill-rule": "evenodd"
    });
    feature.path = path;
    land.append(path);
  }
  map.append(land, svgElement("g", { id: "overlay-layer" }));
}

function mapCountry(feature) {
  const [lon, lat] = [feature.properties.LABEL_X, feature.properties.LABEL_Y];
  let dx = 0, dy = 0;
  eachPoint(feature.geometry.coordinates, ([x, y]) => {
    if (Math.abs(x - lon) <= 65 && Math.abs(y - lat) <= 45) {
      dx = Math.max(dx, Math.abs(x - lon));
      dy = Math.max(dy, Math.abs(y - lat));
    }
  });
  const width = Math.min(1000, Math.max(100, Math.max(dx, dy * 2) * 2.8 * 1000 / 360));
  const height = width / 2;
  const [x, y] = point([lon, lat]);
  const left = Math.max(0, Math.min(1000 - width, x - width / 2));
  const top = Math.max(0, Math.min(500 - height, y - height / 2));
  $("map").setAttribute("viewBox", `${left} ${top} ${width} ${height}`);
  if (dx < 2 && dy < 2) {
    $("overlay-layer").append(svgElement("circle", { cx: x, cy: y, r: width * 0.015, class: "locator" }));
  }
}

function renderMap(type, item) {
  const map = $("map");
  map.setAttribute("viewBox", "0 0 1000 500");
  $("ocean-layer").replaceChildren();
  $("overlay-layer").replaceChildren();
  for (const feature of features) feature.path.classList.remove("highlight");

  if (type === "oceans") {
    for (const region of oceanRegions[item]) {
      $("ocean-layer").append(svgElement("path", { d: ringPath(region), class: "ocean-highlight" }));
    }
  } else if (type === "countries") {
    item.feature.path.classList.add("highlight");
    mapCountry(item.feature);
  } else {
    for (const feature of features) {
      const code = feature.properties.ADM0_A3;
      const continent = feature.properties.CONTINENT;
      if (code === "RUS" || code === "TUR") {
        if (item !== "Europe" && item !== "Asia") continue;
        const dividingLongitude = code === "RUS" ? 60 : 29;
        const boundary = point([dividingLongitude, 0])[0];
        const clip = svgElement("clipPath", { id: `clip-${code}` });
        clip.append(svgElement("rect", {
          x: item === "Europe" ? 0 : boundary, y: 0,
          width: item === "Europe" ? boundary : 1000 - boundary, height: 500
        }));
        const overlay = feature.path.cloneNode();
        overlay.classList.add("highlight");
        overlay.setAttribute("clip-path", `url(#clip-${code})`);
        $("overlay-layer").append(clip, overlay);
      } else if (continent === item) {
        feature.path.classList.add("highlight");
      }
    }
  }
}

function pool(type) {
  if (type === "countries") return countries;
  return type === "continents" ? continents : oceans;
}

function nextItem(type) {
  if (!bags[type] || bags[type].length === 0) {
    bags[type] = shuffle(pool(type));
    if (bags[type].length > 1 && bags[type][bags[type].length - 1] === previous[type]) {
      [bags[type][0], bags[type][bags[type].length - 1]] = [bags[type][bags[type].length - 1], bags[type][0]];
    }
  }
  const item = bags[type].pop();
  previous[type] = item;
  return item;
}

function nameOf(item) {
  return typeof item === "string" ? item : item.name;
}

function showQuestion() {
  $("result").hidden = true;
  $("quiz").hidden = false;
  const type = mode === "all" ? shuffle(["continents", "oceans", "countries"])[0] : mode;
  const item = nextItem(type);
  question = { type, item };
  $("question-number").textContent = `QUESTION ${String(answered + 1).padStart(2, "0")} / 10`;
  const singular = { countries: "country", continents: "continent", oceans: "ocean" }[type];
  $("category").textContent = singular.toUpperCase();
  $("prompt").textContent = `Which ${singular} is highlighted?`;
  $("feedback").textContent = "";
  $("next").hidden = true;
  const alternatives = shuffle(pool(type).filter(choice => choice !== item)).slice(0, 2);
  const options = shuffle([item, ...alternatives]);
  const answers = $("answers");
  answers.replaceChildren();
  options.forEach((option, index) => {
    const button = document.createElement("button");
    button.className = "answer";
    const letter = document.createElement("span");
    letter.className = "letter";
    letter.textContent = "ABC"[index];
    const label = document.createElement("span");
    label.textContent = nameOf(option);
    button.append(letter, label);
    button.addEventListener("click", () => selectAnswer(button, option, options));
    answers.append(button);
  });
  renderMap(type, item);
}

function selectAnswer(button, choice, options) {
  const correct = choice === question.item;
  answered++;
  if (correct) score++;
  $("score").innerHTML = `${score} <small>/ ${answered}</small>`;
  [...$("answers").children].forEach((answer, index) => {
    answer.disabled = true;
    if (options[index] === question.item) answer.classList.add("correct");
  });
  if (!correct) button.classList.add("incorrect");
  $("feedback").textContent = correct ? "That's right! Nice work." : `Not quite — it's ${nameOf(question.item)}.`;
  $("next").hidden = false;
  $("next").firstChild.textContent = answered === 10 ? "See results " : "Next question ";
}

function startRound() {
  answered = 0;
  score = 0;
  bags = {};
  previous = {};
  $("score").innerHTML = "0 <small>/ 0</small>";
  showQuestion();
}

async function loadMap() {
  $("loading").hidden = false;
  $("error").hidden = true;
  $("quiz").hidden = true;
  try {
    const response = await fetch("data/countries.geojson");
    if (!response.ok) throw new Error(`Map request failed: ${response.status}`);
    const data = await response.json();
    features = data.features;
    const byCode = new Map(features.map(feature => [feature.properties.ADM0_A3, feature]));
    const missing = countryCodes.filter(code => !byCode.has(code));
    if (missing.length) throw new Error(`Missing country boundaries: ${missing.join(", ")}`);
    countries = countryCodes.map(code => {
      const feature = byCode.get(code);
      return { code, name: countryNames[code] || feature.properties.NAME_LONG, feature };
    });
    buildMap();
    mapReady = true;
    $("loading").hidden = true;
    startRound();
  } catch (error) {
    console.error("Could not load geography data:", error);
    $("loading").hidden = true;
    $("error").hidden = false;
  }
}

document.querySelectorAll(".mode").forEach(button => {
  button.addEventListener("click", () => {
    mode = button.dataset.mode;
    document.querySelectorAll(".mode").forEach(item => {
      const active = item === button;
      item.classList.toggle("active", active);
      item.setAttribute("aria-pressed", String(active));
    });
    if (mapReady) startRound();
  });
});
$("next").addEventListener("click", () => {
  if (answered < 10) showQuestion();
  else {
    $("quiz").hidden = true;
    $("result").hidden = false;
    $("result-text").textContent = `You got ${score} out of 10 correct. Every journey starts somewhere.`;
  }
});
$("restart").addEventListener("click", startRound);
$("retry").addEventListener("click", loadMap);
loadMap();
