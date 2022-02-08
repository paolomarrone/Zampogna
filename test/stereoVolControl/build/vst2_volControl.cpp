#include "vst2_volControl.h"




void volControl::reset()
{
	firstRun = 1;
}

void volControl::setSampleRate(float sampleRate)
{
	fs = sampleRate;
	
}

void volControl::process(float *x1_1, float *x2_1, float *y1_1__out__, float *y2_1__out__, int nSamples)
{
	if (firstRun) {
		vol1_1_CHANGED = vol1_1 = 1;
		vol2_1_CHANGED = vol2_1 = 1;
	}
	else {
		vol1_1_CHANGED = vol1_1 != vol1_1_z1;
		vol2_1_CHANGED = vol2_1 != vol2_1_z1;
	}
	
	
	vol1_1_CHANGED = 0;
	vol2_1_CHANGED = 0;

	if (firstRun) {
		
	}

	for (int i = 0; i < nSamples; i++) {
		
		const float y1_1 = (x1_1[i] * vol1_1);
		const float y2_1 = (x2_1[i] * vol2_1);
		
		
		
		y1_1__out__[i] = y1_1;
		y2_1__out__[i] = y2_1;
	}

	
	vol1_1_z1 = vol1_1;
	vol2_1_z1 = vol2_1;
	firstRun = 0;
}


float volControl::getvol1_1() {
	return vol1_1;
}
void volControl::setvol1_1(float value) {
	vol1_1 = value;
}

float volControl::getvol2_1() {
	return vol2_1;
}
void volControl::setvol2_1(float value) {
	vol2_1 = value;
}
