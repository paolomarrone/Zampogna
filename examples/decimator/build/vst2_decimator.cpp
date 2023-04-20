#include "vst2_decimator.h"




void decimator::reset()
{
	firstRun = 1;
}

void decimator::setSampleRate(float sampleRate)
{
	fs = sampleRate;
	
}

void decimator::process(float *x, float *y__out__, int nSamples)
{
	if (firstRun) {
	}
	else {
	}
	
	

	if (firstRun) {
		
		_delayed_0 = 1.0f;
		_delayed_1 = 0.0f;
	}

	for (int i = 0; i < nSamples; i++) {
		
		if (_delayed_0) {
y = x[i];
s = 0.0f;

} else {
y = _delayed_1;
s = 1.0f;

}
;
		
		_delayed_0 = s;
		_delayed_1 = y;
		
		
		y__out__[i] = y;
	}

	
	firstRun = 0;
}

