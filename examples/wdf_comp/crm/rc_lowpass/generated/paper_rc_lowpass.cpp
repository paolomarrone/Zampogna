#include "paper_rc_lowpass.h"


static const float Rl_5 = 1000.0f;
static const float al_5 = 0.0f;


void paper_rc_lowpass::reset()
{
	firstRun = 1;
}

void paper_rc_lowpass::setSampleRate(float sampleRate)
{
	fs = sampleRate;
	const float Rr_5 = (0.5f / (0.000001f * fs));
	paper_rc_lowpass_extra_0 = (Rr_5 / (Rl_5 + Rr_5));
	
}

void paper_rc_lowpass::process(float *x, float *y_out_, int nSamples)
{
	if (firstRun) {
	}
	else {
	}
	
	

	if (firstRun) {
		
		_delayed_1 = 0.0f;
	}

	for (int i = 0; i < nSamples; i++) {
		
		const float bC = _delayed_1;
		const float ar_5 = bC;
		const float aC = (ar_5 - (paper_rc_lowpass_extra_0 * ((((2.0f * x[i]) - -((al_5 + ar_5))) + al_5) + ar_5)));
		const float y = (0.5f * (aC + bC));
		
		_delayed_1 = aC;
		
		
		y_out_[i] = y;
	}

	
	firstRun = 0;
}


