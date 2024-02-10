use neon::prelude::*;
use neon::types::buffer::TypedArray;

mod verify;
mod test_vectors;

fn is_valid_solution_wrapper(mut cx: FunctionContext) -> JsResult<JsBoolean> {
    let n = cx.argument::<JsNumber>(0)?.value(&mut cx) as u32;
    let k = cx.argument::<JsNumber>(1)?.value(&mut cx) as u32;

    // Bind the JsBuffer handles to variables to extend their lifetimes
    let input_handle = cx.argument::<JsBuffer>(2)?;
    let nonce_handle = cx.argument::<JsBuffer>(3)?;
    let soln_handle = cx.argument::<JsBuffer>(4)?;

    // Now get slices from these handles
    let input = input_handle.as_slice(&cx);
    let nonce = nonce_handle.as_slice(&cx);
    let soln = soln_handle.as_slice(&cx);

    // Convert slices to Vec<u8> as before
    let input_vec = input.to_vec();
    let nonce_vec = nonce.to_vec();
    let soln_vec = soln.to_vec();

    // Call the original Rust function
    let result = verify::is_valid_solution(n, k, &input_vec, &nonce_vec, &soln_vec);

    // Convert the result to a JavaScript boolean
    match result {
        Ok(_) => Ok(cx.boolean(true)),
        Err(_) => Ok(cx.boolean(false)),
    }
}

#[neon::main]
fn main(mut cx: ModuleContext) -> NeonResult<()> {
    cx.export_function("is_valid_solution", is_valid_solution_wrapper)?;
    Ok(())
}
