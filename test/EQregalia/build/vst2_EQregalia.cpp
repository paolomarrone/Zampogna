#include "vst2_EQregalia.h"


static const float decibel_range_1 = 40.f;
static const float EQregalia__extra__0 = (decibel_range_1 / 2.f);
static const float EQregalia__extra__2 = (decibel_range_1 / 2.f);
static const float EQregalia__extra__4 = (decibel_range_1 / 2.f);
static const float pi_0 = 3.141592653589793f;
static const float EQregalia__extra__6 = (pi_0 * 200.f);
static const float EQregalia__extra__8 = (pi_0 * 5000.f);
static const float deltaf_10 = 1789.f;
static const float EQregalia__extra__10 = (pi_0 * deltaf_10);
static const float EQregalia__extra__11 = (pi_0 * deltaf_10);
static const float EQregalia__extra__12 = -(0.4643843937958486f);
static const float EQregalia__extra__13 = ((2.f * pi_0) * 1000.f);
static const float EQregalia__extra__18 = (pi_0 * 200.f);
static const float EQregalia__extra__20 = (pi_0 * 5000.f);
static const float deltaf_12 = 1789.f;
static const float EQregalia__extra__22 = (pi_0 * deltaf_12);
static const float EQregalia__extra__23 = (pi_0 * deltaf_12);
static const float EQregalia__extra__24 = -(0.4643843937958486f);
static const float EQregalia__extra__25 = ((2.f * pi_0) * 1000.f);
static const float x_2 = 0.f;
static const float x_4 = 0.f;
static const float decibel_range_1 = 40.f;
static const float EQregalia__extraI__48 = (decibel_range_1 / 2.f);
static const float EQregalia__extraI__49 = tan(0.f);
static const float EQregalia__extraI__50 = (decibel_range_1 / 2.f);


void EQregalia::reset()
{
	firstRun = 1;
}

void EQregalia::setSampleRate(float sampleRate)
{
	fs = sampleRate;
	static const float z_2 = (EQregalia__extra__6 / fs);
	a_2 = ((z_2 - 1.f) / (z_2 + 1.f));
	static const float z_6 = (EQregalia__extra__8 / fs);
	a_6 = ((z_6 - 1.f) / (z_6 + 1.f));
	a_10 = ((1.f - (EQregalia__extra__10 / fs)) / (1.f + (EQregalia__extra__11 / fs)));
	static const float z_10 = (EQregalia__extra__13 / fs);
	static const float b_10 = -(((((EQregalia__extra__12 * z_10) * z_10) - (0.01348369482970019f * z_10)) + 1.000898384794433f));
	EQregalia__extra__14 = (b_10 * (1.f + a_10));
	EQregalia__extra__15 = (b_10 * (1.f + a_10));
	static const float z_4 = (EQregalia__extra__18 / fs);
	a_4 = ((z_4 - 1.f) / (z_4 + 1.f));
	static const float z_8 = (EQregalia__extra__20 / fs);
	a_8 = ((z_8 - 1.f) / (z_8 + 1.f));
	a_12 = ((1.f - (EQregalia__extra__22 / fs)) / (1.f + (EQregalia__extra__23 / fs)));
	static const float z_12 = (EQregalia__extra__25 / fs);
	static const float b_12 = -(((((EQregalia__extra__24 * z_12) * z_12) - (0.01348369482970019f * z_12)) + 1.000898384794433f));
	EQregalia__extra__26 = (b_12 * (1.f + a_12));
	EQregalia__extra__27 = (b_12 * (1.f + a_12));
	
}

void EQregalia::process(float *xL_1, float *xR_1, float *yL_1__out__, float *yR_1__out__, int nSamples)
{
	if (firstRun) {
		low_1_CHANGED = low_1 = 1;
		med_1_CHANGED = med_1 = 1;
		high_1_CHANGED = high_1 = 1;
	}
	else {
		low_1_CHANGED = low_1 != low_1_z1;
		med_1_CHANGED = med_1 != med_1_z1;
		high_1_CHANGED = high_1 != high_1_z1;
	}
	
	if (high_1_CHANGED) {
		static const float highdb_1 = ((high_1 * decibel_range_1) - EQregalia__extra__0);
		static const float gain_11 = highdb_1;
		static const float K_10 = (1.005216266655582f + (gain_11 * (0.1154462118686094f + (gain_11 * (0.006357962473527189f + (gain_11 * (0.0002473043497433871f + (gain_11 * (0.000009275409030059003f + (gain_11 * 2.061300092186973e-7f))))))))));
		EQregalia__extra__1 = ((1.f + K_10) / 2.f);
		EQregalia__extra__9 = ((1.f - K_10) / 2.f);
		static const float gain_13 = highdb_1;
		static const float K_12 = (1.005216266655582f + (gain_13 * (0.1154462118686094f + (gain_13 * (0.006357962473527189f + (gain_13 * (0.0002473043497433871f + (gain_13 * (0.000009275409030059003f + (gain_13 * 2.061300092186973e-7f))))))))));
		EQregalia__extra__16 = ((1.f + K_12) / 2.f);
		EQregalia__extra__21 = ((1.f - K_12) / 2.f);
	}
	if (med_1_CHANGED) {
		static const float meddb_1 = ((med_1 * decibel_range_1) - EQregalia__extra__2);
		static const float gain_7 = meddb_1;
		static const float K_6 = (1.005216266655582f + (gain_7 * (0.1154462118686094f + (gain_7 * (0.006357962473527189f + (gain_7 * (0.0002473043497433871f + (gain_7 * (0.000009275409030059003f + (gain_7 * 2.061300092186973e-7f))))))))));
		EQregalia__extra__3 = ((1.f + K_6) / 2.f);
		EQregalia__extra__7 = ((1.f - K_6) / 2.f);
		static const float gain_9 = meddb_1;
		static const float K_8 = (1.005216266655582f + (gain_9 * (0.1154462118686094f + (gain_9 * (0.006357962473527189f + (gain_9 * (0.0002473043497433871f + (gain_9 * (0.000009275409030059003f + (gain_9 * 2.061300092186973e-7f))))))))));
		EQregalia__extra__17 = ((1.f + K_8) / 2.f);
		EQregalia__extra__19 = ((1.f - K_8) / 2.f);
	}
	if (low_1_CHANGED) {
		EQregalia__extra__5 = ((low_1 * decibel_range_1) - EQregalia__extra__4);
	}
	
	low_1_CHANGED = 0;
	med_1_CHANGED = 0;
	high_1_CHANGED = 0;

	if (firstRun) {
		static const float lowdb_1 = (((low_1 * decibel_range_1) - EQregalia__extraI__48) + EQregalia__extraI__49);
		static const float gain_3 = lowdb_1;
		static const float gain_5 = lowdb_1;
		static const float meddb_1 = ((med_1 * decibel_range_1) - EQregalia__extraI__50);
		static const float gain_7 = meddb_1;
		static const float gain_9 = meddb_1;
		
		__delayed__28 = x_2;
		__delayed__29 = 0.f;
		__delayed__30 = (((((1.005216266655582f + (gain_3 * (0.1154462118686094f + (gain_3 * (0.006357962473527189f + (gain_3 * (0.0002473043497433871f + (gain_3 * (0.000009275409030059003f + (gain_3 * 2.061300092186973e-7f)))))))))) + 1.f) / 2.f) * x_2) + 0.f);
		__delayed__31 = 0.f;
		__delayed__32 = ((((1.f + (1.005216266655582f + (gain_7 * (0.1154462118686094f + (gain_7 * (0.006357962473527189f + (gain_7 * (0.0002473043497433871f + (gain_7 * (0.000009275409030059003f + (gain_7 * 2.061300092186973e-7f))))))))))) / 2.f) * (((((1.005216266655582f + (gain_3 * (0.1154462118686094f + (gain_3 * (0.006357962473527189f + (gain_3 * (0.0002473043497433871f + (gain_3 * (0.000009275409030059003f + (gain_3 * 2.061300092186973e-7f)))))))))) + 1.f) / 2.f) * x_2) + 0.f)) + 0.f);
		__delayed__33 = ((((1.f + (1.005216266655582f + (gain_7 * (0.1154462118686094f + (gain_7 * (0.006357962473527189f + (gain_7 * (0.0002473043497433871f + (gain_7 * (0.000009275409030059003f + (gain_7 * 2.061300092186973e-7f))))))))))) / 2.f) * (((((1.005216266655582f + (gain_3 * (0.1154462118686094f + (gain_3 * (0.006357962473527189f + (gain_3 * (0.0002473043497433871f + (gain_3 * (0.000009275409030059003f + (gain_3 * 2.061300092186973e-7f)))))))))) + 1.f) / 2.f) * x_2) + 0.f)) + 0.f);
		__delayed__34 = ((((1.f + (1.005216266655582f + (gain_7 * (0.1154462118686094f + (gain_7 * (0.006357962473527189f + (gain_7 * (0.0002473043497433871f + (gain_7 * (0.000009275409030059003f + (gain_7 * 2.061300092186973e-7f))))))))))) / 2.f) * (((((1.005216266655582f + (gain_3 * (0.1154462118686094f + (gain_3 * (0.006357962473527189f + (gain_3 * (0.0002473043497433871f + (gain_3 * (0.000009275409030059003f + (gain_3 * 2.061300092186973e-7f)))))))))) + 1.f) / 2.f) * x_2) + 0.f)) + 0.f);
		__delayed__35 = 0.f;
		__delayed__36 = 0.f;
		__delayed__37 = 0.f;
		__delayed__38 = x_4;
		__delayed__39 = 0.f;
		__delayed__40 = (((((1.005216266655582f + (gain_5 * (0.1154462118686094f + (gain_5 * (0.006357962473527189f + (gain_5 * (0.0002473043497433871f + (gain_5 * (0.000009275409030059003f + (gain_5 * 2.061300092186973e-7f)))))))))) + 1.f) / 2.f) * x_4) + 0.f);
		__delayed__41 = 0.f;
		__delayed__42 = ((((1.f + (1.005216266655582f + (gain_9 * (0.1154462118686094f + (gain_9 * (0.006357962473527189f + (gain_9 * (0.0002473043497433871f + (gain_9 * (0.000009275409030059003f + (gain_9 * 2.061300092186973e-7f))))))))))) / 2.f) * (((((1.005216266655582f + (gain_5 * (0.1154462118686094f + (gain_5 * (0.006357962473527189f + (gain_5 * (0.0002473043497433871f + (gain_5 * (0.000009275409030059003f + (gain_5 * 2.061300092186973e-7f)))))))))) + 1.f) / 2.f) * x_4) + 0.f)) + 0.f);
		__delayed__43 = ((((1.f + (1.005216266655582f + (gain_9 * (0.1154462118686094f + (gain_9 * (0.006357962473527189f + (gain_9 * (0.0002473043497433871f + (gain_9 * (0.000009275409030059003f + (gain_9 * 2.061300092186973e-7f))))))))))) / 2.f) * (((((1.005216266655582f + (gain_5 * (0.1154462118686094f + (gain_5 * (0.006357962473527189f + (gain_5 * (0.0002473043497433871f + (gain_5 * (0.000009275409030059003f + (gain_5 * 2.061300092186973e-7f)))))))))) + 1.f) / 2.f) * x_4) + 0.f)) + 0.f);
		__delayed__44 = ((((1.f + (1.005216266655582f + (gain_9 * (0.1154462118686094f + (gain_9 * (0.006357962473527189f + (gain_9 * (0.0002473043497433871f + (gain_9 * (0.000009275409030059003f + (gain_9 * 2.061300092186973e-7f))))))))))) / 2.f) * (((((1.005216266655582f + (gain_5 * (0.1154462118686094f + (gain_5 * (0.006357962473527189f + (gain_5 * (0.0002473043497433871f + (gain_5 * (0.000009275409030059003f + (gain_5 * 2.061300092186973e-7f)))))))))) + 1.f) / 2.f) * x_4) + 0.f)) + 0.f);
		__delayed__45 = 0.f;
		__delayed__46 = 0.f;
		__delayed__47 = 0.f;
	}

	for (int i = 0; i < nSamples; i++) {
		
		const float lowdb_1 = (EQregalia__extra__5 + tan(xL_1[i]));
		const float gain_3 = lowdb_1;
		const float K_2 = (1.005216266655582f + (gain_3 * (0.1154462118686094f + (gain_3 * (0.006357962473527189f + (gain_3 * (0.0002473043497433871f + (gain_3 * (0.000009275409030059003f + (gain_3 * 2.061300092186973e-7f))))))))));
		const float x_2 = xL_1[i];
		const float u_2 = ((((K_2 - 1.f) / 2.f) * ((a_2 * x_2) + __delayed__28)) - (a_2 * __delayed__29));
		const float x_6 = ((((K_2 + 1.f) / 2.f) * x_2) + u_2);
		const float u_6 = ((EQregalia__extra__7 * ((a_6 * x_6) + __delayed__30)) - (a_6 * __delayed__31));
		const float x_10 = ((EQregalia__extra__3 * x_6) + u_6);
		const float u_10 = (((EQregalia__extra__9 * (((a_10 * x_10) + (EQregalia__extra__14 * __delayed__32)) + __delayed__34)) - (EQregalia__extra__15 * __delayed__35)) - (a_10 * __delayed__37));
		const float yL_1 = ((EQregalia__extra__1 * x_10) + u_10);
		const float gain_5 = lowdb_1;
		const float K_4 = (1.005216266655582f + (gain_5 * (0.1154462118686094f + (gain_5 * (0.006357962473527189f + (gain_5 * (0.0002473043497433871f + (gain_5 * (0.000009275409030059003f + (gain_5 * 2.061300092186973e-7f))))))))));
		const float x_4 = xR_1[i];
		const float u_4 = ((((K_4 - 1.f) / 2.f) * ((a_4 * x_4) + __delayed__38)) - (a_4 * __delayed__39));
		const float x_8 = ((((K_4 + 1.f) / 2.f) * x_4) + u_4);
		const float u_8 = ((EQregalia__extra__19 * ((a_8 * x_8) + __delayed__40)) - (a_8 * __delayed__41));
		const float x_12 = ((EQregalia__extra__17 * x_8) + u_8);
		const float u_12 = (((EQregalia__extra__21 * (((a_12 * x_12) + (EQregalia__extra__26 * __delayed__42)) + __delayed__44)) - (EQregalia__extra__27 * __delayed__45)) - (a_12 * __delayed__47));
		const float yR_1 = ((EQregalia__extra__16 * x_12) + u_12);
		
		__delayed__28 = x_2;
		__delayed__29 = u_2;
		__delayed__30 = x_6;
		__delayed__31 = u_6;
		__delayed__32 = x_10;
		__delayed__33 = x_10;
		__delayed__34 = __delayed__33;
		__delayed__35 = u_10;
		__delayed__36 = u_10;
		__delayed__37 = __delayed__36;
		__delayed__38 = x_4;
		__delayed__39 = u_4;
		__delayed__40 = x_8;
		__delayed__41 = u_8;
		__delayed__42 = x_12;
		__delayed__43 = x_12;
		__delayed__44 = __delayed__43;
		__delayed__45 = u_12;
		__delayed__46 = u_12;
		__delayed__47 = __delayed__46;
		
		
		yL_1__out__[i] = yL_1;
		yR_1__out__[i] = yR_1;
	}

	
	low_1_z1 = low_1;
	med_1_z1 = med_1;
	high_1_z1 = high_1;
	firstRun = 0;
}


float EQregalia::getlow_1() {
	return low_1;
}
void EQregalia::setlow_1(float value) {
	low_1 = value;
}

float EQregalia::getmed_1() {
	return med_1;
}
void EQregalia::setmed_1(float value) {
	med_1 = value;
}

float EQregalia::gethigh_1() {
	return high_1;
}
void EQregalia::sethigh_1(float value) {
	high_1 = value;
}
