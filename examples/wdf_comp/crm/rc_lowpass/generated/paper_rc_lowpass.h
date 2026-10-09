class paper_rc_lowpass
{
public:
	void setSampleRate(float sampleRate);
	void reset();
	void process(float *x, float *y_out_, int nSamples);


private:

	
	float paper_rc_lowpass_extra_0 = 0.0f;
	float _delayed_1 = 0.0f;

	

	float fs;
	char firstRun;

};
