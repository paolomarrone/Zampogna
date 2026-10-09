class paper_baxandall_eq
{
public:
	void setSampleRate(float sampleRate);
	void reset();
	void process(float *x, float *y_out_, int nSamples);

	float getbass();
	void setbass(float value);
	float gettreble();
	void settreble(float value);

private:

	
	float paper_baxandall_eq_extra_0 = 0.0f;
	float R0p_13 = 0.0f;
	float paper_baxandall_eq_extra_2 = 0.0f;
	float R1p_13 = 0.0f;
	float R3p_13 = 0.0f;
	float R4p_13 = 0.0f;
	float s01_13 = 0.0f;
	float s11_13 = 0.0f;
	float paper_baxandall_eq_extra_5 = 0.0f;
	float paper_baxandall_eq_extra_6 = 0.0f;
	float paper_baxandall_eq_extra_7 = 0.0f;
	float s31_13 = 0.0f;
	float paper_baxandall_eq_extra_9 = 0.0f;
	float k_7 = 0.0f;
	float s41_13 = 0.0f;
	float paper_baxandall_eq_extra_11 = 0.0f;
	float k_10 = 0.0f;
	float s51_13 = 0.0f;
	float s05_13 = 0.0f;
	float s15_13 = 0.0f;
	float paper_baxandall_eq_extra_12 = 0.0f;
	float s35_13 = 0.0f;
	float s45_13 = 0.0f;
	float paper_baxandall_eq_extra_13 = 0.0f;
	float paper_baxandall_eq_extra_14 = 0.0f;
	float paper_baxandall_eq_extra_15 = 0.0f;
	float paper_baxandall_eq_extra_16 = 0.0f;
	float paper_baxandall_eq_extra_17 = 0.0f;
	float paper_baxandall_eq_extra_18 = 0.0f;
	float Rl_16 = 0.0f;
	float paper_baxandall_eq_extra_19 = 0.0f;
	float paper_baxandall_eq_extra_22 = 0.0f;
	float k_3 = 0.0f;
	float _delayed_23 = 0.0f;
	float paper_baxandall_eq_extra_24 = 0.0f;
	float _delayed_25 = 0.0f;
	float paper_baxandall_eq_extra_26 = 0.0f;
	float s04_13 = 0.0f;
	float s14_13 = 0.0f;
	float paper_baxandall_eq_extra_27 = 0.0f;
	float s34_13 = 0.0f;
	float s44_13 = 0.0f;
	float s54_13 = 0.0f;
	float _delayed_28 = 0.0f;
	float paper_baxandall_eq_extra_29 = 0.0f;
	float s03_13 = 0.0f;
	float s13_13 = 0.0f;
	float paper_baxandall_eq_extra_30 = 0.0f;
	float s33_13 = 0.0f;
	float s43_13 = 0.0f;
	float s53_13 = 0.0f;
	float _delayed_31 = 0.0f;
	float s00_13 = 0.0f;
	float s10_13 = 0.0f;
	float paper_baxandall_eq_extra_32 = 0.0f;
	float s30_13 = 0.0f;
	float s40_13 = 0.0f;
	float s50_13 = 0.0f;
	float paper_baxandall_eq_extra_35 = 0.0f;
	float k_2 = 0.0f;
	float _delayed_36 = 0.0f;
	float bass = 0.0f;
	float treble = 0.0f;

	
	float bass_z1;
	char bass_CHANGED;
	
	float treble_z1;
	char treble_CHANGED;
	

	float fs;
	char firstRun;

};
