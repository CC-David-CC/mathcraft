function [zeta, rmse] = mc_fit(p, speeds, measured)
  speeds = speeds(:); measured = measured(:);
  if (numel(unique(speeds(speeds > 0))) < 3 || p.unbalance_g_mm == 0)
    error("Fit requires nonzero unbalance and at least three distinct positive measured speeds");
  endif
  grid = linspace(0, 1, 51); errors = zeros(size(grid));
  for j = 1:numel(grid)
    errors(j) = fit_loss(grid(j), p, speeds, measured);
  endfor
  finite_errors = errors(isfinite(errors));
  if (isempty(finite_errors) || max(finite_errors)-min(finite_errors) <= 32*eps(max(1,max(finite_errors))))
    error("The observations do not distinguish damping ratios for this model");
  endif
  [best, j] = min(errors);
  lo = grid(max(1,j-1)); hi = grid(min(numel(grid),j+1));
  tau = (sqrt(5)-1)/2;
  for k = 1:38
    x = hi-tau*(hi-lo); y = lo+tau*(hi-lo);
    if (fit_loss(x,p,speeds,measured) <= fit_loss(y,p,speeds,measured))
      hi = y;
    else
      lo = x;
    endif
  endfor
  mid = (lo+hi)/2; mid_loss = fit_loss(mid,p,speeds,measured);
  if (mid_loss < best), zeta=mid; rmse=mid_loss; else zeta=grid(j); rmse=best; endif
endfunction
function v = fit_loss(z,p,speeds,measured)
  p.damping_ratio = z;
  [a, unused] = mc_response(speeds,p);
  if (any(!isfinite(a))), v = Inf; else v = sqrt(mean((measured-a).^2)); endif
endfunction
