#include "vst2_EQregaliaStereo.h"


static const float decibel_range_2 = 40.f;
static const float EQregaliaStereo__extra__0 = (decibel_range_2 / 2.f);
static const float EQregaliaStereo__extra__2 = (decibel_range_2 / 2.f);
static const float EQregaliaStereo__extra__4 = (decibel_range_2 / 2.f);
static const float pi_0 = 3.141592653589793f;
static const float EQregaliaStereo__extra__7 = (pi_0 * 200.f);
static const float EQregaliaStereo__extra__9 = (pi_0 * 5000.f);
static const float deltaf_7 = 1789.f;
static const float EQregaliaStereo__extra__11 = (pi_0 * deltaf_7);
static const float EQregaliaStereo__extra__12 = (pi_0 * deltaf_7);
static const float EQregaliaStereo__extra__13 = -(0.4643843937958486f);
static const float EQregaliaStereo__extra__14 = ((2.f * pi_0) * 1000.f);
static const float decibel_range_9 = 40.f;
static const float EQregaliaStereo__extra__17 = (decibel_range_9 / 2.f);
static const float EQregaliaStereo__extra__19 = (decibel_range_9 / 2.f);
static const float EQregaliaStereo__extra__21 = (decibel_range_9 / 2.f);
static const float EQregaliaStereo__extra__24 = (pi_0 * 200.f);
static const float EQregaliaStereo__extra__26 = (pi_0 * 5000.f);
static const float deltaf_14 = 1789.f;
static const float EQregaliaStereo__extra__28 = (pi_0 * deltaf_14);
static const float EQregaliaStereo__extra__29 = (pi_0 * deltaf_14);
static const float EQregaliaStereo__extra__30 = -(0.4643843937958486f);
static const float EQregaliaStereo__extra__31 = ((2.f * pi_0) * 1000.f);
static const float decibel_range_2_I = 40.f;
static const float gain_4_I = ((1 * decibel_range_2_I) - (decibel_range_2_I / 2.f));
static const float gain_6_I = ((0 * decibel_range_2_I) - (decibel_range_2_I / 2.f));
static const float decibel_range_9_I = 40.f;
static const float gain_11_I = ((1 * decibel_range_9_I) - (decibel_range_9_I / 2.f));
static const float gain_13_I = ((0 * decibel_range_9_I) - (decibel_range_9_I / 2.f));


void EQregaliaStereo::reset()
{
	firstRun = 1;
}

void EQregaliaStereo::setSampleRate(float sampleRate)
{
	fs = sampleRate;
	const float z_3 = (EQregaliaStereo__extra__7 / fs);
	a_3 = ((z_3 - 1.f) / (z_3 + 1.f));
	const float z_5 = (EQregaliaStereo__extra__9 / fs);
	a_5 = ((z_5 - 1.f) / (z_5 + 1.f));
	a_7 = ((1.f - (EQregaliaStereo__extra__11 / fs)) / (1.f + (EQregaliaStereo__extra__12 / fs)));
	const float z_7 = (EQregaliaStereo__extra__14 / fs);
	const float b_7 = -(((((EQregaliaStereo__extra__13 * z_7) * z_7) - (0.01348369482970019f * z_7)) + 1.000898384794433f));
	EQregaliaStereo__extra__15 = (b_7 * (1.f + a_7));
	EQregaliaStereo__extra__16 = (b_7 * (1.f + a_7));
	const float z_10 = (EQregaliaStereo__extra__24 / fs);
	a_10 = ((z_10 - 1.f) / (z_10 + 1.f));
	const float z_12 = (EQregaliaStereo__extra__26 / fs);
	a_12 = ((z_12 - 1.f) / (z_12 + 1.f));
	a_14 = ((1.f - (EQregaliaStereo__extra__28 / fs)) / (1.f + (EQregaliaStereo__extra__29 / fs)));
	const float z_14 = (EQregaliaStereo__extra__31 / fs);
	const float b_14 = -(((((EQregaliaStereo__extra__30 * z_14) * z_14) - (0.01348369482970019f * z_14)) + 1.000898384794433f));
	EQregaliaStereo__extra__32 = (b_14 * (1.f + a_14));
	EQregaliaStereo__extra__33 = (b_14 * (1.f + a_14));
	
}

void EQregaliaStereo::process(float *xL, float *xR, float *yL__out__, float *yR__out__, int nSamples)
{
	if (firstRun) {
		low_CHANGED = 1;
		med_CHANGED = 1;
		high_CHANGED = 1;
	}
	else {
		low_CHANGED = low != low_z1;
		med_CHANGED = med != med_z1;
		high_CHANGED = high != high_z1;
	}
	
	if (high_CHANGED) {
		const float gain_8 = ((high * decibel_range_2) - EQregaliaStereo__extra__0);
		const float K_7 = (1.005216266655582f + (gain_8 * (0.1154462118686094f + (gain_8 * (0.006357962473527189f + (gain_8 * (0.0002473043497433871f + (gain_8 * (0.000009275409030059003f + (gain_8 * 2.061300092186973e-7f))))))))));
		EQregaliaStereo__extra__1 = ((1.f + K_7) / 2.f);
		EQregaliaStereo__extra__10 = ((1.f - K_7) / 2.f);
		const float gain_15 = ((high * decibel_range_9) - EQregaliaStereo__extra__17);
		const float K_14 = (1.005216266655582f + (gain_15 * (0.1154462118686094f + (gain_15 * (0.006357962473527189f + (gain_15 * (0.0002473043497433871f + (gain_15 * (0.000009275409030059003f + (gain_15 * 2.061300092186973e-7f))))))))));
		EQregaliaStereo__extra__18 = ((1.f + K_14) / 2.f);
		EQregaliaStereo__extra__27 = ((1.f - K_14) / 2.f);
	}
	if (med_CHANGED) {
		const float gain_6 = ((med * decibel_range_2) - EQregaliaStereo__extra__2);
		const float K_5 = (1.005216266655582f + (gain_6 * (0.1154462118686094f + (gain_6 * (0.006357962473527189f + (gain_6 * (0.0002473043497433871f + (gain_6 * (0.000009275409030059003f + (gain_6 * 2.061300092186973e-7f))))))))));
		EQregaliaStereo__extra__3 = ((1.f + K_5) / 2.f);
		EQregaliaStereo__extra__8 = ((1.f - K_5) / 2.f);
		const float gain_13 = ((med * decibel_range_9) - EQregaliaStereo__extra__19);
		const float K_12 = (1.005216266655582f + (gain_13 * (0.1154462118686094f + (gain_13 * (0.006357962473527189f + (gain_13 * (0.0002473043497433871f + (gain_13 * (0.000009275409030059003f + (gain_13 * 2.061300092186973e-7f))))))))));
		EQregaliaStereo__extra__20 = ((1.f + K_12) / 2.f);
		EQregaliaStereo__extra__25 = ((1.f - K_12) / 2.f);
	}
	if (low_CHANGED) {
		const float gain_4 = ((low * decibel_range_2) - EQregaliaStereo__extra__4);
		const float K_3 = (1.005216266655582f + (gain_4 * (0.1154462118686094f + (gain_4 * (0.006357962473527189f + (gain_4 * (0.0002473043497433871f + (gain_4 * (0.000009275409030059003f + (gain_4 * 2.061300092186973e-7f))))))))));
		EQregaliaStereo__extra__5 = ((K_3 + 1.f) / 2.f);
		EQregaliaStereo__extra__6 = ((K_3 - 1.f) / 2.f);
		const float gain_11 = ((low * decibel_range_9) - EQregaliaStereo__extra__21);
		const float K_10 = (1.005216266655582f + (gain_11 * (0.1154462118686094f + (gain_11 * (0.006357962473527189f + (gain_11 * (0.0002473043497433871f + (gain_11 * (0.000009275409030059003f + (gain_11 * 2.061300092186973e-7f))))))))));
		EQregaliaStereo__extra__22 = ((K_10 + 1.f) / 2.f);
		EQregaliaStereo__extra__23 = ((K_10 - 1.f) / 2.f);
	}
	
	low_CHANGED = 0;
	med_CHANGED = 0;
	high_CHANGED = 0;

	if (firstRun) {
		
		__delayed__34 = 0;
		__delayed__35 = 0.f;
		__delayed__36 = (((((1.005216266655582f + (gain_4_I * (0.1154462118686094f + (gain_4_I * (0.006357962473527189f + (gain_4_I * (0.0002473043497433871f + (gain_4_I * (0.000009275409030059003f + (gain_4_I * 2.061300092186973e-7f)))))))))) + 1.f) / 2.f) * 0) + 0.f);
		__delayed__37 = 0.f;
		__delayed__38 = ((((1.f + (1.005216266655582f + (gain_6_I * (0.1154462118686094f + (gain_6_I * (0.006357962473527189f + (gain_6_I * (0.0002473043497433871f + (gain_6_I * (0.000009275409030059003f + (gain_6_I * 2.061300092186973e-7f))))))))))) / 2.f) * (((((1.005216266655582f + (gain_4_I * (0.1154462118686094f + (gain_4_I * (0.006357962473527189f + (gain_4_I * (0.0002473043497433871f + (gain_4_I * (0.000009275409030059003f + (gain_4_I * 2.061300092186973e-7f)))))))))) + 1.f) / 2.f) * 0) + 0.f)) + 0.f);
		__delayed__39 = ((((1.f + (1.005216266655582f + (gain_6_I * (0.1154462118686094f + (gain_6_I * (0.006357962473527189f + (gain_6_I * (0.0002473043497433871f + (gain_6_I * (0.000009275409030059003f + (gain_6_I * 2.061300092186973e-7f))))))))))) / 2.f) * (((((1.005216266655582f + (gain_4_I * (0.1154462118686094f + (gain_4_I * (0.006357962473527189f + (gain_4_I * (0.0002473043497433871f + (gain_4_I * (0.000009275409030059003f + (gain_4_I * 2.061300092186973e-7f)))))))))) + 1.f) / 2.f) * 0) + 0.f)) + 0.f);
		__delayed__40 = ((((1.f + (1.005216266655582f + (gain_6_I * (0.1154462118686094f + (gain_6_I * (0.006357962473527189f + (gain_6_I * (0.0002473043497433871f + (gain_6_I * (0.000009275409030059003f + (gain_6_I * 2.061300092186973e-7f))))))))))) / 2.f) * (((((1.005216266655582f + (gain_4_I * (0.1154462118686094f + (gain_4_I * (0.006357962473527189f + (gain_4_I * (0.0002473043497433871f + (gain_4_I * (0.000009275409030059003f + (gain_4_I * 2.061300092186973e-7f)))))))))) + 1.f) / 2.f) * 0) + 0.f)) + 0.f);
		__delayed__41 = 0.f;
		__delayed__42 = 0.f;
		__delayed__43 = 0.f;
		__delayed__44 = 0;
		__delayed__45 = 0.f;
		__delayed__46 = (((((1.005216266655582f + (gain_11_I * (0.1154462118686094f + (gain_11_I * (0.006357962473527189f + (gain_11_I * (0.0002473043497433871f + (gain_11_I * (0.000009275409030059003f + (gain_11_I * 2.061300092186973e-7f)))))))))) + 1.f) / 2.f) * 0) + 0.f);
		__delayed__47 = 0.f;
		__delayed__48 = ((((1.f + (1.005216266655582f + (gain_13_I * (0.1154462118686094f + (gain_13_I * (0.006357962473527189f + (gain_13_I * (0.0002473043497433871f + (gain_13_I * (0.000009275409030059003f + (gain_13_I * 2.061300092186973e-7f))))))))))) / 2.f) * (((((1.005216266655582f + (gain_11_I * (0.1154462118686094f + (gain_11_I * (0.006357962473527189f + (gain_11_I * (0.0002473043497433871f + (gain_11_I * (0.000009275409030059003f + (gain_11_I * 2.061300092186973e-7f)))))))))) + 1.f) / 2.f) * 0) + 0.f)) + 0.f);
		__delayed__49 = ((((1.f + (1.005216266655582f + (gain_13_I * (0.1154462118686094f + (gain_13_I * (0.006357962473527189f + (gain_13_I * (0.0002473043497433871f + (gain_13_I * (0.000009275409030059003f + (gain_13_I * 2.061300092186973e-7f))))))))))) / 2.f) * (((((1.005216266655582f + (gain_11_I * (0.1154462118686094f + (gain_11_I * (0.006357962473527189f + (gain_11_I * (0.0002473043497433871f + (gain_11_I * (0.000009275409030059003f + (gain_11_I * 2.061300092186973e-7f)))))))))) + 1.f) / 2.f) * 0) + 0.f)) + 0.f);
		__delayed__50 = ((((1.f + (1.005216266655582f + (gain_13_I * (0.1154462118686094f + (gain_13_I * (0.006357962473527189f + (gain_13_I * (0.0002473043497433871f + (gain_13_I * (0.000009275409030059003f + (gain_13_I * 2.061300092186973e-7f))))))))))) / 2.f) * (((((1.005216266655582f + (gain_11_I * (0.1154462118686094f + (gain_11_I * (0.006357962473527189f + (gain_11_I * (0.0002473043497433871f + (gain_11_I * (0.000009275409030059003f + (gain_11_I * 2.061300092186973e-7f)))))))))) + 1.f) / 2.f) * 0) + 0.f)) + 0.f);
		__delayed__51 = 0.f;
		__delayed__52 = 0.f;
		__delayed__53 = 0.f;
	}

	for (int i = 0; i < nSamples; i++) {
		
		const float x_3 = xL[i];
		const float u_3 = ((EQregaliaStereo__extra__6 * ((a_3 * x_3) + __delayed__34)) - (a_3 * __delayed__35));
		const float x_5 = ((EQregaliaStereo__extra__5 * x_3) + u_3);
		const float u_5 = ((EQregaliaStereo__extra__8 * ((a_5 * x_5) + __delayed__36)) - (a_5 * __delayed__37));
		const float x_7 = ((EQregaliaStereo__extra__3 * x_5) + u_5);
		const float u_7 = (((EQregaliaStereo__extra__10 * (((a_7 * x_7) + (EQregaliaStereo__extra__15 * __delayed__38)) + __delayed__40)) - (EQregaliaStereo__extra__16 * __delayed__41)) - (a_7 * __delayed__43));
		const float yL = ((EQregaliaStereo__extra__1 * x_7) + u_7);
		const float x_10 = xR[i];
		const float u_10 = ((EQregaliaStereo__extra__23 * ((a_10 * x_10) + __delayed__44)) - (a_10 * __delayed__45));
		const float x_12 = ((EQregaliaStereo__extra__22 * x_10) + u_10);
		const float u_12 = ((EQregaliaStereo__extra__25 * ((a_12 * x_12) + __delayed__46)) - (a_12 * __delayed__47));
		const float x_14 = ((EQregaliaStereo__extra__20 * x_12) + u_12);
		const float u_14 = (((EQregaliaStereo__extra__27 * (((a_14 * x_14) + (EQregaliaStereo__extra__32 * __delayed__48)) + __delayed__50)) - (EQregaliaStereo__extra__33 * __delayed__51)) - (a_14 * __delayed__53));
		const float yR = ((EQregaliaStereo__extra__18 * x_14) + u_14);
		
		__delayed__34 = x_3;
		__delayed__35 = u_3;
		__delayed__36 = x_5;
		__delayed__37 = u_5;
		__delayed__38 = x_7;
		__delayed__39 = x_7;
		__delayed__40 = __delayed__39;
		__delayed__41 = u_7;
		__delayed__42 = u_7;
		__delayed__43 = __delayed__42;
		__delayed__44 = x_10;
		__delayed__45 = u_10;
		__delayed__46 = x_12;
		__delayed__47 = u_12;
		__delayed__48 = x_14;
		__delayed__49 = x_14;
		__delayed__50 = __delayed__49;
		__delayed__51 = u_14;
		__delayed__52 = u_14;
		__delayed__53 = __delayed__52;
		
		
		yL__out__[i] = yL;
		yR__out__[i] = yR;
	}

	
	low_z1 = low;
	med_z1 = med;
	high_z1 = high;
	firstRun = 0;
}


float EQregaliaStereo::getlow() {
	return low;
}
void EQregaliaStereo::setlow(float value) {
	low = value;
}

float EQregaliaStereo::getmed() {
	return med;
}
void EQregaliaStereo::setmed(float value) {
	med = value;
}

float EQregaliaStereo::gethigh() {
	return high;
}
void EQregaliaStereo::sethigh(float value) {
	high = value;
}
