function [a, phase] = mc_response(rpm, p)
  [a, phase] = unbalance(rpm(:), p);
  if (!isnumeric(a) || !isreal(a) || !isvector(a) || numel(a) != numel(rpm) ...
      || !isnumeric(phase) || !isreal(phase) || !isvector(phase) || numel(phase) != numel(rpm))
    error("unbalance must return two real vectors with one value per RPM");
  endif
  a = a(:); phase = phase(:);
  if (any(a(isfinite(a)) < 0))
    error("peak displacement must be nonnegative");
  endif
  a(!isfinite(a)) = NaN; phase(!isfinite(phase)) = NaN;
endfunction
