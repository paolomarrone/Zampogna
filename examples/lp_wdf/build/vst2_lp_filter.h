class lp_filter
{
public:
	void setSampleRate(float sampleRate);
	void reset();
	void process(float *x_1, float *y_1__out__, int nSamples);

	float getcutoff_1();
	void setcutoff_1(float value);

private:
	
	float fs;
	
	float cutoff_1;
	float cutoff_1_z1;
	char cutoff_1_CHANGED;
	

	
	float Rr_5;
	float lp_filter__extra__1;
	float __delayed__2;
	
	char firstRun;

};
