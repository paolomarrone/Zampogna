#include "paper_diode_clipper.h"


static const float Rr_4 = 1000.0f;
static const float paper_diode_clipper_extra_0 = (1.0f / Rr_4);
static const float paper_diode_clipper_extra_3 = (2.0f * 0.02585f);
static const float reciprocal_5 = (1.0f / 0.02585f);


void paper_diode_clipper::reset()
{
	firstRun = 1;
}

void paper_diode_clipper::setSampleRate(float sampleRate)
{
	fs = sampleRate;
	const float Rl_4 = (0.5f / (0.000001f * fs));
	const float R0_4 = (1.0f / ((1.0f / Rl_4) + paper_diode_clipper_extra_0));
	paper_diode_clipper_extra_1 = (R0_4 / Rl_4);
	paper_diode_clipper_extra_2 = (R0_4 / Rr_4);
	logR_5 = wdf_log(((R0_4 * 1e-9f) * reciprocal_5));
	
}

void paper_diode_clipper::process(float *x, float *y_out_, int nSamples)
{
	if (firstRun) {
	}
	else {
	}
	
	

	if (firstRun) {
		
		_delayed_4 = 0.0f;
	}

	for (int i = 0; i < nSamples; i++) {
		
		const float bC = _delayed_4;
		const float al_4 = bC;
		const float bu_4 = ((paper_diode_clipper_extra_1 * al_4) + (paper_diode_clipper_extra_2 * x[i]));
		const float a_5 = bu_4;
		const float lambda_5 = wdf_sign(a_5);
		const float scaled_5 = ((lambda_5 * a_5) * reciprocal_5);
		const float aC = (((a_5 - ((paper_diode_clipper_extra_3 * lambda_5) * (wdf_omega4((logR_5 + scaled_5)) - wdf_omega4((logR_5 - scaled_5))))) + bu_4) - al_4);
		const float y = (0.5f * (aC + bC));
		
		_delayed_4 = aC;
		
		
		y_out_[i] = y;
	}

	
	firstRun = 0;
}


