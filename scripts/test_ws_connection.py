import asyncio
import websockets
import json
import logging
import math
import struct

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("WS_Test")

def generate_sine_wave(duration_ms, freq=440, rate=24000):
    audio = b""
    num_samples = int((duration_ms / 1000.0) * rate)
    for i in range(num_samples):
        # Sine wave
        value = int(32767.0 * math.sin(2.0 * math.pi * freq * i / rate))
        audio += struct.pack('<h', value)
    return audio

async def test_connect():
    uri = "ws://127.0.0.1:8000/websocket/offer"
    # Match origin to allow
    origin = "http://localhost:5173"
    
    logger.info(f"Connecting to {uri}...")
    try:
        async with websockets.connect(uri, origin=origin) as websocket:
            logger.info("Connected! Sending audio...")
            
            # Send 2 seconds of audio (should trigger VAD speech)
            chunk_size = 4096 # bytes
            audio = generate_sine_wave(2000) # 2s
            
            # Send in chunks
            for i in range(0, len(audio), chunk_size):
                chunk = audio[i:i+chunk_size]
                await websocket.send(chunk)
                await asyncio.sleep(0.01) # Simulate real-time
            
            logger.info("Sent speech. Now sending silence to trigger VAD pause...")
            
            # Send 1s silence
            silence = b'\x00' * (24000 * 2) # 1s of 16-bit
            for i in range(0, len(silence), chunk_size):
                 chunk = silence[i:i+chunk_size]
                 await websocket.send(chunk)
                 await asyncio.sleep(0.01)
                 
            logger.info("Waiting for response...")
            while True:
                try:
                    msg = await asyncio.wait_for(websocket.recv(), timeout=10.0)
                    logger.info(f"Received: {len(msg)} bytes" if isinstance(msg, bytes) else f"Received: {msg}")
                    # If we receive bytes, it works!
                    break
                except asyncio.TimeoutError:
                    logger.info("Timeout waiting for response.")
                    break
            
    except Exception as e:
        logger.error(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_connect())
