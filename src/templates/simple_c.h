// TODO

#ifndef _{{=it.name.toUpperCase()}}_H
#define _{{=it.name.toUpperCase()}}_H

{{?it.control_inputs.length > 0}}
enum {
	{{~it.control_inputs:c}}
	p_{{=c}},{{~}}
};
{{?}}

struct _{{=it.name}} {
	{{=it.memory_declarations}}
	
	{{~it.control_inputs:c}}
	float {{=c}}_z1;
	char {{=c}}_CHANGED;
	{{~}}

	float fs;
	char firstRun;
};
typedef struct _{{=it.name}} {{=it.name}};


void {{=it.name}}_init({{=it.name}} *instance);
void {{=it.name}}_set_sample_rate({{=it.name}} *instance, float sample_rate);
void {{=it.name}}_reset({{=it.name}} *instance);
void {{=it.name}}_process({{=it.name}} *instance, {{?it.audio_inputs.length > 0}} {{=it.audio_inputs.map(x => 'const float *' + x).join(', ')}}, {{?}}{{?it.audio_outputs.length > 0}}{{=it.audio_outputs.map(x => 'float *' + x).join(', ')}}, {{?}}int nSamples);
float {{=it.name}}_get_parameter({{=it.name}} *instance, int index);
void {{=it.name}}_set_parameter({{=it.name}} *instance, int index, float value);


{{=it.constants}}

void {{=it.name}}_init({{=it.name}} *instance) {
	{{=it.init}}
}

void {{=it.name}}_reset({{=it.name}} *instance) {
	instance->firstRun = 1;
}

void {{=it.name}}_set_sample_rate({{=it.name}} *instance, float sample_rate) {
	instance->fs = sample_rate;
	{{=it.fs_update}}
}

void {{=it.name}}_process({{=it.name}} *instance, {{?it.audio_inputs.length > 0}} {{=it.audio_inputs.map(x => 'const float *' + x).join(', ')}}, {{?}}{{?it.audio_outputs.length > 0}}{{=it.audio_outputs.map(x => 'float *' + x).join(', ')}}, {{?}}int nSamples) {
	if (instance->firstRun) {{{~it.control_inputs:c}}
		instance->{{=c}}_CHANGED = 1;{{~}}
	}
	else {{{~it.control_inputs:c}}
		instance->{{=c}}_CHANGED = instance->{{=c}} != instance->{{=c}}_z1;{{~}}
	}
	{{=it.control_coeffs_update}}

	{{~it.control_inputs:c}}
	instance->{{=c}}_CHANGED = 0;{{~}}

	if (instance->firstRun) {
		{{=it.reset}}
	}

	for (int i = 0; i < nSamples; i++) {
{{=it.audio_update.toString(2)}}
		
{{=it.delay_updates.toString(2)}}

{{=it.output_updates.toString(2)}}
	}

	{{~it.control_inputs:c}}
	instance->{{=c}}_z1 = instance->{{=c}};{{~}}
	instance->firstRun = 0;
}

float {{=it.name}}_get_parameter({{=it.name}} *instance, int index) {
	switch (index) {
		{{~it.control_inputs:c}}case p_{{=c}}:
			return instance->{{=c}};
		{{~}}
	}
}

void {{=it.name}}_set_parameter({{=it.name}} *instance, int index, float value) {
	switch (index) {
		{{~it.control_inputs:c}}case p_{{=c}}:
			instance->{{=c}} = value;
			break;
		{{~}}
	}
}


#endif