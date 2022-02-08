function [y1_1__out__, y2_1__out__] = volControl(x1_1, x2_1, fs, vol1_1, vol2_1)

  % constants

  


  % fs

  


  % controlli/coefficienti

  
  

  
  % init delay

  
  
  
  
  for i = 1:length(x1_1)

    % audio rate

    
    y1_1 = (x1_1(i) * vol1_1);
    y2_1 = (x2_1(i) * vol2_1);

    % delay updates
    
    

    % output

    
    y1_1__out__(i) = y1_1;
    y2_1__out__(i) = y2_1;
    
  endfor

endfunction
