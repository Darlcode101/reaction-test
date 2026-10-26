# Reaction Lab

Two go/no-go reaction time tests, as a static site for GitHub Pages.

- **Colour test** – a goal colour is shown at the top. The box flashes different colours; click (or press Space) only when it turns the goal colour.
- **Shape test** – same idea with 3D shapes (cube, sphere, pyramid, cylinder, cone), all the same colour, so only the shape matters.

Each test runs 10 goal appearances, with 0–2 distractors before each one and a random 0.6–1.8 s wait between stimuli. A goal that isn't clicked within 1.5 s counts as a miss.

## Results / CSV

After a test you get average, median and best times plus a per-attempt table. **Download CSV** gives one row per event:

| column | meaning |
| --- | --- |
| participant | name entered on the home screen |
| test | `colour` or `shape` |
| goal | the goal colour/shape for that run |
| row | event number |
| attempt | which of the 10 goal attempts this happened during |
| shown | what was on screen when you clicked |
| result | `hit`, `miss`, `wrong` (clicked a distractor) or `early` (clicked during the wait) |
| reaction_ms | time from stimulus appearing to click, in ms |
| timestamp | ISO time of the event |

## Run locally

```bash
python3 -m http.server 8125
```

Then open http://localhost:8125. Friends on the same Wi-Fi can use `http://<your-local-ip>:8125`.
