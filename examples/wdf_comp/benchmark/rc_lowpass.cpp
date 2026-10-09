#include "common.h"
#include "paper_rc_lowpass.h"
#include "rc_lowpass_old.h"

int main(int argc, char** argv)
{
	paper_rc_lowpass ciaramella;
	ciaramella.setSampleRate(48000.0f);
	State state {};
	Impedances impedances {};
	calc_impedances(impedances, 48000.0f);

	return compare_and_benchmark(argc, argv, "RC lowpass", 1.0e-5f,
		[&] { ciaramella.reset(); },
		[&](float* input, float* output, int samples) { ciaramella.process(input, output, samples); },
		[&] { state = {}; },
		[&](float* input, float* output, int samples) {
			for (int i = 0; i < samples; ++i)
				output[i] = process(state, impedances, input[i]);
		});
}
