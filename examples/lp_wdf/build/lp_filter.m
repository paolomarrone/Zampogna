function [y_1__out__] = lp_filter(x_1, fs, cutoff_1)

  % constants

  C_1 = 0.000001;
  C_3 = C_1;
  lp_filter__extra__0 = (2 * 3.141592653589793);
  al_5 = 0;
  


  % fs

  Rr_5 = (0.5 / (C_3 * fs));
  


  % controlli/coefficienti

   
  % cutoff_1
  
  lp_filter__extra__1 = (Rr_5 / ((1 / ((lp_filter__extra__0 * ((0.1 + (0.3 * cutoff_1)) * fs)) * C_1)) + Rr_5));
  
  

  
  % init delay

  
  __delayed__2 = 0;
  
  
  
  for i = 1:length(x_1)

    % audio rate

    
    bC_1 = __delayed__2;
    ar_5 = bC_1;
    aC_1 = (ar_5 - (lp_filter__extra__1 * ((al_5 + ar_5) + ((2 * x_1(i)) - -((al_5 + ar_5))))));
    y_1 = (0.5 * (aC_1 + bC_1));

    % delay updates
    
    __delayed__2 = aC_1;
    

    % output

    
    y_1__out__(i) = y_1;
    
  endfor

endfunction
