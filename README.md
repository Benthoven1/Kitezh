# Mulvium

Landing site for Mulvium, a non-profit foundation reimagining social responsibility.

## Structure

- `index.html` — landing page. 3D clay-colored solar system on white; hover a planet
  for a division, hover the star to enter a 2D birds-eye view with vision content.
- `css/style.css` — shared stylesheet.
- `js/main.js` — Three.js module. Handles the 3D cosmos, 2D transition, and
  interactions.
- `pages/meet-mulvium/` — one placeholder page per division (International Festival
  Orchestra, Castles, Education, Economic Zones).
- `pages/about/` — People, Careers, Contact Us.

## Running locally

ES modules and an import map are used, so open over HTTP rather than `file://`:

```
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

## Source material

The 2D content is adapted from `Kitezh, The Vision.pdf`.
