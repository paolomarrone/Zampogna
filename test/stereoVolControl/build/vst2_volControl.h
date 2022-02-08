class volControl
{
public:
	void setSampleRate(float sampleRate);
	void reset();
	void process(float *x1_1, float *x2_1, float *y1_1__out__, float *y2_1__out__, int nSamples);

	float getvol1_1();
	void setvol1_1(float value);
	float getvol2_1();
	void setvol2_1(float value);

private:
	
	float fs;
	
	float vol1_1;
	float vol1_1_z1;
	char vol1_1_CHANGED;
	
	float vol2_1;
	float vol2_1_z1;
	char vol2_1_CHANGED;
	

	
	
	char firstRun;

};
