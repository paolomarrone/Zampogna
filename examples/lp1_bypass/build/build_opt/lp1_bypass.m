function [y0] = lp1_bypass(x0, bypass0, fs)

	% declarations

	bypass_z1 = zeros(1, 1);
	x_z1 = zeros(1, 1);
	t_z1 = zeros(1, 1);

	% constants/init

	x__0 = (3.141592653589793 * 2) * 1000;

	% fs/control coeffs
	fs0 = fs;
	B0 = x__0 / (fs0 + x__0);
	A1 = -fs0 / (fs0 + x__0);

	% reset
	bypass_z1(:) = 0;
	x_z1(:) = 0;
	t_z1(:) = 0;

	% outputs

	y0 = zeros(size(x0));

	for i = 1:length(x0)

		bypass = bypass0(i);
		x = x0(i);
		if (bypass > 0.5)
			y0(i) = x;
			x_z1(1) = x;
		else
			if (bypass_z1(1) > 0.5)
				s0 = x_z1(1);
			else
				s0 = t_z1(1);
			end
			t = B0 * x - A1 * s0;
			t_z1(1) = t;
			y0(i) = t;
		end
		bypass_z1(1) = bypass;

	end

end
