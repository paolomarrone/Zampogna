#!/usr/bin/env python3

import csv
import math
import pathlib
import subprocess
import sys


CIRCUITS = {
	"rc_lowpass": "RC lowpass",
	"preamp_eq": "Pre-amp EQ",
	"diode_clipper": "Diode clipper, 1 V impulse",
	"baxandall_eq": "Baxandall EQ, controls at 0.5",
}
SAMPLE_RATE = 48000
FLOOR_DB = -180.0


def fft(values):
	count = len(values)
	if count == 0 or count & (count - 1):
		raise ValueError("impulse length must be a power of two")
	result = [complex(value) for value in values]
	j = 0
	for i in range(1, count):
		bit = count >> 1
		while j & bit:
			j ^= bit
			bit >>= 1
		j ^= bit
		if i < j:
			result[i], result[j] = result[j], result[i]
	length = 2
	while length <= count:
		angle = -2.0 * math.pi / length
		step = complex(math.cos(angle), math.sin(angle))
		half = length // 2
		for offset in range(0, count, length):
			weight = 1.0 + 0.0j
			for index in range(offset, offset + half):
				even = result[index]
				odd = result[index + half] * weight
				result[index] = even + odd
				result[index + half] = even - odd
				weight *= step
		length *= 2
	return result[:count // 2 + 1]


def decibels(value):
	return max(FLOOR_DB, 20.0 * math.log10(max(abs(value), 10.0 ** (FLOOR_DB / 20.0))))


def quote(path):
	return "'" + str(path).replace("\\", "\\\\").replace("'", "\\'") + "'"


def render(source, destination, title):
	ciaramella = []
	reference = []
	with source.open(newline="") as file:
		rows = csv.DictReader(file)
		for row in rows:
			ciaramella.append(float(row["ciaramella"]))
			reference.append(float(row["wdf_compiler"]))

	ciaramella_fft = fft(ciaramella)
	reference_fft = fft(reference)
	data_file = source.with_suffix(".dat")
	with data_file.open("w") as file:
		for index in range(1, len(ciaramella_fft)):
			frequency = index * SAMPLE_RATE / len(ciaramella)
			file.write(
				f"{frequency:.9g} {decibels(ciaramella_fft[index]):.9g} "
				f"{decibels(reference_fft[index]):.9g} "
				f"{decibels(ciaramella_fft[index] - reference_fft[index]):.9g}\n"
			)

	gnuplot = f"""
set terminal pngcairo size 1200,720 enhanced font 'Sans,12'
set output {quote(destination)}
set multiplot layout 2,1 title '{title}' font ',16'
set logscale x
set xrange [20:24000]
set grid xtics ytics lc rgb '#dddddd'
set border lc rgb '#555555'
set ylabel 'Magnitude (dB)'
set yrange [-120:20]
set format x ''
set key bottom left
plot {quote(data_file)} using 1:2 with lines lw 3 lc rgb '#1769aa' title 'Ciaramella', \\
     {quote(data_file)} using 1:3 with lines lw 2 dt 2 lc rgb '#e07a1f' title 'wdf\\_compiler'
unset key
set xlabel 'Frequency (Hz)'
set ylabel '|difference| (dBFS)'
set yrange [-180:-40]
set format x '%g'
plot {quote(data_file)} using 1:4 with lines lw 2 lc rgb '#7b1fa2'
unset multiplot
"""
	result = subprocess.run(["gnuplot"], input=gnuplot, text=True, capture_output=True)
	if result.returncode != 0:
		sys.stderr.write(result.stderr)
		raise RuntimeError(f"gnuplot failed for {source}")


def main():
	if len(sys.argv) != 3:
		raise SystemExit(f"usage: {sys.argv[0]} INPUT_DIR OUTPUT_DIR")
	input_directory = pathlib.Path(sys.argv[1])
	output_directory = pathlib.Path(sys.argv[2])
	output_directory.mkdir(parents=True, exist_ok=True)
	for name, title in CIRCUITS.items():
		render(input_directory / f"{name}.csv", output_directory / f"{name}.png", title)


if __name__ == "__main__":
	main()
