#include "paper_preamp_eq.h"


static const float Rl_6 = 4674.0f;
static const float Rl_4 = 15000.0f;
static const float paper_preamp_eq_extra_0 = (1.0f / Rl_4);
static const float al_6 = 0.0f;
static const float al_4 = 0.0f;
static const float Rl_13 = 10000.0f;
static const float paper_preamp_eq_extra_5 = (1.0f / Rl_13);
static const float Rl_11 = 80000.0f;
static const float al_13 = 0.0f;
static const float al_11 = 0.0f;


void paper_preamp_eq::reset()
{
	firstRun = 1;
}

void paper_preamp_eq::setSampleRate(float sampleRate)
{
	fs = sampleRate;
	const float Rr_4 = (0.5f / (1.5e-7f * fs));
	const float R0_4 = (1.0f / (paper_preamp_eq_extra_0 + (1.0f / Rr_4)));
	const float Rr_6 = R0_4;
	const float R0_6 = (Rl_6 + Rr_6);
	const float Rl_8 = R0_6;
	const float Rr_8 = (0.5f / (0.0000033f * fs));
	const float R0_8 = (1.0f / ((1.0f / Rl_8) + (1.0f / Rr_8)));
	paper_preamp_eq_extra_1 = (R0_8 / Rl_8);
	paper_preamp_eq_extra_2 = ((R0_4 / Rl_4) * al_4);
	paper_preamp_eq_extra_3 = (R0_4 / Rr_4);
	paper_preamp_eq_extra_4 = (R0_8 / Rr_8);
	const float Rr_14 = R0_8;
	const float Rr_11 = (0.5f / (2.7e-9f * fs));
	const float R0_11 = (Rl_11 + Rr_11);
	const float Rr_13 = R0_11;
	const float R0_13 = (1.0f / (paper_preamp_eq_extra_5 + (1.0f / Rr_13)));
	const float Rl_14 = R0_13;
	const float R0_14 = (Rl_14 + Rr_14);
	paper_preamp_eq_extra_6 = (Rr_14 / R0_14);
	paper_preamp_eq_extra_7 = ((R0_13 / Rl_13) * al_13);
	paper_preamp_eq_extra_8 = (R0_13 / Rr_13);
	const float Rr_17 = R0_14;
	const float Rl_17 = (0.5f / (4.7e-9f * fs));
	const float R0_17 = (Rl_17 + Rr_17);
	paper_preamp_eq_extra_9 = (Rr_17 / R0_17);
	paper_preamp_eq_extra_10 = (Rr_6 / R0_6);
	paper_preamp_eq_extra_13 = (Rr_11 / R0_11);
	paper_preamp_eq_extra_14 = (Rl_14 / R0_14);
	paper_preamp_eq_extra_16 = (Rl_17 / R0_17);
	
}

void paper_preamp_eq::process(float *x, float *y_out_, int nSamples)
{
	if (firstRun) {
	}
	else {
	}
	
	

	if (firstRun) {
		
		_delayed_11 = 0.0f;
		_delayed_12 = 0.0f;
		_delayed_15 = 0.0f;
		_delayed_17 = 0.0f;
	}

	for (int i = 0; i < nSamples; i++) {
		
		const float ar_4 = _delayed_11;
		const float bu_4 = (paper_preamp_eq_extra_2 + (paper_preamp_eq_extra_3 * ar_4));
		const float ar_6 = bu_4;
		const float al_8 = -((al_6 + ar_6));
		const float bHfc = _delayed_12;
		const float ar_8 = bHfc;
		const float bu_8 = ((paper_preamp_eq_extra_1 * al_8) + (paper_preamp_eq_extra_4 * ar_8));
		const float ar_14 = bu_8;
		const float ar_11 = _delayed_15;
		const float ar_13 = -((al_11 + ar_11));
		const float bu_13 = (paper_preamp_eq_extra_7 + (paper_preamp_eq_extra_8 * ar_13));
		const float al_14 = bu_13;
		const float ar_17 = -((al_14 + ar_14));
		const float al_17 = _delayed_17;
		const float sum_17 = ((((2.0f * x[i]) - -((al_17 + ar_17))) + al_17) + ar_17);
		const float sum_14 = (((ar_17 - (paper_preamp_eq_extra_9 * sum_17)) + al_14) + ar_14);
		const float junction_8 = ((ar_14 - (paper_preamp_eq_extra_6 * sum_14)) + bu_8);
		const float aHfc = (junction_8 - ar_8);
		const float y = (0.5f * (aHfc + bHfc));
		
		_delayed_11 = (((ar_6 - (paper_preamp_eq_extra_10 * (((junction_8 - al_8) + al_6) + ar_6))) + bu_4) - ar_4);
		_delayed_12 = aHfc;
		_delayed_15 = (ar_11 - (paper_preamp_eq_extra_13 * (((((al_14 - (paper_preamp_eq_extra_14 * sum_14)) + bu_13) - ar_13) + al_11) + ar_11)));
		_delayed_17 = (al_17 - (paper_preamp_eq_extra_16 * sum_17));
		
		
		y_out_[i] = y;
	}

	
	firstRun = 0;
}


