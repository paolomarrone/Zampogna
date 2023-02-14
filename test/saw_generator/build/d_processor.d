struct saw_generator
{
nothrow:
public:
@nogc:

    

    void setSampleRate(float sampleRate)
    {
        fs = sampleRate;
        
    }

    void reset()
    {
        firstRun = 1;
    }

    void process(float *y__out__, int nSamples)
    {
        if (firstRun) 
        {
            enable_CHANGED = 1;
            frequency_CHANGED = 1;
            
        }
        else {
            enable_CHANGED = enable != enable_z1;
            frequency_CHANGED = frequency != frequency_z1;
        }
        
        if (enable_CHANGED) {
            saw_generator_extra_0 = (enable > 0.5f);
        }
        if (frequency_CHANGED) {
            const float fr_3 = frequency;
            phaseInc_2 = (((((fr_3 * fr_3) * fr_3) * 10000.0f) + 20.0f) / fs);
        }
        
        enable_CHANGED = 0;
        frequency_CHANGED = 0;

        if (firstRun) {
            
            _delayed_1 = 0.0f;
        }

        for (int i = 0; i < nSamples; i++) {
            
            if (saw_generator_extra_0) {
x_4 = (_delayed_1 + phaseInc_2);
if ((x_4 >= 1.0f)) {
y_4 = (x_4 - 1.0f);

} else {
y_4 = x_4;

}
;
phase_2 = y_4;
y = ((2.0f * phase_2) - 1.0f);

} else {
y = 0.0f;

}
;

            _delayed_1 = phase_2;
            
            
            y__out__[i] = y;
        }

        
        enable_z1 = enable;
        frequency_z1 = frequency;
        firstRun = 0;
    }

    
    float getenable()
    {
        return enable;
    }
    void setenable(float value)
    {
        enable = value;
    }
    
    float getfrequency()
    {
        return frequency;
    }
    void setfrequency(float value)
    {
        frequency = value;
    }
    

private:

    
    float saw_generator_extra_0 = 0.0f;
    float phaseInc_2 = 0.0f;
    float phase_2 = 0.0f;
    float _delayed_1 = 0.0f;

    
    float enable = 0;
    float frequency = 0;

    
    float enable_z1;
    char enable_CHANGED;
    
    float frequency_z1;
    char frequency_CHANGED;
    

    float fs;
    int firstRun;

};