function [y__out__] = saw_generator(nSamples, fs, enable, frequency)

  % constants

  y_3 = 0;
  

  % fs

  


  % controlli/coefficienti

   
  % enable
  
  saw_generator_extra_0 = (enable > 0.5);
   
  % frequency
  
  phaseInc_2 = (frequency / fs);
  
  

  
  % init delay

  
  _delayed_1 = 0;
  
  
  
  for i = 1:nSamples

    % audio rate

    
    if (saw_generator_extra_0)
phase_2 = frac((_delayed_1 + phaseInc_2));
y = ((2 * phase_2) - 1);

else
y = y_3;

endif
;

    % delay updates
    
    _delayed_1 = phase_2;
    

    % output

    
    y__out__(i) = y;
    
  endfor

endfunction
