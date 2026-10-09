#include "common.h"
#include "paper_preamp_eq.h"
#include "preamp_eq.h"

int main(int argc, char** argv)
{
	paper_preamp_eq ciaramella;
	ciaramella.setSampleRate(48000.0f);
	State state {};
	Impedances impedances {};
	calc_impedances(impedances, 48000.0f);

	return compare_and_benchmark(argc, argv, "Pre-amp EQ", 1.0e-5f,
		[&] { ciaramella.reset(); },
		[&](float* input, float* output, int samples) { ciaramella.process(input, output, samples); },
		[&] { state = {}; },
		[&](float* input, float* output, int samples) {
			for (int i = 0; i < samples; ++i)
				output[i] = process(state, impedances, input[i]);
		});
}
