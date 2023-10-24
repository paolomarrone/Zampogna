/*
	Generated by Zampogna
*/

#include "{{=it.name}}.h"

{{=it.constants.toString(0)}}

void {{=it.name}}_init({{=it.name}} *instance) {
{{=it.init.toString(1)}}
}

void {{=it.name}}_set_sample_rate({{=it.name}} *instance, float sample_rate) {
	instance->fs = sample_rate;
{{=it.fs_update.toString(1)}}
}

{{?it.mem_sets.length > 0}}
size_t {{=it.name}}_mem_req({{=it.name}} *instance) {
	{{?it.mem_reqs.length != 0}}
	return 
		{{=it.mem_reqs.join('\n\t\t+ ')}};
	{{??}}
	return 0;
	{{?}}
}

void {{=it.name}}_mem_set({{=it.name}} *instance, void *mem) {
	char *m = (char *)mem;
	{{~it.mem_sets:s:i}}
	{{=s}};
	m += {{=it.mem_reqs[i]}};
	{{~}}
}
{{?}}

void {{=it.name}}_reset({{=it.name}} *instance) {
	instance->firstRun = 1;
}

void {{=it.name}}_process({{=it.name}} *instance, const float** x, float** y, int n_samples) {

	{{~it.audio_inputs:a:i}}
	const float* {{=a}} = x[{{=i}}];{{~}}
	{{~it.audio_outputs:a:i}}
	float* {{=a}} = y[{{=i}}];{{~}}

	if (instance->firstRun) {{{~it.parameters:c}}
		instance->{{=c}}_CHANGED = 1;{{~}}
	}
	else {{{~it.parameters:c}}
		instance->{{=c}}_CHANGED = instance->{{=c}} != instance->{{=c}}_z1;{{~}}
	}
	
{{=it.control_coeffs_update.toString(1)}}

{{=it.update_coeffs_ctrl.toString(1)}}

	{{~it.parameters:c}}
	instance->{{=c}}_CHANGED = 0;{{~}}

	if (instance->firstRun) {
{{=it.reset.toString(2)}}
	}

	for (int i = 0; i < n_samples; i++) {

{{=it.update_coeffs_audio.toString(2)}}

{{=it.audio_update.toString(2)}}
		
{{=it.memory_updates.toString(2)}}

{{=it.output_updates.toString(2)}}

	}

	{{~it.parameters:c}}
	instance->{{=c}}_z1 = instance->{{=c}};{{~}}
	instance->firstRun = 0;
}

void {{=it.name}}_set_parameter({{=it.name}} *instance, int index, float value) {
	switch (index) {
		{{~it.parameters:c}}case p_{{=c}}:
			instance->{{=c}} = value;
			break;
		{{~}}
	}
}

float {{=it.name}}_get_parameter({{=it.name}} *instance, int index) {
	switch (index) {
		{{~it.parameters:c}}case p_{{=c}}:
			return instance->{{=c}};
		{{~}}
	}
}
