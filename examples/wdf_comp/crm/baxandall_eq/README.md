# Baxandall EQ

The two-band Baxandall circuit used in the paper. `bass` and `treble` are normalized potentiometer positions; the benchmark uses 0.5 for both.

The 6-port R-type adaptor calls `baxandall_scattering(index, Ra, Rb, Rc, Rd, Re)` while coefficients are updated. `externals.h` supplies the comparison implementation; a final target can replace it. Audio-rate scattering remains generated Ciaramella code.

References: [paper, fig. 4](https://dafx26.mit.edu/assets/papers/DAFx26_paper_23.pdf), [`wdf_compiler` circuit](https://github.com/Chowdhury-DSP/wdf_compiler/blob/main/tests/baxandall_eq/baxandall_eq.wdf).
