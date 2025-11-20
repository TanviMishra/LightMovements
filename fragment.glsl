precision mediump float;

uniform float u_time;
uniform vec2 u_resolution;

// Noise function for organic patterns
float noise(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

// Smooth noise
float smoothNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    
    float a = noise(i);
    float b = noise(i + vec2(1.0, 0.0));
    float c = noise(i + vec2(0.0, 1.0));
    float d = noise(i + vec2(1.0, 1.0));
    
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

// Fractal noise
float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;
    
    for (int i = 0; i < 4; i++) {
        value += amplitude * smoothNoise(p * frequency);
        frequency *= 2.0;
        amplitude *= 0.5;
    }
    
    return value;
}

// Dappled light pattern (like sunlight through leaves)
float dappledLight(vec2 uv) {
    vec2 p = uv * 8.0;
    p += vec2(u_time * 0.1, u_time * 0.15);
    
    float pattern = fbm(p);
    
    // Create circular dappled spots
    vec2 grid = floor(p);
    vec2 cell = fract(p) - 0.5;
    
    float dist = length(cell);
    float spot = smoothstep(0.4, 0.2, dist);
    
    // Combine with noise for organic variation
    float noiseValue = fbm(grid * 0.5 + u_time * 0.05);
    spot *= mix(0.3, 1.0, noiseValue);
    
    // Add movement
    spot *= 0.5 + 0.5 * sin(u_time * 0.5 + noiseValue * 10.0);
    
    return spot;
}

// Water glimmering effect
float waterGlimmer(vec2 uv) {
    // Create water-like waves
    vec2 p = uv;
    p.y += u_time * 0.2;
    
    // Wave distortion
    float wave = sin(p.y * 10.0 + u_time) * 0.02;
    p.x += wave;
    
    // Horizontal ripples
    float ripples = sin((p.y + u_time * 0.3) * 15.0) * 0.01;
    p.x += ripples;
    
    // Glimmer pattern - high frequency noise
    float glimmer = fbm(p * 50.0 + vec2(u_time * 2.0, 0.0));
    
    // Create bright spots that move
    float brightSpots = step(0.85, glimmer);
    
    // Add animated highlights
    float highlights = sin(p.x * 30.0 + u_time * 3.0) * 0.5 + 0.5;
    highlights = pow(highlights, 8.0);
    
    return brightSpots * 0.8 + highlights * 0.3;
}

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;
    
    // Adjust for portrait 2:1 aspect ratio
    uv.y *= 2.0;
    uv.y -= 0.5;
    
    // Base background (darker, like water or shadow)
    float base = 0.1;
    
    // Dappled light effect (upper portion)
    float dappled = dappledLight(uv);
    dappled *= smoothstep(0.6, 0.3, uv.y); // Fade out towards bottom
    
    // Water glimmer effect (lower portion)
    float glimmer = waterGlimmer(uv);
    glimmer *= smoothstep(0.4, 0.7, uv.y); // Fade in towards bottom
    
    // Combine effects
    float brightness = base + dappled * 0.6 + glimmer * 0.4;
    
    // Add some overall variation
    brightness += fbm(uv * 3.0 + u_time * 0.1) * 0.1;
    
    // Ensure values stay in range
    brightness = clamp(brightness, 0.0, 1.0);
    
    // Output greyscale
    gl_FragColor = vec4(brightness, brightness, brightness, 1.0);
}
