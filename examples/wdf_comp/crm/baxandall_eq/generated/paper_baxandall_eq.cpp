#include "paper_baxandall_eq.h"


static const float Rl_5 = 1000000.0f;
static const float paper_baxandall_eq_extra_1 = (1.0f / Rl_5);
static const float R2p_13 = 10000.0f;
static const float Rl_9 = 1000.0f;
static const float paper_baxandall_eq_extra_3 = (2.0f * 2.2e-7f);
static const float Rl_12 = 10000.0f;
static const float paper_baxandall_eq_extra_4 = (2.0f * 2.2e-8f);
static const float bRl = 0.0f;
static const float al_5 = bRl;
static const float a2_13 = 0.0f;
static const float al_9 = 0.0f;
static const float paper_baxandall_eq_extra_8 = (2.0f * 2.2e-7f);
static const float al_12 = 0.0f;
static const float paper_baxandall_eq_extra_10 = (2.0f * 2.2e-8f);
static const float paper_baxandall_eq_extra_20 = (2.0f * 6.4e-8f);
static const float paper_baxandall_eq_extra_21 = (2.0f * 6.4e-8f);
static const float paper_baxandall_eq_extra_33 = (2.0f * 6.4e-9f);
static const float paper_baxandall_eq_extra_34 = (2.0f * 6.4e-9f);


void paper_baxandall_eq::reset()
{
	firstRun = 1;
}

void paper_baxandall_eq::setSampleRate(float sampleRate)
{
	fs = sampleRate;
	paper_baxandall_eq_extra_0 = (0.5f / (6.4e-9f * fs));
	paper_baxandall_eq_extra_2 = (0.5f / (6.4e-8f * fs));
	paper_baxandall_eq_extra_9 = (1.0f / fs);
	paper_baxandall_eq_extra_11 = (1.0f / fs);
	Rl_16 = (0.5f / (0.000001f * fs));
	paper_baxandall_eq_extra_22 = (1.0f / fs);
	paper_baxandall_eq_extra_35 = (1.0f / fs);
	
}

void paper_baxandall_eq::process(float *x, float *y_out_, int nSamples)
{
	if (firstRun) {
		bass_CHANGED = 1;
		treble_CHANGED = 1;
	}
	else {
		bass_CHANGED = bass != bass_z1;
		treble_CHANGED = treble != treble_z1;
	}
	
	if (treble_CHANGED) {
		const float trebleA = (100000.0f * treble);
		const float R_2 = ((trebleA * 10000.0f) / (trebleA + 10000.0f));
		R0p_13 = (R_2 + paper_baxandall_eq_extra_0);
		const float trebleB = (100000.0f * (1.0f - treble));
		const float R_3 = ((trebleB * 1000.0f) / (trebleB + 1000.0f));
		const float Rr_5 = (R_3 + paper_baxandall_eq_extra_2);
		const float R0_5 = (1.0f / (paper_baxandall_eq_extra_1 + (1.0f / Rr_5)));
		R1p_13 = R0_5;
		paper_baxandall_eq_extra_5 = ((R0_5 / Rl_5) * al_5);
		paper_baxandall_eq_extra_6 = (R0_5 / Rr_5);
		paper_baxandall_eq_extra_13 = ((R0p_13 * R1p_13) + ((R0p_13 + R1p_13) * R2p_13));
		paper_baxandall_eq_extra_14 = ((R0p_13 * R1p_13) + ((R0p_13 + R1p_13) * R2p_13));
		paper_baxandall_eq_extra_15 = (R0p_13 + R1p_13);
		paper_baxandall_eq_extra_16 = ((R0p_13 * R1p_13) + ((R0p_13 + R1p_13) * R2p_13));
		paper_baxandall_eq_extra_17 = (R0p_13 + R2p_13);
		paper_baxandall_eq_extra_18 = (R1p_13 + R2p_13);
		k_3 = ((paper_baxandall_eq_extra_20 * R_3) / ((paper_baxandall_eq_extra_21 * R_3) + paper_baxandall_eq_extra_22));
		k_2 = ((paper_baxandall_eq_extra_33 * R_2) / ((paper_baxandall_eq_extra_34 * R_2) + paper_baxandall_eq_extra_35));
	}
	if (bass_CHANGED) {
		const float R_7 = (100000.0f * (1.0f - bass));
		const float Rr_9 = (R_7 / (1.0f + ((paper_baxandall_eq_extra_3 * R_7) * fs)));
		const float R0_9 = (Rl_9 + Rr_9);
		R3p_13 = R0_9;
		const float R_10 = (100000.0f * bass);
		const float Rr_12 = (R_10 / (1.0f + ((paper_baxandall_eq_extra_4 * R_10) * fs)));
		const float R0_12 = (Rl_12 + Rr_12);
		R4p_13 = R0_12;
		const float twoRC_7 = (paper_baxandall_eq_extra_8 * R_7);
		k_7 = (twoRC_7 / (twoRC_7 + paper_baxandall_eq_extra_9));
		const float twoRC_10 = (paper_baxandall_eq_extra_10 * R_10);
		k_10 = (twoRC_10 / (twoRC_10 + paper_baxandall_eq_extra_11));
		paper_baxandall_eq_extra_26 = (Rr_12 / R0_12);
		paper_baxandall_eq_extra_29 = (Rr_9 / R0_9);
	}
	if (bass_CHANGED | treble_CHANGED) {
		s01_13 = baxandall_scattering(1.0f, R0p_13, R1p_13, R2p_13, R3p_13, R4p_13);
		s11_13 = baxandall_scattering(7.0f, R0p_13, R1p_13, R2p_13, R3p_13, R4p_13);
		paper_baxandall_eq_extra_7 = (baxandall_scattering(13.0f, R0p_13, R1p_13, R2p_13, R3p_13, R4p_13) * a2_13);
		s31_13 = baxandall_scattering(19.0f, R0p_13, R1p_13, R2p_13, R3p_13, R4p_13);
		s41_13 = baxandall_scattering(25.0f, R0p_13, R1p_13, R2p_13, R3p_13, R4p_13);
		s51_13 = baxandall_scattering(31.0f, R0p_13, R1p_13, R2p_13, R3p_13, R4p_13);
		s05_13 = baxandall_scattering(5.0f, R0p_13, R1p_13, R2p_13, R3p_13, R4p_13);
		s15_13 = baxandall_scattering(11.0f, R0p_13, R1p_13, R2p_13, R3p_13, R4p_13);
		paper_baxandall_eq_extra_12 = (baxandall_scattering(17.0f, R0p_13, R1p_13, R2p_13, R3p_13, R4p_13) * a2_13);
		s35_13 = baxandall_scattering(23.0f, R0p_13, R1p_13, R2p_13, R3p_13, R4p_13);
		s45_13 = baxandall_scattering(29.0f, R0p_13, R1p_13, R2p_13, R3p_13, R4p_13);
		const float Rr_16 = (((paper_baxandall_eq_extra_13 * R3p_13) + ((paper_baxandall_eq_extra_14 + (paper_baxandall_eq_extra_15 * R3p_13)) * R4p_13)) / ((paper_baxandall_eq_extra_16 + (paper_baxandall_eq_extra_17 * R3p_13)) + ((paper_baxandall_eq_extra_18 + R3p_13) * R4p_13)));
		const float R0_16 = (Rl_16 + Rr_16);
		paper_baxandall_eq_extra_19 = (Rr_16 / R0_16);
		paper_baxandall_eq_extra_24 = (Rl_16 / R0_16);
		s04_13 = baxandall_scattering(4.0f, R0p_13, R1p_13, R2p_13, R3p_13, R4p_13);
		s14_13 = baxandall_scattering(10.0f, R0p_13, R1p_13, R2p_13, R3p_13, R4p_13);
		paper_baxandall_eq_extra_27 = (baxandall_scattering(16.0f, R0p_13, R1p_13, R2p_13, R3p_13, R4p_13) * a2_13);
		s34_13 = baxandall_scattering(22.0f, R0p_13, R1p_13, R2p_13, R3p_13, R4p_13);
		s44_13 = baxandall_scattering(28.0f, R0p_13, R1p_13, R2p_13, R3p_13, R4p_13);
		s54_13 = baxandall_scattering(34.0f, R0p_13, R1p_13, R2p_13, R3p_13, R4p_13);
		s03_13 = baxandall_scattering(3.0f, R0p_13, R1p_13, R2p_13, R3p_13, R4p_13);
		s13_13 = baxandall_scattering(9.0f, R0p_13, R1p_13, R2p_13, R3p_13, R4p_13);
		paper_baxandall_eq_extra_30 = (baxandall_scattering(15.0f, R0p_13, R1p_13, R2p_13, R3p_13, R4p_13) * a2_13);
		s33_13 = baxandall_scattering(21.0f, R0p_13, R1p_13, R2p_13, R3p_13, R4p_13);
		s43_13 = baxandall_scattering(27.0f, R0p_13, R1p_13, R2p_13, R3p_13, R4p_13);
		s53_13 = baxandall_scattering(33.0f, R0p_13, R1p_13, R2p_13, R3p_13, R4p_13);
		s00_13 = baxandall_scattering(0.0f, R0p_13, R1p_13, R2p_13, R3p_13, R4p_13);
		s10_13 = baxandall_scattering(6.0f, R0p_13, R1p_13, R2p_13, R3p_13, R4p_13);
		paper_baxandall_eq_extra_32 = (baxandall_scattering(12.0f, R0p_13, R1p_13, R2p_13, R3p_13, R4p_13) * a2_13);
		s30_13 = baxandall_scattering(18.0f, R0p_13, R1p_13, R2p_13, R3p_13, R4p_13);
		s40_13 = baxandall_scattering(24.0f, R0p_13, R1p_13, R2p_13, R3p_13, R4p_13);
		s50_13 = baxandall_scattering(30.0f, R0p_13, R1p_13, R2p_13, R3p_13, R4p_13);
	}
	
	bass_CHANGED = 0;
	treble_CHANGED = 0;

	if (firstRun) {
		
		_delayed_23 = 0.0f;
		_delayed_25 = 0.0f;
		_delayed_28 = 0.0f;
		_delayed_31 = 0.0f;
		_delayed_36 = 0.0f;
	}

	for (int i = 0; i < nSamples; i++) {
		
		const float old_2 = _delayed_36;
		const float a0_13 = -(old_2);
		const float old_3 = _delayed_23;
		const float ar_5 = -(old_3);
		const float bu_5 = (paper_baxandall_eq_extra_5 + (paper_baxandall_eq_extra_6 * ar_5));
		const float a1_13 = bu_5;
		const float old_7 = _delayed_31;
		const float b_7 = (k_7 * old_7);
		const float ar_9 = b_7;
		const float a3_13 = -((al_9 + ar_9));
		const float old_10 = _delayed_28;
		const float b_10 = (k_10 * old_10);
		const float ar_12 = b_10;
		const float a4_13 = -((al_12 + ar_12));
		const float ar_16 = (((((s05_13 * a0_13) + (s15_13 * a1_13)) + paper_baxandall_eq_extra_12) + (s35_13 * a3_13)) + (s45_13 * a4_13));
		const float al_16 = _delayed_25;
		const float sum_16 = ((((2.0f * x[i]) - -((al_16 + ar_16))) + al_16) + ar_16);
		const float au_13 = (ar_16 - (paper_baxandall_eq_extra_19 * sum_16));
		const float junction_5 = (((((((s01_13 * a0_13) + (s11_13 * a1_13)) + paper_baxandall_eq_extra_7) + (s31_13 * a3_13)) + (s41_13 * a4_13)) + (s51_13 * au_13)) + bu_5);
		const float y = (0.5f * ((junction_5 - al_5) + bRl));
		const float a_3 = (junction_5 - ar_5);
		const float a_2 = ((((((s00_13 * a0_13) + (s10_13 * a1_13)) + paper_baxandall_eq_extra_32) + (s30_13 * a3_13)) + (s40_13 * a4_13)) + (s50_13 * au_13));
		
		_delayed_23 = (-(a_3) + (k_3 * (a_3 + old_3)));
		_delayed_25 = (al_16 - (paper_baxandall_eq_extra_24 * sum_16));
		_delayed_28 = ((b_10 + (ar_12 - (paper_baxandall_eq_extra_26 * ((((((((s04_13 * a0_13) + (s14_13 * a1_13)) + paper_baxandall_eq_extra_27) + (s34_13 * a3_13)) + (s44_13 * a4_13)) + (s54_13 * au_13)) + al_12) + ar_12)))) - old_10);
		_delayed_31 = ((b_7 + (ar_9 - (paper_baxandall_eq_extra_29 * ((((((((s03_13 * a0_13) + (s13_13 * a1_13)) + paper_baxandall_eq_extra_30) + (s33_13 * a3_13)) + (s43_13 * a4_13)) + (s53_13 * au_13)) + al_9) + ar_9)))) - old_7);
		_delayed_36 = (-(a_2) + (k_2 * (a_2 + old_2)));
		
		
		y_out_[i] = y;
	}

	
	bass_z1 = bass;
	treble_z1 = treble;
	firstRun = 0;
}


float paper_baxandall_eq::getbass() {
	return bass;
}
void paper_baxandall_eq::setbass(float value) {
	bass = value;
}

float paper_baxandall_eq::gettreble() {
	return treble;
}
void paper_baxandall_eq::settreble(float value) {
	treble = value;
}

