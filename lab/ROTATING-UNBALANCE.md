# Rotating-unbalance worksheet

The measured quantity is the steady-state **peak displacement of the vibrating mass** along the measured axis. The force source is a mass rotating at a fixed eccentricity. The one-mode model uses total translating mass M, stiffness k, viscous damping c and unbalance U equal to eccentric mass times offset. The UI accepts U in g·mm. Multiplying the eccentric mass in grams by the offset in millimetres gives the input directly.

## Model

With angular speed ω in rad/s, U in kg·m and x in metres,

    M x″ + c x′ + k x = U ω² cos(ωt)
    ω = 2π rpm / 60
    ωn = √(k/M)
    r = ω/ωn
    ζ = c/(2√(kM))

The peak displacement in metres and the phase lag of displacement behind the applied force are

    X = (U/M) r² / hypot(1 − r², 2ζr)
    φ = atan2(2ζr, 1 − r²)

The worksheet evaluates the model in Octave and displays mm and degrees. One g·mm equals 10⁻⁶ kg·m. The reference calculation at natural speed uses X = (U/M)/(2ζ) for ζ > 0. The frequency of maximum displacement can differ from the natural frequency. For the supplied model with 0 < ζ < 1/√2 the maximum occurs at r = 1/√(1 − 2ζ²).

At zero speed or zero unbalance there is no harmonic force and phase is undefined. An undamped system under nonzero forcing at exactly its natural speed has no bounded steady-state solution. MathCraft displays a gap there. High-speed response approaches U/M. These are checks on both the equation and the unit conversions.

## Bring a bench sweep

Record one row per observed operating point. Keep repeated speeds as separate observations. Use peak displacement in mm. For a sinusoid, divide peak-to-peak displacement by two or multiply RMS displacement by √2. Acceleration, shaft runout and displacement of the supporting base are different observables. Convert and document the sensor calibration and reference before comparison.

```csv
rpm,amplitude_mm,phase_deg
600,0.60,10.2
900,3.75,53.0
```

Those two rows illustrate the file format. `phase_deg` is optional and may be blank. Measured phase should use a lag-positive convention relative to the forcing reference. Use decimal points, commas between columns and no thousands separators. UTF-8 files, blank lines and whole-line comments beginning with # are supported. Measurement order and the original CSV text are preserved in the worksheet.

1. Replace the default mass, stiffness and unbalance with the apparatus values. Set the sweep upper speed to cover the observations.
2. Import the measurements and pin the initial prediction. Compare both the amplitude and phase traces. Evaluate signed displacement residuals against speed to see where the model over- or under-predicts.
3. Fit damping with mass, stiffness and U held fixed. Each measured amplitude has equal weight, including replicates. The search scans 0 ≤ ζ ≤ 1, then refines around the best sampled interval. It needs at least three distinct positive speeds. A fit to the bundled model estimates one parameter. For custom models with multiple narrow minima, the search is a numerical estimate.
4. The table and residual export use measured RPMs directly. RMSE is the square root of the mean squared amplitude residual, in mm. The worksheet reports the count of finite comparisons. A damping candidate giving a nonfinite prediction at a measured point is ineligible for the fit.
5. Save the worksheet with its pinned model, inputs, raw data, predictions and engine identifier. Reopen it from Files or as a device file. Replay uses elementwise tolerance 10⁻⁹ + 10⁻⁸ max(|a|, |b|), with identical undefined-value positions required.

Mass, stiffness, viscous damping, synchronous rotating force and steady state are physical assumptions. Changes in calibration, extra modes or a changing operating speed can produce structured residuals. Record the actual course units, sensor output and expectations alongside a real experiment. The included data is synthetic.

A public engineering reference for the rotating-unbalance formulation is the Michigan State University ME 451 prelab, section “Rotating Unbalance” and Figure 3.5. [MSU prelab](https://www.egr.msu.edu/classes/me451/me451_labs/Fall_2016/Labs%201-4%20Prelab.pdf)
