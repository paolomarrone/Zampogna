// TODO

#ifndef _{{=it.name.toUpperCase()}}_H
#define _{{=it.name.toUpperCase()}}_H

{{?it.parameters.length > 0}}
enum {
	{{~it.parameters:c}}
	p_{{=c}},{{~}}

	p_n
};
{{?}}

struct _{{=it.name}} {
	
	// Parameters
{{=it.parameter_states.toString(1)}}

	// Memory
{{=it.memory_declarations.toString(1)}}

	// States
{{=it.states.toString(1)}}

	// Coefficients
{{=it.coefficients.toString(1)}}

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


{{=it.constants.toString(0)}}

void {{=it.name}}_init({{=it.name}} *instance) {

{{=it.init.toString(1)}}

}

void {{=it.name}}_reset({{=it.name}} *instance) {
	instance->firstRun = 1;
}

void {{=it.name}}_set_sample_rate({{=it.name}} *instance, float sample_rate) {
	
	instance->fs = sample_rate;
	
{{=it.fs_update.toString(1)}}

}

void {{=it.name}}_process({{=it.name}} *instance, {{?it.audio_inputs.length > 0}} {{=it.audio_inputs.map(x => 'const float *' + x).join(', ')}}, {{?}}{{?it.audio_outputs.length > 0}}{{=it.audio_outputs.map(x => 'float *' + x).join(', ')}}, {{?}}int nSamples) {
	
	if (instance->firstRun) {{{~it.parameters:c}}
		instance->{{=c}}_CHANGED = 1;{{~}}
	}
	else {{{~it.parameters:c}}
		instance->{{=c}}_CHANGED = instance->{{=c}} != instance->{{=c}}_z1;{{~}}
	}
	
{{=it.control_coeffs_update.toString(1)}}

	{{~it.parameters:c}}
	instance->{{=c}}_CHANGED = 0;{{~}}

	if (instance->firstRun) {
		{{=it.reset}}
	}

	for (int i = 0; i < nSamples; i++) {

{{=it.audio_update.toString(2)}}
		
{{=it.delay_updates.toString(2)}}

{{=it.output_updates.toString(2)}}

	}

	{{~it.parameters:c}}
	instance->{{=c}}_z1 = instance->{{=c}};{{~}}
	instance->firstRun = 0;
}

float {{=it.name}}_get_parameter({{=it.name}} *instance, int index) {
	switch (index) {
		{{~it.parameters:c}}case p_{{=c}}:
			return instance->{{=c}};
		{{~}}
	}
}

void {{=it.name}}_set_parameter({{=it.name}} *instance, int index, float value) {
	switch (index) {
		{{~it.parameters:c}}case p_{{=c}}:
			instance->{{=c}} = value;
			break;
		{{~}}
	}
}


#endif