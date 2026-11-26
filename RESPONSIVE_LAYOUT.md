# WAFFER browser layout update

This update keeps the existing native application and shared backend, and changes the browser UI only. It uses viewport width in CSS pixels, not physical screen resolution, device names, or forced browser zoom. Resize or rotate the screen and the layout switches automatically.

| Viewport | Layout | Home deals | Map height |
| --- | --- | --- | --- |
| Below 600 px | Compact menu, 16 px page padding | One column | 330 px |
| 600–1023 px | Two-row header, 24 px page padding | Two columns | 400 px |
| 1024 px and above | Desktop header, 32 px page padding; maximum homepage width 1440 px | Three columns | 460 px |

Detail pages retain a narrower reading width (1000 px, groceries up to 1200 px). Category cards fill equal columns, deals wrap without a horizontal carousel, and the search fields, button hit areas, and typography are sized for the browser. Native tab navigation and its original map height are unchanged.

## Publish

Copy the source over your existing repository root, keeping your `.git` and `.env`. Then review `git status` and commit the update. The existing GitHub Pages Actions workflow deploys the new build on a push to the default main/master branch. See GITHUB_PAGES.md for the complete setup and local development commands. No extra npm dependencies or backend changes are required.

## Validation

- TypeScript compilation, grocery map unit tests and Expo GitHub Pages production export passed.
- Offline Chromium rendering of the exported JavaScript passed at widths 320, 390, 600, 768, 1024, 1440 and 1920 px. The home deals grid had the expected row count and category cards stayed in a row. The grocery store pin could be selected and its direction button appeared at every size. No page JavaScript errors were reported.
- The browser tests used synthetic promotion and supermarket responses; live backend, physical devices, Safari and actual GitHub deployment were not tested in this environment. The supplied build retains the original live backend URL and uses real data when deployed.
