class decimator
{
public:
	void setSampleRate(float sampleRate);
	void reset();
	void process(float *x, float *y__out__, int nSamples);


private:

	
	float _delayed_0 = 0.f;
	float _delayed_1 = 0.f;
	
	

	

	float fs;
	char firstRun;

};
