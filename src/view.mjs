export const markup = `
<header class="mc-head">
  <div class="mc-brand"><span class="mc-mark" aria-hidden="true">∿</span><b>MathCraft</b></div>
  <div class="mc-tools"><button data-id="open">Open</button><button class="mc-primary" data-id="save">Save worksheet</button>
  <details class="mc-menu"><summary aria-label="More file actions">•••</summary><div>
  <button data-id="as">Save as…</button><button data-id="download">Download worksheet</button><button data-id="upload">Import worksheet…</button>
  </div></details></div>
</header>
<div class="mc-body">
  <div class="mc-title"><div><div class="mc-kicker">VIBRATIONS LAB</div><h1>Rotating unbalance</h1><p>Steady-state response to a rotating eccentric mass.</p></div><span class="mc-engine" data-id="engine">Starting Octave…</span></div>
  <div class="mc-tabs" role="group" aria-label="Worksheet views"><button data-tab="lab" aria-pressed="true">Experiment</button><button data-tab="model" aria-pressed="false">Octave workspace</button></div>
  <section data-panel="lab" class="mc-layout">
    <aside class="mc-card mc-controls"><div class="mc-section"><h2>System parameters</h2></div>
      <label>Vibrating mass <span>kg</span><input data-id="mass_kg" type="number" min="0" step="any"></label>
      <label>Linear stiffness <span>N/m</span><input data-id="stiffness_n_m" type="number" min="0" step="any"></label>
      <label>Rotating unbalance <span>g·mm</span><input data-id="unbalance_g_mm" type="number" min="0" step="any"></label>
      <label>Damping ratio <span>% of critical</span><input data-id="damping" type="number" min="0" max="100" step="any"></label>
      <input data-id="slider" aria-label="Damping ratio slider, percent" type="range" min="0" max="100" step="0.1">
      <label>Sweep upper speed <span>rpm</span><input data-id="maxRPM" type="number" min="0" step="any"></label>
      <button data-id="fit" class="mc-wide">Fit damping to measurements</button>
      <small>Fit varies damping only. Mass, stiffness and unbalance stay fixed.</small>
    </aside>
    <div class="mc-content">
      <div class="mc-stats"><div><small>Natural speed</small><strong data-id="natural">—</strong><small data-id="hz">rpm</small></div><div><small>At natural speed</small><strong data-id="amp">—</strong><small>mm peak</small></div><div><small>Amplitude RMSE</small><strong data-id="rmse">—</strong><small data-id="count">mm</small></div></div>
      <section class="mc-card"><div class="mc-section mc-wrap"><h2>Frequency response</h2><div class="mc-modes" role="group" aria-label="Graph quantity"><button data-mode="amplitude" aria-pressed="true">Amplitude</button><button data-mode="phase" aria-pressed="false">Phase</button><button data-mode="residual" aria-pressed="false">Residuals</button></div></div>
      <div class="mc-legend"><span class="mc-live">Current model</span><span class="mc-obs">Measurements</span><span class="mc-ref" data-id="reflegend" hidden>Pinned model</span></div>
      <canvas data-id="chart" tabindex="0" aria-label="Frequency response graph. Use arrow keys to inspect or read the data table below."></canvas>
      <p class="mc-readout" data-id="readout"></p></section>
      <section class="mc-card mc-pad"><div class="mc-section mc-wrap"><h2>Reference run</h2><div class="mc-row"><button data-id="pin">Pin current run</button><button data-id="replay" disabled>Replay pinned run</button><button data-id="unpin" disabled>Clear pin</button></div></div>
      <p data-id="reference">Pin a run to compare it with later settings.</p><div data-id="verdict" role="status"></div></section>
    </div>
    <section class="mc-card mc-measure mc-pad"><div class="mc-section mc-wrap"><div><h2>Measurements</h2><p data-id="dataset"></p></div><div class="mc-row"><button data-id="csv">Import CSV</button><button data-id="export">Export residuals</button><button data-id="clear">Remove data</button></div></div>
    <div class="mc-scroll"><table><thead><tr><th>Speed (rpm)</th><th>Measured (mm)</th><th>Predicted (mm)</th><th>Residual (mm)</th><th>Measured phase (°)</th><th>Predicted phase (°)</th></tr></thead><tbody data-id="rows"></tbody></table></div>
    <small>Peak displacement in mm. Residual = measured − predicted. Import columns rpm, amplitude_mm, and optional phase_deg.</small></section>
  </section>
  <section data-panel="model" hidden class="mc-editors">
  <section class="mc-card mc-pad"><div class="mc-section mc-wrap"><div><h2>Model function</h2><p>unbalance.m · Used by the sweep, fit and reference runs.</p></div><div class="mc-row"><button data-id="loadmodel">Import .m</button><button data-id="getmodel">Export .m</button></div></div>
  <label class="mc-sr" data-label="source">Octave model source</label><textarea data-id="source" aria-label="Octave model source" spellcheck="false"></textarea>
  <button data-id="run" class="mc-primary">Run model</button></section>
  <section class="mc-card mc-pad"><div class="mc-section mc-wrap"><div><h2>Scratch script</h2><p>Use p, rpm, measured_rpm and measured_mm in a fresh Octave workspace.</p></div><div class="mc-row"><button data-id="loadscript">Import .m</button><button data-id="getscript">Export .m</button></div></div>
  <textarea data-id="script" aria-label="Octave scratch script" spellcheck="false"></textarea>
  <div class="mc-row"><button data-id="runscript" class="mc-primary">Run script</button><button data-id="stop">Stop interpreter</button></div>
  <pre data-id="stdout" aria-label="Octave output">Script output appears here.</pre></section></section>
  <div class="mc-message" role="status" aria-live="polite" data-id="status">Loading worksheet…</div>
</div>
<input hidden type="file" data-id="pickcsv" accept=".csv,text/csv"><input hidden type="file" data-id="picksheet" accept=".mathcraft,application/json"><input hidden type="file" data-id="pickmodel" accept=".m,text/plain"><input hidden type="file" data-id="pickscript" accept=".m,text/plain">
`;
