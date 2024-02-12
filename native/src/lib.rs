use neon::prelude::*;
use neon::types::buffer::TypedArray;
use verify::is_valid_solution;
mod verify;
mod test_vectors;

fn is_valid_solution_wrapper(mut cx: FunctionContext) -> JsResult<JsBoolean> {
    // Extract arguments from JavaScript
    let n = cx.argument::<JsNumber>(0)?.value(&mut cx) as u32;
    let k = cx.argument::<JsNumber>(1)?.value(&mut cx) as u32;

    // Bind the JsBuffer arguments to variables to extend their lifetimes
    let input_buffer = cx.argument::<JsBuffer>(2)?;
    let nonce_buffer = cx.argument::<JsBuffer>(3)?;
    let soln_buffer = cx.argument::<JsBuffer>(4)?;

    // Convert JsBuffer to &[u8] slices
    let input = input_buffer.as_slice(&cx);
    let nonce = nonce_buffer.as_slice(&cx);
    let soln_bytes = soln_buffer.as_slice(&cx);


    // Directly call the Rust is_valid_solution function with the solution bytes
    let result = is_valid_solution(n, k, input, nonce, soln_bytes);

    // Map the result to a JavaScript boolean
    match result {
        Ok(_) => Ok(cx.boolean(true)),
        Err(_) => Ok(cx.boolean(false)),
    }
}

// Register the module and export the is_valid_solution function to JS
register_module!(mut m, {
    m.export_function("is_validSolution", is_valid_solution_wrapper)
});
