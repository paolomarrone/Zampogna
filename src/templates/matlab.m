function [{{=it.audio_outputs.join(', ')}}] = {{=it.name}}({{=it.audio_inputs.join(', ')}}{{?it.audio_inputs.length > 0}},{{??}}nSamples,{{?}} fs{{?it.parameters.length > 0}}, {{?}}{{=it.parameters.join(', ')}})

	% declarations
{{=it.parameter_states.toString(1)}}
{{=it.memory_declarations.toString(1)}}
{{=it.states.toString(1)}}
{{=it.coefficients.toString(1)}}
{{=it.submodules.toString(1)}}

	% constants/init
{{=it.constants.toString(1)}}
{{=it.init.toString(1)}}

	% fs/control coeffs
{{=it.fs_update.toString(1)}}
{{=it.control_coeffs_update.toString(1)}}
{{=it.update_coeffs_ctrl.toString(1)}}

	% reset
{{=it.reset.toString(1)}}

	% outputs
	{{~it.audio_outputs:o}}
	{{?it.audio_inputs.length > 0}}
	{{=o}} = zeros(size({{=it.audio_inputs[0]}}));
	{{??}}
	{{=o}} = zeros(1, nSamples);
	{{?}}
	{{~}}

	for i = 1:{{?it.audio_inputs.length > 0}}length({{=it.audio_inputs[0]}}){{??}}nSamples{{?}}
{{?it.loop_body}}
{{=it.loop_body.toString(2)}}
{{??}}
{{=it.update_coeffs_audio.toString(2)}}
{{=it.audio_update.toString(2)}}
{{=it.memory_updates.toString(2)}}
{{=it.output_updates.toString(2)}}
{{?}}
	end

end
