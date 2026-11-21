# MathCraft

MathCraft is a browser-local GNU Octave lab workspace. Open a lab from the library, start a blank lab, or import your own Octave code. Each WebOS window can work on a different lab.

**New Octave lab** opens a code editor. **Import .m files** accepts an entry script and helper functions together. Use **Editing** to choose a file and **Run from** to select the entry script. Signed-in users can also bring in code from account Files. Running a lab starts a fresh Octave worker. Printed results appear below the editor. Set `lab_x` and `lab_y` to numeric vectors to graph a response.

**Save worksheet** keeps all code, the lab name and the entry script together in a `.mathcraft` file. Reopen it through Files or import a downloaded copy. Imported general code runs when you select **Run lab**. The library includes five editable teaching models with their assumptions in the source, plus the original rotating-unbalance experiment.

## Open it

From the extracted `mathcraft` directory, run `npm start` with Node 20 or newer. Open **http://127.0.0.1:8788/**. No npm install or math server is needed. With Python alone, `python3 -m http.server 8788 --bind 127.0.0.1` serves the same app. Serve this directory over HTTP so the browser can load its modules and worker.

## Rotating Unbalance

1. Choose **Rotating Unbalance** from the library. The default apparatus has a 1 kg vibrating mass, 10,000 N/m stiffness and 1,000 g·mm unbalance. At 5% damping, the predicted peak displacement at 954.93 rpm is 10 mm.
2. **Pin current run**. Change damping to **10%**. The green curve now gives 5 mm at the natural speed. The dashed curve retains the original settings. Switch to phase and inspect the 90° lag at that speed.
3. **Fit damping to measurements**. The supplied 15-row example is synthetic, generated at 8% damping with small deterministic amplitude offsets. The fit gives approximately 7.9982% and an amplitude RMSE of 0.02313 mm.
4. Use **Import CSV** for your own sweep. Select **Residuals**, inspect a point or read the table, then **Export residuals**. Each prediction uses the exact speed in its CSV row. The sweep limit controls the graph's horizontal extent.
5. Open **Octave workspace**. Edit `unbalance.m`, run the model or evaluate a scratch script. A new scratch workspace receives `p`, a 481-point column vector `rpm`, `measured_rpm` and `measured_mm`. Import and export plain `.m` files here. **Stop interpreter** cancels a running calculation.
6. Save a `.mathcraft` worksheet, reopen it and choose **Replay pinned run**. A fresh interpreter reruns the pinned source and inputs, then checks the stored curve, measurement predictions and summary. The included `examples/fitted-rotor.mathcraft` is a worked session with the original 5% reference and the fitted working model.

Standalone **Save worksheet** downloads a portable file. In a signed-in WebOS window it saves to account Files using the host's revision and identity checks. The **•••** menu also supports downloading or importing a portable copy.

## Repository

| Path | Purpose |
| --- | --- |
| `app.mjs`, `src/` | Synchronous WebOS mount, UI, graph, worker, file contract and worksheet schema |
| `lab/unbalance.m` | Editable physical model shared by every numerical operation |
| `lab/mc_run.m`, `lab/mc_fit.m` | Experiment runner and single-parameter fit |
| `lab/ROTATING-UNBALANCE.md` | Assumptions, equations, measurement units and interpretation |
| `examples/` | Synthetic observations, scratch script and saved example worksheet |
| `webos-files.json`, `tools/register-webos.py` | Viewer file inventory and desktop/Files registration |
| `vendor/octave/` | GNU Octave 7.2.0 WASM, matching build sources, notices and checksums |
| `tests/`, `.github/workflows/verify.yml` | File/state tests and real-browser numerical and UI checks |
| `START-HERE.md` | Local Codex task for installing the app, creating the GitHub repo and verifying the real desktop |

Each mounted window owns its worker and worksheet. The browser renders the response arrays. The supplied runtime supports numerical Octave scripts including matrix and complex arithmetic. Native Octave figure windows, MATLAB toolboxes and a desktop MATLAB compatibility layer are outside this build. The model assumes a linear, steady-state, single-mode rig. Use the course handout and the measured apparatus parameters when applying it to a bench.

## Verify

```sh
npm run verify:vendor
npm test
npm run test:registration
python3 -m venv .venv
. .venv/bin/activate
python -m pip install -r tests/requirements.txt
python -m playwright install chromium
npm run test:browser
```

Set `CHROMIUM_PATH` to use an existing Chromium executable. On a minimal Linux image the Playwright installer also accepts `--with-deps chromium` for OS packages. The browser suite starts an ephemeral loopback server, blocks external browser requests, and tests the real WASM interpreter. Open `tests/host.html` via that server for the two-window account-contract fixture. A native GNU Octave installation can also run `octave --quiet lab/check_unbalance.m`. The same numerical check script runs inside the browser suite.

The ZIP was checked with real headless Chromium and a simulated account host. Live account synchronization and GitHub publishing require your WebOS checkout and identity. Vendor notices and build instructions are in `vendor/octave/PROVENANCE.md`.
