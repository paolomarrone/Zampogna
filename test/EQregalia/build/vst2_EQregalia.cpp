#include "vst2_EQregalia.h"


static const float decibel_range = 40.f;
static const float EQregalia__extra__0 = (decibel_range / 2.f);
static const float EQregalia__extra__2 = (decibel_range / 2.f);
static const float EQregalia__extra__4 = (decibel_range / 2.f);
static const float pi_0 = 3.141592653589793f;
static const float EQregalia__extra__7 = (pi_0 * 200.f);
static const float EQregalia__extra__9 = (pi_0 * 5000.f);
static const float deltaf_6 = 1789.f;
static const float EQregalia__extra__11 = (pi_0 * deltaf_6);
static const float EQregalia__extra__12 = (pi_0 * deltaf_6);
static const float EQregalia__extra__13 = -(0.4643843937958486f);
static const float EQregalia__extra__14 = ((2.f * pi_0) * 1000.f);
static const float decibel_range_I = 40.f;
static const float gain_3_I = ((1 * decibel_range_I) - (decibel_range_I / 2.f));
static const float gain_5_I = ((0 * decibel_range_I) - (decibel_range_I / 2.f));


void EQregalia::reset()
{
	firstRun = 1;
}

void EQregalia::setSampleRate(float sampleRate)
{
	fs = sampleRate;
	static const float z_2 = (EQregalia__extra__7 / fs);
	a_2 = ((z_2 - 1.f) / (z_2 + 1.f));
	static const float z_4 = (EQregalia__extra__9 / fs);
	a_4 = ((z_4 - 1.f) / (z_4 + 1.f));
	a_6 = ((1.f - (EQregalia__extra__11 / fs)) / (1.f + (EQregalia__extra__12 / fs)));
	static const float z_6 = (EQregalia__extra__14 / fs);
	static const float b_6 = -(((((EQregalia__extra__13 * z_6) * z_6) - (0.01348369482970019f * z_6)) + 1.000898384794433f));
	EQregalia__extra__15 = (b_6 * (1.f + a_6));
	EQregalia__extra__16 = (b_6 * (1.f + a_6));
	
}

void EQregalia::process(float *x, float *y__out__, int nSamples)
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
		static const float gain_7 = ((high * decibel_range) - EQregalia__extra__0);
		static const float K_6 = (1.005216266655582f + (gain_7 * (0.1154462118686094f + (gain_7 * (0.006357962473527189f + (gain_7 * (0.0002473043497433871f + (gain_7 * (0.000009275409030059003f + (gain_7 * 2.061300092186973e-7f))))))))));
		EQregalia__extra__1 = ((1.f + K_6) / 2.f);
		EQregalia__extra__10 = ((1.f - K_6) / 2.f);
	}
	if (med_CHANGED) {
		static const float gain_5 = ((med * decibel_range) - EQregalia__extra__2);
		static const float K_4 = (1.005216266655582f + (gain_5 * (0.1154462118686094f + (gain_5 * (0.006357962473527189f + (gain_5 * (0.0002473043497433871f + (gain_5 * (0.000009275409030059003f + (gain_5 * 2.061300092186973e-7f))))))))));
		EQregalia__extra__3 = ((1.f + K_4) / 2.f);
		EQregalia__extra__8 = ((1.f - K_4) / 2.f);
	}
	if (low_CHANGED) {
		static const float gain_3 = ((low * decibel_range) - EQregalia__extra__4);
		static const float K_2 = (1.005216266655582f + (gain_3 * (0.1154462118686094f + (gain_3 * (0.006357962473527189f + (gain_3 * (0.0002473043497433871f + (gain_3 * (0.000009275409030059003f + (gain_3 * 2.061300092186973e-7f))))))))));
		EQregalia__extra__5 = ((K_2 + 1.f) / 2.f);
		EQregalia__extra__6 = ((K_2 - 1.f) / 2.f);
	}
	
	low_CHANGED = 0;
	med_CHANGED = 0;
	high_CHANGED = 0;

	if (firstRun) {
		
		__delayed__17 = 0;
		__delayed__18 = 0.f;
		__delayed__19 = (((((1.005216266655582f + (gain_3_I * (0.1154462118686094f + (gain_3_I * (0.006357962473527189f + (gain_3_I * (0.0002473043497433871f + (gain_3_I * (0.000009275409030059003f + (gain_3_I * 2.061300092186973e-7f)))))))))) + 1.f) / 2.f) * 0) + 0.f);
		__delayed__20 = 0.f;
		__delayed__21 = ((((1.f + (1.005216266655582f + (gain_5_I * (0.1154462118686094f + (gain_5_I * (0.006357962473527189f + (gain_5_I * (0.0002473043497433871f + (gain_5_I * (0.000009275409030059003f + (gain_5_I * 2.061300092186973e-7f))))))))))) / 2.f) * (((((1.005216266655582f + (gain_3_I * (0.1154462118686094f + (gain_3_I * (0.006357962473527189f + (gain_3_I * (0.0002473043497433871f + (gain_3_I * (0.000009275409030059003f + (gain_3_I * 2.061300092186973e-7f)))))))))) + 1.f) / 2.f) * 0) + 0.f)) + 0.f);
		__delayed__22 = ((((1.f + (1.005216266655582f + (gain_5_I * (0.1154462118686094f + (gain_5_I * (0.006357962473527189f + (gain_5_I * (0.0002473043497433871f + (gain_5_I * (0.000009275409030059003f + (gain_5_I * 2.061300092186973e-7f))))))))))) / 2.f) * (((((1.005216266655582f + (gain_3_I * (0.1154462118686094f + (gain_3_I * (0.006357962473527189f + (gain_3_I * (0.0002473043497433871f + (gain_3_I * (0.000009275409030059003f + (gain_3_I * 2.061300092186973e-7f)))))))))) + 1.f) / 2.f) * 0) + 0.f)) + 0.f);
		__delayed__23 = ((((1.f + (1.005216266655582f + (gain_5_I * (0.1154462118686094f + (gain_5_I * (0.006357962473527189f + (gain_5_I * (0.0002473043497433871f + (gain_5_I * (0.000009275409030059003f + (gain_5_I * 2.061300092186973e-7f))))))))))) / 2.f) * (((((1.005216266655582f + (gain_3_I * (0.1154462118686094f + (gain_3_I * (0.006357962473527189f + (gain_3_I * (0.0002473043497433871f + (gain_3_I * (0.000009275409030059003f + (gain_3_I * 2.061300092186973e-7f)))))))))) + 1.f) / 2.f) * 0) + 0.f)) + 0.f);
		__delayed__24 = 0.f;
		__delayed__25 = 0.f;
		__delayed__26 = 0.f;
	}

	for (int i = 0; i < nSamples; i++) {
		
		const float x_2 = x[i];
		const float u_2 = ((EQregalia__extra__6 * ((a_2 * x_2) + __delayed__17)) - (a_2 * __delayed__18));
		const float x_4 = ((EQregalia__extra__5 * x_2) + u_2);
		const float u_4 = ((EQregalia__extra__8 * ((a_4 * x_4) + __delayed__19)) - (a_4 * __delayed__20));
		const float x_6 = ((EQregalia__extra__3 * x_4) + u_4);
		const float u_6 = (((EQregalia__extra__10 * (((a_6 * x_6) + (EQregalia__extra__15 * __delayed__21)) + __delayed__23)) - (EQregalia__extra__16 * __delayed__24)) - (a_6 * __delayed__26));
		const float y = ((EQregalia__extra__1 * x_6) + u_6);
		
		__delayed__17 = x_2;
		__delayed__18 = u_2;
		__delayed__19 = x_4;
		__delayed__20 = u_4;
		__delayed__21 = x_6;
		__delayed__22 = x_6;
		__delayed__23 = __delayed__22;
		__delayed__24 = u_6;
		__delayed__25 = u_6;
		__delayed__26 = __delayed__25;
		
		
		y__out__[i] = y;
	}

	
	low_z1 = low;
	med_z1 = med;
	high_z1 = high;
	firstRun = 0;
}


float EQregalia::getlow() {
	return low;
}
void EQregalia::setlow(float value) {
	low = value;
}

float EQregalia::getmed() {
	return med;
}
void EQregalia::setmed(float value) {
	med = value;
}

float EQregalia::gethigh() {
	return high;
}
void EQregalia::sethigh(float value) {
	high = value;
}
