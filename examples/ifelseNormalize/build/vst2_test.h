class test
{
public:
	void setSampleRate(float sampleRate);
	void reset();
	void process(float *x, float *y1__out__, int nSamples);


private:

	
	float y1_2 = 0.f;
	float t2_b0 = 0.f;
	float t1_c__b1 = 0.f;
	float y1_3 = 0.f;
	float _delayed_0 = 0.f;
	float _delayed_1 = 0.f;
	
	

	

	float fs;
	char firstRun;

};
