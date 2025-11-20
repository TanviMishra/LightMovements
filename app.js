// WebGL setup and shader management
class LightMovements {
    constructor() {
        this.canvas = document.getElementById('canvas');
        this.gl = this.canvas.getContext('webgl');
        
        if (!this.gl) {
            console.error('WebGL not supported');
            return;
        }
        
        // Set canvas size for portrait 2:1 aspect ratio
        this.canvas.width = 400;
        this.canvas.height = 800;
        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        
        this.time = 0;
        this.mode = 0; // 0 = river, 1 = dappled light
        
        // Corner positions (normalized 0-1, relative to canvas)
        // Order: top-left, top-right, bottom-right, bottom-left
        this.corners = [
            { x: 0.0, y: 0.0 }, // top-left
            { x: 1.0, y: 0.0 }, // top-right
            { x: 1.0, y: 1.0 }, // bottom-right
            { x: 0.0, y: 1.0 }  // bottom-left
        ];
        
        this.draggingCorner = null;
        this.init();
        this.setupControls();
        this.setupCornerHandles();
    }
    
    setupControls() {
        // Add mode indicator
        const indicator = document.createElement('div');
        indicator.id = 'mode-indicator';
        indicator.style.cssText = `
            position: fixed;
            top: 20px;
            left: 20px;
            color: white;
            font-family: Arial, sans-serif;
            font-size: 14px;
            background: rgba(0,0,0,0.5);
            padding: 10px;
            border-radius: 5px;
            pointer-events: none;
            z-index: 1000;
        `;
        // document.body.appendChild(indicator);
        
        // Update indicator text
        const updateIndicator = () => {
            indicator.textContent = `Mode: ${this.mode === 0 ? 'River' : 'Dappled Light'} (Press SPACE or click to toggle)`;
        };
        
        // Toggle mode with spacebar or click
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
                this.mode = 1 - this.mode;
                updateIndicator();
            }
        });
        
        // Also allow clicking canvas to toggle
        this.canvas.addEventListener('click', () => {
            this.mode = 1 - this.mode;
            updateIndicator();
        });
        
        updateIndicator();
    }
    
    setupCornerHandles() {
        // Create container for corner handles
        const handleContainer = document.createElement('div');
        handleContainer.id = 'corner-handles';
        handleContainer.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 100;
        `;
        document.body.appendChild(handleContainer);
        
        // Create handles for each corner
        this.handles = [];
        const cornerNames = ['TL', 'TR', 'BR', 'BL'];
        const cornerPositions = [
            { x: 0, y: 0 },      // top-left
            { x: 1, y: 0 },      // top-right
            { x: 1, y: 1 },      // bottom-right
            { x: 0, y: 1 }       // bottom-left
        ];
        
        cornerNames.forEach((name, index) => {
            const handle = document.createElement('div');
            handle.className = 'corner-handle';
            handle.dataset.cornerIndex = index;
            handle.style.cssText = `
                position: absolute;
                width: 20px;
                height: 20px;
                background: rgba(255, 255, 255, 0.8);
                border: 2px solid #fff;
                border-radius: 50%;
                cursor: move;
                pointer-events: all;
                transform: translate(-50%, -50%);
                transition: background 0.2s;
            `;
            handle.addEventListener('mouseenter', () => {
                handle.style.background = 'rgba(255, 255, 255, 1.0)';
                handle.style.transform = 'translate(-50%, -50%) scale(1.2)';
            });
            handle.addEventListener('mouseleave', () => {
                handle.style.background = 'rgba(255, 255, 255, 0.8)';
                handle.style.transform = 'translate(-50%, -50%) scale(1.0)';
            });
            
            handleContainer.appendChild(handle);
            this.handles.push(handle);
            this.updateHandlePosition(index);
        });
        
        // Mouse/touch event handlers
        const getCanvasPos = (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = (e.clientX || e.touches[0].clientX) - rect.left;
            const y = (e.clientY || e.touches[0].clientY) - rect.top;
            return {
                x: x / rect.width,
                y: y / rect.height
            };
        };
        
        const startDrag = (e, cornerIndex) => {
            e.preventDefault();
            this.draggingCorner = cornerIndex;
            document.addEventListener('mousemove', onDrag);
            document.addEventListener('mouseup', endDrag);
            document.addEventListener('touchmove', onDrag);
            document.addEventListener('touchend', endDrag);
        };
        
        const onDrag = (e) => {
            if (this.draggingCorner === null) return;
            e.preventDefault();
            const pos = getCanvasPos(e);
            this.corners[this.draggingCorner].x = Math.max(0, Math.min(1, pos.x));
            this.corners[this.draggingCorner].y = Math.max(0, Math.min(1, pos.y));
            this.updateHandlePosition(this.draggingCorner);
        };
        
        const endDrag = (e) => {
            this.draggingCorner = null;
            document.removeEventListener('mousemove', onDrag);
            document.removeEventListener('mouseup', endDrag);
            document.removeEventListener('touchmove', onDrag);
            document.removeEventListener('touchend', endDrag);
        };
        
        // Attach drag handlers to each handle
        this.handles.forEach((handle, index) => {
            handle.addEventListener('mousedown', (e) => startDrag(e, index));
            handle.addEventListener('touchstart', (e) => startDrag(e, index));
        });
        
        // Update handle positions on window resize
        window.addEventListener('resize', () => {
            if (this.handles) {
                this.handles.forEach((handle, index) => {
                    this.updateHandlePosition(index);
                });
            }
        });
    }
    
    updateHandlePosition(cornerIndex) {
        const handle = this.handles[cornerIndex];
        const corner = this.corners[cornerIndex];
        const rect = this.canvas.getBoundingClientRect();
        
        handle.style.left = (rect.left + corner.x * rect.width) + 'px';
        handle.style.top = (rect.top + corner.y * rect.height) + 'px';
    }
    
    init() {
        // Shader sources embedded directly
        const vertexShaderSource = `
            attribute vec2 a_position;
            
            uniform vec2 u_cornerTL; // top-left corner (0-1)
            uniform vec2 u_cornerTR; // top-right corner (0-1)
            uniform vec2 u_cornerBR; // bottom-right corner (0-1)
            uniform vec2 u_cornerBL; // bottom-left corner (0-1)

            void main() {
                // a_position: (-1,-1) = BL, (1,-1) = BR, (-1,1) = TL, (1,1) = TR
                vec2 pos = a_position;
                
                // Convert from clip space to 0-1 range
                vec2 uv = (pos + 1.0) * 0.5;
                
                // Convert corners from 0-1 to clip space (-1 to 1)
                // Note: corner positions are in screen coords (y=0 at top), but clip space has y=-1 at bottom
                // So we need to flip Y: screen y=0 -> clip y=1, screen y=1 -> clip y=-1
                vec2 cornerTL = vec2(u_cornerTL.x * 2.0 - 1.0, (1.0 - u_cornerTL.y) * 2.0 - 1.0);
                vec2 cornerTR = vec2(u_cornerTR.x * 2.0 - 1.0, (1.0 - u_cornerTR.y) * 2.0 - 1.0);
                vec2 cornerBR = vec2(u_cornerBR.x * 2.0 - 1.0, (1.0 - u_cornerBR.y) * 2.0 - 1.0);
                vec2 cornerBL = vec2(u_cornerBL.x * 2.0 - 1.0, (1.0 - u_cornerBL.y) * 2.0 - 1.0);
                
                // Bilinear interpolation between corners in clip space
                // uv.y: 0 = bottom, 1 = top (in clip space)
                vec2 top = mix(cornerTL, cornerTR, uv.x);
                vec2 bottom = mix(cornerBL, cornerBR, uv.x);
                vec2 warpedPos = mix(bottom, top, uv.y);
                
                gl_Position = vec4(warpedPos, 0.0, 1.0);
            }
        `;
        
        const fragmentShaderSource = `
            precision mediump float;

            uniform float u_time;
            uniform vec2 u_resolution;
            uniform float u_mode; // 0 = river, 1 = dappled light

            // Noise function for organic patterns
            float hash(vec2 p) {
                return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
            }

            // Smooth noise
            float smoothNoise(vec2 p) {
                vec2 i = floor(p);
                vec2 f = fract(p);
                f = f * f * (3.0 - 2.0 * f);
                
                float a = hash(i);
                float b = hash(i + vec2(1.0, 0.0));
                float c = hash(i + vec2(0.0, 1.0));
                float d = hash(i + vec2(1.0, 1.0));
                
                return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
            }

            // Fractal Brownian Motion
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

            // Calculate wave height field - waves moving left to right
            float waveHeight(vec2 uv) {
                // Primary waves moving horizontally (chunkier - lower frequency)
                float wave1 = sin(uv.y * 5.0 - u_time * 0.8) * 0.5;
                float wave2 = sin(uv.y * 7.0 + uv.x * 1.5 - u_time * 0.6) * 0.3;
                float wave3 = sin(uv.y * 4.0 - uv.x * 1.0 - u_time * 1.0) * 0.4;
                
                // Chunkier ripples - lower frequency for thicker strokes
                float ripple1 = sin(uv.y * 12.0 - u_time * 1.2) * 0.15;
                float ripple2 = sin(uv.y * 15.0 + uv.x * 2.0 - u_time * 1.5) * 0.12;
                float ripple3 = sin(uv.y * 18.0 - uv.x * 1.8 - u_time * 1.8) * 0.1;
                
                // Medium ripples for texture (chunkier)
                float mediumRipples = sin(uv.y * 22.0 + uv.x * 3.0 - u_time * 2.0) * 0.08;
                
                // Add noise-based waves for organic variation (slower)
                float noiseWave = fbm(uv * 2.5 + vec2(u_time * 0.2, 0.0)) * 0.2;
                
                // Combine waves and ripples
                return wave1 + wave2 + wave3 + ripple1 + ripple2 + ripple3 + mediumRipples + noiseWave;
            }

            // Calculate wave normal (for light reflection)
            vec2 waveNormal(vec2 uv, float eps) {
                float hL = waveHeight(uv - vec2(eps, 0.0));
                float hR = waveHeight(uv + vec2(eps, 0.0));
                float hD = waveHeight(uv - vec2(0.0, eps));
                float hU = waveHeight(uv + vec2(0.0, eps));
                
                float dx = (hR - hL) / (2.0 * eps);
                float dy = (hU - hD) / (2.0 * eps);
                
                return normalize(vec2(-dx, -dy));
            }

            // Diamond-shaped sparkle (not star-like)
            float diamondSparkle(vec2 p, vec2 center, float intensity, float time, float size) {
                vec2 d = p - center;
                
                // Scale by size variation
                d /= size;
                
                // Create diamond shape using rotated square
                float angle = atan(d.y, d.x) + 0.785; // Rotate 45 degrees
                float dist = length(d);
                
                // Diamond shape: max of rotated x and y
                float rotatedX = abs(cos(angle) * d.x - sin(angle) * d.y);
                float rotatedY = abs(sin(angle) * d.x + cos(angle) * d.y);
                float diamond = max(rotatedX, rotatedY);
                
                // Core bright center
                float core = 1.0 - smoothstep(0.0, 0.01 * size, dist);
                core *= intensity;
                
                // Diamond shape falloff
                float diamondShape = 1.0 - smoothstep(0.0, 0.08 * size, diamond);
                diamondShape = pow(diamondShape, 0.8); // Slightly softer edges
                
                // Outer glow
                float glow = 1.0 - smoothstep(0.05 * size, 0.15 * size, dist);
                glow *= 0.15;
                
                return (core + diamondShape * 0.9 + glow) * intensity;
            }

            // Dappled light through trees (gentle swaying)
            float dappledLightPattern(vec2 uv, float time) {
                // Gentle swaying motion
                float swayX = sin(time * 0.3) * 0.02;
                float swayY = cos(time * 0.25) * 0.015;
                
                // Create organic dappled light patches
                vec2 p = uv * 6.0;
                p += vec2(swayX, swayY) * 6.0; // Apply gentle sway
                
                // Multiple layers of light patches at different scales
                float patches = 0.0;
                
                // Large patches
                float large = fbm(p * 0.8 + vec2(time * 0.05, 0.0));
                large = smoothstep(0.4, 0.7, large);
                
                // Medium patches
                float medium = fbm(p * 1.5 + vec2(time * 0.08, time * 0.06));
                medium = smoothstep(0.45, 0.75, medium);
                
                // Small patches
                float small = fbm(p * 3.0 + vec2(time * 0.1, time * 0.08));
                small = smoothstep(0.5, 0.8, small);
                
                // Combine patches
                patches = max(large, max(medium * 0.8, small * 0.6));
                
                // Add gentle movement to patches
                patches *= 0.7 + 0.3 * sin(time * 0.4 + p.x * 2.0 + p.y * 1.5);
                
                return patches;
            }

            void main() {
                vec2 uv = gl_FragCoord.xy / u_resolution.xy;
                
                // Adjust for portrait 2:1 aspect ratio
                uv.y *= 2.0;
                uv.y -= 0.5;
                
                float brightness = 0.0;
                
                if (u_mode < 0.5) {
                    // RIVER MODE
                    // Scale UV for wave frequency
                    vec2 waveUV = uv * vec2(1.5, 3.0);
                    
                    // Calculate wave height
                    float height = waveHeight(waveUV);
                    
                    // Calculate wave normal
                    float eps = 0.01;
                    vec2 normal = waveNormal(waveUV, eps);
                    
                    // Light direction (moving smoothly and continuously)
                    float lightSpeed = 0.08;
                    float lightX = sin(u_time * lightSpeed) * 0.9;
                    vec2 lightDir = normalize(vec2(lightX, 0.3));
                    
                    // Calculate how much light catches on the wave
                    float lightCatch = dot(normal, lightDir);
                    lightCatch = max(0.0, lightCatch);
                    lightCatch = pow(lightCatch, 0.5);
                    
                    // Detect wave crests
                    float crest = smoothstep(0.3, 0.7, height);
                    
                    // Light intensity
                    float lightIntensity = lightCatch * crest;
                    
                    // Specular highlights
                    vec2 viewDir = vec2(0.0, 1.0);
                    vec2 reflectDir = reflect(-lightDir, normal);
                    float specular = pow(max(0.0, dot(viewDir, reflectDir)), 32.0);
                    
                    // Combine light effects
                    brightness = 0.08; // Base dark water
                    brightness += lightIntensity * 0.7;
                    brightness += specular * 0.5;
                    
                    // Wave shadowing
                    float shadow = smoothstep(-0.5, 0.5, height) * 0.1;
                    brightness -= shadow;
                    
                    // Texture variation
                    float texture = fbm(waveUV * 5.0) * 0.05;
                    brightness += texture;
                    
                    // Create wavy line pattern (top to bottom) for sparkle concentration
                    // Calculate distance from wavy line
                    float wavyLineX = sin(uv.y * 4.0 + u_time * 0.5) * 0.15 + 
                                      sin(uv.y * 7.0 + u_time * 0.3) * 0.08 +
                                      sin(uv.y * 11.0 + u_time * 0.7) * 0.05;
                    wavyLineX += 0.5; // Center around middle
                    
                    // Distance from current x position to wavy line
                    float distToLine = abs(uv.x - wavyLineX);
                    
                    // Concentration factor - stronger near the line
                    float concentration = 1.0 - smoothstep(0.0, 0.25, distToLine);
                    concentration = pow(concentration, 0.5); // Sharper falloff
                    
                    // Add glimmering/twinkling diamond sparkles (using dappled light approach, concentrated along wavy line)
                    float glimmer = 0.0;
                    vec2 sparkleUV = uv * 25.0;
                    
                    for (int layer = 0; layer < 2; layer++) {
                        float layerScale = 20.0 + float(layer) * 15.0;
                        vec2 layerUV = sparkleUV * (layerScale / 25.0);
                        layerUV += vec2(sin(u_time * 0.2 + float(layer)), cos(u_time * 0.15 + float(layer))) * 0.5;
                        
                        vec2 grid = floor(layerUV);
                        vec2 cell = fract(layerUV);
                        
                        float cellHash = hash(grid + vec2(float(layer) * 23.7));
                        
                        // Get world position to check distance to wavy line
                        vec2 worldPos = (grid + vec2(0.5)) / (layerScale / 25.0);
                        vec2 worldUV = worldPos / vec2(1.5, 3.0);
                        worldUV.y = (worldUV.y + 0.5) / 2.0; // Convert back to 0-1 range
                        
                        // Calculate distance to wavy line at this y position
                        float lineXAtY = sin(worldUV.y * 4.0 + u_time * 0.5) * 0.15 + 
                                         sin(worldUV.y * 7.0 + u_time * 0.3) * 0.08 +
                                         sin(worldUV.y * 11.0 + u_time * 0.7) * 0.05;
                        lineXAtY += 0.5;
                        float distToLineAtY = abs(worldUV.x - lineXAtY);
                        float localConcentration = 1.0 - smoothstep(0.0, 0.04, distToLineAtY); // Very tight around line
                        localConcentration = pow(localConcentration, 0.5); // Very sharp falloff
                        
                        // Only allow sparkles very close to the line - much higher threshold
                        float baseThreshold = 0.98 + float(layer) * 0.005; // Very high base threshold
                        float adjustedThreshold = mix(baseThreshold, 0.94, localConcentration); // Only lower near line
                        
                        // Sparkles appear only very close to wavy line
                        if (cellHash > adjustedThreshold && localConcentration > 0.3) {
                            vec2 center = grid + vec2(0.5) + (cellHash - 0.5) * 0.3;
                            
                            float sparkleSize = 0.6 + cellHash * 0.7; // Smaller size, no multiplier
                            
                            float twinklePhase = cellHash * 6.28318;
                            float twinkleSpeed = 2.0 + cellHash * 1.5;
                            float twinkle = sin(u_time * twinkleSpeed + twinklePhase) * 0.5 + 0.5;
                            twinkle = 0.4 + twinkle * 0.6;
                            
                            float star = diamondSparkle(layerUV, center, 1.0, u_time, sparkleSize);
                            
                            float intensity = 0.6 + cellHash * 0.4;
                            intensity *= twinkle;
                            intensity *= (0.9 + localConcentration * 0.3); // Brighter near line
                            
                            glimmer += star * intensity;
                        }
                    }
                    
                    brightness += glimmer * 1.0;
                    
                } else {
                    // DAPPLED LIGHT MODE
                    // Base dark ground
                    brightness = 0.12;
                    
                    // Add texture to ground
                    float groundTexture = fbm(uv * 8.0) * 0.08;
                    brightness += groundTexture;
                    
                    // Create dappled light patches with gentle swaying
                    float dappled = dappledLightPattern(uv, u_time);
                    
                    // Add diamond sparkles in the light patches
                    float sparkles = 0.0;
                    vec2 sparkleUV = uv * 25.0;
                    
                    for (int layer = 0; layer < 2; layer++) {
                        float layerScale = 20.0 + float(layer) * 15.0;
                        vec2 layerUV = sparkleUV * (layerScale / 25.0);
                        layerUV += vec2(sin(u_time * 0.2 + float(layer)), cos(u_time * 0.15 + float(layer))) * 0.5;
                        
                        vec2 grid = floor(layerUV);
                        vec2 cell = fract(layerUV);
                        
                        float cellHash = hash(grid + vec2(float(layer) * 23.7));
                        
                        // Sparkles appear in light patches
                        if (cellHash > 0.75 && dappled > 0.3) {
                            vec2 center = grid + vec2(0.5) + (cellHash - 0.5) * 0.3;
                            
                            float sparkleSize = 0.8 + cellHash * 1.0;
                            
                            float twinklePhase = cellHash * 6.28318;
                            float twinkleSpeed = 2.0 + cellHash * 1.5;
                            float twinkle = sin(u_time * twinkleSpeed + twinklePhase) * 0.5 + 0.5;
                            twinkle = 0.4 + twinkle * 0.6;
                            
                            float star = diamondSparkle(layerUV, center, 1.0, u_time, sparkleSize);
                            
                            float intensity = 0.6 + cellHash * 0.4;
                            intensity *= twinkle;
                            intensity *= dappled; // Brighter in light patches
                            
                            sparkles += star * intensity;
                        }
                    }
                    
                    // Combine dappled light and sparkles
                    brightness += dappled * 0.7;
                    brightness += sparkles * 0.8;
                }
                
                // Ensure values stay in range
                brightness = clamp(brightness, 0.0, 1.0);
                
                // Output greyscale
                gl_FragColor = vec4(brightness, brightness, brightness, 1.0);
            }
        `;
        
        // Create shaders
        const vertexShader = this.createShader(this.gl.VERTEX_SHADER, vertexShaderSource);
        const fragmentShader = this.createShader(this.gl.FRAGMENT_SHADER, fragmentShaderSource);
        
        // Create program
        this.program = this.createProgram(vertexShader, fragmentShader);
        
        // Setup geometry (full-screen quad)
        this.setupGeometry();
        
        // Start animation loop
        this.animate();
    }
    
    createShader(type, source) {
        const shader = this.gl.createShader(type);
        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);
        
        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            console.error('Shader compilation error:', this.gl.getShaderInfoLog(shader));
            this.gl.deleteShader(shader);
            return null;
        }
        
        return shader;
    }
    
    createProgram(vertexShader, fragmentShader) {
        const program = this.gl.createProgram();
        this.gl.attachShader(program, vertexShader);
        this.gl.attachShader(program, fragmentShader);
        this.gl.linkProgram(program);
        
        if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
            console.error('Program linking error:', this.gl.getProgramInfoLog(program));
            this.gl.deleteProgram(program);
            return null;
        }
        
        return program;
    }
    
    setupGeometry() {
        // Full-screen quad vertices
        const positions = new Float32Array([
            -1, -1,
             1, -1,
            -1,  1,
            -1,  1,
             1, -1,
             1,  1,
        ]);
        
        const positionBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, positionBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, positions, this.gl.STATIC_DRAW);
        
        const positionLocation = this.gl.getAttribLocation(this.program, 'a_position');
        this.gl.enableVertexAttribArray(positionLocation);
        this.gl.vertexAttribPointer(positionLocation, 2, this.gl.FLOAT, false, 0, 0);
    }
    
    animate() {
        this.time += 0.016; // ~60fps
        
        this.gl.useProgram(this.program);
        
        // Set uniforms
        const timeLocation = this.gl.getUniformLocation(this.program, 'u_time');
        this.gl.uniform1f(timeLocation, this.time);
        
        const resolutionLocation = this.gl.getUniformLocation(this.program, 'u_resolution');
        this.gl.uniform2f(resolutionLocation, this.canvas.width, this.canvas.height);
        
        const modeLocation = this.gl.getUniformLocation(this.program, 'u_mode');
        this.gl.uniform1f(modeLocation, this.mode);
        
        // Set corner positions
        const cornerTLLocation = this.gl.getUniformLocation(this.program, 'u_cornerTL');
        this.gl.uniform2f(cornerTLLocation, this.corners[0].x, this.corners[0].y);
        
        const cornerTRLocation = this.gl.getUniformLocation(this.program, 'u_cornerTR');
        this.gl.uniform2f(cornerTRLocation, this.corners[1].x, this.corners[1].y);
        
        const cornerBRLocation = this.gl.getUniformLocation(this.program, 'u_cornerBR');
        this.gl.uniform2f(cornerBRLocation, this.corners[2].x, this.corners[2].y);
        
        const cornerBLLocation = this.gl.getUniformLocation(this.program, 'u_cornerBL');
        this.gl.uniform2f(cornerBLLocation, this.corners[3].x, this.corners[3].y);
        
        // Update handle positions if window resized
        if (this.handles) {
            this.handles.forEach((handle, index) => {
                this.updateHandlePosition(index);
            });
        }
        
        // Clear and draw
        this.gl.clearColor(0, 0, 0, 1);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
        this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
        
        requestAnimationFrame(() => this.animate());
    }
}

// Initialize when page loads
window.addEventListener('load', () => {
    new LightMovements();
});
