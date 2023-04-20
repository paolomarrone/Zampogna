#include "vst2_effect.h"

#include <cstdlib>
#include <cstdio>
#include <cmath>
#include <algorithm>

AudioEffect *createEffectInstance(audioMasterCallback audioMaster) { return new Effect(audioMaster); }

Effect::Effect(audioMasterCallback audioMaster) : AudioEffectX(audioMaster, 1, 0) {
	setNumInputs(1);
	setNumOutputs(1);
	setUniqueID('fxfx');
	DECLARE_VST_DEPRECATED(canMono) ();
	canProcessReplacing();
	strcpy(programName, "Effect");

	instance = test();
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
	
	}
}

float Effect::getParameter(VstInt32 index) {
	float v = 0.f;
	switch (index) {
	
	}
	return v;
}

void Effect::getParameterName(VstInt32 index, char *text) {
	const char *names[] = { };
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
	instance.process(inputs[0], outputs[0], sampleFrames);
}

void Effect::processReplacing(float **inputs, float **outputs, VstInt32 sampleFrames) {
	instance.process(inputs[0], outputs[0], sampleFrames);
}