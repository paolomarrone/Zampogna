#ifndef _EFFECT_H
#define _EFFECT_H

#include "audioeffectx.h"
#include "vst2_EQregaliaStereo.h"

class Effect : public AudioEffectX
{
public:
	Effect(audioMasterCallback audioMaster);
	~Effect();

	virtual void setSampleRate(float sampleRate);
	virtual void process(float **inputs, float **outputs, VstInt32 sampleFrames);
	virtual void processReplacing(float **inputs, float **outputs, VstInt32 sampleFrames);
	virtual void setProgramName(char *name);
	virtual void getProgramName(char *name);
	virtual bool getProgramNameIndexed(VstInt32 category, VstInt32 index, char* name);
	virtual void setParameter(VstInt32 index, float value);
	virtual float getParameter(VstInt32 index);
	virtual void getParameterLabel(VstInt32 index, char *label);
	virtual void getParameterDisplay(VstInt32 index, char *text);
	virtual void getParameterName(VstInt32 index, char *text);

	virtual bool getEffectName(char *name);
	virtual bool getVendorString(char *text);
	virtual bool getProductString(char *text);
	virtual VstInt32 getVendorVersion() { return 1000; }

private:
	char programName[32];

	EQregaliaStereo instance;
};

#endif
