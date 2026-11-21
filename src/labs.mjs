export const labs = [
  ['horizontal', 'Horizontal Pendulum', 'Small-angle torsional oscillation about a vertical pivot.', `% Horizontal pendulum with a torsion spring and negligible friction.
inertia = 0.08;       % kg m^2
stiffness = 0.5;      % N m/rad
angle0 = 0.12;        % rad
omega = sqrt(stiffness / inertia);
lab_x = linspace(0, 10, 201);
lab_y = angle0 * cos(omega * lab_x);
printf("Period: %.3f s\\n", 2*pi/omega);`],
  ['rail', 'Translational Rail', 'Free response of a spring-mounted carriage.', `% Undamped carriage released from rest.
mass = 1.5;           % kg
stiffness = 30;       % N/m
displacement = 0.05;  % m
omega = sqrt(stiffness / mass);
lab_x = linspace(0, 5, 201);
lab_y = displacement * cos(omega * lab_x);
printf("Natural frequency: %.3f Hz\\n", omega/(2*pi));`],
  ['upright', 'Upright Pendulum', 'Linearized motion near the unstable upright equilibrium.', `% Small-angle approximation; use only while the angle stays small.
length_m = 0.5;
angle0 = 0.001;       % rad, released from rest
growth = sqrt(9.81 / length_m);
lab_x = linspace(0, 1, 201);
lab_y = angle0 * cosh(growth * lab_x);
printf("Angle after one second: %.4f rad\\n", lab_y(end));`],
  ['xtheta', 'X Theta', 'Coupled translation and rotation of a spring-supported rigid body.', `% Two vertical springs support a rigid bar at offsets -a and +a.
mass = 2; inertia = 0.12; a = 0.3;  % kg, kg m^2, m
k1 = 30; k2 = 50;                     % N/m
M = diag([mass, inertia]);
K = [k1+k2, a*(k2-k1); a*(k2-k1), a^2*(k1+k2)];
[V,D] = eig(M\\K);
omega = sqrt(diag(D));                % rad/s
weights = V\\[0.05; 0];               % initial displacement, zero velocity
lab_x = linspace(0, 5, 201);
motion = V * diag(weights) * cos(omega * lab_x);
lab_y = motion(1,:);                  % translation (m); row 2 is rotation (rad)
disp("Modal frequencies (Hz):"); disp(sort(omega)/(2*pi));`],
  ['pendulum', 'Pendulum', 'Small-angle motion of a gravity pendulum.', `% Point mass, massless rod, negligible friction.
length_m = 0.8;
angle0 = 0.1;         % rad
omega = sqrt(9.81 / length_m);
lab_x = linspace(0, 6, 201);
lab_y = angle0 * cos(omega * lab_x);
printf("Period: %.3f s\\n", 2*pi/omega);`],
  ['rotor', 'Rotating Unbalance', 'Frequency sweep, measured data, damping fit and reference replay.']
];
