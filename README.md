# Licensing Synroc: project website

An interactive website summarising our SCPU3001 project for ANSTO, which also serves as our **handout**.

It is built with **R and Quarto in RStudio**, with no Shiny. R calculates everything when the site is rendered, and the interactive parts run in the visitor's browser. The site is just static files, so it can be hosted free and never "goes to sleep" the way a shinyapps.io app does.

## What's on the site

| Section | Interactive feature |
|---|---|
| Problem | Slider: cubes drawn to true volume (liquid vs cemented vs Synroc) |
| Where | Click any of the 8 jurisdictions for its waste stream, legal and political scores |
| Research | Tabs for RQ1–RQ4: aim, approach, answer, evidence, risks |
| Decision | Set your own weights and watch the ranking update live (plus the SMAA result computed in R) |
| Economics | Volume slider against break-even; discounting slider showing why distant disposal kills value |
| Risks | Clickable 3×3 risk matrix, before vs after treatment |
| Plan | Clickable gates roadmap (Now → G1 → G2 → G3 → Sign), what we ask ANSTO, limitations |
| Sources | IEEE reference list [1]–[24], matching the slides |

## Files

```
synroc-website/
├── synroc-website.Rproj   open this in RStudio
├── _quarto.yml            site settings
├── index.qmd              the main page
├── references.qmd         the Sources page
├── R/site_data.R          ALL numbers: scores, volumes, risks (mirrors synroc_model.R)
└── assets/
    ├── site.css           look and feel (pastel palette, fonts)
    ├── app.js             interactive charts (reads the data R writes)
    └── head.html          Google Fonts + icon
```

To change a number, edit `R/site_data.R` and re-render. Every chart updates.
Text lives in `index.qmd`. The RQ tab text and the gate descriptions are in `assets/app.js`; search for `const RQ` and `const STEPS`.

## Run it in RStudio (about 2 minutes)

1. Open `synroc-website.Rproj`.
2. In the Console, install the two packages once:
   ```r
   install.packages(c("rmarkdown", "jsonlite"))
   ```
3. Open the **Build** tab and click **Render Website**, or in the Terminal run:
   ```
   quarto preview
   ```
   RStudio already includes Quarto. The site opens in the Viewer, and the finished files go in `docs/`.

## Put it online (free)

Pick one:

- **Quarto Pub** (easiest). In the RStudio Terminal run `quarto publish quarto-pub` and log in when asked. You get a link like `https://<you>.quarto.pub/licensing-synroc`.
- **Netlify Drop.** Drag the `docs` folder onto https://app.netlify.com/drop.
- **GitHub Pages.** Render in RStudio first, then commit and push the whole project, including `docs/`. On GitHub go to Settings → Pages → Source: *Deploy from a branch* → Branch `main`, folder `/docs`. GitHub can't run Quarto itself, so it must publish the already-rendered `docs/` folder.

Then put the link, or a QR code of it, on the final slide.

## Notes

- Fonts load from Google Fonts. Offline, the site falls back to Georgia and Arial.
- The cost figures are medians from our 20,000-draw Monte Carlo model; see the written report for the method.
- Built for SCPU3001, University of Sydney, October 2026.
