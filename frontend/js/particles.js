/**
 * Physics-based neon orb particle system with settings
 */

class ParticleSystem {
    constructor() {
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.particles = [];
        
        // Default settings
        this.settings = {
            count: 12,
            minSize: 8,
            maxSize: 20,
            hue: 140,
            hueVariance: 40,
            trailLength: 40,
            speed: 3,
            glowIntensity: 1,
            collisions: true,
            rainbow: false,
            speedTrails: false,
        };
        
        // Load saved settings
        this.loadSettings();
        
        this.init();
        this.createSettingsPanel();
    }

    init() {
        this.canvas.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: -1;
            pointer-events: none;
        `;
        document.body.prepend(this.canvas);

        this.resize();
        window.addEventListener('resize', () => this.resize());

        this.regenerateParticles();
        this.animate();
    }

    loadSettings() {
        try {
            const saved = localStorage.getItem('particleSettings');
            if (saved) {
                this.settings = { ...this.settings, ...JSON.parse(saved) };
            }
        } catch (e) {
            console.warn('Could not load particle settings');
        }
    }

    saveSettings() {
        try {
            localStorage.setItem('particleSettings', JSON.stringify(this.settings));
        } catch (e) {
            console.warn('Could not save particle settings');
        }
    }

    regenerateParticles() {
        this.particles = [];
        for (let i = 0; i < this.settings.count; i++) {
            this.particles.push(this.createParticle());
        }
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    createParticle() {
        const radius = this.settings.minSize + Math.random() * (this.settings.maxSize - this.settings.minSize);
        const baseHue = this.settings.rainbow 
            ? Math.random() * 360 
            : this.settings.hue + (Math.random() - 0.5) * this.settings.hueVariance;
        
        return {
            x: radius + Math.random() * (this.canvas.width - radius * 2),
            y: radius + Math.random() * (this.canvas.height - radius * 2),
            vx: (Math.random() - 0.5) * this.settings.speed,
            vy: (Math.random() - 0.5) * this.settings.speed,
            radius: radius,
            mass: radius,
            trail: [],
            hue: baseHue,
            hueShift: this.settings.rainbow ? Math.random() * 2 : 0,
            glow: 0.8 + Math.random() * 0.2,
        };
    }

    createSettingsPanel() {
        const panel = document.createElement('div');
        panel.id = 'particle-settings';
        panel.innerHTML = `
            <button id="settings-toggle" title="Background Settings">⚙</button>
            <div id="settings-panel">
                <div class="settings-header">
                    <h3>Background Effects</h3>
                    <button id="settings-close">×</button>
                </div>
                <div class="settings-body">
                    <div class="setting-group">
                        <label>Orbs: <span id="count-val">${this.settings.count}</span></label>
                        <input type="range" id="setting-count" min="1" max="50" value="${this.settings.count}">
                    </div>
                    <div class="setting-group">
                        <label>Min Size: <span id="minSize-val">${this.settings.minSize}</span></label>
                        <input type="range" id="setting-minSize" min="2" max="30" value="${this.settings.minSize}">
                    </div>
                    <div class="setting-group">
                        <label>Max Size: <span id="maxSize-val">${this.settings.maxSize}</span></label>
                        <input type="range" id="setting-maxSize" min="5" max="50" value="${this.settings.maxSize}">
                    </div>
                    <div class="setting-group">
                        <label>Color: <span id="hue-val" style="color: hsl(${this.settings.hue}, 100%, 60%)">●</span></label>
                        <input type="range" id="setting-hue" min="0" max="360" value="${this.settings.hue}">
                    </div>
                    <div class="setting-group">
                        <label>Color Variance: <span id="hueVariance-val">${this.settings.hueVariance}</span></label>
                        <input type="range" id="setting-hueVariance" min="0" max="180" value="${this.settings.hueVariance}">
                    </div>
                    <div class="setting-group">
                        <label>Trail Length: <span id="trailLength-val">${this.settings.trailLength}</span></label>
                        <input type="range" id="setting-trailLength" min="0" max="100" value="${this.settings.trailLength}">
                    </div>
                    <div class="setting-group">
                        <label>Speed: <span id="speed-val">${this.settings.speed}</span></label>
                        <input type="range" id="setting-speed" min="0.5" max="25" step="0.5" value="${this.settings.speed}">
                    </div>
                    <div class="setting-group">
                        <label>Glow: <span id="glowIntensity-val">${this.settings.glowIntensity}</span></label>
                        <input type="range" id="setting-glowIntensity" min="0" max="2" step="0.1" value="${this.settings.glowIntensity}">
                    </div>
                    <div class="setting-group checkbox">
                        <label>
                            <input type="checkbox" id="setting-collisions" ${this.settings.collisions ? 'checked' : ''}>
                            Physics Collisions
                        </label>
                    </div>
                    <div class="setting-group checkbox">
                        <label>
                            <input type="checkbox" id="setting-rainbow" ${this.settings.rainbow ? 'checked' : ''}>
                            Rainbow Mode
                        </label>
                    </div>
                    <div class="setting-group checkbox">
                        <label>
                            <input type="checkbox" id="setting-speedTrails" ${this.settings.speedTrails ? 'checked' : ''}>
                            Speed-Based Trails
                        </label>
                    </div>
                    <div class="setting-actions">
                        <button id="settings-reset">Reset Defaults</button>
                    </div>
                </div>
            </div>
        `;
        
        const style = document.createElement('style');
        style.textContent = `
            #particle-settings {
                position: fixed;
                bottom: 20px;
                right: 20px;
                z-index: 1000;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            }
            #settings-toggle {
                width: 44px;
                height: 44px;
                border-radius: 50%;
                border: 1px solid rgba(255,255,255,0.1);
                background: rgba(15, 15, 25, 0.8);
                backdrop-filter: blur(10px);
                color: rgba(255,255,255,0.7);
                font-size: 20px;
                cursor: pointer;
                transition: all 0.3s ease;
            }
            #settings-toggle:hover {
                background: rgba(30, 30, 50, 0.9);
                color: #0af;
                box-shadow: 0 0 20px rgba(0, 170, 255, 0.3);
                transform: rotate(90deg);
            }
            #settings-panel {
                display: none;
                position: absolute;
                bottom: 54px;
                right: 0;
                width: 280px;
                background: rgba(15, 15, 25, 0.95);
                backdrop-filter: blur(20px);
                border: 1px solid rgba(255,255,255,0.1);
                border-radius: 16px;
                overflow: hidden;
                box-shadow: 0 10px 40px rgba(0,0,0,0.5);
            }
            #settings-panel.open {
                display: block;
                animation: slideUp 0.3s ease;
            }
            @keyframes slideUp {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
            }
            .settings-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 12px 16px;
                border-bottom: 1px solid rgba(255,255,255,0.05);
            }
            .settings-header h3 {
                margin: 0;
                font-size: 14px;
                font-weight: 600;
                color: #fff;
            }
            #settings-close {
                background: none;
                border: none;
                color: rgba(255,255,255,0.5);
                font-size: 20px;
                cursor: pointer;
                padding: 0;
                line-height: 1;
            }
            #settings-close:hover { color: #fff; }
            .settings-body {
                padding: 16px;
                max-height: 400px;
                overflow-y: auto;
            }
            .setting-group {
                margin-bottom: 16px;
            }
            .setting-group label {
                display: flex;
                justify-content: space-between;
                align-items: center;
                font-size: 12px;
                color: rgba(255,255,255,0.7);
                margin-bottom: 6px;
            }
            .setting-group input[type="range"] {
                width: 100%;
                height: 4px;
                -webkit-appearance: none;
                background: rgba(255,255,255,0.1);
                border-radius: 2px;
                outline: none;
            }
            .setting-group input[type="range"]::-webkit-slider-thumb {
                -webkit-appearance: none;
                width: 14px;
                height: 14px;
                background: linear-gradient(135deg, #bf5af2, #0af);
                border-radius: 50%;
                cursor: pointer;
                box-shadow: 0 0 10px rgba(0, 170, 255, 0.5);
            }
            .setting-group.checkbox label {
                justify-content: flex-start;
                gap: 8px;
                cursor: pointer;
            }
            .setting-group input[type="checkbox"] {
                width: 16px;
                height: 16px;
                accent-color: #0af;
            }
            .setting-actions {
                margin-top: 16px;
                padding-top: 16px;
                border-top: 1px solid rgba(255,255,255,0.05);
            }
            #settings-reset {
                width: 100%;
                padding: 8px;
                background: rgba(255,255,255,0.05);
                border: 1px solid rgba(255,255,255,0.1);
                border-radius: 8px;
                color: rgba(255,255,255,0.7);
                font-size: 12px;
                cursor: pointer;
                transition: all 0.2s ease;
            }
            #settings-reset:hover {
                background: rgba(255,255,255,0.1);
                color: #fff;
            }
        `;
        
        document.head.appendChild(style);
        document.body.appendChild(panel);
        
        // Event listeners
        document.getElementById('settings-toggle').addEventListener('click', () => {
            document.getElementById('settings-panel').classList.toggle('open');
        });
        
        document.getElementById('settings-close').addEventListener('click', () => {
            document.getElementById('settings-panel').classList.remove('open');
        });
        
        // Range inputs
        const rangeSettings = ['count', 'minSize', 'maxSize', 'hue', 'hueVariance', 'trailLength', 'speed', 'glowIntensity'];
        rangeSettings.forEach(setting => {
            const input = document.getElementById(`setting-${setting}`);
            input.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                this.settings[setting] = val;
                
                if (setting === 'hue') {
                    document.getElementById(`${setting}-val`).style.color = `hsl(${val}, 100%, 60%)`;
                } else {
                    document.getElementById(`${setting}-val`).textContent = val;
                }
                
                if (setting === 'count' || setting === 'minSize' || setting === 'maxSize') {
                    this.regenerateParticles();
                }
                
                this.saveSettings();
            });
        });
        
        // Checkboxes
        document.getElementById('setting-collisions').addEventListener('change', (e) => {
            this.settings.collisions = e.target.checked;
            this.saveSettings();
        });
        
        document.getElementById('setting-rainbow').addEventListener('change', (e) => {
            this.settings.rainbow = e.target.checked;
            this.regenerateParticles();
            this.saveSettings();
        });
        
        document.getElementById('setting-speedTrails').addEventListener('change', (e) => {
            this.settings.speedTrails = e.target.checked;
            this.saveSettings();
        });
        
        // Reset
        document.getElementById('settings-reset').addEventListener('click', () => {
            this.settings = {
                count: 12,
                minSize: 8,
                maxSize: 20,
                hue: 140,
                hueVariance: 40,
                trailLength: 40,
                speed: 3,
                glowIntensity: 1,
                collisions: true,
                rainbow: false,
                speedTrails: false,
            };
            this.saveSettings();
            this.regenerateParticles();
            this.updateSettingsUI();
        });
    }

    updateSettingsUI() {
        document.getElementById('setting-count').value = this.settings.count;
        document.getElementById('count-val').textContent = this.settings.count;
        document.getElementById('setting-minSize').value = this.settings.minSize;
        document.getElementById('minSize-val').textContent = this.settings.minSize;
        document.getElementById('setting-maxSize').value = this.settings.maxSize;
        document.getElementById('maxSize-val').textContent = this.settings.maxSize;
        document.getElementById('setting-hue').value = this.settings.hue;
        document.getElementById('hue-val').style.color = `hsl(${this.settings.hue}, 100%, 60%)`;
        document.getElementById('setting-hueVariance').value = this.settings.hueVariance;
        document.getElementById('hueVariance-val').textContent = this.settings.hueVariance;
        document.getElementById('setting-trailLength').value = this.settings.trailLength;
        document.getElementById('trailLength-val').textContent = this.settings.trailLength;
        document.getElementById('setting-speed').value = this.settings.speed;
        document.getElementById('speed-val').textContent = this.settings.speed;
        document.getElementById('setting-glowIntensity').value = this.settings.glowIntensity;
        document.getElementById('glowIntensity-val').textContent = this.settings.glowIntensity;
        document.getElementById('setting-collisions').checked = this.settings.collisions;
        document.getElementById('setting-rainbow').checked = this.settings.rainbow;
        document.getElementById('setting-speedTrails').checked = this.settings.speedTrails;
    }

    update() {
        const friction = 0.999;
        const bounce = 0.95;

        for (let i = 0; i < this.particles.length; i++) {
            const p = this.particles[i];

            // Rainbow mode hue shift
            if (this.settings.rainbow) {
                p.hue = (p.hue + p.hueShift) % 360;
            }

            // Store trail position
            p.trail.unshift({ x: p.x, y: p.y });
            
            // Calculate trail length - speed-dependent or fixed
            let effectiveTrailLength = this.settings.trailLength;
            if (this.settings.speedTrails) {
                const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
                const maxSpeed = this.settings.speed * 1.5;
                const speedRatio = Math.min(speed / maxSpeed, 1);
                effectiveTrailLength = Math.floor(this.settings.trailLength * (0.2 + speedRatio * 0.8));
            }
            
            while (p.trail.length > effectiveTrailLength) {
                p.trail.pop();
            }

            // Apply velocity
            p.x += p.vx;
            p.y += p.vy;

            // Apply friction
            p.vx *= friction;
            p.vy *= friction;

            // Bounce off walls
            if (p.x - p.radius < 0) {
                p.x = p.radius;
                p.vx = Math.abs(p.vx) * bounce;
            }
            if (p.x + p.radius > this.canvas.width) {
                p.x = this.canvas.width - p.radius;
                p.vx = -Math.abs(p.vx) * bounce;
            }
            if (p.y - p.radius < 0) {
                p.y = p.radius;
                p.vy = Math.abs(p.vy) * bounce;
            }
            if (p.y + p.radius > this.canvas.height) {
                p.y = this.canvas.height - p.radius;
                p.vy = -Math.abs(p.vy) * bounce;
            }

            // Collision with other particles
            if (this.settings.collisions) {
                for (let j = i + 1; j < this.particles.length; j++) {
                    this.collide(p, this.particles[j]);
                }
            }

            // Random movement
            p.vx += (Math.random() - 0.5) * 0.1;
            p.vy += (Math.random() - 0.5) * 0.1;

            // Speed limit based on settings
            const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
            const maxSpeed = this.settings.speed * 1.5;
            if (speed > maxSpeed) {
                p.vx = (p.vx / speed) * maxSpeed;
                p.vy = (p.vy / speed) * maxSpeed;
            }
        }
    }

    collide(p1, p2) {
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const minDist = p1.radius + p2.radius;

        if (dist < minDist) {
            const nx = dx / dist;
            const ny = dy / dist;
            const dvx = p1.vx - p2.vx;
            const dvy = p1.vy - p2.vy;
            const dvn = dvx * nx + dvy * ny;

            if (dvn > 0) return;

            const restitution = 0.9;
            const impulse = -(1 + restitution) * dvn / (1/p1.mass + 1/p2.mass);

            p1.vx += impulse * nx / p1.mass;
            p1.vy += impulse * ny / p1.mass;
            p2.vx -= impulse * nx / p2.mass;
            p2.vy -= impulse * ny / p2.mass;

            const overlap = minDist - dist;
            const separateX = overlap * nx * 0.5;
            const separateY = overlap * ny * 0.5;
            p1.x -= separateX;
            p1.y -= separateY;
            p2.x += separateX;
            p2.y += separateY;
        }
    }

    draw() {
        this.ctx.fillStyle = 'rgba(10, 10, 15, 0.15)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        const glowMult = this.settings.glowIntensity;

        for (const p of this.particles) {
            // Draw trail
            if (p.trail.length > 1 && this.settings.trailLength > 0) {
                this.ctx.beginPath();
                this.ctx.moveTo(p.trail[0].x, p.trail[0].y);
                
                for (let i = 1; i < p.trail.length; i++) {
                    this.ctx.lineTo(p.trail[i].x, p.trail[i].y);
                }
                
                const gradient = this.ctx.createLinearGradient(
                    p.x, p.y,
                    p.trail[p.trail.length - 1].x,
                    p.trail[p.trail.length - 1].y
                );
                gradient.addColorStop(0, `hsla(${p.hue}, 100%, 60%, ${0.8 * glowMult})`);
                gradient.addColorStop(0.5, `hsla(${p.hue}, 100%, 50%, ${0.3 * glowMult})`);
                gradient.addColorStop(1, `hsla(${p.hue}, 100%, 40%, 0)`);
                
                this.ctx.strokeStyle = gradient;
                this.ctx.lineWidth = p.radius * 0.8;
                this.ctx.lineCap = 'round';
                this.ctx.lineJoin = 'round';
                this.ctx.stroke();
            }

            // Draw outer glow
            if (glowMult > 0) {
                const glowGradient = this.ctx.createRadialGradient(
                    p.x, p.y, 0,
                    p.x, p.y, p.radius * 4
                );
                glowGradient.addColorStop(0, `hsla(${p.hue}, 100%, 60%, ${0.4 * glowMult})`);
                glowGradient.addColorStop(0.3, `hsla(${p.hue}, 100%, 50%, ${0.2 * glowMult})`);
                glowGradient.addColorStop(1, `hsla(${p.hue}, 100%, 40%, 0)`);
                
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, p.radius * 4, 0, Math.PI * 2);
                this.ctx.fillStyle = glowGradient;
                this.ctx.fill();
            }

            // Draw orb core
            const coreGradient = this.ctx.createRadialGradient(
                p.x - p.radius * 0.3, p.y - p.radius * 0.3, 0,
                p.x, p.y, p.radius
            );
            coreGradient.addColorStop(0, `hsla(${p.hue}, 80%, 90%, 1)`);
            coreGradient.addColorStop(0.4, `hsla(${p.hue}, 100%, 60%, 1)`);
            coreGradient.addColorStop(1, `hsla(${p.hue}, 100%, 40%, 0.8)`);
            
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            this.ctx.fillStyle = coreGradient;
            this.ctx.fill();
        }
    }

    animate() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.animate());
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new ParticleSystem();
});
