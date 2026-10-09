#include "common.h"
#include "paper_diode_clipper.h"
#include "diode_clipper.h"

int main(int argc, char** argv)
{
	paper_diode_clipper ciaramella;
	ciaramella.setSampleRate(48000.0f);
	Params params {};
	params.DP_params = { 1.0e-9f, 25.85e-3f, 1.0f };
	State state {};
	Impedances impedances {};
	calc_impedances(impedances, 48000.0f, params);

	return compare_and_benchmark(argc, argv, "Diode clipper", 1.0e-5f,
		[&] { ciaramella.reset(); },
		[&](float* input, float* output, int samples) { ciaramella.process(input, output, samples); },
		[&] { state = {}; },
		[&](float* input, float* output, int samples) {
			for (int i = 0; i < samples; ++i)
				output[i] = process(state, impedances, input[i]);
		});
}
