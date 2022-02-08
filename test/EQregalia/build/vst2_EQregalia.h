class EQregalia
{
public:
	void setSampleRate(float sampleRate);
	void reset();
	void process(float *xL_1, float *xR_1, float *yL_1__out__, float *yR_1__out__, int nSamples);

	float getlow_1();
	void setlow_1(float value);
	float getmed_1();
	void setmed_1(float value);
	float gethigh_1();
	void sethigh_1(float value);

private:
	
	float fs;
	
	float low_1;
	float low_1_z1;
	char low_1_CHANGED;
	
	float med_1;
	float med_1_z1;
	char med_1_CHANGED;
	
	float high_1;
	float high_1_z1;
	char high_1_CHANGED;
	

	
	float EQregalia__extra__1;
	float EQregalia__extra__3;
	float EQregalia__extra__5;
	float a_2;
	float EQregalia__extra__7;
	float a_6;
	float EQregalia__extra__9;
	float a_10;
	float EQregalia__extra__14;
	float EQregalia__extra__15;
	float EQregalia__extra__16;
	float EQregalia__extra__17;
	float a_4;
	float EQregalia__extra__19;
	float a_8;
	float EQregalia__extra__21;
	float a_12;
	float EQregalia__extra__26;
	float EQregalia__extra__27;
	float __delayed__28;
	float __delayed__29;
	float __delayed__30;
	float __delayed__31;
	float __delayed__32;
	float __delayed__33;
	float __delayed__34;
	float __delayed__35;
	float __delayed__36;
	float __delayed__37;
	float __delayed__38;
	float __delayed__39;
	float __delayed__40;
	float __delayed__41;
	float __delayed__42;
	float __delayed__43;
	float __delayed__44;
	float __delayed__45;
	float __delayed__46;
	float __delayed__47;
	
	char firstRun;

};
