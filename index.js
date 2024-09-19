const { is_validSolution } = require("./native/index.node");

function writeCompactSize(length, buffer, pos) {
  let bytesWritten;
  if (length < 253) {
    buffer.writeUInt8(length, pos);
    bytesWritten = 1;
  } else if (length <= 0xffff) {
    buffer.writeUInt8(253, pos);
    buffer.writeUInt16LE(length, pos + 1);
    bytesWritten = 3;
  } else if (length <= 0xffffffff) {
    buffer.writeUInt8(254, pos);
    buffer.writeUInt32LE(length, pos + 1);
    bytesWritten = 5;
  } else {
    buffer.writeUInt8(255, pos);
    buffer.writeBigUInt64LE(BigInt(length), pos + 1);
    bytesWritten = 9;
  }
  return bytesWritten;
}

function readCompactSizeFromHex(input_hex, pos) {
  // Parse the prefix to determine how many bytes are used for the value
  const prefixHex = input_hex.substring(pos, pos + 2);
  const prefix = parseInt(prefixHex, 16);
  let value = 0;
  let bytesRead = 0;

  if (prefix < 0xfd) {
    // The prefix is the value
    value = prefix;
    bytesRead = 1;
  } else if (prefix === 0xfd) {
    // The next two bytes are the value
    const sizeHexLE = input_hex.substring(pos + 2, pos + 6); // Little-endian hex string
    const sizeHex = sizeHexLE.substring(2, 4) + sizeHexLE.substring(0, 2); // Convert to big-endian
    value = parseInt(sizeHex, 16);
    bytesRead = 3;
  } else if (prefix === 0xfe) {
    // The next four bytes are the value
    const sizeHexLE = input_hex.substring(pos + 2, pos + 10); // Little-endian hex string
    const sizeHex =
      sizeHexLE.substring(6, 8) +
      sizeHexLE.substring(4, 6) +
      sizeHexLE.substring(2, 4) +
      sizeHexLE.substring(0, 2); // Convert to big-endian
    value = parseInt(sizeHex, 16);
    bytesRead = 5;
  } else if (prefix === 0xff) {
    // The next eight bytes are the value
    const sizeHexLE = input_hex.substring(pos + 2, pos + 18); // Little-endian hex string
    const sizeHex =
      sizeHexLE.substring(14, 16) +
      sizeHexLE.substring(12, 14) +
      sizeHexLE.substring(10, 12) +
      sizeHexLE.substring(8, 10) +
      sizeHexLE.substring(6, 8) +
      sizeHexLE.substring(4, 6) +
      sizeHexLE.substring(2, 4) +
      sizeHexLE.substring(0, 2); // Convert to big-endian
    value = parseInt(sizeHex, 16);
    bytesRead = 9;
  } else {
    // Unsupported format
    return "Unsupported format";
  }

  let hexLength = bytesRead * 2;
  return { value, hexLength };
}

function readCompactSize(inputBuffer, pos) {
  // Parse the prefix to determine how many bytes are used for the value
  const prefix = inputBuffer.readUInt8(pos);
  let value = 0;
  let bytesRead = 0;

  if (prefix < 0xfd) {
    // The prefix is the value
    value = prefix;
    bytesRead = 1;
  } else if (prefix === 0xfd) {
    // The next two bytes are the value, read as little-endian
    value = inputBuffer.readUInt16LE(pos + 1);
    bytesRead = 3; // Prefix + 2 bytes
  } else if (prefix === 0xfe) {
    // The next four bytes are the value, read as little-endian
    value = inputBuffer.readUInt32LE(pos + 1);
    bytesRead = 5; // Prefix + 4 bytes
  } else if (prefix === 0xff) {
    // The next eight bytes are the value, read as little-endian
    // Note: JavaScript numbers can only safely represent integers up to 2^53 - 1,
    // but we are reading this as a buffer, not a number, due to JavaScript limitations.
    value = inputBuffer.readBigUInt64LE(pos + 1);
    bytesRead = 9; // Prefix + 8 bytes
  } else {
    // Unsupported format
    return "Unsupported format";
  }

  return { value, bytesRead };
}

function parseBlockData(rawBlockHexString) {
  // calculate size of the v4 data without nonce and solution
  const v4HexDataWithoutNonceAndSolutionSize = 2 * (4 + 32 + 32 + 32 + 4 + 4);
  const uint256Size = 2 * 32;

  // Extracting block version (first 4 bytes) - big-endian
  let blockVersionStr = rawBlockHexString.substring(0, 8);
  const verBuffer = Buffer.from(blockVersionStr, "hex");
  let blockVersion = verBuffer.readUInt32LE(0);
  console.log(`Block Version: ${blockVersion}`);

  let pos = 0;
  const v4HexDataWithoutNonceAndSolution = rawBlockHexString.substring(
    pos,
    pos + v4HexDataWithoutNonceAndSolutionSize
  );
  console.log(
    `V4 Data Without Nonce and Solution: ${v4HexDataWithoutNonceAndSolution}`
  );
  pos += v4HexDataWithoutNonceAndSolutionSize;

  let pos_v5 = pos;
  let v5HexData = "";
  if (blockVersion >= 5) {
    // extracting v5 data

    // Extracting PastelID
    const pastelIDSize = readCompactSizeFromHex(rawBlockHexString, pos);
    console.log(`Pastel ID Size Hex Length: ${pastelIDSize.hexLength}`);
    console.log(`Pastel ID Size: ${pastelIDSize.value}`);
    pos += pastelIDSize.hexLength; // Move past Pastel ID compact size in hex string
  
    const pastelid_in_hex = rawBlockHexString.substring(
      pos,
      pos + pastelIDSize.value * 2);
    console.log(`Pastel ID (hex): ${pastelid_in_hex}`);
    const pastelIDString = Buffer.from(pastelid_in_hex, "hex").toString("utf8");
    console.log(`Pastel ID: ${pastelIDString}`);
    pos += pastelIDSize.value * 2;

    // Extracting Signature
    const signatureSize = readCompactSizeFromHex(rawBlockHexString, pos);
    console.log(`Signature Size Hex Length: ${signatureSize.hexLength}`);
    console.log(`Signature Size: ${signatureSize.value}`);
    pos += signatureSize.hexLength; // Move past Signature compact size in hex string

    const signatureValue = rawBlockHexString.substring(
      pos,
      pos + signatureSize.value * 2);
    console.log(`Signature (hex): ${signatureValue}`);
    pos += signatureSize.value * 2;

    v5HexData = rawBlockHexString.substring(pos_v5, pos);
  }

  const nonceValue = rawBlockHexString.substring(pos, pos + uint256Size);
  console.log(`Nonce Value (hex): ${nonceValue}`);
  pos += uint256Size;

  // solution compact size and value
  const solutionSize = readCompactSizeFromHex(rawBlockHexString, pos);
  console.log(`Solution Size Hex Length: ${solutionSize.hexLength}`);
  console.log(`Solution Size: ${solutionSize.value}`);
  pos += solutionSize.hexLength; // Move past solution compact size in hex string
  const solutionValue = rawBlockHexString.substring(
    pos,
    pos + solutionSize.value * 2
  );
  console.log(`Solution (hex): ${solutionValue}`);
  pos += solutionSize.value * 2;

  const blockTxData = rawBlockHexString.substring(pos);
  console.log(`Block TX Data: ${blockTxData}`);

  return {
    equihash_input_in_hex: `${v4HexDataWithoutNonceAndSolution}${v5HexData}`,
    nonce_value_in_hex: nonceValue,
    solution_value_in_hex: solutionValue,
  };
}

function getDataForEquihashValidation(rawBlockHexString) {
  const parsedData = parseBlockData(rawBlockHexString);
  const equihashInputHex = `${parsedData.equihash_input_in_hex}${parsedData.nonce_value_in_hex}`;
  const solutionHex = parsedData.solution_value_in_hex;

  console.log("Equihash Input (hex):", equihashInputHex);
  console.log("Solution (hex):", solutionHex);

  return {
    equihash_input_hex_string: equihashInputHex,
    solution_hex_string: solutionHex,
  };
}

// function to get compact size length
function getCompactSizeLength(length) {
  if (length < 253) {
      return 1;
  } else if (length <= 0xffff) {
      return 3;
  } else if (length <= 0xffffffff) {
      return 5;
  } else {
      return 9;
  }
}

function serializeHeader(
  nTime,
  nonce,
  version,
  prevHashReversed,
  merkleRootReversed,
  hashFinalSaplingRootReversed,
  difficulty_bits,
  pastelid_pubkey_in_hex,
  signature_in_hex,
  solution_in_hex
) {
  var bufferLength = 3024; // Sufficient buffer size for additional fields
  var header = Buffer.alloc(bufferLength);
  var position = 0;

  // Version (4 bytes)
  header.writeUInt32LE(version, position);
  position += 4;

  // Previous block hash (32 bytes)
  Buffer.from(prevHashReversed, "hex").copy(header, position);
  position += prevHashReversed.length / 2;

  // Merkle root (32 bytes)
  Buffer.from(merkleRootReversed, "hex").copy(header, position);
  position += merkleRootReversed.length / 2;

  // Final sapling root hash field (32 bytes)
  Buffer.from(hashFinalSaplingRootReversed, "hex").copy(header, position);
  position += hashFinalSaplingRootReversed.length / 2;

  // Time (4 bytes)
  header.writeUInt32LE(nTime, position); // Correctly parsing nTime as hex
  position += 4;

  // Bits, difficulty (4 bytes)
  Buffer.from(difficulty_bits, "hex").copy(header, position);
  position += 4;

  // Nonce (32 bytes)
  // Assuming nonce is correctly reversed if needed based on block version
  const nonceBuffer = Buffer.from(nonce, "hex");
  nonceBuffer.copy(header, position);
  position += nonceBuffer.length; 

  // Solution Compact Size and Value
  const solutionBuffer = Buffer.from(solution_in_hex, "hex");
  position += writeCompactSize(solutionBuffer.length, header, position);
  solutionBuffer.copy(header, position);
  position += solutionBuffer.length;

  // Conditional handling for Version 5 specific fields
  if (version >= 5) {
    // PastelID (variable length)
    const pastelIdBuffer = Buffer.from(pastelid_pubkey_in_hex, "hex");
    // PastelID compact size
    position += writeCompactSize(pastelIdBuffer.length, header, position);
    pastelIdBuffer.copy(header, position);
    position += pastelIdBuffer.length;

    // Signature (variable length)
    const signatureBuffer = Buffer.from(signature_in_hex, "hex"); 
    position += writeCompactSize(signatureBuffer.length, header, position);
    signatureBuffer.copy(header, position);
    position += signatureBuffer.length;
  }

  // Trim the buffer to the actual used size
  var trimmedHeader = header.slice(0, position);

  return trimmedHeader;
}

function prepareForSerialization(parsedData) {
  // Extract fields from v4_data_without_nonce_and_solution
  const v4Data = parsedData.v4_data_without_nonce_and_solution;

  // Extracting the version, previous hash, merkle root, and reserved hash from the v4 data
  const version = parseInt(reverseHex(v4Data.substring(0, 8)), 16); // First 4 bytes for version
  const prevHashReversed = v4Data.substring(8, 72); // Next 32 bytes for prev hash, assuming it's already reversed in v4 data
  const merkleRootReversed = v4Data.substring(72, 136); // Following 32 bytes for merkle root, assuming it's already reversed
  const hashFinalSaplingRootReversed = v4Data.substring(136, 200); // Following 32 bytes for Final Sapling Root, assuming it's already reversed
  const nTime = parseInt(reverseHex(v4Data.substring(200, 208)), 16); // Convert to decimal
  const difficultyBits = v4Data.substring(208, 216); // Next 4 bytes for difficulty bits

  // Nonce handling - Convert from reversed hex to regular hex
  const nonce = parsedData.nonce_value_in_hex;

  // PastelID and Signature handling - Convert from hex to expected format for serialization
  const pastelidPubkey = parsedData.pastelid_value_in_hex;
  const signature = parsedData.signature_value_in_hex;
  const solution = parsedData.solution_value_in_hex;

  return {
    nTime,
    nonce,
    version,
    prevHashReversed,
    merkleRootReversed,
    hashFinalSaplingRootReversed,
    difficultyBits,
    pastelidPubkey,
    signature,
    solution
  };
}

function reverseHex(hex) {
    return hex.match(/../g).reverse().join("");
}

function prepareForParsing(serializedHeader) {
  let position = 0;
  const output = {};

  // Assuming the serializedHeader includes V4 data, nonce, solution, PastelID, and signature in that order

  // V4 Data Without Nonce and Solution
  const v4DataLength = 214; // Fixed length based on Zcash's format
  output.v4_data_without_nonce_and_solution = serializedHeader
    .slice(position, position + v4DataLength)
    .toString("hex");
  position += v4DataLength;

  const nonceValue = serializedHeader
    .slice(position, position + 32)
    .toString("hex");
  position += 32;
  output.nonce_value_reversed = reverseHex(nonceValue);

  // Solution Compact Size and Value
  const solutionSize = readCompactSize(serializedHeader, position);
  position += solutionSize.bytesRead;
  output.solution_compact_size_hex = Buffer.alloc(getCompactSizeLength(solutionSize.value)); 
  writeCompactSize(solutionSize.value, output.solution_compact_size_hex, 0);

  const solutionValue = serializedHeader
    .slice(position, position + solutionSize.value)
    .toString("hex");
  position += solutionSize.value;
  output.solution_value = reverseHex(solutionValue); // Assuming solution needs reversal

  // PastelID
  const pastelIDSize = readCompactSize(serializedHeader, position); // Assuming compact size is 1 byte
  position += pastelIDSize.bytesRead;
  output.pastelid_value_in_hex = serializedHeader
    .slice(position, position + pastelIDSize.value)
    .toString("hex");
  position += pastelIDSize.value;

  // Signature
  const signatureSize = readCompactSize(serializedHeader, position); // Assuming compact size is 1 byte
  position += signatureSize.bytesRead;
  output.signature_value = serializedHeader
    .slice(position, position + signatureSize.value)
    .toString("hex");

  return output;
}

function SerializationTest(block_data_hex_string) {
  // Show that the serializeHeader function effectively inverts the parseBlockData function:
  const parsed_block_data = parseBlockData(block_data_hex_string);
  const {
    nTime,
    nonce,
    version,
    prevHashReversed,
    merkleRootReversed,
    hashFinalSaplingRootReversed,
    difficultyBits,
    pastelidPubkey,
    signature,
    solution
  } = prepareForSerialization(parsed_block_data);

  const serialized_header = serializeHeader(
    nTime,
    nonce,
    version,
    prevHashReversed,
    merkleRootReversed,
    hashFinalSaplingRootReversed,
    difficultyBits,
    pastelidPubkey,
    signature,
    solution
  );
  const reparsed_data = prepareForParsing(serialized_header);

  console.log("Original data:");
  console.log(parsed_block_data);
  console.log("Serialized header:");
  console.log(serialized_header.toString("hex"));
  console.log("Reparsed data:");
  console.log(reparsed_data);
}

function runTests() {
  // Test vector parameters
  const n = 200;
  const k = 9;

  const completeTestBlockDataAsHexString =
    "05000000635fcfbf24561ecf5412b2414a7772cbb6ec815ec4506bfc88e3083f2d12a90092cca437c18153576b8013bda235c8ee97f430989a4205745d188bf4f54d6eccfbc2f4300c01f0b7820d00e3347c8da4ee614674376cbc45359daa54f9b5493e3786db660dcd0020566a5859335959665061556e7a716e6466634647764848783839384c4e6675383544566b385a38556a3353776552503251314251357637645a41636777706e61364e73714b33595a77696d353876334e7557355075337572475cc744e6f8ba46e61e7949af304c9ebea27da9dee1a0c9020efdfb004ea08230016fdcd1d680fb65cbb7281cb8e8326f23fec677b6163180c90e0997944e87155515a15f6c1679883a932c58f8a38470f4327f4b607e16844437b7191a20edc4e3254fba3d9326c795c8bf1f950e403f0057fffff5d8d8aa41000000000000000000000000000000000000000000000000fd4005001c192b9e581b7cde0fb520be466f4a1be854eea32e923f28941647a78e40854417492705bd827ffbab122fcffe4511b865334cfa8840e75c7f720c5cb21c1b8d8568d26a355bcb07920c2d56a5c510285e7a1d06bbe667d1d588891eb0d82a3e70e7e6364492127d0e96f996c5f3e17de13686339077e6dec92f5f105a2fc5b4572e4f96d1721df3ef86f855e2aa07b717d132c4072a789e31f7767976c836d9c741f163fdd73e0160e73ec967b3a15da8b72dd9d080830e3f7e515505c88b092d498c8fb95883cfd0c91f910df14ec08a12f2da89fccd54c06d53f1b4f8198b3cecdf554758503adae9115b8101f52087b400e3ad73ac0c7e05a208887e29db3150efacf9d150eb214a54b476ab375e0bee0ace630326b25c82e8248c6e5bde679cd53fe52502fd462e23ac272777096d0d54bacf399a3dc3822a0476b5a4dd0fefd82005cf6835c2b61a80b9069607681744ffd4577594d3b5b989ec167978817816280d2a68dffeefd6c58f9aa78674c75c86d8b9dd762b2313568c6a687ab1919017ac96dde4aa2aba3486ca30e24d7081ee85817bd1632d6420218ceaae10ec9209db08ac18848237cdb15693f0f22e4a798d9f8a95114f1aa81ee161b3354262cd9caf2134f5b8185b372848f576d998bf992b8a2443276b7e7ea76b3cd7fc4e0d7efb90a96b4b85c9d7613570fdf332a779d1e107b8ce8a8355f3195777738a31d6d2b361751f52803c0bc2233a522e4f02d2861328dfbc462de0749450196e1d1c25548a9b655254cf2170e4454fd87c142c5287ac95ebac1dbdf09946d708e2adcaf18f7e2b9f0a229e497ca2479d1294d234ac4057857082b78607181c47580e4cef9d7e0e13c68dc678c7c8717f4e4026fadeb4495749f52c92a2a16d2f053644b01587b873cebc82bd1f151d0d13f822af619d8e2cce3ee01a01a3eb9ac363ad3fee97f539da62ac819b360e1fba024a1d6431c169883a28545b3df72a31d8831a64ae14dc18c2658653650473773a5f6796b2323eb89bf61513dfeafc0f27e529eeb28ff6332a86c76adc69930cb429516052cfb596a1141cf2b3c5f154a5fc057b14e39d4e0ee1248d47d3931650e2ed5de74b97b9513323f6d77e2b6b37fed2e6bf35e7cb4f7fc75de84035c1af86215a30bd3d8c08929b62fd9e77591b1b4c099e6200d98ad43fbaf9e200e5dbeb8ee14118db24176cfe63de8726f563e4c680c3d1b8f2f0c098b0a63449bcc5c05d0bc50ac0671bc6fb3c5df1e03141fe548c7d1e4d19deeffcd4982ab8ebc922826b7736e50e87bfb600d778f5a371e146b6746829eb6b94c3833ab01d35a39006affbf985a48fd0e4f1f071de42f1102cc70686d194095fab0ac0637b1c7758a7be6930260b91f63a5b7dd9e2dc32f3b14026268bf4ba8dd102e968981f15b947d9c6d32d2648f1651aa6dd5d2d13567c4e15cc06a71418b19166e439b929179d8de50794eae6046095cfe5a4e34490c137c55265ff70b41412d8d1a69232ab4dbfb19c606709a6dd5cdb872f0cec4e59a46e0b5bf81e684564d8536217cfdcbd991a71b9a719a90319b8e5d5d49f7c761f90c55e1e331f2d548c07cc3a2377bbe6f363513206c7e85c2cbb724f27890adf5dd5008e0d897cfe7dd79484fda6800894ed85248585df0d1d857a5fcbbb01d1dc7e74ae37f6ea1f1ae4ee77e74ea3b42bccf3058cc3dccb7e12d866472e08ae153000f73441c6787e14a13bb7211b36759f931a689fdc20a5b6604cd3e240c2b9053d21697d76d20d4f9f395955ab2e75749e07ee1e9c0f37ed848114a0037b704544a58bbf14b94e235be2382ad2a5a638d76dd960950377b87c336d5ef0398d3750e03c9c90a6409f7b60d5b2c6f7933d9dd0947d72";
  const { equihash_input_hex_string, solution_hex_string } =
    getDataForEquihashValidation(completeTestBlockDataAsHexString);

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
    {
      blockHeader: equihash_input_hex_string,
      solution: solution_hex_string,
      expectedValid: true,
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

  SerializationTest(completeTestBlockDataAsHexString);
}

// Run the tests
//runTests();

module.exports = {
  is_validSolution,
  parseBlockData,
  getDataForEquihashValidation,
};
