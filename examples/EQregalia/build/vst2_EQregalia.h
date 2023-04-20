class EQregalia
{
public:
	void setSampleRate(float sampleRate);
	void reset();
	void process(float *x, float *y__out__, int nSamples);

	float getlow();
	void setlow(float value);
	float getmed();
	void setmed(float value);
	float gethigh();
	void sethigh(float value);

private:

	
	float EQregalia__extra__1;
	float EQregalia__extra__3;
	float EQregalia__extra__5;
	float EQregalia__extra__6;
	float a_2;
	float EQregalia__extra__8;
	float a_4;
	float EQregalia__extra__10;
	float a_6;
	float EQregalia__extra__15;
	float EQregalia__extra__16;
	float __delayed__17;
	float __delayed__18;
	float __delayed__19;
	float __delayed__20;
	float __delayed__21;
	float __delayed__22;
	float __delayed__23;
	float __delayed__24;
	float __delayed__25;
	float __delayed__26;
	
	
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
