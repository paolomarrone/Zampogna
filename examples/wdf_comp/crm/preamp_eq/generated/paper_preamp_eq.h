class paper_preamp_eq
{
public:
	void setSampleRate(float sampleRate);
	void reset();
	void process(float *x, float *y_out_, int nSamples);


private:

	
	float paper_preamp_eq_extra_1 = 0.0f;
	float paper_preamp_eq_extra_2 = 0.0f;
	float paper_preamp_eq_extra_3 = 0.0f;
	float paper_preamp_eq_extra_4 = 0.0f;
	float paper_preamp_eq_extra_6 = 0.0f;
	float paper_preamp_eq_extra_7 = 0.0f;
	float paper_preamp_eq_extra_8 = 0.0f;
	float paper_preamp_eq_extra_9 = 0.0f;
	float paper_preamp_eq_extra_10 = 0.0f;
	float _delayed_11 = 0.0f;
	float _delayed_12 = 0.0f;
	float paper_preamp_eq_extra_13 = 0.0f;
	float paper_preamp_eq_extra_14 = 0.0f;
	float _delayed_15 = 0.0f;
	float paper_preamp_eq_extra_16 = 0.0f;
	float _delayed_17 = 0.0f;

	

	float fs;
	char firstRun;

};
