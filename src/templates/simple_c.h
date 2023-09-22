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
	{{~it.memory_declarations:d}}
	float {{=d}}{{~}}
	
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
void {{=it.name}}_process({{=it.name}} *instance, {{?it.audio_inputs.length > 0}} {{=it.audio_inputs.map(x => 'const float *' + x).join(', ')}}, {{?}}{{?it.outputs.length > 0}}{{=it.outputs.map(x => 'float *' + x).join(', ')}}, {{?}}int nSamples);
float {{=it.name}}_get_parameter({{=it.name}} *instance, int index);
void {{=it.name}}_set_parameter({{=it.name}} *instance, int index, float value);


{{~it.constants:c}}static const float {{=c}};
{{~}}

void {{=it.name}}_init({{=it.name}} *instance) {
	{{~it.init:d}}
	{{=d}};{{~}}
}

void {{=it.name}}_reset({{=it.name}} *instance) {
	instance->firstRun = 1;
}

void {{=it.name}}_set_sample_rate({{=it.name}} *instance, float sample_rate) {
	instance->fs = sample_rate;
	{{~it.fs_update:s}}{{=s}};
	{{~}}
}

void {{=it.name}}_process({{=it.name}} *instance, {{?it.audio_inputs.length > 0}} {{=it.audio_inputs.map(x => 'const float *' + x).join(', ')}}, {{?}}{{?it.outputs.length > 0}}{{=it.outputs.map(x => 'float *' + x).join(', ')}}, {{?}}int nSamples) {
	if (instance->firstRun) {{{~it.control_inputs:c}}
		instance->{{=c}}_CHANGED = 1;{{~}}
	}
	else {{{~it.control_inputs:c}}
		instance->{{=c}}_CHANGED = instance->{{=c}} != instance->{{=c}}_z1;{{~}}
	}
	{{~it.control_coeffs_update:c}}
	if ({{=Array.from(c.set).map(e => "instance->" + e + "_CHANGED").join(' | ')}}) {{{~c.stmts: s}}
		{{=s}};{{~}}
	}{{~}}
	{{~it.control_inputs:c}}
	instance->{{=c}}_CHANGED = 0;{{~}}

	if (instance->firstRun) {{{~it.reset:r}}
		{{=r}};{{~}}
	}

	for (int i = 0; i < nSamples; i++) {
		{{~it.audio_update: a}}
		{{=a}};{{~}}
		
		{{~it.delay_updates:u}}{{=u}};
		{{~}}
		{{~it.output_updates:u}}
		{{=u}};{{~}}
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