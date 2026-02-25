# Ciaramella

## EXPERIMENTAL branch!  

Trying better (?) implementation

### Notes (experimental status)

- This branch is experimental and under active development.
- Some features and implementation details may change.

### Current language/compiler features

- Datatypes
  - `float32`, `int32`, `bool`
  - Strong typing
  - Casts are always required
  - If datatype is not specified, default is `float32`

- Arrays
  - Used for delay lines

- Signal properties
  - `.init`
    - automatic inference and propagation
  - `.fs`
    - automatic inference and propagation

- Includes
  - Include other `.crm` files
  - Include C code
    - Brickworks modules
    - described by JSON files

### Delay implementation (experimental)

- Delays are implemented with memory blocks.
- Memory reads happen at the beginning of the sample step and memory writes at the end.

### If-then-else support (experimental)

- `if-then-else` is supported through synchronous `SELECT` blocks plus graph flattening.
- Branch contents are flattened into the outer graph.
- We currently rely on later optimization / cleanup in outgen to improve generated code quality and branch recreation.


# Credits
Ciaramella and Zampogna are being developed by [Orastron](http://orastron.com "Orastron")
