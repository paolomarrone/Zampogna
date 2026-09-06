function [y0] = lp1_bypass(x0, bypass0, fs)

	% declarations

	s3 = zeros(1, 1);
	s4 = zeros(1, 1);
	s5 = zeros(1, 1);

	fs0 = 0;

	% constants/init

	% fs/control coeffs
	fs0 = fs;

	% reset
	s3(:) = 0;
	s4(:) = 0;
	s5(:) = 0;

	% outputs

	y0 = zeros(size(x0));

	for i = 1:length(x0)
		bypass = 0;
		bypass = bypass0(i);
		v = 0;
		v = (bypass) > (0.5);
		x = 0;
		x = x0(i);
		y = 0;
		if (v)
			y = x;
		end
		fc = 0;
		if ~(v)
			fc = 1000;
		end
		v0 = 0;
		if ~(v)
			v0 = ((3.141592653589793) * (2)) * (fc);
		end
		v1 = 0;
		if ~(v)
			v1 = ((3.141592653589793) * (2)) * (fc);
		end
		v2 = 0;
		if ~(v)
			v2 = (fs0) + (v1);
		end
		v3 = 0;
		if ~(v)
			v3 = (v0) / (v2);
		end
		B0 = 0;
		if ~(v)
			B0 = v3;
		end
		x1 = 0;
		if ~(v)
			x1 = x;
		end
		v4 = 0;
		if ~(v)
			v4 = (B0) * (x1);
		end
		v5 = 0;
		if ~(v)
			v5 = -(fs0);
		end
		v6 = 0;
		if ~(v)
			v6 = ((3.141592653589793) * (2)) * (fc);
		end
		v7 = 0;
		if ~(v)
			v7 = (fs0) + (v6);
		end
		v8 = 0;
		if ~(v)
			v8 = (v5) / (v7);
		end
		A1 = 0;
		if ~(v)
			A1 = v8;
		end
		v9 = 0;
		v9 = s3(0 + 1);
		y1 = 0;
		y1 = v9;
		previous_bypass = 0;
		previous_bypass = y1;
		v10 = 0;
		if ~(v)
			v10 = (previous_bypass) > (0.5);
		end
		v11 = 0;
		v11 = s4(0 + 1);
		y2 = 0;
		y2 = v11;
		previous_x = 0;
		previous_x = y2;
		s = 0;
		if ~(v)
			if (v10)
				s = previous_x;
			end
		end
		v12 = 0;
		if ~(v)
			v12 = s5(0 + 1);
		end
		y3 = 0;
		if ~(v)
			y3 = v12;
		end
		previous_t = 0;
		if ~(v)
			previous_t = y3;
		end
		s0 = 0;
		if ~(v)
			if ~(v10)
				s0 = previous_t;
			end
		end
		v13 = 0;
		if ~(v)
			if v10
				v13 = s;
			else
				v13 = s0;
			end
		end
		s1 = 0;
		if ~(v)
			s1 = v13;
		end
		s2 = 0;
		if ~(v)
			s2 = s1;
		end
		v14 = 0;
		if ~(v)
			v14 = (A1) * (s2);
		end
		v15 = 0;
		if ~(v)
			v15 = (v4) - (v14);
		end
		y4 = 0;
		if ~(v)
			y4 = v15;
		end
		t = 0;
		if ~(v)
			t = y4;
		end
		y5 = 0;
		if ~(v)
			y5 = t;
		end
		v16 = 0;
		if v
			v16 = y;
		else
			v16 = y5;
		end
		y6 = 0;
		y6 = v16;
		x2 = 0;
		x2 = bypass;
		index = 0;
		next = 0;
		index = 0;
		next = x2;
		x3 = 0;
		x3 = x;
		index0 = 0;
		next0 = 0;
		index0 = 0;
		next0 = x3;
		x4 = 0;
		if ~(v)
			x4 = t;
		end
		index1 = 0;
		next1 = 0;
		if ~(v)
			index1 = 0;
		end
		if ~(v)
			next1 = x4;
		end
		s3(index + 1) = next;
		s4(index0 + 1) = next0;
		if ~(v)
			s5(index1 + 1) = next1;
		end
		y0(i) = y6;
	end

end
