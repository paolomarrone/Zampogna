class EQregaliaStereo
{
public:
	void setSampleRate(float sampleRate);
	void reset();
	void process(float *xL, float *xR, float *yL__out__, float *yR__out__, int nSamples);

	float getlow();
	void setlow(float value);
	float getmed();
	void setmed(float value);
	float gethigh();
	void sethigh(float value);

private:

	
	float EQregaliaStereo__extra__1;
	float EQregaliaStereo__extra__3;
	float EQregaliaStereo__extra__5;
	float EQregaliaStereo__extra__6;
	float a_3;
	float EQregaliaStereo__extra__8;
	float a_5;
	float EQregaliaStereo__extra__10;
	float a_7;
	float EQregaliaStereo__extra__15;
	float EQregaliaStereo__extra__16;
	float EQregaliaStereo__extra__18;
	float EQregaliaStereo__extra__20;
	float EQregaliaStereo__extra__22;
	float EQregaliaStereo__extra__23;
	float a_10;
	float EQregaliaStereo__extra__25;
	float a_12;
	float EQregaliaStereo__extra__27;
	float a_14;
	float EQregaliaStereo__extra__32;
	float EQregaliaStereo__extra__33;
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
	float __delayed__48;
	float __delayed__49;
	float __delayed__50;
	float __delayed__51;
	float __delayed__52;
	float __delayed__53;
	
	
	float low = 1;
	float med = 0;
	float high = 0;

	
	float low_z1;
	char low_CHANGED;
	
	float med_z1;
	char med_CHANGED;
	
	float high_z1;
	char high_CHANGED;
	

	float fs;
	char firstRun;

};
