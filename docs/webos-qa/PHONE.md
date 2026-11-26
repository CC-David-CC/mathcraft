# MathCraft on WebOS

Open **Programming → MathCraft → Rotating Unbalance**. MathCraft runs the
included GNU Octave WASM engine in a browser worker. The standalone repository
runs with `npm start`, and its `webos-files.json` lists the WebOS bundle inputs.

The source pin is `f983f10c2a95d61b8efa0b02ef94fdb083a4d742`. The workflow
ran on ksu.codes with viewer
`7f2ef5f0e62b1db0ac50341b6e8c7243a6af722fb4f25716e236b4e4eaf5351f`.
The Galaxy S10+ used Chrome 158.0.8127.92 in portrait.

1. Wait for the stock lab's first calculation. The app shows a natural speed
   of 954.9 rpm and 10 mm at that speed.
2. Tap **Pin current run**. Set damping to 10% and confirm the current model now
   predicts 5 mm. The original 10 mm curve is still visible for comparison.
3. Tap **Save worksheet** and choose a folder. The Save name defaults to
   `rotating-unbalance.mathcraft`. Enter a bare name and save. Files adds
   the `.mathcraft` extension.
4. Close the app. Open the worksheet through **Files → Open**. Verify the
   editable damping value is still 10%. Tap **Replay pinned run** and check
   **Replay matched**. Guest files are temporary to the browser tab.

[Comparison graph](portrait-damped.png) · [Saved worksheet](portrait-saved.png) ·
[Graph after reopen](portrait-replayed.png)

The Moto G 5G completed the same workflow in landscape. Touch-tablet emulation
at 820 × 1050 CSS pixels and desktop Chromium completed the hosted guest
workflow. A fresh signed-in desktop session reopened the server-backed
worksheet and replayed its reference in isolated WebOS.

## Desktop coverage

Desktop Chromium passed eight of the ten selected workflows.

- Run the stock rotor model and confirm the natural speed and displacement.
- Pin a reference, edit damping, and compare the curves.
- Save a worksheet with the expected extension.
- Reopen the worksheet from Files, including from a fresh signed-in session.
- Replay the reference after reopening.
- Fit damping against the 15 synthetic observations to about 7.9982%.
- Switch between the phase and residual graph views.
- Execute an editable Octave scratch script and verify its determinant of 5.

Custom measurement import/export and multi-file Octave project execution
remain open for this device review.
