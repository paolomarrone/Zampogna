class paper_diode_clipper
{
public:
	void setSampleRate(float sampleRate);
	void reset();
	void process(float *x, float *y_out_, int nSamples);


private:

	
	float paper_diode_clipper_extra_1 = 0.0f;
	float paper_diode_clipper_extra_2 = 0.0f;
	float logR_5 = 0.0f;
	float _delayed_4 = 0.0f;

	

	float fs;
	char firstRun;

};
