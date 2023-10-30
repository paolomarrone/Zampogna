
#ifndef _CONFIG_H
#define _CONFIG_H

// Definitions

#define IO_MONO			1
#define IO_STEREO		(1<<1)

struct config_io_bus {
	const char	*name;
	char		 out;
	char		 aux;
	char		 cv;
	char		 configs;
};

struct config_parameter {
	const char	*name;
	const char	*shortName;
	const char	*units;
	char		 out;
	char		 bypass;
	int		 steps;
	float		 defaultValueUnmapped;
};

// Data

#define COMPANY_NAME		"Orastron"
#define COMPANY_WEBSITE		"https://www.orastron.com/"
#define COMPANY_MAILTO		"mailto:info@orastron.com"

#define PLUGIN_NAME		"{{=it.name}}"
#define PLUGIN_VERSION		"0.0.1"

{{ if (it.audio_inputs.length > 2) throw new Error("Max 2 audio inputs supported in vst3 for now"); }}
{{ if (it.audio_outputs.length > 2) throw new Error("Max 2 audio outputs supported in vst3 for now"); }}

#define NUM_BUSES_IN		1
#define NUM_BUSES_OUT		1
#define NUM_CHANNELS_IN		{{=it.audio_inputs.length}}
#define NUM_CHANNELS_OUT	{{=it.audio_outputs.length}}

static struct config_io_bus config_buses_in[NUM_BUSES_IN] = {
	{ "Audio in", 0, 0, 0, {{=it.audio_inputs.length}} }
};

static struct config_io_bus config_buses_out[NUM_BUSES_OUT] = {
	{ "Audio out", 1, 0, 0, {{=it.audio_outputs.length}} }
};

#define NUM_PARAMETERS		{{=it.parameters.length}}

static struct config_parameter config_parameters[NUM_PARAMETERS] = {
	{{~it.parameters:p}}
	{ "{{=p}}", "{{=p}}", "", 0, 0, 0, {{=it.parameters_initialValues[p]}} },{{~}}
};

// Internal API

#include "{{=it.name}}.h"

#define P_TYPE				{{=it.name}}
#define P_INIT				{{=it.name}}_init
#define P_SET_SAMPLE_RATE		{{=it.name}}_set_sample_rate
{{?it.mem_sets.length > 0}}
#define P_MEM_REQ			{{=it.name}}_mem_req
#define P_MEM_SET			{{=it.name}}_mem_set
{{?}}
#define P_RESET				{{=it.name}}_reset
#define P_PROCESS			{{=it.name}}_process
#define P_SET_PARAMETER			{{=it.name}}_set_parameter
#define P_GET_PARAMETER			{{=it.name}}_get_parameter

#endif
