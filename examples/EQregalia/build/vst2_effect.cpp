#include "vst2_effect.h"

#include <cstdlib>
#include <cstdio>
#include <cmath>
#include <algorithm>

AudioEffect *createEffectInstance(audioMasterCallback audioMaster) { return new Effect(audioMaster); }

Effect::Effect(audioMasterCallback audioMaster) : AudioEffectX(audioMaster, 1, 3) {
	setNumInputs(2);
	setNumOutputs(2);
	setUniqueID('fxfx');
	DECLARE_VST_DEPRECATED(canMono) ();
	canProcessReplacing();
	strcpy(programName, "Effect");

	instance = EQregaliaStereo();
}

Effect::~Effect() {}

bool Effect::getProductString(char* text) { strcpy(text, "Effect"); return true; }
bool Effect::getVendorString(char* text) { strcpy(text, "Ciaramella"); return true; }
bool Effect::getEffectName(char* name) { strcpy(name, "Effect"); return true; }

void Effect::setProgramName(char *name) { strcpy(programName, name); }
void Effect::getProgramName(char *name) { strcpy(name, programName); }

bool Effect::getProgramNameIndexed(VstInt32 category, VstInt32 index, char* name) {
	if (index == 0) {
		strcpy(name, programName);
		return true;
	}
	return false;
}

void Effect::setParameter(VstInt32 index, float value) {
	switch (index) {
	
	case 0:
		instance.setlow(value);
		break;
	case 1:
		instance.setmed(value);
		break;
	case 2:
		instance.sethigh(value);
		break;
	}
}

float Effect::getParameter(VstInt32 index) {
	float v = 0.f;
	switch (index) {
	
	case 0:
		v = instance.getlow();
		break;
	case 1:
		v = instance.getmed();
		break;
	case 2:
		v = instance.gethigh();
		break;
	}
	return v;
}

void Effect::getParameterName(VstInt32 index, char *text) {
	const char *names[] = { "low","med","high"};
	strcpy(text, names[index]);
}

void Effect::getParameterDisplay(VstInt32 index, char *text) {
	text[0] = '\0';
}

void Effect::getParameterLabel(VstInt32 index, char *text)  {
	text[0] = '\0';
}

void Effect::setSampleRate(float sampleRate) {
	instance.setSampleRate(sampleRate);
	instance.reset();
}

void Effect::process(float **inputs, float **outputs, VstInt32 sampleFrames) {
	instance.process(inputs[0],inputs[1], outputs[0],outputs[1], sampleFrames);
}

void Effect::processReplacing(float **inputs, float **outputs, VstInt32 sampleFrames) {
	instance.process(inputs[0],inputs[1], outputs[0],outputs[1], sampleFrames);
}