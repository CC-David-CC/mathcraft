function [curve, predictions, summary] = mc_run(p, max_rpm, speeds, measured)
  natural_hz = sqrt(p.stiffness_n_m / p.mass_kg) / (2*pi);
  natural_rpm = natural_hz * 60;
  sweep = linspace(0, max_rpm, 481)';
  if (natural_rpm <= max_rpm)
    sweep = unique([sweep; natural_rpm]);
  endif
  speeds = speeds(:); measured = measured(:);
  [a, phase] = mc_response([sweep; speeds; natural_rpm], p);
  n = numel(sweep);
  idx = n + (1:numel(speeds));
  predicted = a(idx)(:);
  residual = measured - predicted;
  usable = isfinite(residual);
  rmse = NaN;
  if (any(usable)), rmse = sqrt(mean(residual(usable).^2)); endif
  curve = [sweep, a(1:n), phase(1:n)];
  predictions = [speeds, measured, predicted, residual, phase(idx)(:)];
  summary = [natural_hz, natural_rpm, a(end), phase(end), rmse, sum(usable)];
endfunction
