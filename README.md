# Equihash Node Binding

## Introduction
This project provides Node.js bindings for a Rust-based Equihash solution verifier. Equihash is a memory-hard Proof of Work algorithm, which is utilized by several cryptocurrencies to ensure network security through mining. This binding allows Node.js applications to efficiently verify Equihash solutions using the underlying Rust implementation for improved performance.

## Installation

To install `equihash-node-binding`, ensure you have Node.js and Rust installed on your system, then run:

```bash
npm install equihash-node-binding
```

This command will compile the Rust library and create the necessary bindings for use in Node.js.

## Usage

To verify an Equihash solution in your Node.js application, follow the example below:

```javascript
const { is_valid_solution } = require('equihash-node-binding');

// Define your test vector
const testVector = {
    params: { n: 200, k: 9 },
    input: Buffer.from("block header"),
    nonce: Buffer.alloc(32, 0), // 32-byte buffer filled with zeros
    solutions: [ /* array of solution indices */ ]
};

// Prepare the solutions as a Buffer
const solutionsBuffer = Buffer.from(new Uint32Array(testVector.solutions).buffer);

// Call the verification function
const isValid = is_valid_solution(
    testVector.params.n,
    testVector.params.k,
    testVector.input,
    testVector.nonce,
    solutionsBuffer
);

console.log('Solution valid:', isValid);
```

This example demonstrates how to prepare the input, nonce, and solution buffers, and how to call the `is_valid_solution` function to verify the validity of an Equihash solution.

## API Documentation

- `is_valid_solution(n, k, input, nonce, solution)`: Verifies the validity of an Equihash solution.
  - `n`: Parameter `n` of the Equihash algorithm.
  - `k`: Parameter `k` of the Equihash algorithm.
  - `input`: The input buffer (e.g., block header).
  - `nonce`: The nonce buffer.
  - `solution`: The solution buffer containing the solution indices.

### Integrating Rust and Node.js with Neon

In the context of the `equihash-node-binding` library, Neon plays a crucial role in bridging the high-performance Rust code with the Node.js environment, allowing for efficient Equihash solution verification within a JavaScript-based application. Neon provides the tools and framework necessary to call Rust functions from Node.js, effectively combining the computational efficiency of Rust with the ease and flexibility of JavaScript.

#### How Neon Works

1. **Neon Bindings**: At its core, Neon provides a set of bindings that allow Rust functions to be called from Node.js code. These bindings handle the conversion of data types between JavaScript and Rust, ensuring that complex data structures can be passed back and forth between the two environments seamlessly.

2. **Native Modules**: Neon is used to compile Rust code into a native Node.js module, which can then be required and used in Node.js applications just like any other module. This process involves defining a Neon project within the Rust codebase, which specifies how the Rust functions are exposed to JavaScript.

3. **Function Exporting**: Rust functions are annotated with specific macros (e.g., `#[neon::main]`) to indicate that they should be exposed to the Node.js environment. These functions are then registered with Neon, which makes them accessible from JavaScript code.

#### Neon in `equihash-node-binding`

In the provided library, Neon is used to expose the Rust implementation of the Equihash solution verification to Node.js. This involves several key steps:

1. **Rust Function Wrappers**: Rust functions intended for use in Node.js are wrapped in additional functions that handle the interaction with the Neon framework. For example, the `is_valid_solution_wrapper` function in `lib.rs` acts as a bridge between JavaScript and the underlying Rust `is_valid_solution` logic. It takes arguments from the JavaScript side, converts them to Rust types, calls the Rust function, and then converts the result back to a JavaScript-compatible type.

2. **Type Conversion**: The wrapper function deals with converting JavaScript types to Rust types and vice versa. For instance, JavaScript `Buffer` objects are converted to Rust `Vec<u8>` for processing, and Rust `bool` results are converted back to JavaScript `Boolean` values.

3. **Error Handling**: Errors in the Rust code are converted to JavaScript exceptions, allowing Node.js applications to use standard JavaScript error handling mechanisms (try-catch blocks) to manage errors arising from the Rust side.

4. **Module Context**: The `main` function in the Rust code, annotated with `#[neon::main]`, is the entry point for the Neon module. It registers the exported functions (e.g., `is_valid_solution`) with Neon, making them callable from the Node.js environment.

5. **Building and Installation**: The Neon CLI tools facilitate the compilation of the Rust code into a native module. The `build` and `install` scripts in `package.json` ensure that the native module is compiled and ready to use when the package is installed in a Node.js project.

Through Neon, `equihash-node-binding` leverages the best of both worlds: the performance and safety of Rust for intensive computational tasks, and the flexibility and ecosystem of Node.js for application development. This combination is particularly powerful for applications requiring high-performance computations, such as cryptocurrency mining or data processing, within a JavaScript-based environment.

### Understanding the Rust Code for Equihash Verification

The provided Rust code is a core component of the `equihash-node-binding` project, designed to verify Equihash solutions. Equihash is a memory-hard Proof of Work (PoW) algorithm, which is used in various cryptocurrencies to secure their networks. The Rust code leverages the performance and safety features of Rust to provide efficient and reliable verification of Equihash solutions.

#### Key Components

1. **Params Structure**: Defines the parameters `n` and `k` for the Equihash algorithm. These parameters determine the algorithm's complexity and memory requirements. The `Params::new` function ensures that the parameters meet specific constraints to be valid for Equihash, such as `n` being a multiple of 8 and `k` being less than `n`.

2. **Node Structure**: Represents a node in the solution tree. Each node contains a `hash` and a list of `indices`. The `hash` is derived from the input data and the nonce, while `indices` represent the indices of the solution in the original list of hashes.

3. **Hash Generation and Expansion**: The `generate_hash` function creates a hash using the BLAKE2b hashing algorithm, personalized with the Equihash parameters. The `expand_array` function expands a compressed array into a bit array based on the bit length specified, which is used in the solution verification process.

4. **Solution Verification**: The core of the code lies in the `is_valid_solution` function, which checks if a given solution is valid for a set of inputs (`input`, `nonce`) and Equihash parameters (`n`, `k`). It does this by reconstructing the solution tree from the solution indices and verifying that the final node represents a valid solution.

    - **Tree Construction**: The solution tree is built using the `tree_validator` function, which recursively constructs the tree from the bottom up. At each level, it ensures that paired nodes have a valid collision (i.e., their hashes match in the first `collision_byte_length` bytes) and that their indices are distinct and ordered correctly.

    - **Collision Detection**: The `has_collision` function checks if two nodes have a collision in their hash values up to a certain length (`collision_byte_length`), which is crucial for verifying that the solution follows the Equihash algorithm's requirements.

    - **Distinct Indices**: The `distinct_indices` function ensures that all indices in the solution are unique, a requirement for a valid Equihash solution.

5. **Error Handling**: The `Error` and `Kind` structures define various error types that can occur during the verification process, such as invalid parameters, collisions not found, indices out of order, duplicate indices, and non-zero root hash.

#### Verification Process

The verification process starts by initializing the hashing state with the Equihash parameters and the input data. It then converts the minimal representation of the solution (a compact byte array) into a list of indices using the `indices_from_minimal` function.

Using these indices, the `tree_validator` function is called to recursively build the solution tree and check for the validity of each pair of nodes. If the tree is constructed successfully without errors, the root node's hash is checked to be all zeros in the first `collision_byte_length` bytes, indicating a valid solution.

## Contributing

Contributions to `equihash-node-binding` are welcome! Please submit pull requests with any bug fixes or enhancements. Ensure you follow the project's code style and contribute guidelines (if any).

## License

This project is licensed under the ISC License. See the LICENSE file for more details.
