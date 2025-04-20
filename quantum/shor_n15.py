import math
import numpy as np
from math import gcd, isqrt
from fractions import Fraction
from qiskit import QuantumCircuit, QuantumRegister, ClassicalRegister, transpile
from qiskit.circuit.library import QFT
import matplotlib.pyplot as plt
from qiskit_ibm_runtime import QiskitRuntimeService, SamplerV2 as Sampler
from qiskit.transpiler.preset_passmanagers import generate_preset_pass_manager
from qiskit.circuit import Gate
from qiskit_aer import AerSimulator # Import AerSimulator directly

# For Command Line Args, JSON output, Time, Exit codes
import argparse
import json
import time
import sys
import traceback # For detailed error logging

# --- Fixed Parameters ---
N = 15
# Using the specific base 'a' for which optimized circuits are available
a = 7
# Fixed qubit counts for N=15
n_work = 4
n_control = 4

# --- Helper Functions (Logging to stderr) ---
def log_stderr(*args, **kwargs):
    """Prints messages to stderr."""
    print(*args, file=sys.stderr, **kwargs)

# --- Optimized Modular Exponentiation for N=15, a=7 (as before) ---
# (Keeping the U_a_pow_mod15 function exactly as in the original script)
def U_a_pow_mod15(a, power, n_work):
    """Creates the gate U^(a^power) mod 15 on n_work qubits.
       Uses known optimized circuits for a=7, N=15."""
    if a not in [7]: # Restricting to a=7 as discussed
         log_stderr(f"ERROR: This script is hardcoded for a=7 with N=15.")
         raise ValueError(f"Optimized circuit for a={a} not implemented/selected.")
    if n_work != 4:
        raise ValueError("This implementation requires n_work=4 for N=15.")

    U = QuantumCircuit(n_work, name=f"U^{a}^{power}_mod15")
    k = (a**power) % 15 # The effective multiplication factor

    log_stderr(f"  Building gate for multiplication by {k} = ({a}^{power} mod 15)")

    # Specific implementations for a=7, N=15
    if k == 7: # U^1 = *7 mod 15
        U.swap(0, 1)
        U.swap(1, 2)
        U.swap(2, 3)
    elif k == 4: # U^2 = *7^2 = *49 = *4 mod 15
        U.swap(0, 2)
        U.swap(1, 3)
    elif k == 1: # U^4 = *7^4 = *1 mod 15 -> Identity
        pass
    elif k == 1: # U^8 = *7^8 = *1 mod 15 -> Identity
         pass

    return U.to_gate()

# --- Circuit Construction (as before, using log_stderr) ---
def build_shor_circuit_n15(n_control, n_work, a):
    """Builds the quantum circuit for Shor's algorithm for N=15, a=7."""
    log_stderr("Building Shor Circuit (N=15, a=7)...")
    ctrl = QuantumRegister(n_control, name='ctrl')
    work = QuantumRegister(n_work, name='work')
    creg = ClassicalRegister(n_control, name='c') # Measure control bits
    qc = QuantumCircuit(ctrl, work, creg)

    qc.x(work[0]) # Initialize work register to |1>
    qc.h(ctrl)    # Apply Hadamard gates to control register
    qc.barrier()

    log_stderr("Applying controlled modular exponentiation gates...")
    for k in range(n_control):
        power = 2**k
        try:
            U_gate = U_a_pow_mod15(a, power, n_work)
            if U_gate.definition.size() > 0:
                 C_U_gate = U_gate.control(1)
                 qc.append(C_U_gate, [ctrl[k]] + work[:])
                 log_stderr(f"    Applied c-{U_gate.name} controlled by ctrl[{k}]")
            else:
                 log_stderr(f"    Skipped c-{U_gate.name} (Identity) controlled by ctrl[{k}]")
        except ValueError as e:
            log_stderr(f"ERROR generating gate: {e}")
            raise # Re-raise the exception to be caught in main

    qc.barrier()
    log_stderr("Applying inverse QFT...")
    qft_inv = QFT(num_qubits=n_control, inverse=True, do_swaps=True, name="IQFT")
    qc.append(qft_inv.to_instruction(), ctrl)

    qc.barrier()
    qc.measure(ctrl, creg) # Measure control register into classical register
    log_stderr("Circuit construction complete.")
    return qc

# --- Classical Post-Processing (as before, using log_stderr) ---
def process_measurement(bitstr, t, a, N):
    """Processes the measurement result to find the period and factors."""
    y = int(bitstr, 2)
    log_stderr(f"\n--- Processing Measurement: {bitstr} (y = {y}) ---")

    if y == 0:
        log_stderr("Measured 0, cannot determine phase/period. Skipping.")
        return None, None

    phase = y / (2**t)
    log_stderr(f"Calculated phase = {phase:.6f} (y/2^t = {y}/2^{t})")

    try:
        frac = Fraction(phase).limit_denominator(N)
        r_candidate = frac.denominator
        s = frac.numerator
        log_stderr(f"Continued fraction approximation (limit N={N}) = {s}/{r_candidate}")
        log_stderr(f"Candidate period r = {r_candidate}")

        if r_candidate == 0:
             log_stderr("Candidate period is 0. Skipping.")
             return None, None

        if pow(a, r_candidate, N) != 1:
            log_stderr(f"Verification failed: {a}^{r_candidate} mod {N} != 1")
            # Try processing multiples of r? Sometimes needed. For N=15 usually not.
            # Example: Check 2*r, 3*r etc. up to a limit if needed.
            # For simplicity here, we stick to the direct result.
            return None, None
        else:
            log_stderr(f"Verification successful: {a}^{r_candidate} mod {N} == 1")

        if r_candidate % 2 != 0:
            log_stderr("Period r is odd. Cannot find non-trivial factors using this r.")
            return None, None

        term = pow(a, r_candidate // 2, N)
        if (term + 1) % N == 0:
            log_stderr(f"Found trivial factor case: {a}^({r_candidate}//2) = -1 mod {N}.")
            return None, None

        factor1 = gcd(term - 1, N)
        factor2 = gcd(term + 1, N)
        log_stderr(f"Potential factors: gcd({term}-1, {N}) = {factor1}, gcd({term}+1, {N}) = {factor2}")

        if factor1 != 1 and factor1 != N:
            log_stderr(f"Success! Non-trivial factor found: {factor1}")
            return factor1, N // factor1
        elif factor2 != 1 and factor2 != N:
            log_stderr(f"Success! Non-trivial factor found: {factor2}")
            return factor2, N // factor2
        else:
            log_stderr("Factors found are trivial (1 or N).")
            return None, None

    except Exception as e:
        log_stderr(f"Error during continued fraction processing for phase {phase}: {e}")
        log_stderr(traceback.format_exc())
        return None, None

# --- Get Backend Noise Properties ---
def get_backend_noise_metrics(backend):
    """Retrieve noise and error metrics from the backend if available."""
    log_stderr("\nRetrieving backend noise metrics...")
    metrics = {
        "gate_error": None,
        "readout_error": None,
        "t1_time": None,
        "t2_time": None,
        "quantum_volume": None
    }
    
    try:
        # Check if this is a hardware backend with properties
        if hasattr(backend, 'properties') and backend.properties():
            props = backend.properties()
            
            # Average gate error (focusing on CX gates as they're typically most error-prone)
            cx_gate_errors = []
            for gate_data in props.gates:
                if gate_data.gate == 'cx':
                    if hasattr(gate_data, 'parameters'):
                        for param in gate_data.parameters:
                            if param.name == 'gate_error':
                                cx_gate_errors.append(param.value)
            
            if cx_gate_errors:
                metrics["gate_error"] = sum(cx_gate_errors) / len(cx_gate_errors) * 100  # Convert to percentage
                log_stderr(f"Average CX gate error: {metrics['gate_error']:.4f}%")
            
            # Average readout error
            readout_errors = []
            for qubit in range(props.n_qubits):
                qubit_props = props.qubit_properties(qubit)
                if qubit_props:
                    for prop in qubit_props:
                        if prop.name == 'readout_error':
                            readout_errors.append(prop.value)
            
            if readout_errors:
                metrics["readout_error"] = sum(readout_errors) / len(readout_errors) * 100  # Convert to percentage
                log_stderr(f"Average readout error: {metrics['readout_error']:.4f}%")
            
            # Average T1 and T2 times
            t1_times = []
            t2_times = []
            for qubit in range(props.n_qubits):
                qubit_props = props.qubit_properties(qubit)
                if qubit_props:
                    t1 = next((prop.value for prop in qubit_props if prop.name == 'T1'), None)
                    t2 = next((prop.value for prop in qubit_props if prop.name == 'T2'), None)
                    
                    if t1 is not None:
                        t1_times.append(t1 * 1e6)  # Convert to microseconds
                    if t2 is not None:
                        t2_times.append(t2 * 1e6)  # Convert to microseconds
            
            if t1_times:
                metrics["t1_time"] = sum(t1_times) / len(t1_times)
                log_stderr(f"Average T1 time: {metrics['t1_time']:.2f} μs")
            
            if t2_times:
                metrics["t2_time"] = sum(t2_times) / len(t2_times)
                log_stderr(f"Average T2 time: {metrics['t2_time']:.2f} μs")
        
        # Try to get quantum volume from backend configuration
        if hasattr(backend, 'configuration'):
            config = backend.configuration()
            if hasattr(config, 'quantum_volume'):
                metrics["quantum_volume"] = config.quantum_volume
                log_stderr(f"Quantum Volume: {metrics['quantum_volume']}")
    
    except Exception as e:
        log_stderr(f"Error retrieving backend noise metrics: {e}")
        log_stderr(traceback.format_exc())
    
    return metrics

# --- Circuit Optimisation (returns metrics) ---
def optimize_circuit(qc, backend):
    """Optimize the circuit and return metrics."""
    log_stderr(f"\nOptimizing circuit for backend: {backend.name}...")
    target = backend.target
    pm = generate_preset_pass_manager(target=target, optimization_level=2)
    optimized_circuit = pm.run(qc)
    log_stderr("Optimization complete.")
    depth = 0
    cx_count = 0
    gate_count = 0
    try:
        depth = optimized_circuit.depth()
        ops = optimized_circuit.count_ops()
        cx_count = ops.get('cx', 0)
        gate_count = sum(ops.values())
        log_stderr(f"Optimized circuit depth: {depth}")
        log_stderr(f"Optimized CX gate count: {cx_count}")
        log_stderr(f"Optimized total gate count: {gate_count}")
    except Exception as e:
        log_stderr(f"Could not calculate depth/gate counts: {e}")
    return optimized_circuit, depth, cx_count, gate_count


# --- Execution on Hardware/Simulator (returns job_id, counts) ---
def run_circuit(qc, backend, shots):
    """Run the circuit using SamplerV2 primitive."""
    log_stderr(f"\nRunning circuit on backend: {backend.name} with {shots} shots.")
    sampler = Sampler(mode=backend)
    sampler.options.default_shots = shots

    job = sampler.run([qc])
    job_id = job.job_id()
    log_stderr(f"Job ID: {job_id}")
    log_stderr("Waiting for job to complete...")
    result = job.result()[0] # Waits for completion
    log_stderr("Job finished.")
    
    # Get QPU time if available
    qpu_time = None
    try:
        usage_data = job.usage_estimation
        if usage_data and 'quantum_seconds' in usage_data:
            qpu_time = usage_data['quantum_seconds']
            log_stderr(f"QPU time: {qpu_time} seconds")
    except Exception as e:
        log_stderr(f"Unable to retrieve QPU time: {e}")

    counts = {}
    # Extract counts robustly from SamplerV2 result
    data_container = None
    pub_result = result.data # Access the PubResult directly

    # SamplerV2 stores results per classical register. Ours is named 'c'.
    if hasattr(pub_result, 'c'):
        data_container = pub_result.c
        log_stderr("Extracting counts from data field: c")
    elif hasattr(pub_result, 'meas'): # Fallback check
         data_container = pub_result.meas
         log_stderr("Extracting counts from data field: meas")
    # Add more fallbacks if needed based on future Qiskit versions

    if data_container and hasattr(data_container, 'get_counts'):
        counts = data_container.get_counts()
    elif data_container and isinstance(data_container, dict): # Aer sometimes returns dict
         counts = data_container
    else:
        log_stderr("Warning: Could not extract counts from SamplerV2 result data structure.")
        log_stderr(f"Result data type: {type(pub_result)}")
        log_stderr(f"Result data content: {pub_result}")


    log_stderr("Measurement counts received.")
    return job_id, counts, qpu_time

# --- Plotting Function ---
def generate_plot(counts, n_control, a, N, backend_name, theme, plot_file_path):
    """Generates and saves the histogram plot."""
    log_stderr(f"\nGenerating plot ({theme} theme) to {plot_file_path}...")
    try:
        text_color = 'black' if theme == 'light' else 'white'
        bar_color = '#1976d2' # A common blue, works on light/dark
        expected_line_color = 'red'
        grid_color = '#cccccc' if theme == 'light' else '#555555'

        plt.style.use('seaborn-v0_8-darkgrid' if theme == 'dark' else 'seaborn-v0_8-whitegrid')
        fig, ax = plt.subplots(figsize=(10, 6))
        fig.patch.set_alpha(0.0) # Make figure background transparent
        ax.patch.set_alpha(0.0)  # Make axes background transparent


        int_counts = {int(k, 2): v for k, v in counts.items()}
        if not int_counts:
             log_stderr("No counts data to plot.")
             # Create an empty plot as placeholder? Or handle upstream.
             # For now, save an empty transparent plot
             plt.title("No Measurement Data Received", color=text_color)

        else:
             max_outcome = 2**n_control -1
             all_outcomes = range(max_outcome + 1)
             all_counts = [int_counts.get(i, 0) for i in all_outcomes]

             ax.bar(all_outcomes, all_counts, color=bar_color)
             ax.set_xlabel("Measurement Outcome (Integer)", color=text_color)
             ax.set_ylabel("Counts", color=text_color)
             ax.set_title(f"Shor's N={N} (a={a}) Results on {backend_name}", color=text_color)

             ax.tick_params(axis='x', colors=text_color)
             ax.tick_params(axis='y', colors=text_color)

             for spine in ax.spines.values():
                 spine.set_edgecolor(text_color)

             # Expected peaks for N=15, a=7 (r=4)
             period_r = 4 # Hardcoded for N=15, a=7
             expected_peaks = [s * (2**n_control // period_r) for s in range(period_r)]
             has_peaks = False
             for i, peak in enumerate(expected_peaks):
                  if peak != 0: # Don't label the peak at 0 usually
                      label = f"Expected Peak (y={peak})" if not has_peaks else ""
                      ax.axvline(x=peak, color=expected_line_color, linestyle='--', label=label)
                      has_peaks = True

             if has_peaks:
                 legend = ax.legend(loc='best')
                 plt.setp(legend.get_texts(), color=text_color)
                 legend.get_frame().set_alpha(0.5) # Slightly visible frame can help

             ax.grid(axis='y', linestyle='--', color=grid_color, alpha=0.7)
             ax.set_xticks(np.arange(0, 2**n_control, step=max(1, 2**n_control // 16))) # Adjust ticks


        # Save with transparent background
        plt.savefig(plot_file_path, transparent=True, dpi=150, bbox_inches='tight')
        plt.close(fig) # Close the plot figure
        log_stderr(f"Plot saved successfully to {plot_file_path}")
        return True
    except Exception as e:
        log_stderr(f"ERROR generating plot: {e}")
        log_stderr(traceback.format_exc())
        return False


# --- Main Execution ---
def main():
    parser = argparse.ArgumentParser(description="Run Shor's algorithm for N=15, a=7 using Qiskit.")
    parser.add_argument('--api_token', type=str, required=True, help='IBM Quantum API Token')
    parser.add_argument('--shots', type=int, default=4096, help='Number of shots to run (default: 4096)')
    parser.add_argument('--run_on_hardware', action='store_true', help='Run on real hardware instead of simulator')
    parser.add_argument('--plot_file', type=str, required=True, help='Path to save the output plot PNG file')
    parser.add_argument('--plot_theme', type=str, required=True, choices=['light', 'dark'], help='Plot theme (light or dark)')
    parser.add_argument('--output_json', type=str, required=True, help='Path to save the output JSON results file')
    args = parser.parse_args()

    results = {
        "status": "failure",
        "n_value": N,
        "a_value": a,
        "factors": None,
        "execution_time_sec": None,
        "qpu_time_sec": None,
        "circuit_depth": None,
        "cx_gate_count": None,
        "total_gate_count": None,
        "backend_used": None,
        "job_id": None,
        "shots": args.shots,
        "ran_on_hardware": args.run_on_hardware,
        "plot_file_path": None,
        "error_message": None,
        "raw_counts": None,
        # Add noise metrics to results
        "gate_error": None,
        "readout_error": None,
        "t1_time": None,
        "t2_time": None,
        "quantum_volume": None,
    }
    start_time = time.time()

    try:
        # --- Initial Checks (Classical) ---
        log_stderr(f"Attempting to factor N = {N} using base a = {a}")
        if N % 2 == 0 or isqrt(N)**2 == N or gcd(a, N) != 1:
             # Should not happen for N=15, a=7 but good practice
             results["error_message"] = "N=15, a=7 failed basic classical checks (should not happen)."
             raise ValueError(results["error_message"])
        log_stderr(f"N={N}, a={a} passed classical checks. Proceeding with quantum algorithm.")

        # --- Connect to IBM Quantum ---
        log_stderr("\nConnecting to IBM Quantum...")
        service = QiskitRuntimeService(channel="ibm_quantum", token=args.api_token)
        log_stderr("Connected.")

        # --- Select Backend ---
        backend = None
        if args.run_on_hardware:
            log_stderr("Selecting least busy real hardware backend...")
            try:
                # Ensure simulator=False and min_num_qubits requirement
                backend = service.least_busy(min_num_qubits=(n_control + n_work), operational=True, simulator=False)
                log_stderr(f"Selected real hardware backend: {backend.name}")
            except Exception as e:
                 results["error_message"] = f"Could not find suitable IBM hardware backend: {e}"
                 raise RuntimeError(results["error_message"])
        else:
            log_stderr("Selecting local Aer simulator...")
            try:
                 # Use default AerSimulator (most flexible)
                 backend = AerSimulator()
                 log_stderr(f"Selected backend: {backend.name}")
            except ImportError:
                 results["error_message"] = "qiskit-aer not installed. Cannot run simulator."
                 raise ImportError(results["error_message"])
            except Exception as e:
                 results["error_message"] = f"Failed to initialize AerSimulator: {e}"
                 raise RuntimeError(results["error_message"])

        results["backend_used"] = backend.name

        # --- Get Backend Noise Metrics (if hardware) ---
        if args.run_on_hardware:
            noise_metrics = get_backend_noise_metrics(backend)
            results["gate_error"] = noise_metrics["gate_error"]
            results["readout_error"] = noise_metrics["readout_error"]
            results["t1_time"] = noise_metrics["t1_time"]
            results["t2_time"] = noise_metrics["t2_time"]
            results["quantum_volume"] = noise_metrics["quantum_volume"]

        # --- Build Circuit ---
        qc = build_shor_circuit_n15(n_control, n_work, a)

        # --- Optimize Circuit ---
        qc_optimized, depth, cx_count, gate_count = optimize_circuit(qc, backend)
        results["circuit_depth"] = depth
        results["cx_gate_count"] = cx_count
        results["total_gate_count"] = gate_count

        # --- Run Circuit ---
        job_id, counts, qpu_time = run_circuit(qc_optimized, backend, args.shots)
        results["job_id"] = job_id
        results["raw_counts"] = counts # Include raw counts in JSON
        results["qpu_time_sec"] = qpu_time  # Add QPU time to results

        # --- Plot Results ---
        plot_success = generate_plot(counts, n_control, a, N, backend.name, args.plot_theme, args.plot_file)
        if plot_success:
            results["plot_file_path"] = args.plot_file
        else:
            results["error_message"] = (results.get("error_message") or "") + " Failed to generate plot."
            # Continue processing results even if plot fails

        # --- Process Measurements ---
        log_stderr("\n--- Factor Finding ---")
        log_stderr(f"Expected peaks near multiples of 2^{n_control}/4 = {2**n_control // 4}")

        if not counts:
            results["error_message"] = (results.get("error_message") or "") + " No measurement counts received."
            raise ValueError("No measurement counts received.")

        # Sort counts by frequency
        sorted_counts = sorted(counts.items(), key=lambda item: item[1], reverse=True)
        factors_found = False
        successful_bitstr = None

        for bitstr, count in sorted_counts: # Process all results or top N
            log_stderr(f"\nTrying measurement outcome: {bitstr} (Counts: {count})")
            factor1, factor2 = process_measurement(bitstr, n_control, a, N)
            if factor1 is not None and factor2 is not None:
                results["factors"] = sorted([factor1, factor2])
                results["status"] = "success"
                factors_found = True
                successful_bitstr = bitstr
                log_stderr(f"Factors {factor1}, {factor2} found from bitstring {bitstr}.")
                break # Stop after finding the first valid factors

        if factors_found:
             log_stderr(f"\n====================================")
             log_stderr(f"Successfully factored N={N} into {results['factors'][0]} and {results['factors'][1]}")
             log_stderr(f"Using measurement result {successful_bitstr}.")
             log_stderr(f"====================================")
        else:
             results["error_message"] = (results.get("error_message") or "") + " Failed to find non-trivial factors from measurements."
             log_stderr("\n------------------------------------")
             log_stderr(f"Failed to find factors for N={N} with a={a}.")
             log_stderr("Check histogram plot and logs. Possible reasons: noise, insufficient shots, unlucky results.")
             log_stderr("------------------------------------")
             # Keep status as "failure"

    except Exception as e:
        log_stderr(f"\n--- SCRIPT ERROR ---")
        log_stderr(f"An error occurred: {e}")
        log_stderr(traceback.format_exc()) # Log full traceback to stderr
        if results["error_message"] is None: # Set error message if not already set
             results["error_message"] = f"An unexpected error occurred: {str(e)}"
        results["status"] = "failure"
        # Ensure factors are None if status is failure
        results["factors"] = None

    finally:
        end_time = time.time()
        results["execution_time_sec"] = round(end_time - start_time, 2)

        # --- Write JSON Output ---
        log_stderr(f"\nWriting results to {args.output_json}")
        try:
            with open(args.output_json, 'w') as f:
                json.dump(results, f, indent=4)
            log_stderr("JSON results saved successfully.")
        except Exception as e:
            log_stderr(f"ERROR: Failed to write JSON results to {args.output_json}: {e}")
            # If JSON writing fails, we can't communicate results back easily
            # Print results to stderr as a last resort?
            print(json.dumps(results, indent=4), file=sys.stderr)
            # Exit with error code even if factors were found, because output failed
            sys.exit(1)

        # --- Exit with appropriate code ---
        if results["status"] == "success":
             log_stderr("Exiting with status code 0 (Success).")
             sys.exit(0)
        else:
             log_stderr(f"Exiting with status code 1 (Failure: {results.get('error_message', 'Unknown error')}).")
             sys.exit(1)


if __name__ == '__main__':
    main()