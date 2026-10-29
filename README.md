# Reaction Lab

Go/no-go reaction time tests, as a static site for GitHub Pages.

1. **Shape test** – a goal shape is shown at the top. 3D shapes (cube, sphere, pyramid, cylinder, cone) flash up one at a time, all in the same blue; click (or press Space) only when the goal shape appears.
2. **Shape + colour test** – the goal is a shape *and* a colour (e.g. "Red Cube"), with shapes in red, yellow, green, blue or purple. Click only when both match. Most distractors are near-misses: right shape in the wrong colour, or the right colour on the wrong shape.
3. **Focus test** – stare at the dot and click when it turns green. Turn your sound up. 🤫

Each test runs 10 goal appearances, with 0–2 distractors before each one and a random 0.6–1.8 s wait between stimuli. A goal that isn't clicked within 1.5 s counts as a miss.

## Results / CSV

After a test you get average, median and best times plus a per-attempt table. **Download CSV** gives two columns, one row per goal attempt (1–10):

```csv
test_number,ms
1,312
2,287
3,
```

`ms` is the time from the goal appearing to the click; it's empty if that attempt was missed.

## Run locally

```bash
python3 -m http.server 8125
```

Then open http://localhost:8125. Friends on the same Wi-Fi can use `http://<your-local-ip>:8125`.
