#pragma once

#include <cmath>
#include <wdf_lib_omega.h>

inline float wdf_log(float x)
{
	return std::log(x);
}

inline float wdf_sign(float x)
{
	return x > 0.0f ? 1.0f : (x < 0.0f ? -1.0f : 0.0f);
}

inline float wdf_omega4(float x)
{
	return wdf_lib::Omega::omega4(x);
}
