% This cell receives p, rpm, measured_rpm and measured_mm from the worksheet.
natural_rpm = 60/(2*pi) * sqrt(p.stiffness_n_m / p.mass_kg);
[a, lag] = unbalance(natural_rpm, p);
printf("Natural speed: %.3f rpm\n", natural_rpm);
printf("Displacement at natural speed: %.6g mm peak\n", a);
printf("Phase lag: %.3f degrees\n", lag);
