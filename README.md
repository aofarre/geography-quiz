# Atlas Quest

A browser-based geography quiz. Identify highlighted oceans, continents, and countries in ten-question rounds.

## Run and publish

Serve this directory with any static web server; no build step or dependencies are required. Opening `index.html` directly may not work because browsers restrict local file requests.

To publish on GitHub Pages, push the files to the repository, then under **Settings → Pages**, choose **Deploy from a branch**, select the branch containing the app and `/ (root)`, and save. Paths are relative, so the app also works under a repository subpath.

To run the browser checks, visit `tests/quiz.html` on the same local server.

## Coverage and sources

The country pool is the **union**, without duplicates, of these snapshots, checked 15 November 2026:

- [EU member countries](https://european-union.europa.eu/principles-countries-history/eu-countries_en) (27).
- [OECD members](https://www.oecd.org/en/about/members-partners.html) (38).
- [NATO members](https://www.nato.int/en/about-us/organization/nato-member-countries) (32).
- [The 20 most populous countries in 2026](https://www.populationpyramid.net/population-size-per-country/2026/), based on UN World Population Prospects estimates. The ranking is a fixed snapshot, not a live feed.
- The 23 sovereign countries of North America, including Central America and the Caribbean, as described by [Nations Atlas](https://nationsatlas.com/north-america/). Dependent territories are not included as separate countries.

Map boundaries come from [Natural Earth](https://www.naturalearthdata.com/), public domain, using [this pinned version](https://github.com/nvkelso/natural-earth-vector/tree/ca96624a56bd078437bca8184e78163e5039ad19) of its 1:50m country polygons. Natural Earth draws disputed boundaries according to its own mapping policy; this is not an assertion of political recognition. The seven-continent model groups Australia and the islands of Oceania together as **Oceania**. Ocean highlights are approximate teaching regions, not authoritative maritime boundaries; the Southern Ocean is shown south of 60°S.

Update the lists in `app.js` when refreshing the snapshot.
