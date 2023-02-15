#include "vst2_test.h"




void test::reset()
{
	firstRun = 1;
}

void test::setSampleRate(float sampleRate)
{
	fs = sampleRate;
	
}

void test::process(float *x, float *y1__out__, int nSamples)
{
	if (firstRun) {
	}
	else {
	}
	
	

	if (firstRun) {
		
		_delayed_0 = 0.0f;
		_delayed_1 = 0.0f;
	}

	for (int i = 0; i < nSamples; i++) {
		
		if ((x[i] > 0.5f)) {
y1_2 = _delayed_1;
t2_b0 = y1_2;
y1 = y1_2;
t1 = (t2_b0 + x[i]);
t2 = t2_b0;

} else {
t1_c__b1 = (_delayed_0 + x[i]);
y1_3 = t1_c__b1;
y1 = y1_3;
t1 = t1_c__b1;
t2 = y1_3;

}
;
		
		_delayed_0 = t2;
		_delayed_1 = t1;
		
		
		y1__out__[i] = y1;
	}

	
	firstRun = 0;
}

