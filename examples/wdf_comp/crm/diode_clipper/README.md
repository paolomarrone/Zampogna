# Diode clipper

The paper's 1 kΩ/1 µF clipper with an anti-parallel diode pair at the root.

`wdf_sign(x)`, `wdf_log(x)` and `wdf_omega4(x)` are external functions. `externals.h` supplies the comparison implementation; a final target can replace it.

References: [paper](https://dafx26.mit.edu/assets/papers/DAFx26_paper_23.pdf), [`wdf_compiler` circuit](https://github.com/Chowdhury-DSP/wdf_compiler/blob/main/tests/diode_clipper/diode_clipper.wdf), [diode model](https://www.researchgate.net/publication/299514713_An_Improved_and_Generalized_Diode_Clipper_Model_for_Wave_Digital_Filters), [Wright Omega approximation](https://www.dafx.de/paper-archive/2019/DAFx2019_paper_5.pdf).
