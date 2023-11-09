/*
 * Brickworks
 *
 * Copyright (C) 2023 Orastron Srl unipersonale
 *
 * Brickworks is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, version 3 of the License.
 *
 * Brickworks is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Brickworks.  If not, see <http://www.gnu.org/licenses/>.
 *
 * File author: Stefano D'Angelo
 */

var buses = [
	{
		stereo:		{{?it.audio_inputs.length == 2}} true {{??}} false {{?}},
		output:		false
	},
	{
		stereo:		{{?it.audio_outputs.length == 2}} true {{??}} false {{?}},
		output:		true
	}
];

var parameters = [
	{{~it.parameters:p}}
	{
		name: "{{=p}}",
		output: false,
		defaultValue: {{=it.parameters_initialValues[p].replace(/\.?f/g, '')}}
	},{{~}}
];
