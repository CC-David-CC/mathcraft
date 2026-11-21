function [amplitude_mm, phase_deg] = unbalance(rpm, p)
  % Peak steady-state displacement and phase lag relative to rotating force.
  % SI inputs except rpm, unbalance in g*mm, and output displacement in mm.
  r = (rpm(:) .* (2*pi/60)) ./ sqrt(p.stiffness_n_m / p.mass_kg);
  elastic = 1 - r.^2;
  viscous = 2 .* p.damping_ratio .* r;
  scale_mm = 1e-3 * p.unbalance_g_mm / p.mass_kg;
  amplitude_mm = scale_mm .* r.^2 ./ hypot(elastic, viscous);
  phase_deg = atan2(viscous, elastic) .* (180/pi);
  if (p.unbalance_g_mm == 0)
    amplitude_mm(:) = 0;
    phase_deg(:) = NaN;
  else
    phase_deg(r == 0) = NaN;
    singular = (p.damping_ratio == 0) & (abs(r - 1) <= 8*eps);
    amplitude_mm(singular) = NaN;
    phase_deg(singular) = NaN;
  end
end
