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

function readCompactSize(input, pos) {
  // Parse the prefix to determine how many bytes are used for the value
  const prefixHex = input.substring(pos, pos + 2);
  const prefix = parseInt(prefixHex, 16);
  let value = 0;
  let bytesRead = 0;

  console.log(`Prefix: ${prefix}`);
  if (prefix < 0xfd) {
      // The prefix is the value
      value = prefix;
      bytesRead = 1;
  } else if (prefix === 0xfd) {
      // The next two bytes are the value
      const sizeHexLE = input.substring(pos + 2, pos + 6); // Little-endian hex string
      const sizeHex = sizeHexLE.substring(2, 4) + sizeHexLE.substring(0, 2); // Convert to big-endian
      value = parseInt(sizeHex, 16);
      bytesRead = 3;
  } else if (prefix === 0xfe) {
      // The next four bytes are the value
      const sizeHexLE = input.substring(pos + 2, pos + 10); // Little-endian hex string
      const sizeHex = sizeHexLE.substring(6, 8) + sizeHexLE.substring(4, 6) + sizeHexLE.substring(2, 4) + sizeHexLE.substring(0, 2); // Convert to big-endian
      value = parseInt(sizeHex, 16);
      bytesRead = 5;
  } else if (prefix === 0xff) {
      // The next eight bytes are the value
      const sizeHexLE = input.substring(pos + 2, pos + 18); // Little-endian hex string
      const sizeHex = sizeHexLE.substring(14, 16) + sizeHexLE.substring(12, 14) + sizeHexLE.substring(10, 12) + sizeHexLE.substring(8, 10) +
                sizeHexLE.substring(6, 8) + sizeHexLE.substring(4, 6) + sizeHexLE.substring(2, 4) + sizeHexLE.substring(0, 2); // Convert to big-endian
      value = parseInt(sizeHex, 16);
      bytesRead = 9;
  } else {
      // Unsupported format
      return "Unsupported format";
  }

  let hexLength = bytesRead * 2;
  return { value, hexLength };
}

function parseBlockData(rawBlockHexString) {
  // calculate size of the v4 data without nonce and solution
  const v4HexDataWithoutNonceAndSolutionSize = 2 * (4 + 32 + 32 + 32 + 4 + 4);
  const uint256Size = 2 * 32;

  let pos = 0;
  const v4HexDataWithoutNonceAndSolution = rawBlockHexString.substring(
    pos,
    pos + v4HexDataWithoutNonceAndSolutionSize
  );
  console.log(
    `V4 Data Without Nonce and Solution: ${v4HexDataWithoutNonceAndSolution}`
  );
  pos += v4HexDataWithoutNonceAndSolutionSize;

  const nonceValue = rawBlockHexString.substring(pos, pos + uint256Size);
  console.log(`Nonce Value (hex): ${nonceValue}`);
  pos += uint256Size;
  
  // solution compact size and value
  const solutionSize = readCompactSize(rawBlockHexString, pos);
  console.log(`Solution Size Hex Length: ${solutionSize.hexLength}`);
  console.log(`Solution Size: ${solutionSize.value}`);
  pos += solutionSize.hexLength; // Move past solution compact size in hex string
  const solutionValue = rawBlockHexString.substring(
    pos,
    pos + solutionSize.value * 2
  );
  console.log(`Solution (hex): ${solutionValue}`);
  pos += solutionSize.value * 2;

  const v5_data_combined_with_tx_data = rawBlockHexString.substring(pos);

  // Extracting PastelID
  let pos_v5 = 0;
  const pastelIDSize = readCompactSize(v5_data_combined_with_tx_data, pos_v5);
  console.log(`Pastel ID Size Hex Length: ${pastelIDSize.hexLength}`);
  console.log(`Pastel ID Size: ${pastelIDSize.value}`);
  pos_v5 += pastelIDSize.hexLength; // Move past Pastel ID compact size in hex string

  const pastelIDValue = v5_data_combined_with_tx_data.substring(
    pos_v5,
    pos_v5 + pastelIDSize.value * 2
  );
  console.log(`Pastel ID (hex): ${pastelIDValue}`);
  const pastelIDString = Buffer.from(pastelIDValue, "hex").toString("utf8");
  console.log(`Pastel ID: ${pastelIDString}`);
  pos_v5 += pastelIDSize.value * 2;

  // Extracting Signature
  const signatureSize = readCompactSize(v5_data_combined_with_tx_data, pos_v5);
  console.log(`Signature Size Hex Length: ${signatureSize.hexLength}`);
  console.log(`Signature Size: ${signatureSize.value}`);
  pos_v5 += signatureSize.hexLength; // Move past Signature compact size in hex string

  const signatureValue = v5_data_combined_with_tx_data.substring(
    pos_v5,
    pos_v5 + signatureSize.value * 2
  );
  console.log(`Signature (hex): ${signatureValue}`);
  pos_v5 += signatureSize.value * 2;

  const blockTxData = v5_data_combined_with_tx_data.substring(pos_v5);
  console.log(`Block TX Data: ${blockTxData}`);

  const v5_data_combined = v5_data_combined_with_tx_data.substring(
    0,
    v5_data_combined_with_tx_data.length - blockTxData.length
  );
  console.log(`V5 Data Combined (hex): ${v5_data_combined}`);

  return {
    v4_data_without_nonce_and_solution: v4HexDataWithoutNonceAndSolution,
    nonce_value_in_hex: nonceValue,
    solution_value_in_hex: solutionValue,
    pastelid_value_in_hex: pastelIDValue,
    signature_value_in_hex: signatureValue,
    v5_data_combined_in_hex: v5_data_combined,
  };
}

function getDataForEquihashValidation(rawBlockHexString) {
  const parsedData = parseBlockData(rawBlockHexString);
  const equihashInputHex = `${parsedData.v4_data_without_nonce_and_solution}${parsedData.v5_data_combined_in_hex}${parsedData.nonce_value_in_hex}`;
  const solutionHex = parsedData.solution_value_in_hex;

  console.log("Equihash Input (hex):", equihashInputHex);
  console.log("Solution (hex):", solutionHex);

  return {
    equihash_input_hex_string: equihashInputHex,
    solution_hex_string: solutionHex,
  };
}

function runTests() {
  // Test vector parameters
  const n = 200;
  const k = 9;

  const completeTestBlockDataAsHexString =
    "0500000020e87b9ad6547ee05575a1b511f5f81bd618c810e1d6013bd6e18a215092830208ec3d49c7882563766d4bd39d4f623ac80c8a00dbaf1ba20732f57fbd98dcd2d60cbc2d19f4e180dfd8d2170cca76badfcfcdde2f6b6cd55faf2f33d60c2b520b18cd65ef6607200600f2e5a3dc7d15ebd662139ebbae38ab99cfd65eeef76428f237f08e000000fd40050100f29d530ebedfb601d10f023e1ee963b170de842ed5a7440510833b1645147b5fbd5481e149d19f4d137f1d6d87a81da1bc9cb5ddd04edcfe237b13b28a183dc60f4d46ca2d554c1a87dbe8d9ef08299fdf4604c6c29be84332e996f675b722cc322d99761203400c5beae193580efafcc611683058c2cdf61edfa00b0dc65b87162fbc738272953137cb5ebd9d70911d9c1b86326eb149922bf31a3afeae77dbf7053cf897d0030ae3357b5195e92baad2416dc78156ba4156f2f40552b3a47f0c29c0fe4e24582a594b11421b514b4407f101fa6bc3e2fb7ea60170b7b70898d7d6cabbc51075c58399f601a9bf76027f9d73da96945317f66004faab7bcb0a926b414df5e915ffa06e6ae6d734bf08b6a0a43ad0d0e54185138a3049148a340f7d08570b8a5eaf9dde1a352c0830c495cd4c11f5e51bef1435d9eb1a125c8d9551f653d95ce1cd24fe03b3f8260307a035cf510af183e85112aab7b194760f0b61fb0ca3eb786d475df5c319f3e10162ab1abf389de3de084ea612a8e6a823fa6f339befd338db1299ddcd3835eca42b9c19624fd636e551aeca25d627e274cf711bec9c4cd0d643d39147d352147d40e252a4b2f3fc36669d486a22feb3de9a93a9052587d9f961de7da51e15cf8361d526d9a47a429449a60b6e20413d079336a1cd95399a9fabd49d2763c6e89f5657d537eae4048db215afcbc47db82d57bab8fa7646a88ff8aa7618bfb239d3cbcba17ef044b7967930337fdf7e3bee1bd11697149a64a96c0aa201a2aadd5faa21ff36732bb44a92d2568b4b8fddd5471d3d30adde6c162a1409176b7381936fbcf0b0d326e3fd9f82e3f29a45d409d7a55ec3635e63af9847b7a57b95b21ea6d397e10f9ec730d052774d9053d6db487408ee8b539663aa2d698b7e8ce6d1ab564f93e17ea522f584e13e57d401ff8793a824294b6fb991f0ba43a0dccdabd716130708639b4d89c91bb07b81dbc6e4e4fd61df6f7336043d24a37e19108bff48314cc0bbc2077150be6289442e74e16562f167af6314be01aeb6de4776544c8d0213e7c9754ef46d2c4ee637a9b563a1ac457be68c06752242f2e25627630fb396255a80d92e0f2bd747079a8eacb3d0087fc25bb17e0346e118c83b08ccbc18c7832f885bdb2568d3abe19a7809fb848f7fb96305cb1d26d827e0d3efe0e22067164a9927a9375fb3126ef525a1f8d69bf2eb73ba1ca87a7a6fa79676d30c54b19433578f28da60b1dada734e2b3dcb5a58d822cfb1ab6dd28fadc26c82f442da23e9aa5390222f0c3167237b991187518ac32839a7cb0f1647fd7e74342ac73224e949b3cddd0624fdd522338fdf3e051b24d157e7f8dc315bcefe559abdc3aabdeaa8b9cd9c309675c34ca07d153b6af46605ad3b5d5b5db2fbdc05a5468b80963e2ebb0e634201b240b9d567d33aed09cf10d137ce599b7010923412ae9839308db769ab14c0f573b8db11ddfe485425e1f861615dced9eac7503966e1e2a044a770e5974885bdc802efcd7ed31b10811502cbca338d4a3a435e049e03ca45c6b8c5df1fd6f5a36bb3d0fde5b712ded7c78ed5da09d85e3515f447ccce0903f448efb2a6034900d4ff409355da3ff177ac0bde3b0b28e6f5cd4eb1bc070b673df2d909ed074e84c9904d2eef42413ca88045fa4ad81ddb0a847a9905c7bbcc4dd2b2d23332b525ea337559c91e1deb485c70c327ea54435f92c8cbb4f93c32e9b233d7faf5dda56be98b01a83b2a774a96a0465c3c7431acfa72caccaf85fb9aa58e34ce1b670356fb3f6d51ab6477acd9a6c375f8b6f105fe0d46760a1cf17436217ea11c9c7cb31607262a0accb77990bd77eb3346e4ef7898dd75ff2f3b18343669730699b33f5aa6566a585877503931486a795a3271357a466648415143656f444b3554766e774559754a634a597858737139786559676d554c6b3353523845723269796d6f546151344e394d3272636f7746424a47586f5a36796531674e720b2377423a43ce37525c48f3f9fea451d01463c8426b4c562edf2bc9f448f536645a836efadae2a04d7b1f120a64cbfede3ac04fcc51cfa580314fbe25057b4e75c05983c2df0ab2b1ecfda528be6f993e2c3b6cdeef816e204677ecf8573806cbff5c97813ebd681f8d3d5b03da2d203a00010400008085202f89010000000000000000000000000000000000000000000000000000000000000000ffffffff06032e35060101ffffffff020065cd1d000000001976a914a525ad9a09c7fa91a7b9a31fcdf5fca1b75906ed88ac40597307000000001976a914d244e10fe4cde16c8e0ca28b9fc626976f0a1dec88ac00000000423506000000000000000000000000";
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

  function stringToHex(str) {
    return str
      .split("")
      .map((c) => c.charCodeAt(0).toString(16).padStart(2, "0"))
      .join("");
  }

function serializeEquihashInput(
    nTime,
    nonce,
    version,
    prevHashReversed,
    merkleRootReversed,
    hashFinalSaplingRootReversed,
    difficulty_bits,
    currently_selected_supernode_pastelid_pubkey,
    currently_selected_supernode_signature
  ) {
    var bufferLength = 1024; // Sufficient buffer size for additional fields
    var ehInput = Buffer.alloc(bufferLength);
    var position = 0;

    // Version (4 bytes)
    ehInput.writeUInt32LE(version, position);
    position += 4;

    // Previous block hash (32 bytes)
    Buffer.from(prevHashReversed, "hex").copy(ehInput, position);
    position += prevHashReversed.length;

    // Merkle root (32 bytes)
    Buffer.from(merkleRootReversed, "hex").copy(ehInput, position);
    position += merkleRootReversed.length;

    // Final sapling root hash field (32 bytes)
    Buffer.from(hashFinalSaplingRootReversed, "hex").copy(ehInput, position);
    position += hashFinalSaplingRootReversed.length;

    // Time (4 bytes)
    ehInput.writeUInt32LE(parseInt(nTime, 16), position); // Correctly parsing nTime as hex
    position += 4;

    // Bits, difficulty (4 bytes)
    Buffer.from(difficulty_bits, "hex").reverse().copy(ehInput, position);
    position += 4;

    // Conditional handling for Version 5 specific fields
    if (version >= 5) {
      // PastelID (variable length)
      const pastelIdBuffer = Buffer.from(currently_selected_supernode_pastelid_pubkey, "utf-8");
      // PastelID compact size
      position += writeCompactSize(pastelIdBuffer.length, ehInput, position);
      pastelIdBuffer.copy(ehInput, position);
      position += pastelIdBuffer.length;

      // Signature (variable length)
      const signatureBuffer = Buffer.from(currently_selected_supernode_signature, "utf-8")
      // signature compact size
      position += writeCompactSize(signatureBuffer.length, ehInput, position);
      signatureBuffer.copy(ehInput, position);
      position += signatureBuffer.length;
    }

    // Nonce (32 bytes)
    // Assuming nonce is correctly reversed if needed based on block version
    var nonceBuffer = Buffer.from(nonce, "hex");
    nonceBuffer.copy(ehInput, position);
    position += nonceBuffer.length; // Adjust based on actual nonce length

    // Trim the buffer to the actual used size
    var trimmedHeader = ehInput.slice(0, position);

    return trimmedHeader;
  }
}

// Run the tests
runTests();

module.exports = {
  is_validSolution,
  parseBlockData,
  getDataForEquihashValidation,
};
