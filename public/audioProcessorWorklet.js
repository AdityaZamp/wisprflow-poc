//@eslint-disable
class AudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.port.onmessage = (event) => {
      if (event.data.type === "setSampleRate") {
        this.targetSampleRate = event.data.sampleRate;
        this.bufferSize = event.data.bufferSize;
        this.port.postMessage({ type: "ready" });
      }
    };
    this.buffer = [];
  }

  process(inputs, outputs, parameters) {
    const inputData = inputs[0][0];

    // Convert to Float32Array if needed
    const floatData = new Float32Array(inputData);
    this.buffer.push(...floatData);

    // Send data when we have enough samples
    if (this.buffer.length >= this.bufferSize) {
      const chunk = new Float32Array(this.buffer.slice(0, this.bufferSize));
      this.port.postMessage({
        type: "audioData",
        data: chunk,
      });
      this.buffer = this.buffer.slice(this.bufferSize);
    }
    return true;
  }
}

registerProcessor("audioProcessorWorklet", AudioProcessor);
