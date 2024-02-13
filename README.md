# Equihash Node Binding

## Introduction
This project provides Node.js bindings for a Rust-based Equihash solution verifier. Equihash is a memory-hard Proof of Work algorithm, which is utilized by several cryptocurrencies to ensure network security through mining. This binding allows Node.js applications to efficiently verify Equihash solutions using the underlying Rust implementation for improved performance.

## Installation

To install `equihash-node-binding`, ensure you have Node.js and Rust installed on your system, then run:

```bash
npm install equihash-node-binding
```

This command will compile the Rust library and create the necessary bindings for use in Node.js.

To install rust, you can use the following command:

```bash
curl https://sh.rustup.rs -sSf | sh

rustup default nightly  
rustup update nightly   
rustc --version 
```

To install Node.js, you can use the following command:

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
nvm install 20.1
nvm use 20.1
nvm alias default 20.1
```

Then clone the repo and install:

```bash
git clone https://github.com/pastelnetwork/equihash-node-binding
cd equihash-node-binding
npm install
```

Then do:

```bash
cd native
cargo build
cd .. 
sudo npm i -g neon-cli
neon build
```

Then you should be able to do:

```bash
node index.js
```

and see this:

```bash
❯ node index.js
Test case #1: Is valid: true, Expected: true
Test case #1 passed.
Test case #2: Is valid: false, Expected: false
Test case #2 passed.
Test case #3: Is valid: false, Expected: false
Test case #3 passed.
```

## Usage

To verify an Equihash solution in your Node.js application, follow the example below:

```javascript
 // Test vector parameters
  const n = 200;
  const k = 9;

  // Define an array of test cases
  const testCases = [
    {
      blockHeader:
        "0400000008e9694cc2120ec1b5733cc12687b609058eec4f7046a521ad1d1e3049b400003e7420ed6f40659de0305ef9b7ec037f4380ed9848bc1c015691c90aa16ff3930000000000000000000000000000000000000000000000000000000000000000c9310d5874e0001f000000000000000000000000000000010b000000000000000000000000000040",
      solution:
        "00b43863a213bfe79f00337f5a729f09710abcc07035ef8ac34372abddecf2f82715f7223f075af96f0604fc124d6151fc8fb516d24a137faec123a89aa9a433f8a25a6bcfc554c28be556f6c878f96539186fab191505f278df48bf1ad2240e5bb39f372a143de1dd1b672312e00d52a3dd83f471b0239a7e8b30d4b9153027df87c8cd0b64de76749539fea376b4f39d08cf3d5e821495e52fdfa6f8085e59fc670656121c9d7c01388c8b4b4585aa7b9ac3f7ae796f9eb1fadba1730a1860eed797feabb18832b5e8f003c0adaf0788d1016e7a8969144018ecc86140aa4553962aa739a4850b509b505e158c5f9e2d5376374652e9e6d81b19fa0351be229af136efbce681463cc53d7880c1eeca3411154474ff8a7b2bac034a2026646776a517bf63921c31fbbd6be7c3ff42aab28230bfe81d33800b892b262f3579b7a41925a59f5cc1d4f523577c19ff9f92023146fa26486595bd89a1ba459eb0b5cec0578c3a071dbec73eca054c723ab30ce8e69de32e779cd2f1030e39878ac6ea3cdca743b43aedefe1a9b4f2da861038e2759defef0b8cad11d4179f2f08881b53ccc203e558c0571e049d998a257b3279016aad0d7999b609f6331a0d0f88e286a70432ca7f50a5bb8fafbbe9230b4ccb1fa57361c163d6b9f84579d61f41585a022d07dc8e55a8de4d8f87641dae777819458a2bf1bb02c438480ff11621ca8442ec2946875cce247c8877051359e9c822670d37bb00fa806e60e8e890ce62540fda2d5b1c790ca1e005030ac6d8e63db577bb98be111ee146828f9c48ee6257d7627b93ea3dd11aac3412e63dfc7ca132a73c4f51e7650f3f8ecf57bfc18716990b492d50e0a3e5fbf6136e771b91f7283ec3326209265b9531d157f8a07a4117fc8fb29ba1363afc6f9f0608251ea595256727a5bbe28f42a42edfbfa9017680e32980d4ad381612612b2bc7ad91e82eca693ea4fc27049a99636b50a576f1e55c72202d582b150ef194c1419f53177ecf315ea6b0e2f1aa8cd8f59b165aa0d89561c537fb6141f5813b7a4968fe16afc703326113f68508d88ff8d0aee1e88a84c0ae56c72f27511290ced48e93e8c95419d14aed1a5b2e9b2c9c1070c593e5eb50bb9a80e14e9f9fe501f56b1b3140159e8213b75d48d14af472a604484cd8e7e7abb6820245ed3ab29f9947463a033c586194be45eadec8392c8614d83a1e9ca0fe5655fa14f7a9c1d1f8f2185a06193ff4a3c3e9a96b02310033ceaa25894e7c56a6147e691597098054e285d39656d3d459ec5d13243c062b6eb44e19a13bdfc0b3c96bd3d1aeb75bb6b080322aea23555993cb529243958bb1a0e5d5027e6c78155437242d1d13c1d6e442a0e3783147a08bbfc0c2529fb705ad27713df40486fd58f001977f25dfd3c202451c07010a3880bca63959ca61f10ed3871f1152166fce2b52135718a8ceb239a0664a31c62defaad70be4b920dce70549c10d9138fbbad7f291c5b73fa21c3889929b143bc1576b72f70667ac11052b686891085290d871db528b5cfdc10a6d563925227609f10d1768a0e02dc7471ad424f94f737d4e7eb0fb167f1434fc4ae2d49e152f06f0845b6db0a44f0d6f5e7410420e6bd1f430b1af956005bf72b51405a04d9a5d9906ceca52c22c855785c3c3ac4c3e9bf532d31bab321e1db66f6a9f7dc9c017f2b7d8dfeb933cf5bbae71311ae318f6d187ebc5c843be342b08a9a0ff7c4b9c4b0f4fa74b13296afe84b6481440d58332e07b3d051ed55219d28e77af6612134da4431b797c63ef55bc53831e2f421db620fee51ba0967e4ed7009ef90af2204259bbfbb54537fd35c2132fa8e7f9c84bf9938d248862c6ca1cca9f48b0b33aa1589185c4eabc1c32",
      expectedValid: true,
    },
    {
      blockHeader:
        "0400000008e9694cc2120ec1b5733cc12687b609058eec4f7046a521ad1d1e3049b400003e7420ed6f40659de0305ef9b7ec037f4380ed9848bc1c015691c90aa16ff3930000000000000000000000000000000000000000000000000000000000000000c9310d5874e0001f000000000000000000000000000000010b000000000000000000000000000040",
      solution:
        "90b43863a213bfe79f00337f5a729f09710abcc07035ef8ac34372abddecf2f82715f7223f075af96f0604fc124d6151fc8fb516d24a137faec123a89aa9a433f8a25a6bcfc554c28be556f6c878f96539186fab191505f278df48bf1ad2240e5bb39f372a143de1dd1b672312e00d52a3dd83f471b0239a7e8b30d4b9153027df87c8cd0b64de76749539fea376b4f39d08cf3d5e821495e52fdfa6f8085e59fc670656121c9d7c01388c8b4b4585aa7b9ac3f7ae796f9eb1fadba1730a1860eed797feabb18832b5e8f003c0adaf0788d1016e7a8969144018ecc86140aa4553962aa739a4850b509b505e158c5f9e2d5376374652e9e6d81b19fa0351be229af136efbce681463cc53d7880c1eeca3411154474ff8a7b2bac034a2026646776a517bf63921c31fbbd6be7c3ff42aab28230bfe81d33800b892b262f3579b7a41925a59f5cc1d4f523577c19ff9f92023146fa26486595bd89a1ba459eb0b5cec0578c3a071dbec73eca054c723ab30ce8e69de32e779cd2f1030e39878ac6ea3cdca743b43aedefe1a9b4f2da861038e2759defef0b8cad11d4179f2f08881b53ccc203e558c0571e049d998a257b3279016aad0d7999b609f6331a0d0f88e286a70432ca7f50a5bb8fafbbe9230b4ccb1fa57361c163d6b9f84579d61f41585a022d07dc8e55a8de4d8f87641dae777819458a2bf1bb02c438480ff11621ca8442ec2946875cce247c8877051359e9c822670d37bb00fa806e60e8e890ce62540fda2d5b1c790ca1e005030ac6d8e63db577bb98be111ee146828f9c48ee6257d7627b93ea3dd11aac3412e63dfc7ca132a73c4f51e7650f3f8ecf57bfc18716990b492d50e0a3e5fbf6136e771b91f7283ec3326209265b9531d157f8a07a4117fc8fb29ba1363afc6f9f0608251ea595256727a5bbe28f42a42edfbfa9017680e32980d4ad381612612b2bc7ad91e82eca693ea4fc27049a99636b50a576f1e55c72202d582b150ef194c1419f53177ecf315ea6b0e2f1aa8cd8f59b165aa0d89561c537fb6141f5813b7a4968fe16afc703326113f68508d88ff8d0aee1e88a84c0ae56c72f27511290ced48e93e8c95419d14aed1a5b2e9b2c9c1070c593e5eb50bb9a80e14e9f9fe501f56b1b3140159e8213b75d48d14af472a604484cd8e7e7abb6820245ed3ab29f9947463a033c586194be45eadec8392c8614d83a1e9ca0fe5655fa14f7a9c1d1f8f2185a06193ff4a3c3e9a96b02310033ceaa25894e7c56a6147e691597098054e285d39656d3d459ec5d13243c062b6eb44e19a13bdfc0b3c96bd3d1aeb75bb6b080322aea23555993cb529243958bb1a0e5d5027e6c78155437242d1d13c1d6e442a0e3783147a08bbfc0c2529fb705ad27713df40486fd58f001977f25dfd3c202451c07010a3880bca63959ca61f10ed3871f1152166fce2b52135718a8ceb239a0664a31c62defaad70be4b920dce70549c10d9138fbbad7f291c5b73fa21c3889929b143bc1576b72f70667ac11052b686891085290d871db528b5cfdc10a6d563925227609f10d1768a0e02dc7471ad424f94f737d4e7eb0fb167f1434fc4ae2d49e152f06f0845b6db0a44f0d6f5e7410420e6bd1f430b1af956005bf72b51405a04d9a5d9906ceca52c22c855785c3c3ac4c3e9bf532d31bab321e1db66f6a9f7dc9c017f2b7d8dfeb933cf5bbae71311ae318f6d187ebc5c843be342b08a9a0ff7c4b9c4b0f4fa74b13296afe84b6481440d58332e07b3d051ed55219d28e77af6612134da4431b797c63ef55bc53831e2f421db620fee51ba0967e4ed7009ef90af2204259bbfbb54537fd35c2132fa8e7f9c84bf9938d248862c6ca1cca9f48b0b33aa1589185c4eabc1c32",
      expectedValid: false,
    },
    {
      blockHeader:
        "0400000008e9694cc2120ec1b5733cc12687b609058eec4f7046a521ad1d1e3049b400003e7420ed6f40659de0305ef9b7ec037f4380ed9848bc1c015691c90aa16ff3930000000000000000000000000000000000000000000000000000000000000000c9310d5874e0001f000000000000000000000000000000010b000000000000000000000000000040",
      solution:
        "90b43863a213bfe79f00337f5a729f09710abcc07035ef8ac34372abddecf2f82715f7223f075af96f0604fc124d6151fc8fb516d24a137faec123a89aa9a433f8a25a6bcfc554c28be556f6c878f96539186fab191505f278df48bf1ad2240e5bb39f372a143de1dd1b672312e00d52a3dd83f471b0239a7e8b30d4b9153027df87c8cd0b64de76749539fea376b4f39d08cf3d5e821495e52fdfa6f8085e59fc670656121c9d7c01388c8b4b4585aa7b9ac3f7ae796f9eb1fadba1730a1860eed797feabb18832b5e8f003c0adaf0788d1016e7a8969144018ecc86140aa4553962aa739a4850b509b505e158c5f9e2d5376374652e9e6d81b19fa0351be229af136efbce681463cc53d7880c1eeca3411154474ff8a7b2bac034a2026646776a517bf63921c31fbbd6be7c3ff42aab28230bfe81d33800b892b262f3579b7a41925a59f5cc1d4f523577c19ff9f92023146fa26486595bd89a1ba459eb0b5cec0578c3a071dbec73eca054c723ab30ce8e69de32e779cd2f1030e39878ac6ea3cdca743b43aedefe1a9b4f2da861038e2759defef0b8cad11d4179f2f08881b53ccc203e558c0571e049d998a257b3279016aad0d7999b609f6331a0d0f88e286a70432ca7f50a5bb8fafbbe9230b4ccb1fa57361c163d6b9f84579d61f41585a022d07dc8e55a8de4d8f87641dae777819458a2bf1bb02c438480ff11621ca8442ec2946875cce247c8877051359e9c822670d37bb00fa806e60e8e890ce62540fda2d5b1c790ca1e005030ac6d8e63db577bb98be111ee146828f9c48ee6257d7627b93ea3dd11aac3412e63dfc7ca132a73c4f51e7650f3f8ecf57bfc18716990b492d50e0a3e5fbf6136e771b91f7283ec3326209265b9531d157f8a07a4117fc8fb29ba1363afc6f9f0608251ea595256727a5bbe28f42a42edfbfa9017680e32980d4ad381612612b2bc7ad91e82eca693ea4fc27049a99636b50a576f1e55c72202d582b150ef194c1419f53177ecf315ea6b0e2f1aa8cd8f59b165aa0d89561c537fb6141f5813b7a4968fe16afc703326113f68508d88ff8d0aee1e88a84c0ae56c72f27511290ced48e93e8c95419d14aed1a5b2e9b2c9c1070c593e5eb50bb9a80e14e9f9fe501f56b1b3140159e8213b75d48d14af472a604484cd8e7e7abb6820245ed3ab29f9947463a033c586194be45eadec8392c8614d83a1e9ca0fe5655fa14f7a9c1d1f8f2185a06193ff4a3c3e9a96b02310033ceaa25894e7c56a6147e691597098054e285d39656d3d459ec5d13243c062b6eb44e19a13bdfc0b3c96bd3d1aeb75bb6b080322aea23555993cb529243958bb1a0e5d5027e6c78155437242d1d13c1d6e442a0e3783147a08bbfc0c2529fb705ad27713df40486fd58f001977f25dfd3c202451c07010a3880bca63959ca61f10ed3871f1152166fce2b52135718a8ceb239a0664a31c62defaad70be4b920dce70549c10d9138fbbad7f291c5b73fa21c3889929b143bc1576b72f70667ac11052b686891085290d871db528b5cfdc10a6d563925227609f10d1768a0e02dc7471ad424f94f737d4e7eb0fb167f1434fc4ae2d49e152f06f0845b6db0a44f0d6f5e7410420e6bd1f430b1af956005bf72b51405a04d9a5d9906ceca52c22c855785c3c3ac4c3e9bf532d31bab321e1db66f6a9f7dc9c017f2b7d8dfeb933cf5bbae71311ae318f6d187ebc5c843be342b08a9a0ff7c4b9c4b0f4fa74b13296afe84b6481440d58332e07b3d051ed55219d28e77af6612134da4431b797c63ef55bc53831e2f421db620fee51ba0967e4ed7009ef90af2204259bbfbb54537fd35c2132fa8e7f9c84bf9938d248862c6ca1cca9f48b0b33aa1589185c4eabc1c32",
      expectedValid: false,
    },
  ];

  // Iterate over the test cases and check each one
  testCases.forEach(({ blockHeader, solution, expectedValid }, index) => {
    const isValid = is_validSolution(n, k, blockHeader, solution);
    console.log(
      `Test case #${
        index + 1
      }: Is valid: ${isValid}, Expected: ${expectedValid}`
    );

    // Optionally, assert the validity to automatically verify the test outcome
    if (isValid === expectedValid) {
      console.log(`Test case #${index + 1} passed.`);
    } else {
      console.error(`Test case #${index + 1} failed.`);
    }
  });
}

// Run the tests
runTests();
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
