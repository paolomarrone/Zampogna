#!/usr/bin/env bash
set -euo pipefail

script_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
build_dir=${WDF_COMP_BUILD_DIR:-"$script_dir/build"}
crm_dir="$script_dir/crm"
binary_dir="$build_dir/bin"
benchmark_dir="$script_dir/benchmark"
reference_dir="$script_dir/reference"
reference_commit=1311cb8710696ae5f2acc5c93e2ccba7aaae3688
cxx=${CXX:-clang++}

require() {
	if ! command -v "$1" >/dev/null; then
		echo "missing required command: $1" >&2
		exit 1
	fi
}

require git
require "$cxx"
mkdir -p "$binary_dir"

if [[ ! -d "$reference_dir/.git" ]]; then
	if [[ -e "$reference_dir" ]]; then
		echo "$reference_dir exists but is not a git clone" >&2
		exit 1
	fi
	git clone --quiet --filter=blob:none --no-checkout https://github.com/Chowdhury-DSP/wdf_compiler.git "$reference_dir"
fi
if ! git -C "$reference_dir" cat-file -e "$reference_commit^{commit}" 2>/dev/null; then
	git -C "$reference_dir" fetch --quiet origin "$reference_commit"
fi
git -C "$reference_dir" sparse-checkout init --cone
git -C "$reference_dir" sparse-checkout set \
	lib \
	tests/rc_lowpass \
	tests/preamp_eq \
	tests/diode_clipper \
	tests/baxandall_eq
git -C "$reference_dir" checkout --quiet --detach "$reference_commit"

required_reference_files=(
	"tests/rc_lowpass/rc_lowpass_old.h"
	"tests/preamp_eq/preamp_eq.h"
	"tests/diode_clipper/diode_clipper.h"
	"tests/baxandall_eq/baxandall_eq.h"
	"tests/baxandall_eq/custom_baxandall_rtype.h"
	"lib/wdf_lib_omega.h"
)
for file in "${required_reference_files[@]}"; do
	if [[ ! -f "$reference_dir/$file" ]]; then
		echo "missing reference file: $reference_dir/$file" >&2
		exit 1
	fi
done

flags=(-std=c++20 -O3 -march=native)
if [[ ${WDF_BENCH_LTO:-1} == 1 ]]; then
	flags+=(-flto=thin -fuse-ld=lld)
fi
if [[ -n ${CXXFLAGS:-} ]]; then
	read -r -a extra_flags <<< "$CXXFLAGS"
	flags+=("${extra_flags[@]}")
fi

"$cxx" "${flags[@]}" \
	-I "$benchmark_dir" \
	-I "$crm_dir/rc_lowpass/generated" \
	-I "$reference_dir/tests/rc_lowpass" \
	"$benchmark_dir/rc_lowpass.cpp" \
	"$crm_dir/rc_lowpass/generated/paper_rc_lowpass.cpp" \
	-o "$binary_dir/rc_lowpass"

"$cxx" "${flags[@]}" \
	-I "$benchmark_dir" \
	-I "$crm_dir/preamp_eq/generated" \
	-I "$reference_dir/tests/preamp_eq" \
	"$benchmark_dir/preamp_eq.cpp" \
	"$crm_dir/preamp_eq/generated/paper_preamp_eq.cpp" \
	-o "$binary_dir/preamp_eq"

"$cxx" "${flags[@]}" \
	-I "$benchmark_dir" \
	-I "$crm_dir/diode_clipper/generated" \
	-I "$reference_dir/tests/diode_clipper" \
	-I "$reference_dir/lib" \
	-include "$crm_dir/diode_clipper/externals.h" \
	"$benchmark_dir/diode_clipper.cpp" \
	"$crm_dir/diode_clipper/generated/paper_diode_clipper.cpp" \
	-o "$binary_dir/diode_clipper"

"$cxx" "${flags[@]}" \
	-I "$benchmark_dir" \
	-I "$crm_dir/baxandall_eq/generated" \
	-I "$reference_dir/tests/baxandall_eq" \
	-I "$reference_dir/lib" \
	-include "$crm_dir/baxandall_eq/externals.h" \
	"$benchmark_dir/baxandall_eq.cpp" \
	"$crm_dir/baxandall_eq/generated/paper_baxandall_eq.cpp" \
	-o "$binary_dir/baxandall_eq"

echo "built: $binary_dir"
