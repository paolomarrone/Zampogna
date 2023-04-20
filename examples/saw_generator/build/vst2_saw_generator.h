class saw_generator
{
public:
	void setSampleRate(float sampleRate);
	void reset();
	void process(float *y__out__, int nSamples);

	float getenable();
	void setenable(float value);
	float getfrequency();
	void setfrequency(float value);

private:

	
	float saw_generator_extra_0 = 0.f;
	float phaseInc_2 = 0.f;
	float phase_2 = 0.f;
	float _delayed_1 = 0.f;
	
	
	float enable = 0;
	float frequency = 0;

	
	float enable_z1;
	char enable_CHANGED;
	
	float frequency_z1;
	char frequency_CHANGED;
	

	float fs;
	char firstRun;

};
