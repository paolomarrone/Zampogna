#include "vst2_lp_filter.h"


static const float C_1 = 0.000001f;
static const float C_3 = C_1;
static const float lp_filter__extra__0 = (2.f * 3.141592653589793f);
static const float al_5 = 0.f;


void lp_filter::reset()
{
	firstRun = 1;
}

void lp_filter::setSampleRate(float sampleRate)
{
	fs = sampleRate;
	Rr_5 = (0.5f / (C_3 * fs));
	
}

void lp_filter::process(float *x_1, float *y_1__out__, int nSamples)
{
	if (firstRun) {
		cutoff_1_CHANGED = cutoff_1 = 1;
	}
	else {
		cutoff_1_CHANGED = cutoff_1 != cutoff_1_z1;
	}
	
	if (cutoff_1_CHANGED) {
		lp_filter__extra__1 = (Rr_5 / ((1.f / ((lp_filter__extra__0 * ((0.1f + (0.3f * cutoff_1)) * fs)) * C_1)) + Rr_5));
	}
	
	cutoff_1_CHANGED = 0;

	if (firstRun) {
		
		__delayed__2 = 0.f;
	}

	for (int i = 0; i < nSamples; i++) {
		
		const float bC_1 = __delayed__2;
		const float ar_5 = bC_1;
		const float aC_1 = (ar_5 - (lp_filter__extra__1 * ((al_5 + ar_5) + ((2.f * x_1[i]) - -((al_5 + ar_5))))));
		const float y_1 = (0.5f * (aC_1 + bC_1));
		
		__delayed__2 = aC_1;
		
		
		y_1__out__[i] = y_1;
	}

	
	cutoff_1_z1 = cutoff_1;
	firstRun = 0;
}


float lp_filter::getcutoff_1() {
	return cutoff_1;
}
void lp_filter::setcutoff_1(float value) {
	cutoff_1 = value;
}
