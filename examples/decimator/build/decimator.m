function [y__out__] = decimator(x, fs )

  % constants

  

  % fs

  


  % controlli/coefficienti

  
  

  
  % init delay

  
  _delayed_0 = 1;
  _delayed_1 = 0;
  
  
  
  for i = 1:length(x)

    % audio rate

    
    if (_delayed_0)
y = x(i);
s = 0;

else
y = _delayed_1;
s = 1;

endif
;

    % delay updates
    
    _delayed_0 = s;
    _delayed_1 = y;
    

    % output

    
    y__out__(i) = y;
    
  endfor

endfunction
