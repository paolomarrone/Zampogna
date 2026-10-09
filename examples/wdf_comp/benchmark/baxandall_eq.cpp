#include "common.h"
#include "paper_baxandall_eq.h"
#include "baxandall_eq.h"

int main(int argc, char** argv)
{
	paper_baxandall_eq ciaramella;
	ciaramella.setSampleRate(48000.0f);
	ciaramella.setbass(0.5f);
	ciaramella.settreble(0.5f);
	Params params {};
	params.S4_res_value = 50000.0f * 10000.0f / 60000.0f;
	params.S5_res_value = 50000.0f * 1000.0f / 51000.0f;
	params.P3_res_value = 50000.0f;
	params.P2_res_value = 50000.0f;
	State state {};
	Impedances impedances {};
	calc_impedances(impedances, 48000.0f, params);

	return compare_and_benchmark(argc, argv, "Baxandall EQ", 1.0e-5f,
		[&] { ciaramella.reset(); },
		[&](float* input, float* output, int samples) { ciaramella.process(input, output, samples); },
		[&] { state = {}; },
		[&](float* input, float* output, int samples) {
			for (int i = 0; i < samples; ++i)
				output[i] = process(state, impedances, input[i]);
		});
}
