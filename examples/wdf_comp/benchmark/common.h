#pragma once

#include <algorithm>
#include <atomic>
#include <cerrno>
#include <chrono>
#include <cmath>
#include <cstdio>
#include <cstdlib>
#include <limits>
#include <stdexcept>
#include <string>
#include <vector>

struct benchmark_config
{
	int samples = 10'000'000;
	int runs = 7;
};

inline int parse_positive(const char* text, const char* name)
{
	errno = 0;
	char* end = nullptr;
	const auto value = std::strtoull(text, &end, 10);
	if (errno != 0 || end == text || *end != '\0' || value == 0 || value > std::numeric_limits<int>::max())
		throw std::runtime_error(std::string("invalid ") + name + ": " + text);
	return static_cast<int>(value);
}

inline benchmark_config parse_config(int argc, char** argv)
{
	if (argc > 3)
		throw std::runtime_error("usage: benchmark [samples] [runs]");
	benchmark_config config;
	if (argc > 1)
		config.samples = parse_positive(argv[1], "sample count");
	if (argc > 2)
		config.runs = parse_positive(argv[2], "run count");
	return config;
}

inline void fill_input(std::vector<float>& input)
{
	unsigned state = 0x12345678u;
	for (float& sample : input) {
		state = state * 1664525u + 1013904223u;
		sample = static_cast<float>(state >> 8) * (2.0f / 16777215.0f) - 1.0f;
	}
}

template <typename Reset, typename Process>
double measure(const char* name, const benchmark_config& config, std::vector<float>& input,
	std::vector<float>& output, Reset&& reset, Process&& process)
{
	reset();
	double best = std::numeric_limits<double>::infinity();
	double checksum = 0.0;

	for (int run = 0; run < config.runs; ++run) {
		std::atomic_signal_fence(std::memory_order_seq_cst);
		const auto start = std::chrono::steady_clock::now();
		process(input.data(), output.data(), config.samples);
		std::atomic_signal_fence(std::memory_order_seq_cst);
		const auto end = std::chrono::steady_clock::now();
		best = std::min(best, std::chrono::duration<double, std::nano>(end - start).count() / config.samples);
		for (float sample : output)
			checksum += sample;
	}

	std::printf("  %-12s %8.3f ns/sample  checksum %.9g\n", name, best, checksum);
	return best;
}

template <typename CiaramellaReset, typename CiaramellaProcess, typename ReferenceReset, typename ReferenceProcess>
int compare_and_benchmark(int argc, char** argv, const char* circuit, float tolerance,
	CiaramellaReset&& ciaramella_reset, CiaramellaProcess&& ciaramella_process,
	ReferenceReset&& reference_reset, ReferenceProcess&& reference_process)
{
	const auto config = parse_config(argc, argv);
	constexpr int validation_samples = 8192;
	std::vector<float> validation_input(validation_samples);
	std::vector<float> actual(validation_samples);
	std::vector<float> expected(validation_samples);
	fill_input(validation_input);

	ciaramella_reset();
	reference_reset();
	ciaramella_process(validation_input.data(), actual.data(), validation_samples);
	reference_process(validation_input.data(), expected.data(), validation_samples);

	float max_error = 0.0f;
	int max_error_sample = 0;
	for (int i = 0; i < validation_samples; ++i) {
		if (!std::isfinite(actual[i]) || !std::isfinite(expected[i])) {
			std::fprintf(stderr, "%s: non-finite output at sample %d\n", circuit, i);
			return 1;
		}
		const float error = std::abs(actual[i] - expected[i]);
		if (error > max_error) {
			max_error = error;
			max_error_sample = i;
		}
	}

	std::printf("%s\n", circuit);
	std::printf("  correctness  max error %.9g at sample %d\n", max_error, max_error_sample);
	if (max_error > tolerance) {
		std::fprintf(stderr, "  tolerance exceeded: %.9g > %.9g\n", max_error, tolerance);
		return 1;
	}

	if (const char* response_file = std::getenv("WDF_RESPONSE_FILE")) {
		constexpr int impulse_samples = 16384;
		std::vector<float> impulse(impulse_samples);
		std::vector<float> ciaramella_impulse(impulse_samples);
		std::vector<float> reference_impulse(impulse_samples);
		impulse[0] = 1.0f;
		ciaramella_reset();
		reference_reset();
		ciaramella_process(impulse.data(), ciaramella_impulse.data(), impulse_samples);
		reference_process(impulse.data(), reference_impulse.data(), impulse_samples);

		FILE* file = std::fopen(response_file, "w");
		if (file == nullptr) {
			std::perror(response_file);
			return 1;
		}
		std::fprintf(file, "sample,ciaramella,wdf_compiler\n");
		for (int i = 0; i < impulse_samples; ++i)
			std::fprintf(file, "%d,%.9g,%.9g\n", i, ciaramella_impulse[i], reference_impulse[i]);
		std::fclose(file);
	}

	std::vector<float> input(config.samples);
	std::vector<float> ciaramella_output(config.samples);
	std::vector<float> reference_output(config.samples);
	fill_input(input);
	const double ciaramella_time = measure("Ciaramella", config, input, ciaramella_output,
		ciaramella_reset, ciaramella_process);
	const double reference_time = measure("wdf_compiler", config, input, reference_output,
		reference_reset, reference_process);
	std::printf("  ratio        %.3f Ciaramella/wdf_compiler\n\n", ciaramella_time / reference_time);
	return 0;
}
