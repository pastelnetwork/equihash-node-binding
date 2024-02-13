use blake2b_simd::{Hash as Blake2bHash, Params as Blake2bParams, State as Blake2bState};
use byteorder::{BigEndian, LittleEndian, ReadBytesExt, WriteBytesExt};
use std::fmt;
use std::io::Cursor;
use std::mem::size_of;
use hex;

#[derive(Clone, Copy)]
pub struct Params {
    pub(crate) n: u32,
    pub(crate) k: u32,
}

#[derive(Clone)]
struct Node {
    hash: Vec<u8>,
    indices: Vec<u32>,
}

impl Params {
    pub fn new(n: u32, k: u32) -> Result<Self, Error> {
        // We place the following requirements on the parameters:
        // - n is a multiple of 8, so the hash output has an exact byte length.
        // - k >= 3 so the encoded solutions have an exact byte length.
        // - k < n, so the collision bit length is at least 1.
        // - n is a multiple of k + 1, so we have an integer collision bit length.
        if (n % 8 == 0) && (k >= 3) && (k < n) && (n % (k + 1) == 0) {
            Ok(Params { n, k })
        } else {
            Err(Error(Kind::InvalidParams))
        }
    }
    fn indices_per_hash_output(&self) -> u32 {
        512 / self.n
    }
    fn hash_output(&self) -> u8 {
        (self.indices_per_hash_output() * self.n / 8) as u8
    }
    fn collision_bit_length(&self) -> usize {
        (self.n / (self.k + 1)) as usize
    }
    fn collision_byte_length(&self) -> usize {
        (self.collision_bit_length() + 7) / 8
    }
    #[cfg(test)]
    fn hash_length(&self) -> usize {
        ((self.k as usize) + 1) * self.collision_byte_length()
    }
}

impl Node {
    fn new(p: &Params, state: &Blake2bState, i: u32) -> Self {
        let hash = generate_hash(state, i / p.indices_per_hash_output());
        let start = ((i % p.indices_per_hash_output()) * p.n / 8) as usize;
        let end = start + (p.n as usize) / 8;
        Node {
            hash: expand_array(&hash.as_bytes()[start..end], p.collision_bit_length(), 0),
            indices: vec![i],
        }
    }

    // Clippy incorrectly interprets the first argument as `self`.
    #[allow(clippy::wrong_self_convention)]
    fn from_children(a: Node, b: Node, trim: usize) -> Self {
        let hash: Vec<_> = a
            .hash
            .iter()
            .zip(b.hash.iter())
            .skip(trim)
            .map(|(a, b)| a ^ b)
            .collect();
        let indices = if a.indices_before(&b) {
            let mut indices = a.indices;
            indices.extend(b.indices.iter());
            indices
        } else {
            let mut indices = b.indices;
            indices.extend(a.indices.iter());
            indices
        };
        Node { hash, indices }
    }

    #[cfg(test)]
    fn from_children_ref(a: &Node, b: &Node, trim: usize) -> Self {
        let hash: Vec<_> = a
            .hash
            .iter()
            .zip(b.hash.iter())
            .skip(trim)
            .map(|(a, b)| a ^ b)
            .collect();
        let mut indices = Vec::with_capacity(a.indices.len() + b.indices.len());
        if a.indices_before(b) {
            indices.extend(a.indices.iter());
            indices.extend(b.indices.iter());
        } else {
            indices.extend(b.indices.iter());
            indices.extend(a.indices.iter());
        }
        Node { hash, indices }
    }

    fn indices_before(&self, other: &Node) -> bool {
        // Indices are serialized in big-endian so that integer
        // comparison is equivalent to array comparison
        self.indices[0] < other.indices[0]
    }

    fn is_zero(&self, len: usize) -> bool {
        self.hash.iter().take(len).all(|v| *v == 0)
    }
}

/// An Equihash solution failed to verify.
#[derive(Debug)]
pub struct Error(Kind);

impl fmt::Display for Error {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "Invalid solution: {}", self.0)
    }
}

impl std::error::Error for Error {}

#[derive(Debug, PartialEq)]
pub(crate) enum Kind {
    InvalidParams,
    Collision,
    OutOfOrder,
    DuplicateIdxs,
    NonZeroRootHash,
}

impl fmt::Display for Kind {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Kind::InvalidParams => f.write_str("invalid parameters"),
            Kind::Collision => f.write_str("invalid collision length between StepRows"),
            Kind::OutOfOrder => f.write_str("Index tree incorrectly ordered"),
            Kind::DuplicateIdxs => f.write_str("duplicate indices"),
            Kind::NonZeroRootHash => f.write_str("root hash of tree is non-zero"),
        }
    }
}

fn initialise_state(n: u32, k: u32, digest_len: u8) -> Blake2bState {
    let mut personalization: Vec<u8> = Vec::from("ZcashPoW");
    personalization.write_u32::<LittleEndian>(n).unwrap();
    personalization.write_u32::<LittleEndian>(k).unwrap();

    Blake2bParams::new()
        .hash_length(digest_len as usize)
        .personal(&personalization)
        .to_state()
}

fn generate_hash(base_state: &Blake2bState, i: u32) -> Blake2bHash {
    let mut lei = [0u8; 4];
    (&mut lei[..]).write_u32::<LittleEndian>(i).unwrap();

    let mut state = base_state.clone();
    state.update(&lei);
    state.finalize()
}

fn expand_array(vin: &[u8], bit_len: usize, byte_pad: usize) -> Vec<u8> {
    assert!(bit_len >= 8);
    assert!(8 * size_of::<u32>() >= 7 + bit_len);

    let out_width = (bit_len + 7) / 8 + byte_pad;
    let out_len = 8 * out_width * vin.len() / bit_len;

    // Shortcut for parameters where expansion is a no-op
    if out_len == vin.len() {
        return vin.to_vec();
    }

    let mut vout: Vec<u8> = vec![0; out_len];
    let bit_len_mask: u32 = (1 << bit_len) - 1;

    // The acc_bits least-significant bits of acc_value represent a bit sequence
    // in big-endian order.
    let mut acc_bits = 0;
    let mut acc_value: u32 = 0;

    let mut j = 0;
    for b in vin {
        acc_value = (acc_value << 8) | u32::from(*b);
        acc_bits += 8;

        // When we have bit_len or more bits in the accumulator, write the next
        // output element.
        if acc_bits >= bit_len {
            acc_bits -= bit_len;
            for x in byte_pad..out_width {
                vout[j + x] = ((
                    // Big-endian
                    acc_value >> (acc_bits + (8 * (out_width - x - 1)))
                ) & (
                    // Apply bit_len_mask across byte boundaries
                    (bit_len_mask >> (8 * (out_width - x - 1))) & 0xFF
                )) as u8;
            }
            j += out_width;
        }
    }

    vout
}

pub fn indices_from_minimal(p: Params, minimal: &[u8]) -> Result<Vec<u32>, Error> {
    let c_bit_len = p.collision_bit_length();
    // Division is exact because k >= 3.
    if minimal.len() != ((1 << p.k) * (c_bit_len + 1)) / 8 {
        return Err(Error(Kind::InvalidParams));
    }

    assert!(((c_bit_len + 1) + 7) / 8 <= size_of::<u32>());
    let len_indices = 8 * size_of::<u32>() * minimal.len() / (c_bit_len + 1);
    let byte_pad = size_of::<u32>() - ((c_bit_len + 1) + 7) / 8;

    let mut csr = Cursor::new(expand_array(minimal, c_bit_len + 1, byte_pad));
    let mut ret = Vec::with_capacity(len_indices);

    // Big-endian so that lexicographic array comparison is equivalent to integer
    // comparison
    while let Ok(i) = csr.read_u32::<BigEndian>() {
        ret.push(i);
    }

    Ok(ret)
}

fn has_collision(a: &Node, b: &Node, len: usize) -> bool {
    a.hash
        .iter()
        .zip(b.hash.iter())
        .take(len)
        .all(|(a, b)| a == b)
}

fn distinct_indices(a: &Node, b: &Node) -> bool {
    for i in &(a.indices) {
        for j in &(b.indices) {
            if i == j {
                return false;
            }
        }
    }
    true
}

fn validate_subtrees(p: &Params, a: &Node, b: &Node) -> Result<(), Kind> {
    if !has_collision(a, b, p.collision_byte_length()) {
        Err(Kind::Collision)
    } else if b.indices_before(a) {
        Err(Kind::OutOfOrder)
    } else if !distinct_indices(a, b) {
        Err(Kind::DuplicateIdxs)
    } else {
        Ok(())
    }
}

#[cfg(test)]
fn is_valid_solution_iterative(
    p: Params,
    input: &[u8],
    nonce: &[u8],
    indices: &[u32],
) -> Result<(), Error> {
    let mut state = initialise_state(p.n, p.k, p.hash_output());
    state.update(input);
    state.update(nonce);

    let mut rows = Vec::new();
    for i in indices {
        rows.push(Node::new(&p, &state, *i));
    }

    let mut hash_len = p.hash_length();
    while rows.len() > 1 {
        let mut cur_rows = Vec::new();
        for pair in rows.chunks(2) {
            let a = &pair[0];
            let b = &pair[1];
            validate_subtrees(&p, a, b).map_err(Error)?;
            cur_rows.push(Node::from_children_ref(a, b, p.collision_byte_length()));
        }
        rows = cur_rows;
        hash_len -= p.collision_byte_length();
    }

    assert!(rows.len() == 1);

    if rows[0].is_zero(hash_len) {
        Ok(())
    } else {
        Err(Error(Kind::NonZeroRootHash))
    }
}

fn tree_validator(p: &Params, state: &Blake2bState, indices: &[u32]) -> Result<Node, Error> {
    if indices.len() > 1 {
        let end = indices.len();
        let mid = end / 2;
        let a = tree_validator(p, state, &indices[0..mid])?;
        let b = tree_validator(p, state, &indices[mid..end])?;
        validate_subtrees(p, &a, &b).map_err(Error)?;
        Ok(Node::from_children(a, b, p.collision_byte_length()))
    } else {
        Ok(Node::new(p, state, indices[0]))
    }
}

fn is_valid_solution_recursive(
    p: Params,
    input: &[u8],
    nonce: &[u8],
    indices: &[u32],
) -> Result<(), Error> {
    let mut state = initialise_state(p.n, p.k, p.hash_output());
    state.update(input);
    state.update(nonce);

    let root = tree_validator(&p, &state, indices)?;

    // Hashes were trimmed, so only need to check remaining length
    if root.is_zero(p.collision_byte_length()) {
        Ok(())
    } else {
        Err(Error(Kind::NonZeroRootHash))
    }
}

/// Checks whether `soln` is a valid solution for `(input, nonce)` with the
/// parameters `(n, k)`.
pub fn is_valid_solution(
    n: u32,
    k: u32,
    input: &[u8],
    nonce: &[u8],
    soln: &[u8],
) -> Result<(), Error> {
    let p = Params::new(n, k)?;
    let indices = indices_from_minimal(p, soln)?;

    // Recursive validation is faster
    is_valid_solution_recursive(p, input, nonce, &indices)
}

/// Modified to take n, k, block_header, and solution as inputs directly.
pub fn is_valid_solution_direct_input(
    n: u32,
    k: u32,
    block_header_hex: &str,
    solution_hex: &str,
) -> Result<(), Error> {
    // Parse hex strings to byte arrays
    let input = match hex::decode(block_header_hex) {
        Ok(bytes) => bytes,
        Err(_) => return Err(Error(Kind::InvalidParams)),
    };

    let soln = match hex::decode(solution_hex) {
        Ok(bytes) => bytes,
        Err(_) => return Err(Error(Kind::InvalidParams)),
    };

    // Original validation logic with parsed byte arrays
    let p = Params::new(n, k)?;
    let indices = indices_from_minimal(p, &soln)?;
    is_valid_solution_recursive(p, &input, &[], &indices)
}

#[cfg(test)]
mod tests {
    use super::{
        expand_array, indices_from_minimal, is_valid_solution, is_valid_solution_iterative,
        is_valid_solution_recursive, Params, is_valid_solution_direct_input,
    };

    use crate::test_vectors::INVALID_TEST_VECTORS;
    use crate::test_vectors::VALID_TEST_VECTORS;
        
    #[test]
    fn array_expansion() {
        let check_array = |(bit_len, byte_pad), compact, expanded| {
            assert_eq!(expand_array(compact, bit_len, byte_pad), expanded);
        };

        // 8 11-bit chunks, all-ones
        check_array(
            (11, 0),
            &[
                0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
            ],
            &[
                0x07, 0xff, 0x07, 0xff, 0x07, 0xff, 0x07, 0xff, 0x07, 0xff, 0x07, 0xff, 0x07, 0xff,
                0x07, 0xff,
            ][..],
        );
        // 8 21-bit chunks, alternating 1s and 0s
        check_array(
            (21, 0),
            &[
                0xaa, 0xaa, 0xad, 0x55, 0x55, 0x6a, 0xaa, 0xab, 0x55, 0x55, 0x5a, 0xaa, 0xaa, 0xd5,
                0x55, 0x56, 0xaa, 0xaa, 0xb5, 0x55, 0x55,
            ],
            &[
                0x15, 0x55, 0x55, 0x15, 0x55, 0x55, 0x15, 0x55, 0x55, 0x15, 0x55, 0x55, 0x15, 0x55,
                0x55, 0x15, 0x55, 0x55, 0x15, 0x55, 0x55, 0x15, 0x55, 0x55,
            ][..],
        );
        // 8 21-bit chunks, based on example in the spec
        check_array(
            (21, 0),
            &[
                0x00, 0x02, 0x20, 0x00, 0x0a, 0x7f, 0xff, 0xfe, 0x00, 0x12, 0x30, 0x22, 0xb3, 0x82,
                0x26, 0xac, 0x19, 0xbd, 0xf2, 0x34, 0x56,
            ],
            &[
                0x00, 0x00, 0x44, 0x00, 0x00, 0x29, 0x1f, 0xff, 0xff, 0x00, 0x01, 0x23, 0x00, 0x45,
                0x67, 0x00, 0x89, 0xab, 0x00, 0xcd, 0xef, 0x12, 0x34, 0x56,
            ][..],
        );
        // 16 14-bit chunks, alternating 11s and 00s
        check_array(
            (14, 0),
            &[
                0xcc, 0xcf, 0x33, 0x3c, 0xcc, 0xf3, 0x33, 0xcc, 0xcf, 0x33, 0x3c, 0xcc, 0xf3, 0x33,
                0xcc, 0xcf, 0x33, 0x3c, 0xcc, 0xf3, 0x33, 0xcc, 0xcf, 0x33, 0x3c, 0xcc, 0xf3, 0x33,
            ],
            &[
                0x33, 0x33, 0x33, 0x33, 0x33, 0x33, 0x33, 0x33, 0x33, 0x33, 0x33, 0x33, 0x33, 0x33,
                0x33, 0x33, 0x33, 0x33, 0x33, 0x33, 0x33, 0x33, 0x33, 0x33, 0x33, 0x33, 0x33, 0x33,
                0x33, 0x33, 0x33, 0x33,
            ][..],
        );
        // 8 11-bit chunks, all-ones, 2-byte padding
        check_array(
            (11, 2),
            &[
                0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
            ],
            &[
                0x00, 0x00, 0x07, 0xff, 0x00, 0x00, 0x07, 0xff, 0x00, 0x00, 0x07, 0xff, 0x00, 0x00,
                0x07, 0xff, 0x00, 0x00, 0x07, 0xff, 0x00, 0x00, 0x07, 0xff, 0x00, 0x00, 0x07, 0xff,
                0x00, 0x00, 0x07, 0xff,
            ][..],
        );
    }

    #[test]
    fn minimal_solution_repr() {
        let check_repr = |minimal, indices| {
            assert_eq!(
                indices_from_minimal(Params { n: 80, k: 3 }, minimal).unwrap(),
                indices,
            );
        };

        // The solutions here are not intended to be valid.
        check_repr(
            &[
                0x00, 0x00, 0x08, 0x00, 0x00, 0x40, 0x00, 0x02, 0x00, 0x00, 0x10, 0x00, 0x00, 0x80,
                0x00, 0x04, 0x00, 0x00, 0x20, 0x00, 0x01,
            ],
            &[1, 1, 1, 1, 1, 1, 1, 1],
        );
        check_repr(
            &[
                0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
                0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
            ],
            &[
                2097151, 2097151, 2097151, 2097151, 2097151, 2097151, 2097151, 2097151,
            ],
        );
        check_repr(
            &[
                0x0f, 0xff, 0xf8, 0x00, 0x20, 0x03, 0xff, 0xfe, 0x00, 0x08, 0x00, 0xff, 0xff, 0x80,
                0x02, 0x00, 0x3f, 0xff, 0xe0, 0x00, 0x80,
            ],
            &[131071, 128, 131071, 128, 131071, 128, 131071, 128],
        );
        check_repr(
            &[
                0x00, 0x02, 0x20, 0x00, 0x0a, 0x7f, 0xff, 0xfe, 0x00, 0x4d, 0x10, 0x01, 0x4c, 0x80,
                0x0f, 0xfc, 0x00, 0x00, 0x2f, 0xff, 0xff,
            ],
            &[68, 41, 2097151, 1233, 665, 1023, 1, 1048575],
        );
    }

    #[test]
    fn valid_test_vectors() {
        for tv in VALID_TEST_VECTORS {
            for soln in tv.solutions {
                is_valid_solution_iterative(tv.params, tv.input, &tv.nonce, soln).unwrap();
                is_valid_solution_recursive(tv.params, tv.input, &tv.nonce, soln).unwrap();
            }
        }
    }

    #[test]
    fn invalid_test_vectors() {
        for tv in INVALID_TEST_VECTORS {
            assert_eq!(
                is_valid_solution_iterative(tv.params, tv.input, &tv.nonce, tv.solution)
                    .unwrap_err()
                    .0,
                tv.error
            );
            assert_eq!(
                is_valid_solution_recursive(tv.params, tv.input, &tv.nonce, tv.solution)
                    .unwrap_err()
                    .0,
                tv.error
            );
        }
    }

    #[test]
    fn test_valid_solution_direct_input() {
        // Define the Equihash parameters, a sample block header, and a solution.
        let n = 200;
        let k = 9;
        let block_header_hex = "0400000008e9694cc2120ec1b5733cc12687b609058eec4f7046a521ad1d1e3049b400003e7420ed6f40659de0305ef9b7ec037f4380ed9848bc1c015691c90aa16ff3930000000000000000000000000000000000000000000000000000000000000000c9310d5874e0001f000000000000000000000000000000010b000000000000000000000000000040";
        let solution_hex = "00b43863a213bfe79f00337f5a729f09710abcc07035ef8ac34372abddecf2f82715f7223f075af96f0604fc124d6151fc8fb516d24a137faec123a89aa9a433f8a25a6bcfc554c28be556f6c878f96539186fab191505f278df48bf1ad2240e5bb39f372a143de1dd1b672312e00d52a3dd83f471b0239a7e8b30d4b9153027df87c8cd0b64de76749539fea376b4f39d08cf3d5e821495e52fdfa6f8085e59fc670656121c9d7c01388c8b4b4585aa7b9ac3f7ae796f9eb1fadba1730a1860eed797feabb18832b5e8f003c0adaf0788d1016e7a8969144018ecc86140aa4553962aa739a4850b509b505e158c5f9e2d5376374652e9e6d81b19fa0351be229af136efbce681463cc53d7880c1eeca3411154474ff8a7b2bac034a2026646776a517bf63921c31fbbd6be7c3ff42aab28230bfe81d33800b892b262f3579b7a41925a59f5cc1d4f523577c19ff9f92023146fa26486595bd89a1ba459eb0b5cec0578c3a071dbec73eca054c723ab30ce8e69de32e779cd2f1030e39878ac6ea3cdca743b43aedefe1a9b4f2da861038e2759defef0b8cad11d4179f2f08881b53ccc203e558c0571e049d998a257b3279016aad0d7999b609f6331a0d0f88e286a70432ca7f50a5bb8fafbbe9230b4ccb1fa57361c163d6b9f84579d61f41585a022d07dc8e55a8de4d8f87641dae777819458a2bf1bb02c438480ff11621ca8442ec2946875cce247c8877051359e9c822670d37bb00fa806e60e8e890ce62540fda2d5b1c790ca1e005030ac6d8e63db577bb98be111ee146828f9c48ee6257d7627b93ea3dd11aac3412e63dfc7ca132a73c4f51e7650f3f8ecf57bfc18716990b492d50e0a3e5fbf6136e771b91f7283ec3326209265b9531d157f8a07a4117fc8fb29ba1363afc6f9f0608251ea595256727a5bbe28f42a42edfbfa9017680e32980d4ad381612612b2bc7ad91e82eca693ea4fc27049a99636b50a576f1e55c72202d582b150ef194c1419f53177ecf315ea6b0e2f1aa8cd8f59b165aa0d89561c537fb6141f5813b7a4968fe16afc703326113f68508d88ff8d0aee1e88a84c0ae56c72f27511290ced48e93e8c95419d14aed1a5b2e9b2c9c1070c593e5eb50bb9a80e14e9f9fe501f56b1b3140159e8213b75d48d14af472a604484cd8e7e7abb6820245ed3ab29f9947463a033c586194be45eadec8392c8614d83a1e9ca0fe5655fa14f7a9c1d1f8f2185a06193ff4a3c3e9a96b02310033ceaa25894e7c56a6147e691597098054e285d39656d3d459ec5d13243c062b6eb44e19a13bdfc0b3c96bd3d1aeb75bb6b080322aea23555993cb529243958bb1a0e5d5027e6c78155437242d1d13c1d6e442a0e3783147a08bbfc0c2529fb705ad27713df40486fd58f001977f25dfd3c202451c07010a3880bca63959ca61f10ed3871f1152166fce2b52135718a8ceb239a0664a31c62defaad70be4b920dce70549c10d9138fbbad7f291c5b73fa21c3889929b143bc1576b72f70667ac11052b686891085290d871db528b5cfdc10a6d563925227609f10d1768a0e02dc7471ad424f94f737d4e7eb0fb167f1434fc4ae2d49e152f06f0845b6db0a44f0d6f5e7410420e6bd1f430b1af956005bf72b51405a04d9a5d9906ceca52c22c855785c3c3ac4c3e9bf532d31bab321e1db66f6a9f7dc9c017f2b7d8dfeb933cf5bbae71311ae318f6d187ebc5c843be342b08a9a0ff7c4b9c4b0f4fa74b13296afe84b6481440d58332e07b3d051ed55219d28e77af6612134da4431b797c63ef55bc53831e2f421db620fee51ba0967e4ed7009ef90af2204259bbfbb54537fd35c2132fa8e7f9c84bf9938d248862c6ca1cca9f48b0b33aa1589185c4eabc1c32";

        // Call the function with the test parameters
        let result = is_valid_solution_direct_input(n, k, block_header_hex, solution_hex);

        // Assert the expected outcome (here we assume the solution is valid)
        assert!(result.is_ok());
    }


    #[test]
    fn all_bits_matter() {
        // Initialize the state according to one of the valid test vectors.
        let n = 96;
        let k = 5;
        let input = b"Equihash is an asymmetric PoW based on the Generalised Birthday problem.";
        let nonce = [
            1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
            0, 0, 0,
        ];
        let soln = &[
            0x04, 0x6a, 0x8e, 0xd4, 0x51, 0xa2, 0x19, 0x73, 0x32, 0xe7, 0x1f, 0x39, 0xdb, 0x9c,
            0x79, 0xfb, 0xf9, 0x3f, 0xc1, 0x44, 0x3d, 0xa5, 0x8f, 0xb3, 0x8d, 0x05, 0x99, 0x17,
            0x21, 0x16, 0xd5, 0x55, 0xb1, 0xb2, 0x1f, 0x32, 0x70, 0x5c, 0xe9, 0x98, 0xf6, 0x0d,
            0xa8, 0x52, 0xf7, 0x7f, 0x0e, 0x7f, 0x4d, 0x63, 0xfc, 0x2d, 0xd2, 0x30, 0xa3, 0xd9,
            0x99, 0x53, 0xa0, 0x78, 0x7d, 0xfe, 0xfc, 0xab, 0x34, 0x1b, 0xde, 0xc8,
        ];

        // Prove that the solution is valid.
        is_valid_solution(n, k, input, &nonce, soln).unwrap();

        // Changing any single bit of the encoded solution should make it invalid.
        for i in 0..soln.len() * 8 {
            let mut mutated = soln.to_vec();
            mutated[i / 8] ^= 1 << (i % 8);
            is_valid_solution(n, k, input, &nonce, &mutated).unwrap_err();
        }
    }
}