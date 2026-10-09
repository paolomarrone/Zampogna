#pragma once

#include <custom_baxandall_rtype.h>

inline float baxandall_scattering(float index, float Ra, float Rb, float Rc, float Rd, float Re)
{
	baxandall_r::R_Params params {};
	baxandall_r::R_Vars vars {};
	baxandall_r::update_vars(&vars, &params,
		Ra, 1.0f / Ra,
		Rb, 1.0f / Rb,
		Rc, 1.0f / Rc,
		Rd, 1.0f / Rd,
		Re, 1.0f / Re);
	const int flat = static_cast<int>(index);
	return vars.S[(flat / 6) * baxandall_r::num_ports_padded + flat % 6];
}
