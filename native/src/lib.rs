use neon::prelude::*;
use neon::types::buffer::TypedArray;
use std::fs::File;
use std::io::Write;

mod verify;
mod test_vectors;

fn is_valid_solution_wrapper(mut cx: FunctionContext) -> JsResult<JsBoolean> {
    // Specify an absolute path for the debug file
    let mut file = File::create("/home/ubuntu/equihash-node-binding/debug_output.txt").expect("Unable to create debug file");

    let n = cx.argument::<JsNumber>(0)?.value(&mut cx) as u32;
    let k = cx.argument::<JsNumber>(1)?.value(&mut cx) as u32;

    writeln!(file, "n: {}, k: {}", n, k).expect("Unable to write to debug file");

    let input_handle = cx.argument::<JsBuffer>(2)?;
    let nonce_handle = cx.argument::<JsBuffer>(3)?;
    let soln_handle = cx.argument::<JsBuffer>(4)?;

    let input = input_handle.as_slice(&cx);
    let nonce = nonce_handle.as_slice(&cx);
    let soln = soln_handle.as_slice(&cx);

    writeln!(file, "input len: {}, nonce len: {}, soln len: {}", input.len(), nonce.len(), soln.len()).expect("Unable to write to debug file");

    let result = verify::is_valid_solution(n, k, &input.to_vec(), &nonce.to_vec(), soln);

    match &result {
        Ok(_) => writeln!(file, "Result: Ok").expect("Unable to write to debug file"),
        Err(e) => writeln!(file, "Result: Err({:?})", e).expect("Unable to write to debug file"),
    }

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
