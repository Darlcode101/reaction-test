# Reaction Lab

Two go/no-go reaction time tests, as a static site for GitHub Pages.

1. **Shape test** – a goal shape is shown at the top. 3D shapes (cube, sphere, pyramid, cylinder, cone) flash up one at a time, all in the same blue; click (or press Space) only when the goal shape appears.
2. **Shape + colour test** – the goal is a shape *and* a colour (e.g. "Red Cube"), with shapes in red, yellow, green, blue or purple. Click only when both match. Most distractors are near-misses: right shape in the wrong colour, or the right colour on the wrong shape.

Each test runs 10 goal appearances, with 0–2 distractors before each one and a random 0.6–1.8 s wait between stimuli. A goal that isn't clicked within 1.5 s counts as a miss.

## Results / CSV

After a test you get average, median and best times plus a per-attempt table. **Download CSV** gives one row per event:

| column | meaning |
| --- | --- |
| participant | name entered on the home screen |
| test | `shape` or `combo` (shape + colour) |
| goal | the goal for that run, e.g. `Cube` or `Red Cube` |
| row | event number |
| attempt | which of the 10 goal attempts this happened during |
| shown | what was on screen when you clicked |
| stimulus_type | `goal`, `wrong shape`, `wrong colour` or `wrong shape and colour` |
| result | `hit`, `miss`, `wrong` (clicked a distractor) or `early` (clicked during the wait) |
| reaction_ms | time from stimulus appearing to click, in ms |
| timestamp | ISO time of the event |

## Run locally

```bash
python3 -m http.server 8125
```

Then open http://localhost:8125. Friends on the same Wi-Fi can use `http://<your-local-ip>:8125`.
