#!/usr/bin/env bash
set -euo pipefail

if (( $# > 2 )); then
	echo "usage: $0 [samples] [runs]" >&2
	exit 2
fi

script_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
build_dir=${WDF_COMP_BUILD_DIR:-"$script_dir/build"}
binary_dir="$build_dir/bin"
response_dir="$build_dir/responses"
plot_dir="$script_dir/plots"
samples=${1:-10000000}
runs=${2:-7}
cxx=${CXX:-clang++}
make_plots=${WDF_BENCH_PLOTS:-1}

if [[ $make_plots == 1 ]]; then
	for command_name in python3 gnuplot; do
		if ! command -v "$command_name" >/dev/null; then
			echo "missing required command: $command_name (or set WDF_BENCH_PLOTS=0)" >&2
			exit 1
		fi
	done
fi
mkdir -p "$response_dir"
"$script_dir/prepare.sh"

echo "compiler: $($cxx --version | head -n 1)"
echo "reference: wdf_compiler 1.1.0, snapshot 1311cb8"
echo "samples: $samples, runs: $runs"
echo

run_benchmark() {
	local name=$1
	if [[ $make_plots == 1 ]]; then
		WDF_RESPONSE_FILE="$response_dir/$name.csv" "$binary_dir/$name" "$samples" "$runs"
	else
		"$binary_dir/$name" "$samples" "$runs"
	fi
}

run_benchmark rc_lowpass
run_benchmark preamp_eq
run_benchmark diode_clipper
run_benchmark baxandall_eq

if [[ $make_plots == 1 ]]; then
	python3 "$script_dir/plot_frequency.py" "$response_dir" "$plot_dir"
	echo "frequency plots: $plot_dir"
fi
