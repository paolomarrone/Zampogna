
#ifndef _{{=it.name.toUpperCase()}}_H
#define _{{=it.name.toUpperCase()}}_H

#include "platform.h"

{{=it.includes.toString(0)}}

#ifdef __cplusplus
extern "C" {
#endif

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

	// Sun-moculdes
{{=it.submodules.toString(1)}}

	float fs;
	char firstRun;
};
typedef struct _{{=it.name}} {{=it.name}};

void {{=it.name}}_init({{=it.name}} *instance);
void {{=it.name}}_set_sample_rate({{=it.name}} *instance, float sample_rate);
{{?it.mem_sets.length > 0}}
size_t {{=it.name}}_mem_req({{=it.name}} *instance);
void {{=it.name}}_mem_set({{=it.name}} *instance, void *mem);
{{?}}
void {{=it.name}}_reset({{=it.name}} *instance);
void {{=it.name}}_process({{=it.name}} *instance, const float** x, float** y, int n_samples);
void {{=it.name}}_set_parameter({{=it.name}} *instance, int index, float value);
float {{=it.name}}_get_parameter({{=it.name}} *instance, int index);

#ifdef __cplusplus
}
#endif

#endif
