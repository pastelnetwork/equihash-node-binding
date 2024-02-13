use neon::prelude::*;
mod verify;
mod test_vectors;
use verify::is_valid_solution_direct_input; // Ensure this is the function we are using now.

fn is_valid_solution_wrapper(mut cx: FunctionContext) -> JsResult<JsBoolean> {
    // Extract n and k parameters from JavaScript arguments.
    let n = cx.argument::<JsNumber>(0)?.value(&mut cx) as u32;
    let k = cx.argument::<JsNumber>(1)?.value(&mut cx) as u32;

    // Extract the block header and solution as hex strings from JavaScript arguments.
    let block_header_hex = cx.argument::<JsString>(2)?.value(&mut cx);
    let solution_hex = cx.argument::<JsString>(3)?.value(&mut cx);

    // Directly call the Rust is_valid_solution_direct_input function.
    let result = is_valid_solution_direct_input(n, k, &block_header_hex, &solution_hex);

    // Map the result to a JavaScript boolean value.
    match result {
        Ok(_) => Ok(cx.boolean(true)),
        Err(_) => Ok(cx.boolean(false)),
    }
}

// Register the module and export the is_valid_solution_wrapper function to JavaScript.
register_module!(mut m, {
    m.export_function("is_validSolution", is_valid_solution_wrapper)
});
