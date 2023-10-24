
#ifndef _VST3_CONFIG_H
#define _VST3_CONFIG_H

#define PLUGIN_SUBCATEGORY	{{?it.audio_inputs.length == 0}} "Instrument|Synth" {{??}} "Fx" {{?}}

#define PLUGIN_GUID_1		0x{{=[0, 0, 0, 0, 0, 0, 0, 0].map(() => Math.floor(Math.random() * 16).toString(16)).join('')}}
#define PLUGIN_GUID_2		0x{{=[0, 0, 0, 0, 0, 0, 0, 0].map(() => Math.floor(Math.random() * 16).toString(16)).join('')}}
#define PLUGIN_GUID_3		0x{{=[0, 0, 0, 0, 0, 0, 0, 0].map(() => Math.floor(Math.random() * 16).toString(16)).join('')}}
#define PLUGIN_GUID_4		0x{{=[0, 0, 0, 0, 0, 0, 0, 0].map(() => Math.floor(Math.random() * 16).toString(16)).join('')}}

#define CTRL_GUID_1		0x{{=[0, 0, 0, 0, 0, 0, 0, 0].map(() => Math.floor(Math.random() * 16).toString(16)).join('')}}
#define CTRL_GUID_2		0x{{=[0, 0, 0, 0, 0, 0, 0, 0].map(() => Math.floor(Math.random() * 16).toString(16)).join('')}}
#define CTRL_GUID_3		0x{{=[0, 0, 0, 0, 0, 0, 0, 0].map(() => Math.floor(Math.random() * 16).toString(16)).join('')}}
#define CTRL_GUID_4		0x{{=[0, 0, 0, 0, 0, 0, 0, 0].map(() => Math.floor(Math.random() * 16).toString(16)).join('')}}

#endif
